/*
=======================================================
NITRO SYNC - FORMULARIO DE MANTENIMIENTO
=======================================================

  /vehicle/mantenimiento?vehiculoId=X                    -> crear
  /vehicle/mantenimiento?vehiculoId=X&mantenimientoId=Y  -> editar

Tipos disponibles (types/models.ts): Cambio de aceite,
Filtro de aceite, Filtro de aire, Frenos, Llantas,
Batería, Kit de arrastre, Cadena, Refrigerante, Bujías,
Mantenimiento general, Otro.

Se guarda en:

  usuarios/{uid}/vehiculos/{vehiculoId}/mantenimientos

=======================================================
*/

import { useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { router, Stack, useLocalSearchParams } from 'expo-router';

import { Paleta, Radios, Sombras } from '@/constants/theme';

import BotonNitro from '@/components/ui/boton-nitro';
import { useAlerta } from '@/components/ui/confirm-dialog';
import SelectorFecha from '@/components/ui/selector-fecha';

import { useAuth } from '@/context/AuthContext';

import { useRegistrosVehiculo } from '@/hooks/use-registros-vehiculo';

import {
  actualizarMantenimiento,
  crearMantenimiento,
} from '@/services/mantenimientos';

import type { Mantenimiento, TipoMantenimiento } from '@/types/models';

import { formatoDinero, formatoFecha } from '@/utils/formato';

import { esFechaISOValida, hoyISO } from '@/utils/fechas';

/* -------------------------------------------------------
   OPCIONES DE TIPO
   ------------------------------------------------------- */

const TIPOS: TipoMantenimiento[] = [
  'Cambio de aceite',
  'Filtro de aceite',
  'Filtro de aire',
  'Frenos',
  'Llantas',
  'Batería',
  'Kit de arrastre',
  'Cadena',
  'Refrigerante',
  'Bujías',
  'Mantenimiento general',
  'Otro',
];

const ANIO_ACTUAL = new Date().getFullYear();

export default function FormularioMantenimientoScreen() {
  const {
    vehiculoId,
    mantenimientoId,
    tipo: tipoParam,
    kilometraje: kilometrajeParam,
  } = useLocalSearchParams<{
    vehiculoId?: string;
    mantenimientoId?: string;
    tipo?: string;
    kilometraje?: string;
  }>();

  const { user } = useAuth();
  const alerta = useAlerta();

  const { registros, cargando } = useRegistrosVehiculo<Mantenimiento>(
    'mantenimientos',
    vehiculoId,
    'fecha',
    'desc'
  );

  const modo: 'crear' | 'editar' = mantenimientoId ? 'editar' : 'crear';

  /*
  Tipo precargado desde la pantalla del vehículo (por
  ejemplo el acceso rápido "Registrar cambio de aceite").
  Solo se acepta si es un tipo válido.
  */
  const tipoPrecargado: TipoMantenimiento =
    tipoParam && TIPOS.includes(tipoParam as TipoMantenimiento)
      ? (tipoParam as TipoMantenimiento)
      : 'Mantenimiento general';

  /* -------------------------------------------------
     ESTADOS DEL FORMULARIO
     ------------------------------------------------- */

  const [tipo, setTipo] = useState<TipoMantenimiento>(tipoPrecargado);
  const [fecha, setFecha] = useState(hoyISO());
  const [kilometraje, setKilometraje] = useState(
    modo === 'crear' && kilometrajeParam ? String(kilometrajeParam) : ''
  );
  const [costo, setCosto] = useState('');
  const [descripcion, setDescripcion] = useState(
    /* Acceso rápido: se escribe el tipo como descripción. */
    modo === 'crear' && tipoParam ? tipoParam : ''
  );
  const [taller, setTaller] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const [guardando, setGuardando] = useState(false);

  /* -------------------------------------------------
     PRELLENADO EN MODO EDICIÓN (una sola vez)
     ------------------------------------------------- */

  const prellenado = useRef(false);

  const registroOriginal = mantenimientoId
    ? registros.find((registro) => registro.id === mantenimientoId)
    : undefined;

  useEffect(() => {
    if (registroOriginal && !prellenado.current) {
      prellenado.current = true;

      setTipo(registroOriginal.tipo);
      setFecha(registroOriginal.fecha);
      setKilometraje(String(registroOriginal.kilometraje));
      setCosto(String(registroOriginal.costo));
      setDescripcion(registroOriginal.descripcion);
      setTaller(registroOriginal.taller);
      setObservaciones(registroOriginal.observaciones);
    }
  }, [registroOriginal]);

  /* -------------------------------------------------
     DATOS FALTANTES
     ------------------------------------------------- */

  if (!vehiculoId) {
    return (
      <View style={styles.avisoContenedor}>
        <Text style={styles.avisoTitulo}>Vehículo no indicado</Text>

        <Text style={styles.avisoTexto}>
          Falta el identificador del vehículo. Vuelve e inténtalo de nuevo.
        </Text>

        <Pressable
          style={styles.avisoBoton}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/explore');
          }}
        >
          <Text style={styles.avisoBotonTexto}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  if (modo === 'editar' && cargando && !registroOriginal) {
    return (
      <View style={styles.avisoContenedor}>
        <ActivityIndicator size="large" color={Paleta.primario} />

        <Text style={styles.avisoTexto}>Cargando mantenimiento...</Text>
      </View>
    );
  }

  if (modo === 'editar' && !cargando && !registroOriginal) {
    return (
      <View style={styles.avisoContenedor}>
        <Text style={styles.avisoTitulo}>Mantenimiento no encontrado</Text>

        <Text style={styles.avisoTexto}>
          Puede haber sido eliminado. Vuelve a la lista e inténtalo de nuevo.
        </Text>

        <Pressable
          style={styles.avisoBoton}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/explore');
          }}
        >
          <Text style={styles.avisoBotonTexto}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  /* -------------------------------------------------
     VALIDACIÓN
     ------------------------------------------------- */

  const validar = async (): Promise<boolean> => {
    if (!fecha.trim() || !esFechaISOValida(fecha)) {
      await alerta({
        titulo: 'Fecha inválida',
        mensaje: 'Elige la fecha del mantenimiento con el calendario.',
        tipo: 'advertencia',
      });
      return false;
    }

    const anio = Number(fecha.slice(0, 4));

    if (anio < 1950 || anio > ANIO_ACTUAL + 1) {
      await alerta({
        titulo: 'Fecha fuera de rango',
        mensaje: `La fecha debe estar entre 1950 y ${ANIO_ACTUAL + 1}.`,
        tipo: 'advertencia',
      });
      return false;
    }

    if (kilometraje.trim() !== '' && Number.isNaN(Number(kilometraje))) {
      await alerta({
        titulo: 'Kilometraje inválido',
        mensaje: 'Escribe un número (ej: 36500).',
        tipo: 'advertencia',
      });
      return false;
    }

    if (costo.trim() !== '' && Number.isNaN(Number(costo))) {
      await alerta({
        titulo: 'Costo inválido',
        mensaje: 'Escribe un número (ej: 180000).',
        tipo: 'advertencia',
      });
      return false;
    }

    if (!descripcion.trim()) {
      await alerta({
        titulo: 'Falta la descripción',
        mensaje: 'Cuenta qué se le hizo al vehículo (ej: "Cambio de aceite y filtros").',
        tipo: 'advertencia',
      });
      return false;
    }

    return true;
  };

  /* -------------------------------------------------
     GUARDAR
     ------------------------------------------------- */

  const guardar = async () => {
    if (!(await validar())) {
      return;
    }

    if (!user) {
      await alerta({
        titulo: 'Sesión requerida',
        mensaje: 'Inicia sesión para guardar.',
        tipo: 'advertencia',
      });
      return;
    }

    const datos = {
      tipo,
      fecha,
      kilometraje: Number(kilometraje.replace(/[^0-9]/g, '') || '0'),
      costo: Number(costo.replace(/[^0-9]/g, '') || '0'),
      descripcion: descripcion.trim(),
      taller: taller.trim(),
      observaciones: observaciones.trim(),
    };

    try {
      setGuardando(true);

      if (modo === 'editar' && mantenimientoId) {
        await actualizarMantenimiento(
          user.uid,
          vehiculoId,
          mantenimientoId,
          datos
        );
      } else {
        await crearMantenimiento(user.uid, vehiculoId, datos);
      }

      await alerta({
        titulo:
          modo === 'editar'
            ? 'Mantenimiento actualizado'
            : 'Mantenimiento registrado',
        mensaje: 'La información quedó guardada en Firestore.',
        tipo: 'exito',
        icono: 'checkmark-circle-outline',
      });

      router.back();
    } catch (error: any) {
      await alerta({
        titulo: 'No se pudo guardar',
        mensaje: error?.message ?? 'Ocurrió un error inesperado.',
        tipo: 'error',
        icono: 'alert-circle-outline',
      });
    } finally {
      setGuardando(false);
    }
  };

  /* -------------------------------------------------
     INTERFAZ
     ------------------------------------------------- */

  return (
    <KeyboardAvoidingView
      style={styles.contenedor}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          title:
            modo === 'editar' ? 'Editar mantenimiento' : 'Nuevo mantenimiento',
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={true} persistentScrollbar
        keyboardShouldPersistTaps="handled"
      >
        {/* =================================================
            SECCIÓN 1: TIPO
            ================================================= */}

        <View style={styles.tarjeta}>
          <Text style={styles.seccionTitulo}>Tipo de mantenimiento</Text>

          <View style={styles.chips}>
            {TIPOS.map((opcion) => {
              const activo = tipo === opcion;

              return (
                <Pressable
                  key={opcion}
                  style={[styles.chip, activo && styles.chipActivo]}
                  onPress={() => setTipo(opcion)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: activo }}
                >
                  <Text
                    style={[
                      styles.chipTexto,
                      activo && styles.chipTextoActivo,
                    ]}
                  >
                    {opcion}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* =================================================
            SECCIÓN 2: FECHA Y COSTO
            ================================================= */}

        <View style={styles.tarjeta}>
          <Text style={styles.seccionTitulo}>Fecha y costo</Text>

          <SelectorFecha
            etiqueta="Fecha *"
            valor={fecha}
            onChange={setFecha}
            maximo={hoyISO()}
            placeholder="Elegir la fecha del mantenimiento"
          />

          <View style={styles.fila}>
            <View style={styles.mitad}>
              <Text style={styles.etiqueta}>Kilometraje</Text>

              <TextInput
                style={styles.input}
                placeholder="Ej: 36500"
                placeholderTextColor={Paleta.textoSuave}
                keyboardType="number-pad"
                value={kilometraje}
                onChangeText={(texto) =>
                  setKilometraje(texto.replace(/[^0-9]/g, ''))
                }
                maxLength={8}
              />
            </View>

            <View style={styles.mitad}>
              <Text style={styles.etiqueta}>Costo</Text>

              <TextInput
                style={styles.input}
                placeholder="Ej: 180000"
                placeholderTextColor={Paleta.textoSuave}
                keyboardType="number-pad"
                value={costo}
                onChangeText={(texto) =>
                  setCosto(texto.replace(/[^0-9]/g, ''))
                }
                maxLength={10}
              />
            </View>
          </View>

          {/* VISTA PREVIA DEL COSTO */}

          {costo.trim() !== '' && !Number.isNaN(Number(costo)) && (
            <Text style={styles.vistaPrevia}>
              {formatoDinero(Number(costo.replace(/[^0-9]/g, '') || '0'))}
              {fecha && esFechaISOValida(fecha)
                ? ` el ${formatoFecha(fecha)}`
                : ''}
            </Text>
          )}
        </View>

        {/* =================================================
            SECCIÓN 3: DETALLES
            ================================================= */}

        <View style={styles.tarjeta}>
          <Text style={styles.seccionTitulo}>Detalles</Text>

          <Text style={styles.etiqueta}>Descripción *</Text>

          <TextInput
            style={styles.input}
            placeholder="Ej: Cambio de aceite y filtros"
            placeholderTextColor={Paleta.textoSuave}
            value={descripcion}
            onChangeText={setDescripcion}
            maxLength={80}
          />

          <Text style={styles.etiqueta}>Taller</Text>

          <TextInput
            style={styles.input}
            placeholder="Ej: Mecánica El Rapido"
            placeholderTextColor={Paleta.textoSuave}
            value={taller}
            onChangeText={setTaller}
            maxLength={60}
          />

          <Text style={styles.etiqueta}>Observaciones</Text>

          <TextInput
            style={[styles.input, styles.inputArea]}
            placeholder="Ej: Se recomienda revisar las pastillas en el próximo cambio"
            placeholderTextColor={Paleta.textoSuave}
            value={observaciones}
            onChangeText={setObservaciones}
            multiline
            maxLength={200}
          />
        </View>

        {/* =================================================
            BOTÓN GUARDAR
            ================================================= */}

        <BotonNitro
          titulo={
            modo === 'editar' ? 'Guardar cambios' : 'Registrar mantenimiento'
          }
          icono="checkmark-circle"
          cargando={guardando}
          anchoCompleto
          onPress={guardar}
          accessibilityLabel={
            modo === 'editar' ? 'Guardar cambios' : 'Registrar mantenimiento'
          }
          style={styles.botonGuardar}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/*
=======================================================
ESTILOS
=======================================================
*/

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: Paleta.fondo,
  },

  scroll: {
    padding: 16,
    paddingBottom: 40,
  },

  tarjeta: {
    backgroundColor: Paleta.tarjeta,
    borderRadius: Radios.tarjeta,
    padding: 16,
    marginBottom: 14,
    ...Sombras.tarjeta,
  },

  seccionTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: Paleta.texto,
    marginBottom: 12,
  },

  etiqueta: {
    fontSize: 13,
    fontWeight: '600',
    color: Paleta.textoSecundario,
    marginBottom: 6,
    marginTop: 4,
  },

  input: {
    height: 50,
    backgroundColor: Paleta.fondo,
    borderWidth: 1,
    borderColor: Paleta.borde,
    borderRadius: Radios.suave,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Paleta.texto,
    marginBottom: 6,
  },

  inputArea: {
    height: 90,
    paddingTop: 12,
    textAlignVertical: 'top',
  },

  fila: {
    flexDirection: 'row',
    gap: 12,
  },

  mitad: {
    flex: 1,
  },

  vistaPrevia: {
    fontSize: 13,
    fontWeight: '700',
    color: Paleta.primario,
    marginTop: 4,
  },

  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: Radios.pastilla,
    borderWidth: 1,
    borderColor: Paleta.borde,
    backgroundColor: Paleta.fondo,
  },

  chipActivo: {
    backgroundColor: Paleta.primario,
    borderColor: Paleta.primario,
  },

  chipTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: Paleta.textoSecundario,
  },

  chipTextoActivo: {
    color: '#FFFFFF',
  },

  botonGuardar: {
    marginTop: 8,
    marginBottom: 18,
  },

  avisoContenedor: {
    flex: 1,
    backgroundColor: Paleta.fondo,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  avisoTitulo: {
    fontSize: 20,
    fontWeight: '800',
    color: Paleta.texto,
    marginBottom: 8,
    textAlign: 'center',
    marginTop: 12,
  },

  avisoTexto: {
    fontSize: 14,
    color: Paleta.textoSecundario,
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 8,
  },

  avisoBoton: {
    backgroundColor: Paleta.primario,
    borderRadius: Radios.suave,
    paddingHorizontal: 26,
    paddingVertical: 13,
  },

  avisoBotonTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
