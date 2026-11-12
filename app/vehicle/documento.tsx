/*
=======================================================
NITRO SYNC - FORMULARIO DE DOCUMENTO
=======================================================

Sirve para DOS tareas:

  /vehicle/documento?vehiculoId=X               -> crear
  /vehicle/documento?vehiculoId=X&documentoId=Y  -> editar

Documentos disponibles (types/models.ts):
  SOAT, Tecnomecanica, Seguro, Licencia, Otro

Los datos se guardan en la subcolección:

  usuarios/{uid}/vehiculos/{vehiculoId}/documentos

El ESTADO no se guarda: se calcula en vivo con
calcularEstado(vencimiento) y se muestra en la vista
previa (Vigente / Proximo a vencer / Vencido).

Las fechas se escriben en formato "AAAA-MM-DD"
(se validan antes de guardar).

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
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import {
  ColoresEstado,
  Paleta,
  Radios,
  Sombras,
} from '@/constants/theme';

import BotonNitro from '@/components/ui/boton-nitro';
import { useAlerta } from '@/components/ui/confirm-dialog';
import SelectorFecha from '@/components/ui/selector-fecha';

import { useAuth } from '@/context/AuthContext';

import { useDocumentos } from '@/hooks/use-documentos';

import {
  crearDocumento,
  actualizarDocumento,
} from '@/services/documentos';

import { sincronizarNotificacionesVehiculo } from '@/services/notificationService';

import type { TipoDocumento } from '@/types/models';

import {
  ICONO_DOCUMENTO,
  NOMBRES_DOCUMENTO,
  formatoFecha,
  textoDiasVencimiento,
} from '@/utils/formato';

import { calcularEstado, diasRestantes, esFechaISOValida, hoyISO } from '@/utils/fechas';

/* -------------------------------------------------------
   OPCIONES DE TIPO
   ------------------------------------------------------- */

const TIPOS: TipoDocumento[] = [
  'SOAT',
  'Tecnomecanica',
  'Seguro',
  'Licencia',
  'Otro',
];

/* -------------------------------------------------------
   AYUDA PROPIA DE CADA TIPO DE DOCUMENTO

   Antes todos los tipos mostraban el mismo formulario y
   la misma ayuda. Ahora cada uno explica qué es, cómo
   llenar el número y cuánto suele durar. Así, al tocar
   "SOAT" la información es distinta a "Técnico-mecánica".
   ------------------------------------------------------- */

interface InfoTipo {
  /** Explicación corta del documento. */
  ayuda: string;

  /** Nombre sugerido (placeholder del campo). */
  nombrePlaceholder: string;

  /** Número sugerido (placeholder del campo). */
  numeroPlaceholder: string;

  /** Ayuda del campo número. */
  numeroAyuda: string;

  /** Vigencia típica en meses (null = sin sugerencia). */
  mesesVigencia: number | null;

  /** Etiqueta del campo número para este tipo. */
  numeroEtiqueta: string;
}

const INFO_POR_TIPO: Record<TipoDocumento, InfoTipo> = {
  SOAT: {
    ayuda:
      'El SOAT cubre accidentes de tránsito. Escribe la aseguradora y el año del seguro.',
    nombrePlaceholder: 'Ej: SOAT 2026 - Seguros del Estado',
    numeroEtiqueta: 'Número del SOAT',
    numeroPlaceholder: 'Ej: 123456789',
    numeroAyuda: 'Aparece en el certificado del SOAT.',
    mesesVigencia: 12,
  },

  Tecnomecanica: {
    ayuda:
      'Revisión técnico-mecánica y de emisiones. Debe renovarse cada año.',
    nombrePlaceholder: 'Ej: Tecnomecánica 2026 - CDAS',
    numeroEtiqueta: 'Número del certificado',
    numeroPlaceholder: 'Ej: RTM-458712',
    numeroAyuda: 'Aparece en el certificado de la revisión.',
    mesesVigencia: 12,
  },

  Seguro: {
    ayuda:
      'Póliza de seguro (todo riesgo, responsabilidad civil o adicional).',
    nombrePlaceholder: 'Ej: Seguro todo riesgo - SURA',
    numeroEtiqueta: 'Número de la póliza',
    numeroPlaceholder: 'Ej: POL-998877',
    numeroAyuda: 'Aparece en la carátula de la póliza.',
    mesesVigencia: 12,
  },

  Licencia: {
    ayuda:
      'Licencia de conducción del propietario o de quien maneja el vehículo.',
    nombrePlaceholder: 'Ej: Licencia de conducción C1',
    numeroEtiqueta: 'Número de la licencia',
    numeroPlaceholder: 'Ej: 1020304050',
    numeroAyuda: 'Número que aparece en la licencia.',
    mesesVigencia: null,
  },

  Otro: {
    ayuda: 'Cualquier otro documento importante para el vehículo.',
    nombrePlaceholder: 'Ej: Permiso de circulación',
    numeroEtiqueta: 'Número o referencia',
    numeroPlaceholder: 'Ej: 000123',
    numeroAyuda: 'Opcional: deja el campo vacío si no tiene número.',
    mesesVigencia: null,
  },
};

/* Suma meses a una fecha ISO (para sugerir el vencimiento). */
function sumarMeses(fechaISO: string, meses: number): string {
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);

  fecha.setMonth(fecha.getMonth() + meses);

  const nuevoMes = String(fecha.getMonth() + 1).padStart(2, '0');
  const nuevoDia = String(fecha.getDate()).padStart(2, '0');

  return `${fecha.getFullYear()}-${nuevoMes}-${nuevoDia}`;
}

export default function FormularioDocumentoScreen() {
  const { vehiculoId, documentoId } = useLocalSearchParams<{
    vehiculoId?: string;
    documentoId?: string;
  }>();

  const { user } = useAuth();
  const alerta = useAlerta();

  const { documentos, cargando } = useDocumentos(vehiculoId);

  const modo: 'crear' | 'editar' = documentoId ? 'editar' : 'crear';

  /* -------------------------------------------------
     ESTADOS DEL FORMULARIO
     ------------------------------------------------- */

  const [tipo, setTipo] = useState<TipoDocumento>('SOAT');
  const [descripcion, setDescripcion] = useState('');
  const [numero, setNumero] = useState('');
  const [expedicion, setExpedicion] = useState(hoyISO());
  const [vencimiento, setVencimiento] = useState('');

  const [guardando, setGuardando] = useState(false);

  /* -------------------------------------------------
     PRELLENADO EN MODO EDICIÓN

     Se hace una sola vez, cuando el documento llega
     desde Firestore (el primer render aún está vacío).
     ------------------------------------------------- */

  const prellenado = useRef(false);

  const documentoOriginal = documentoId
    ? documentos.find((documento) => documento.id === documentoId)
    : undefined;

  useEffect(() => {
    if (documentoOriginal && !prellenado.current) {
      prellenado.current = true;

      setTipo(documentoOriginal.tipo);
      setDescripcion(documentoOriginal.descripcion);
      setNumero(documentoOriginal.numero);
      setExpedicion(documentoOriginal.expedicion);
      setVencimiento(documentoOriginal.vencimiento);
    }
  }, [documentoOriginal]);

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

  if (modo === 'editar' && cargando && !documentoOriginal) {
    return (
      <View style={styles.avisoContenedor}>
        <ActivityIndicator size="large" color={Paleta.primario} />

        <Text style={styles.avisoTexto}>Cargando documento...</Text>
      </View>
    );
  }

  if (modo === 'editar' && !cargando && !documentoOriginal) {
    return (
      <View style={styles.avisoContenedor}>
        <Text style={styles.avisoTitulo}>Documento no encontrado</Text>

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
     VISTA PREVIA DEL ESTADO (calculado en vivo)
     ------------------------------------------------- */

  const vencimientoValido = esFechaISOValida(vencimiento);
  const estadoPrevio = vencimientoValido
    ? calcularEstado(vencimiento)
    : null;
  const diasPrevios = vencimientoValido ? diasRestantes(vencimiento) : 0;

  /* Ayuda y textos propios del tipo de documento elegido. */
  const info = INFO_POR_TIPO[tipo];

  /* -------------------------------------------------
     VALIDACIÓN
     ------------------------------------------------- */

  const validar = async (): Promise<boolean> => {
    if (!descripcion.trim()) {
      await alerta({
        titulo: 'Falta la descripción',
        mensaje: 'Escribe un nombre corto: ej. "SOAT 2026" o "Seguros SURA".',
        tipo: 'advertencia',
      });
      return false;
    }

    if (!esFechaISOValida(expedicion)) {
      await alerta({
        titulo: 'Fecha de expedición inválida',
        mensaje: 'Elige la fecha de expedición con el calendario.',
        tipo: 'advertencia',
      });
      return false;
    }

    if (!esFechaISOValida(vencimiento)) {
      await alerta({
        titulo: 'Fecha de vencimiento inválida',
        mensaje: 'Elige la fecha de vencimiento con el calendario.',
        tipo: 'advertencia',
      });
      return false;
    }

    if (vencimiento < expedicion) {
      await alerta({
        titulo: 'Fechas inconsistentes',
        mensaje: 'El vencimiento no puede ser anterior a la expedición.',
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
      descripcion: descripcion.trim(),
      numero: numero.trim(),
      expedicion,
      vencimiento,
    };

    try {
      setGuardando(true);

      if (modo === 'editar' && documentoId) {
        await actualizarDocumento(user.uid, vehiculoId, documentoId, datos);
      } else {
        await crearDocumento(user.uid, vehiculoId, datos);
      }

      /* Reprograma los avisos de vencimiento de este vehículo. */
      await sincronizarNotificacionesVehiculo(user.uid, vehiculoId);

      await alerta({
        titulo:
          modo === 'editar' ? 'Documento actualizado' : 'Documento registrado',
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
          title: modo === 'editar' ? 'Editar documento' : 'Nuevo documento',
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={true} persistentScrollbar
        keyboardShouldPersistTaps="handled"
      >
        {/* =================================================
            SECCIÓN 1: TIPO DE DOCUMENTO
            ================================================= */}

        <View style={styles.tarjeta}>
          <Text style={styles.seccionTitulo}>Tipo de documento</Text>

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
                    style={[styles.chipTexto, activo && styles.chipTextoActivo]}
                  >
                    {ICONO_DOCUMENTO[opcion]} {NOMBRES_DOCUMENTO[opcion]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* =================================================
            SECCIÓN 2: INFORMACIÓN
            ================================================= */}

        <View style={styles.tarjeta}>
          <Text style={styles.seccionTitulo}>Información</Text>

          {/* AYUDA PROPIA DEL TIPO ELEGIDO */}

          <View style={styles.infoTipo}>
            <Text style={styles.infoTipoIcono}>{ICONO_DOCUMENTO[tipo]}</Text>

            <Text style={styles.infoTipoTexto}>{info.ayuda}</Text>
          </View>

          <Text style={styles.etiqueta}>Nombre o entidad *</Text>

          <TextInput
            style={styles.input}
            placeholder={info.nombrePlaceholder}
            placeholderTextColor={Paleta.textoSuave}
            value={descripcion}
            onChangeText={setDescripcion}
            maxLength={60}
          />

          <Text style={styles.etiqueta}>{info.numeroEtiqueta}</Text>

          <TextInput
            style={styles.input}
            placeholder={info.numeroPlaceholder}
            placeholderTextColor={Paleta.textoSuave}
            autoCapitalize="characters"
            value={numero}
            onChangeText={setNumero}
            maxLength={30}
          />

          <Text style={styles.ayuda}>{info.numeroAyuda}</Text>
        </View>

        {/* =================================================
            SECCIÓN 3: FECHAS
            ================================================= */}

        <View style={styles.tarjeta}>
          <Text style={styles.seccionTitulo}>Fechas</Text>

          <SelectorFecha
            etiqueta="Fecha de expedición *"
            valor={expedicion}
            onChange={setExpedicion}
            maximo={hoyISO()}
            placeholder="Elegir fecha de expedición"
          />

          <View style={styles.espacio} />

          <SelectorFecha
            etiqueta="Fecha de vencimiento *"
            valor={vencimiento}
            onChange={setVencimiento}
            minimo={expedicion}
            placeholder="Elegir fecha de vencimiento"
            ayuda={
              info.mesesVigencia
                ? `Este tipo de documento suele durar ${info.mesesVigencia} meses.`
                : undefined
            }
          />

          {info.mesesVigencia ? (
            <TouchableOpacity
              style={styles.botonVigencia}
              onPress={() => {
                if (esFechaISOValida(expedicion)) {
                  setVencimiento(sumarMeses(expedicion, info.mesesVigencia!));
                }
              }}
              accessibilityRole="button"
              accessibilityLabel="Completar el vencimiento según la vigencia típica"
            >
              <Ionicons name="flash-outline" size={16} color={Paleta.primario} />

              <Text style={styles.botonVigenciaTexto}>
                Completar {info.mesesVigencia} meses desde la expedición
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* VISTA PREVIA DEL ESTADO (calculado) */}

          {estadoPrevio && (
            <View
              style={[
                styles.previewEstado,
                { backgroundColor: ColoresEstado[estadoPrevio].fondo },
              ]}
            >
              <Text
                style={[
                  styles.previewEstadoTitulo,
                  { color: ColoresEstado[estadoPrevio].texto },
                ]}
              >
                {estadoPrevio}
              </Text>

              <Text
                style={[
                  styles.previewEstadoTexto,
                  { color: ColoresEstado[estadoPrevio].texto },
                ]}
              >
                {textoDiasVencimiento(diasPrevios)} · vence el{' '}
                {formatoFecha(vencimiento)}
              </Text>
            </View>
          )}
        </View>

        {/* =================================================
            BOTÓN GUARDAR
            ================================================= */}

        <BotonNitro
          titulo={modo === 'editar' ? 'Guardar cambios' : 'Registrar documento'}
          icono="checkmark-circle"
          cargando={guardando}
          anchoCompleto
          onPress={guardar}
          accessibilityLabel={
            modo === 'editar' ? 'Guardar cambios' : 'Registrar documento'
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

  /* -----------------------------
     AYUDAS Y VIGENCIA
     ----------------------------- */

  ayuda: {
    fontSize: 12,
    color: Paleta.textoSuave,
    marginTop: 2,
    marginBottom: 4,
    lineHeight: 17,
  },

  espacio: {
    height: 16,
  },

  infoTipo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Paleta.primarioClaro,
    borderRadius: Radios.suave,
    padding: 12,
    marginBottom: 12,
  },

  infoTipoIcono: {
    fontSize: 18,
  },

  infoTipoTexto: {
    flex: 1,
    fontSize: 13,
    color: Paleta.primarioOscuro,
    fontWeight: '600',
    lineHeight: 18,
  },

  botonVigencia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Paleta.primarioClaro,
    borderRadius: Radios.pastilla,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
    alignSelf: 'flex-start',
  },

  botonVigenciaTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: Paleta.primario,
  },

  /* -----------------------------
     CHIPS DE TIPO
     ----------------------------- */

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

  /* -----------------------------
     VISTA PREVIA DE ESTADO
     ----------------------------- */

  previewEstado: {
    borderRadius: Radios.suave,
    padding: 12,
    marginTop: 8,
  },

  previewEstadoTitulo: {
    fontSize: 14,
    fontWeight: '800',
  },

  previewEstadoTexto: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },

  /* -----------------------------
     BOTÓN GUARDAR
     ----------------------------- */

  botonGuardar: {
    marginTop: 8,
    marginBottom: 18,
  },

  /* -----------------------------
     AVISOS
     ----------------------------- */

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
