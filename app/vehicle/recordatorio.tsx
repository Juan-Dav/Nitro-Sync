/*
=======================================================
NITRO SYNC - FORMULARIO DE RECORDATORIO
=======================================================

  /vehicle/recordatorio?vehiculoId=X                  -> crear
  /vehicle/recordatorio?vehiculoId=X&recordatorioId=Y  -> editar

Se guarda en:

  usuarios/{uid}/vehiculos/{vehiculoId}/recordatorios

Antes los recordatorios eran locales (se perdían al
cerrar la app); ahora son persistentes en Firestore.

Estados: Pendiente, Proximo, Vencido, Completado.

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

import {
  ColoresRecordatorio,
  Paleta,
  Radios,
  Sombras,
} from '@/constants/theme';

import BotonNitro from '@/components/ui/boton-nitro';
import { useAlerta } from '@/components/ui/confirm-dialog';
import SelectorFecha from '@/components/ui/selector-fecha';

import { useAuth } from '@/context/AuthContext';

import { useRegistrosVehiculo } from '@/hooks/use-registros-vehiculo';

import {
  actualizarRecordatorio,
  crearRecordatorio,
} from '@/services/recordatorios';

import { sincronizarNotificacionesVehiculo } from '@/services/notificationService';

import type { EstadoRecordatorio, Recordatorio } from '@/types/models';

import { formatoFecha, textoDiasVencimiento } from '@/utils/formato';

import { diasRestantes, esFechaISOValida, hoyISO } from '@/utils/fechas';

/* -------------------------------------------------------
   OPCIONES DE ESTADO
   ------------------------------------------------------- */

const ESTADOS: EstadoRecordatorio[] = [
  'Pendiente',
  'Proximo',
  'Vencido',
  'Completado',
];

const ANIO_ACTUAL = new Date().getFullYear();

export default function FormularioRecordatorioScreen() {
  const { vehiculoId, recordatorioId } = useLocalSearchParams<{
    vehiculoId?: string;
    recordatorioId?: string;
  }>();

  const { user } = useAuth();
  const alerta = useAlerta();

  const { registros, cargando } = useRegistrosVehiculo<Recordatorio>(
    'recordatorios',
    vehiculoId,
    'fecha',
    'asc'
  );

  const modo: 'crear' | 'editar' = recordatorioId ? 'editar' : 'crear';

  /* -------------------------------------------------
     ESTADOS DEL FORMULARIO
     ------------------------------------------------- */

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(hoyISO());
  const [estado, setEstado] = useState<EstadoRecordatorio>('Pendiente');

  const [guardando, setGuardando] = useState(false);

  /* -------------------------------------------------
     PRELLENADO EN MODO EDICIÓN (una sola vez)
     ------------------------------------------------- */

  const prellenado = useRef(false);

  const registroOriginal = recordatorioId
    ? registros.find((registro) => registro.id === recordatorioId)
    : undefined;

  useEffect(() => {
    if (registroOriginal && !prellenado.current) {
      prellenado.current = true;

      setTitulo(registroOriginal.titulo);
      setDescripcion(registroOriginal.descripcion);
      setFecha(registroOriginal.fecha);
      setEstado(registroOriginal.estado);
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

        <Text style={styles.avisoTexto}>Cargando recordatorio...</Text>
      </View>
    );
  }

  if (modo === 'editar' && !cargando && !registroOriginal) {
    return (
      <View style={styles.avisoContenedor}>
        <Text style={styles.avisoTitulo}>Recordatorio no encontrado</Text>

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
     VISTA PREVIA DEL ESTADO
     ------------------------------------------------- */

  const fechaValida = esFechaISOValida(fecha);
  const colores = ColoresRecordatorio[estado];

  /* -------------------------------------------------
     VALIDACIÓN
     ------------------------------------------------- */

  const validar = async (): Promise<boolean> => {
    if (!titulo.trim()) {
      await alerta({
        titulo: 'Falta el título',
        mensaje: 'Escribe el recordatorio (ej: "Lavado general").',
        tipo: 'advertencia',
      });
      return false;
    }

    if (!fecha.trim() || !esFechaISOValida(fecha)) {
      await alerta({
        titulo: 'Fecha inválida',
        mensaje: 'Elige la fecha del recordatorio con el calendario.',
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
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      fecha,
      estado,
    };

    try {
      setGuardando(true);

      if (modo === 'editar' && recordatorioId) {
        await actualizarRecordatorio(
          user.uid,
          vehiculoId,
          recordatorioId,
          datos
        );
      } else {
        await crearRecordatorio(user.uid, vehiculoId, datos);
      }

      /* Reprograma los recordatorios de este vehículo. */
      await sincronizarNotificacionesVehiculo(user.uid, vehiculoId);

      await alerta({
        titulo:
          modo === 'editar'
            ? 'Recordatorio actualizado'
            : 'Recordatorio creado',
        mensaje: 'Se guardó en Firestore y aparecerá en tu lista.',
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
          title: modo === 'editar' ? 'Editar recordatorio' : 'Nuevo recordatorio',
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={true} persistentScrollbar
        keyboardShouldPersistTaps="handled"
      >
        {/* =================================================
            SECCIÓN 1: RECORDATORIO
            ================================================= */}

        <View style={styles.tarjeta}>
          <Text style={styles.seccionTitulo}>Recordatorio</Text>

          <Text style={styles.etiqueta}>Título *</Text>

          <TextInput
            style={styles.input}
            placeholder="Ej: Lavado general"
            placeholderTextColor={Paleta.textoSuave}
            value={titulo}
            onChangeText={setTitulo}
            maxLength={60}
          />

          <Text style={styles.etiqueta}>Descripción</Text>

          <TextInput
            style={styles.input}
            placeholder="Ej: Lavar y encerar el carro"
            placeholderTextColor={Paleta.textoSuave}
            value={descripcion}
            onChangeText={setDescripcion}
            maxLength={140}
          />
        </View>

        {/* =================================================
            SECCIÓN 2: FECHA Y ESTADO
            ================================================= */}

        <View style={styles.tarjeta}>
          <Text style={styles.seccionTitulo}>Fecha y estado</Text>

          <SelectorFecha
            etiqueta="Fecha *"
            valor={fecha}
            onChange={setFecha}
            placeholder="Elegir la fecha del recordatorio"
            ayuda="Se te avisará 30, 15, 7 y 1 día antes, incluso con la pantalla bloqueada."
          />

          <Text style={styles.etiqueta}>Estado</Text>

          <View style={styles.chips}>
            {ESTADOS.map((opcion) => {
              const activo = estado === opcion;

              return (
                <Pressable
                  key={opcion}
                  style={[
                    styles.chip,
                    activo && {
                      backgroundColor: ColoresRecordatorio[opcion].texto,
                      borderColor: ColoresRecordatorio[opcion].texto,
                    },
                  ]}
                  onPress={() => setEstado(opcion)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: activo }}
                >
                  <Text
                    style={[styles.chipTexto, activo && styles.chipTextoActivo]}
                  >
                    {opcion}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* VISTA PREVIA */}

          {fechaValida && (
            <View
              style={[styles.preview, { backgroundColor: colores.fondo }]}
            >
              <Text style={[styles.previewTitulo, { color: colores.texto }]}>
                {estado} · {formatoFecha(fecha)}
              </Text>

              <Text style={[styles.previewTexto, { color: colores.texto }]}>
                {textoDiasVencimiento(diasRestantes(fecha))}
              </Text>
            </View>
          )}
        </View>

        {/* =================================================
            BOTÓN GUARDAR
            ================================================= */}

        <BotonNitro
          titulo={modo === 'editar' ? 'Guardar cambios' : 'Crear recordatorio'}
          icono="checkmark-circle"
          cargando={guardando}
          anchoCompleto
          onPress={guardar}
          accessibilityLabel={
            modo === 'editar' ? 'Guardar cambios' : 'Crear recordatorio'
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

  preview: {
    borderRadius: Radios.suave,
    padding: 12,
    marginTop: 10,
  },

  previewTitulo: {
    fontSize: 14,
    fontWeight: '800',
  },

  previewTexto: {
    fontSize: 12,
    marginTop: 2,
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
