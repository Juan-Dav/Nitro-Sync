import { useEffect, useMemo, useRef, useState } from 'react';

import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import BotonNitro from '@/components/ui/boton-nitro';
import { useAlerta } from '@/components/ui/confirm-dialog';
import ImagenVehiculo from '@/components/ui/imagen-vehiculo';
import {
  ColoresEstado,
  Paleta,
  Radios,
  sombraDura,
} from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useVehiculos } from '@/context/VehiculosContext';
import { ASEGURADORAS, buscarAseguradora } from '@/data/aseguradoras';
import { guardarTelefono, suscribirPerfil } from '@/services/perfil';
import {
  crearSolicitud,
  suscribirMisSolicitudes,
} from '@/services/solicitudes';
import {
  estadoSeguro,
  nombreAseguradora,
  textoVencimiento,
} from '@/utils/admin';
import { esCelularValido, soloDigitos } from '@/utils/contacto';

import type { Solicitud, Vehiculo } from '@/types/models';

const SIN_PREFERENCIA = 'Sin preferencia';

export default function MisSegurosScreen() {
  const { user } = useAuth();
  const { vehiculos, cargando } = useVehiculos();
  const alerta = useAlerta();

  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [telefono, setTelefono] = useState('');
  const telefonoCargado = useRef(false);

  const [abierto, setAbierto] = useState<string | null>(null);
  const [preferida, setPreferida] = useState(SIN_PREFERENCIA);
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    const limpiarPerfil = suscribirPerfil(user.uid, (perfil) => {
      if (!telefonoCargado.current && perfil?.telefono) {
        telefonoCargado.current = true;
        setTelefono(perfil.telefono);
      }
    });

    const limpiarSolicitudes = suscribirMisSolicitudes(user.uid, setSolicitudes);

    return () => {
      limpiarPerfil();
      limpiarSolicitudes();
    };
  }, [user]);

  const porVehiculo = useMemo(() => {
    const mapa = new Map<string, Solicitud>();

    solicitudes.forEach((solicitud) => mapa.set(solicitud.vehiculoId, solicitud));

    return mapa;
  }, [solicitudes]);

  const enviar = async (vehiculo: Vehiculo) => {
    if (!user) {
      return;
    }

    if (!esCelularValido(telefono)) {
      await alerta({
        titulo: 'Revisa tu WhatsApp',
        mensaje:
          'Escribe un celular colombiano de 10 dígitos que empiece por 3, para que el agente te pueda contactar.',
        tipo: 'advertencia',
      });
      return;
    }

    try {
      setEnviando(true);

      await guardarTelefono(user.uid, soloDigitos(telefono));

      await crearSolicitud({
        uid: user.uid,
        email: user.email ?? '',
        vehiculoId: vehiculo.id,
        vehiculoNombre: vehiculo.nombre,
        placa: vehiculo.placa,
        tipoVehiculo: vehiculo.tipo,
        tipo: nombreAseguradora(vehiculo) ? 'Renovación' : 'Cotización',
        aseguradoraPreferida: preferida === SIN_PREFERENCIA ? '' : preferida,
        telefono: soloDigitos(telefono),
        nota: nota.trim(),
      });

      setAbierto(null);
      setNota('');
      setPreferida(SIN_PREFERENCIA);

      await alerta({
        titulo: 'Solicitud enviada',
        mensaje: 'Un agente de seguros la verá y te contactará por WhatsApp.',
        tipo: 'exito',
      });
    } catch {
      await alerta({
        titulo: 'No se pudo enviar',
        mensaje: 'Revisa tu conexión e inténtalo de nuevo.',
        tipo: 'error',
      });
    } finally {
      setEnviando(false);
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
          <Text style={styles.seccion}>Tu WhatsApp</Text>
          <Text style={styles.ayuda}>
            Lo usará el agente de seguros para enviarte la cotización.
          </Text>
          <TextInput
            style={styles.input}
            value={telefono}
            onChangeText={setTelefono}
            placeholder="3001234567"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            maxLength={13}
          />
        </View>

        {!cargando && vehiculos.length === 0 && (
          <Text style={styles.vacio}>
            Registra un vehículo para ver y gestionar su seguro.
          </Text>
        )}

        {vehiculos.map((vehiculo) => {
          const aseguradora = nombreAseguradora(vehiculo);
          const marca = buscarAseguradora(aseguradora);
          const estado = estadoSeguro(vehiculo);
          const colorEstado =
            estado === 'Vigente' ||
            estado === 'Proximo a vencer' ||
            estado === 'Vencido'
              ? ColoresEstado[estado]
              : null;
          const solicitud = porVehiculo.get(vehiculo.id);
          const pendiente = solicitud?.estado === 'Pendiente';
          const atendida = solicitud?.estado === 'Atendida';
          const etiquetaBoton = aseguradora
            ? 'Solicitar renovación'
            : 'Solicitar cotización';

          return (
            <View key={vehiculo.id} style={styles.tarjeta}>
              <View style={styles.fila}>
                <ImagenVehiculo
                  uri={vehiculo.imagen}
                  tipo={vehiculo.tipo}
                  style={styles.imagen}
                />

                <View style={styles.cuerpo}>
                  <Text style={styles.nombre} numberOfLines={1}>
                    {vehiculo.nombre}
                  </Text>
                  <Text style={styles.detalle} numberOfLines={1}>
                    {vehiculo.year}
                    {vehiculo.placa ? ` • ${vehiculo.placa}` : ''}
                  </Text>

                  {aseguradora ? (
                    <View
                      style={[
                        styles.aseguradoraPill,
                        { backgroundColor: marca?.color ?? Paleta.primario },
                      ]}
                    >
                      <Text
                        style={[
                          styles.aseguradoraTexto,
                          { color: marca?.colorTexto ?? '#FFFFFF' },
                        ]}
                      >
                        {aseguradora}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.aseguradoraPill, styles.sinSeguroPill]}>
                      <Text style={[styles.aseguradoraTexto, { color: '#B3123E' }]}>
                        Sin seguro
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {aseguradora ? (
                <View style={styles.vencimientoFila}>
                  <Text style={styles.detalle}>
                    Póliza {vehiculo.numeroPoliza || '—'}
                  </Text>
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
                        {textoVencimiento(vehiculo)}
                      </Text>
                    </View>
                  )}
                </View>
              ) : null}

              {pendiente && (
                <View style={styles.aviso}>
                  <Ionicons name="time-outline" size={16} color={Paleta.advertencia} />
                  <Text style={styles.avisoTexto}>
                    Solicitud de {solicitud?.tipo.toLowerCase()} enviada. Esperando al agente.
                  </Text>
                </View>
              )}

              {atendida && (
                <View style={[styles.aviso, styles.avisoExito]}>
                  <Ionicons name="checkmark-circle" size={16} color={Paleta.exito} />
                  <Text style={[styles.avisoTexto, { color: '#067A55' }]}>
                    Tu última solicitud fue atendida.
                  </Text>
                </View>
              )}

              {abierto === vehiculo.id ? (
                <View style={styles.formulario}>
                  <Text style={styles.etiqueta}>Aseguradora preferida</Text>
                  <View style={styles.chips}>
                    {[SIN_PREFERENCIA, ...ASEGURADORAS.map((a) => a.nombre)].map(
                      (nombre) => {
                        const activo = preferida === nombre;

                        return (
                          <Pressable
                            key={nombre}
                            onPress={() => setPreferida(nombre)}
                            style={[styles.chip, activo && styles.chipActivo]}
                          >
                            <Text
                              style={[
                                styles.chipTexto,
                                activo && styles.chipTextoActivo,
                              ]}
                            >
                              {nombre}
                            </Text>
                          </Pressable>
                        );
                      }
                    )}
                  </View>

                  <Text style={styles.etiqueta}>Nota para el agente (opcional)</Text>
                  <TextInput
                    style={[styles.input, styles.nota]}
                    value={nota}
                    onChangeText={setNota}
                    placeholder="Ej: quiero todo riesgo"
                    placeholderTextColor="#94A3B8"
                    multiline
                    maxLength={200}
                    textAlignVertical="top"
                  />

                  <BotonNitro
                    titulo="Enviar solicitud"
                    icono="send"
                    tamano="mediano"
                    onPress={() => enviar(vehiculo)}
                    cargando={enviando}
                  />

                  <BotonNitro
                    titulo="Cancelar"
                    variante="fantasma"
                    tamano="pequeno"
                    onPress={() => setAbierto(null)}
                  />
                </View>
              ) : (
                <BotonNitro
                  titulo={pendiente ? 'Solicitud enviada' : etiquetaBoton}
                  icono={pendiente ? 'checkmark' : 'shield-checkmark'}
                  tamano="mediano"
                  deshabilitado={pendiente}
                  onPress={() => {
                    setAbierto(vehiculo.id);
                    setNota('');
                    setPreferida(SIN_PREFERENCIA);
                  }}
                />
              )}
            </View>
          );
        })}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Paleta.fondo },
  contenido: { padding: 16, gap: 16, paddingBottom: 40 },
  vacio: { textAlign: 'center', color: Paleta.textoSecundario, marginTop: 20 },
  tarjeta: {
    backgroundColor: Paleta.tarjeta,
    borderRadius: Radios.tarjeta,
    borderWidth: 2,
    borderColor: Paleta.tinta,
    padding: 16,
    gap: 10,
    ...sombraDura(4, 4),
  },
  seccion: { fontSize: 16, fontWeight: '900', color: Paleta.texto },
  ayuda: { fontSize: 12, color: Paleta.textoSecundario },
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
  nota: { height: 80, paddingTop: 12 },
  fila: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  imagen: { width: 72, height: 72, borderRadius: 14 },
  cuerpo: { flex: 1, gap: 4 },
  nombre: { fontSize: 16, fontWeight: '800', color: Paleta.texto },
  detalle: { fontSize: 12, color: Paleta.textoSecundario },
  aseguradoraPill: {
    alignSelf: 'flex-start',
    borderRadius: Radios.pastilla,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  sinSeguroPill: { backgroundColor: Paleta.peligroFondo },
  aseguradoraTexto: { fontSize: 12, fontWeight: '800' },
  vencimientoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  estadoPill: {
    borderWidth: 1,
    borderRadius: Radios.pastilla,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  estadoTexto: { fontSize: 11, fontWeight: '800' },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Paleta.advertenciaFondo,
    borderRadius: Radios.suave,
    padding: 10,
  },
  avisoExito: { backgroundColor: Paleta.exitoFondo },
  avisoTexto: { flex: 1, fontSize: 12, fontWeight: '700', color: '#9A5B00' },
  formulario: { gap: 10 },
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
});
