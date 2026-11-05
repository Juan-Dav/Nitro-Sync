import { useEffect, useState } from 'react';

import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useLocalSearchParams } from 'expo-router';

import BotonNitro from '@/components/ui/boton-nitro';
import { useAlerta, useConfirm } from '@/components/ui/confirm-dialog';
import ImagenVehiculo from '@/components/ui/imagen-vehiculo';
import SelectorFecha from '@/components/ui/selector-fecha';
import {
  ColoresEstado,
  Paleta,
  Radios,
  sombraDura,
} from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { ASEGURADORAS, buscarAseguradora, type Aseguradora } from '@/data/aseguradoras';
import { asignarSeguro, suscribirVehiculoAdmin } from '@/services/admin';
import { suscribirDocumentos } from '@/services/documentos';
import { suscribirPerfil } from '@/services/perfil';
import {
  estadoSeguro,
  generarNumeroPoliza,
  nombreAseguradora,
  textoVencimiento,
  unAnioDespues,
} from '@/utils/admin';
import { calcularEstado, hoyISO } from '@/utils/fechas';

import type { Documento, Perfil, Vehiculo } from '@/types/models';

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.datoEtiqueta}>{etiqueta}</Text>
      <Text style={styles.datoValor}>{valor || '—'}</Text>
    </View>
  );
}

export default function AdminVehiculoScreen() {
  const { uid, id } = useLocalSearchParams<{ uid: string; id: string }>();
  const { user, esAdmin } = useAuth();
  const confirmar = useConfirm();
  const alerta = useAlerta();

  const [vehiculo, setVehiculo] = useState<Vehiculo | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [cargando, setCargando] = useState(true);

  const [seleccionada, setSeleccionada] = useState<Aseguradora | null>(null);
  const [poliza, setPoliza] = useState('');
  const [vencimiento, setVencimiento] = useState(unAnioDespues());
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!uid || !id) {
      return;
    }

    const limpiarVehiculo = suscribirVehiculoAdmin(
      uid,
      id,
      (dato) => {
        setVehiculo(dato);
        setCargando(false);
      },
      () => setCargando(false)
    );

    const limpiarPerfil = suscribirPerfil(uid, setPerfil);
    const limpiarDocumentos = suscribirDocumentos(uid, id, setDocumentos);

    return () => {
      limpiarVehiculo();
      limpiarPerfil();
      limpiarDocumentos();
    };
  }, [uid, id]);

  if (!esAdmin) {
    return null;
  }

  if (!vehiculo) {
    return (
      <View style={styles.centro}>
        <Text style={styles.vacio}>
          {cargando ? 'Cargando vehículo...' : 'No se encontró el vehículo.'}
        </Text>
      </View>
    );
  }

  const aseguradoraActual = nombreAseguradora(vehiculo);
  const marcaActual = buscarAseguradora(aseguradoraActual);
  const estado = estadoSeguro(vehiculo);
  const colorEstado =
    estado === 'Vigente' || estado === 'Proximo a vencer' || estado === 'Vencido'
      ? ColoresEstado[estado]
      : null;

  const llamar = () => {
    if (vehiculo.telefonoAseguradora) {
      Linking.openURL(`tel:${vehiculo.telefonoAseguradora}`);
    }
  };

  const guardar = async () => {
    if (!user || !uid || !id) {
      return;
    }

    if (!seleccionada || !poliza.trim() || !vencimiento) {
      await alerta({
        titulo: 'Datos incompletos',
        mensaje: 'Elige la aseguradora, el número de póliza y el vencimiento.',
        tipo: 'advertencia',
      });
      return;
    }

    if (vencimiento < hoyISO()) {
      await alerta({
        titulo: 'Fecha no válida',
        mensaje: 'El vencimiento del seguro no puede estar en el pasado.',
        tipo: 'advertencia',
      });
      return;
    }

    const aceptado = await confirmar({
      titulo: 'Asignar seguro',
      mensaje: `¿Asignar ${seleccionada.nombre} al vehículo ${vehiculo.placa || vehiculo.nombre}?`,
      textoConfirmar: 'Asignar',
      textoCancelar: 'Cancelar',
      icono: 'shield-checkmark-outline',
    });

    if (!aceptado) {
      return;
    }

    try {
      setGuardando(true);

      await asignarSeguro(
        uid,
        id,
        {
          aseguradora: seleccionada.nombre,
          telefonoAseguradora: seleccionada.telefono,
          numeroPoliza: poliza.trim(),
          vencimientoSeguro: vencimiento,
        },
        user.uid
      );

      setSeleccionada(null);
      setPoliza('');
      setVencimiento(unAnioDespues());

      await alerta({
        titulo: 'Seguro asignado',
        mensaje: 'El propietario ya puede ver su aseguradora en la app.',
        tipo: 'exito',
      });
    } catch {
      await alerta({
        titulo: 'No se pudo asignar',
        mensaje: 'Revisa tu conexión y las reglas de Firestore.',
        tipo: 'error',
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.pantalla}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.tarjeta}>
          <ImagenVehiculo
            uri={vehiculo.imagen}
            tipo={vehiculo.tipo}
            style={styles.portada}
          />

          <Text style={styles.nombre}>{vehiculo.nombre}</Text>
          <Text style={styles.subtitulo}>
            {vehiculo.marca} {vehiculo.modelo} • {vehiculo.year}
          </Text>

          <View style={styles.datos}>
            <Dato etiqueta="Placa" valor={vehiculo.placa} />
            <Dato etiqueta="Tipo" valor={vehiculo.tipo} />
            <Dato etiqueta="Color" valor={vehiculo.color} />
            <Dato
              etiqueta="Kilometraje"
              valor={`${(vehiculo.kilometraje ?? 0).toLocaleString('es-CO')} km`}
            />
          </View>

          <Dato etiqueta="Propietario" valor={perfil?.email ?? ''} />
        </View>

        <View style={styles.tarjeta}>
          <Text style={styles.seccion}>Seguro actual</Text>

          {aseguradoraActual ? (
            <>
              <View style={styles.seguroFila}>
                <View
                  style={[
                    styles.aseguradoraPill,
                    { backgroundColor: marcaActual?.color ?? Paleta.primario },
                  ]}
                >
                  <Text
                    style={[
                      styles.aseguradoraTexto,
                      { color: marcaActual?.colorTexto ?? '#FFFFFF' },
                    ]}
                  >
                    {aseguradoraActual}
                  </Text>
                </View>

                {colorEstado && (
                  <View
                    style={[
                      styles.estadoPill,
                      {
                        backgroundColor: colorEstado.fondo,
                        borderColor: colorEstado.borde,
                      },
                    ]}
                  >
                    <Text style={[styles.estadoTexto, { color: colorEstado.texto }]}>
                      {estado === 'Proximo a vencer' ? 'Próximo a vencer' : estado}
                    </Text>
                  </View>
                )}
              </View>

              <Dato etiqueta="Número de póliza" valor={vehiculo.numeroPoliza ?? ''} />
              <Dato
                etiqueta="Vencimiento"
                valor={
                  vehiculo.vencimientoSeguro
                    ? `${vehiculo.vencimientoSeguro} (${textoVencimiento(vehiculo)})`
                    : ''
                }
              />

              {vehiculo.telefonoAseguradora ? (
                <BotonNitro
                  titulo="Llamar a la aseguradora"
                  icono="call"
                  variante="secundario"
                  tamano="mediano"
                  onPress={llamar}
                  style={styles.espacioBoton}
                />
              ) : null}
            </>
          ) : (
            <Text style={styles.vacio}>
              Este vehículo no tiene seguro registrado.
            </Text>
          )}
        </View>

        <View style={styles.tarjeta}>
          <Text style={styles.seccion}>Asignar o renovar seguro</Text>

          <Text style={styles.etiqueta}>Aseguradora</Text>
          <View style={styles.chips}>
            {ASEGURADORAS.map((item) => {
              const activo = seleccionada?.id === item.id;

              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setSeleccionada(item);
                    if (!poliza.trim()) {
                      setPoliza(generarNumeroPoliza(item.id, vehiculo.placa || 'VEH'));
                    }
                  }}
                  style={[styles.chip, activo && styles.chipActivo]}
                >
                  <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>
                    {item.nombre}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.etiqueta}>Número de póliza</Text>
          <TextInput
            style={styles.input}
            value={poliza}
            onChangeText={setPoliza}
            placeholder="Ej: SURA-ABC123-482913"
            placeholderTextColor="#94A3B8"
            autoCapitalize="characters"
          />

          <SelectorFecha
            etiqueta="Vencimiento del seguro"
            valor={vencimiento}
            onChange={setVencimiento}
            minimo={hoyISO()}
          />

          <BotonNitro
            titulo="Asignar seguro"
            icono="shield-checkmark"
            onPress={guardar}
            cargando={guardando}
            style={styles.espacioBoton}
          />
        </View>

        <View style={styles.tarjeta}>
          <Text style={styles.seccion}>Documentos del vehículo</Text>

          {documentos.length === 0 ? (
            <Text style={styles.vacio}>Sin documentos registrados.</Text>
          ) : (
            documentos.map((documento) => {
              const color = ColoresEstado[calcularEstado(documento.vencimiento)];

              return (
                <View key={documento.id} style={styles.documentoFila}>
                  <View style={styles.documentoTextos}>
                    <Text style={styles.documentoTipo}>{documento.tipo}</Text>
                    <Text style={styles.documentoFecha}>
                      Vence {documento.vencimiento}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.estadoPill,
                      { backgroundColor: color.fondo, borderColor: color.borde },
                    ]}
                  >
                    <Text style={[styles.estadoTexto, { color: color.texto }]}>
                      {calcularEstado(documento.vencimiento) === 'Proximo a vencer'
                        ? 'Próximo a vencer'
                        : calcularEstado(documento.vencimiento)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Paleta.fondo },
  contenido: { padding: 16, gap: 16, paddingBottom: 40 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tarjeta: {
    backgroundColor: Paleta.tarjeta,
    borderRadius: Radios.tarjeta,
    borderWidth: 2,
    borderColor: Paleta.tinta,
    padding: 16,
    gap: 10,
    ...sombraDura(4, 4),
  },
  portada: { width: '100%', height: 170, borderRadius: 16 },
  nombre: { fontSize: 22, fontWeight: '900', color: Paleta.texto },
  subtitulo: { fontSize: 13, color: Paleta.textoSecundario, marginTop: -6 },
  datos: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  dato: { minWidth: '45%', flexGrow: 1 },
  datoEtiqueta: { fontSize: 11, fontWeight: '700', color: Paleta.textoSuave },
  datoValor: { fontSize: 14, fontWeight: '700', color: Paleta.texto },
  seccion: { fontSize: 16, fontWeight: '900', color: Paleta.texto },
  seguroFila: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  aseguradoraPill: {
    borderRadius: Radios.pastilla,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  aseguradoraTexto: { fontSize: 13, fontWeight: '800' },
  estadoPill: {
    borderWidth: 1,
    borderRadius: Radios.pastilla,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  estadoTexto: { fontSize: 11, fontWeight: '800' },
  vacio: { fontSize: 13, color: Paleta.textoSecundario },
  espacioBoton: { marginTop: 6 },
  etiqueta: { fontSize: 13, fontWeight: '700', color: Paleta.textoSecundario },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radios.pastilla,
    backgroundColor: Paleta.fondo,
    borderWidth: 1.5,
    borderColor: Paleta.borde,
  },
  chipActivo: { backgroundColor: Paleta.primario, borderColor: Paleta.tinta },
  chipTexto: { fontSize: 12, fontWeight: '800', color: Paleta.textoSecundario },
  chipTextoActivo: { color: '#FFFFFF' },
  input: {
    backgroundColor: Paleta.fondo,
    borderWidth: 1,
    borderColor: Paleta.borde,
    borderRadius: Radios.suave,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: Paleta.texto,
  },
  documentoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Paleta.borde,
  },
  documentoTextos: { flex: 1 },
  documentoTipo: { fontSize: 14, fontWeight: '800', color: Paleta.texto },
  documentoFecha: { fontSize: 12, color: Paleta.textoSecundario },
});
