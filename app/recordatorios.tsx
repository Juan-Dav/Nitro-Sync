/*
=======================================================
NITRO SYNC - RECORDATORIOS GUARDADOS
=======================================================

Pantalla que muestra TODOS los recordatorios guardados de
todos los vehículos, con:

  - la fecha del recordatorio y cuánto falta (o cuánto
    tiempo pasó),
  - su estado (Pendiente / Próximo / Vencido / Completado),
  - CUÁNDO SE ENVIAN LAS NOTIFICACIONES: 30, 15, 7 y
    1 día antes de la fecha elegida.

Antes el botón "Recordatorios" de Inicio mandaba a los
ajustes del sistema; ahora abre esta lista.

Para agregar un recordatorio se elige primero el vehículo
(al tocar su nombre se abre el formulario).

=======================================================
*/

import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';

import { ColoresRecordatorio, Gradientes, Paleta, Radios, Sombras } from '@/constants/theme';

import { useVehiculos } from '@/context/VehiculosContext';

import { useRecordatoriosDeVehiculos } from '@/hooks/use-recordatorios';

import type { EstadoRecordatorio } from '@/types/models';

import { diasRestantes as calcularDias } from '@/utils/fechas';
import { formatoFecha, textoDiasVencimiento } from '@/utils/formato';

/* Avisos enviados antes del recordatorio (ver notificationService). */
const DIAS_AVISO = [30, 15, 7, 1];

/* -------------------------------------------------------
   CÁLCULOS DE FECHA
   ------------------------------------------------------- */

function restarDias(fechaISO: string, dias: number): string | null {
  const partes = fechaISO.split('-');

  if (partes.length !== 3) {
    return null;
  }

  const fecha = new Date(
    Number(partes[0]),
    Number(partes[1]) - 1,
    Number(partes[2])
  );

  fecha.setDate(fecha.getDate() - dias);

  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');

  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/* Lista de fechas en las que se avisará (solo las futuras). */
function avisosProgramados(
  fechaISO: string,
  estado: EstadoRecordatorio
): string[] {
  if (estado === 'Completado') {
    return [];
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const fechas: string[] = [];

  for (const dias of DIAS_AVISO) {
    const aviso = restarDias(fechaISO, dias);

    if (!aviso) {
      continue;
    }

    const partes = aviso.split('-');
    const fechaAviso = new Date(
      Number(partes[0]),
      Number(partes[1]) - 1,
      Number(partes[2])
    );

    if (fechaAviso >= hoy) {
      fechas.push(aviso);
    }
  }

  return fechas;
}

/* -------------------------------------------------------
   PANTALLA
   ------------------------------------------------------- */

export default function RecordatoriosScreen() {
  const { vehiculos, cargando: cargandoVehiculos } = useVehiculos();

  const { recordatorios, cargando, error } =
    useRecordatoriosDeVehiculos(vehiculos);

  const nuevoRecordatorio = (vehiculoId: string) => {
    router.push(`/vehicle/recordatorio?vehiculoId=${vehiculoId}`);
  };

  const editarRecordatorio = (vehiculoId: string, recordatorioId: string) => {
    router.push(
      `/vehicle/recordatorio?vehiculoId=${vehiculoId}&recordatorioId=${recordatorioId}`
    );
  };

  const cargandoTotal = cargando || cargandoVehiculos;

  return (
    <View style={styles.contenedor}>
      <Stack.Screen options={{ title: 'Recordatorios' }} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={true}
        persistentScrollbar
      >
        {/* =================================================
            ENCABEZADO
            ================================================= */}

        <LinearGradient
          colors={Gradientes.marca}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroTitulo}>Tus recordatorios</Text>

          <Text style={styles.heroTexto}>
            Cada aviso se envía 30, 15, 7 y 1 día antes de la fecha, incluso
            con la pantalla bloqueada.
          </Text>
        </LinearGradient>

        {/* =================================================
            ERROR
            ================================================= */}

        {error && (
          <View style={styles.errorTarjeta}>
            <Ionicons name="cloud-offline-outline" size={20} color="#B91C1C" />

            <Text style={styles.errorTexto}>{error}</Text>
          </View>
        )}

        {/* =================================================
            NUEVO RECORDATORIO (elegir vehículo)
            ================================================= */}

        <Text style={styles.seccionTitulo}>Nuevo recordatorio</Text>

        {vehiculos.length === 0 && !cargandoTotal ? (
          <View style={styles.vacioTarjeta}>
            <Text style={styles.vacioIcono}>🚗</Text>

            <Text style={styles.vacioTitulo}>Aún no tienes vehículos</Text>

            <Text style={styles.vacioTexto}>
              Registra un vehículo para poder crear sus recordatorios.
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/vehicle/formulario')}
              style={styles.botonPrimario}
              accessibilityRole="button"
              accessibilityLabel="Registrar vehículo"
            >
              <Ionicons name="add-circle" size={18} color="#FFFFFF" />

              <Text style={styles.botonPrimarioTexto}>Registrar vehículo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listaVehiculos}
          >
            {vehiculos.map((vehiculo) => (
              <TouchableOpacity
                key={vehiculo.id}
                activeOpacity={0.85}
                onPress={() => nuevoRecordatorio(vehiculo.id)}
                style={styles.chipVehiculo}
                accessibilityRole="button"
                accessibilityLabel={`Nuevo recordatorio para ${vehiculo.nombre}`}
              >
                <Ionicons name="notifications-outline" size={16} color={Paleta.primario} />

                <Text style={styles.chipVehiculoTexto} numberOfLines={1}>
                  {vehiculo.nombre}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* =================================================
            LISTA
            ================================================= */}

        <Text style={styles.seccionTitulo}>Recordatorios guardados</Text>

        {cargandoTotal && (
          <View style={styles.cargandoTarjeta}>
            <ActivityIndicator size="large" color={Paleta.primario} />

            <Text style={styles.cargandoTexto}>Cargando recordatorios...</Text>
          </View>
        )}

        {!cargandoTotal && recordatorios.length === 0 && (
          <View style={styles.vacioTarjeta}>
            <Text style={styles.vacioIcono}>🔔</Text>

            <Text style={styles.vacioTitulo}>No hay recordatorios</Text>

            <Text style={styles.vacioTexto}>
              Toca uno de los vehículos de arriba para crear el primero.
            </Text>
          </View>
        )}

        {recordatorios.map((recordatorio) => {
          const dias = calcularDias(recordatorio.fecha);
          const colores = ColoresRecordatorio[recordatorio.estado];
          const avisos = avisosProgramados(
            recordatorio.fecha,
            recordatorio.estado
          );

          return (
            <TouchableOpacity
              key={`${recordatorio.vehiculoId}-${recordatorio.id}`}
              activeOpacity={0.85}
              onPress={() =>
                editarRecordatorio(recordatorio.vehiculoId, recordatorio.id)
              }
              style={styles.tarjeta}
              accessibilityRole="button"
              accessibilityLabel={`Editar recordatorio ${recordatorio.titulo}`}
            >
              <View style={styles.tarjetaFila}>
                <View style={styles.icono}>
                  <Text style={styles.iconoTexto}>🔔</Text>
                </View>

                <View style={styles.tarjetaInfo}>
                  <Text style={styles.tarjetaTitulo} numberOfLines={1}>
                    {recordatorio.titulo}
                  </Text>

                  <Text style={styles.tarjetaVehiculo} numberOfLines={1}>
                    {recordatorio.nombreVehiculo}
                  </Text>
                </View>

                <View
                  style={[
                    styles.pastilla,
                    {
                      backgroundColor: colores.fondo,
                      borderColor: colores.borde,
                    },
                  ]}
                >
                  <Text style={[styles.pastillaTexto, { color: colores.texto }]}>
                    {recordatorio.estado}
                  </Text>
                </View>
              </View>

              {recordatorio.descripcion ? (
                <Text style={styles.tarjetaDescripcion} numberOfLines={2}>
                  {recordatorio.descripcion}
                </Text>
              ) : null}

              <View style={styles.lineaFecha}>
                <Ionicons name="calendar-outline" size={14} color={Paleta.primario} />

                <Text style={styles.textoFecha}>
                  {formatoFecha(recordatorio.fecha)}
                </Text>

                {recordatorio.estado !== 'Completado' && (
                  <Text
                    style={[
                      styles.textoDias,
                      dias < 0 && { color: Paleta.peligro },
                    ]}
                  >
                    · {textoDiasVencimiento(dias)}
                  </Text>
                )}
              </View>

              {/* CUÁNDO SE AVISARÁ */}

              {avisos.length > 0 ? (
                <View style={styles.avisos}>
                  <Ionicons name="alarm-outline" size={14} color={Paleta.textoSuave} />

                  <Text style={styles.avisosTexto}>
                    Avisos: {avisos.map((aviso) => formatoFecha(aviso)).join(' · ')}
                  </Text>
                </View>
              ) : (
                <View style={styles.avisos}>
                  <Ionicons name="checkmark-done-outline" size={14} color={Paleta.exito} />

                  <Text style={[styles.avisosTexto, { color: Paleta.exito }]}>
                    Sin avisos pendientes
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

/* -------------------------------------------------------
   ESTILOS
   ------------------------------------------------------- */

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: Paleta.fondo,
  },

  scroll: {
    padding: 16,
    paddingBottom: 40,
  },

  hero: {
    borderRadius: Radios.grande,
    padding: 18,
    marginBottom: 8,
  },

  heroTitulo: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  heroTexto: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 6,
    lineHeight: 18,
  },

  seccionTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: Paleta.texto,
    marginTop: 18,
    marginBottom: 10,
  },

  /* -----------------------------
     CHIPS DE VEHÍCULOS
     ----------------------------- */

  listaVehiculos: {
    gap: 10,
    paddingVertical: 2,
  },

  chipVehiculo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Paleta.tarjeta,
    borderWidth: 1,
    borderColor: Paleta.primario,
    borderRadius: Radios.pastilla,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...Sombras.suave,
  },

  chipVehiculoTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: Paleta.primario,
    maxWidth: 160,
  },

  /* -----------------------------
     TARJETA DE RECORDATORIO
     ----------------------------- */

  tarjeta: {
    backgroundColor: Paleta.tarjeta,
    borderRadius: Radios.tarjeta,
    borderWidth: 1,
    borderColor: '#EEF1F9',
    padding: 14,
    marginBottom: 12,
    ...Sombras.tarjeta,
  },

  tarjetaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  icono: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Paleta.primarioClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconoTexto: {
    fontSize: 18,
  },

  tarjetaInfo: {
    flex: 1,
  },

  tarjetaTitulo: {
    fontSize: 15,
    fontWeight: '800',
    color: Paleta.texto,
  },

  tarjetaVehiculo: {
    fontSize: 12,
    color: Paleta.textoSecundario,
    marginTop: 2,
  },

  pastilla: {
    borderRadius: Radios.pastilla,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  pastillaTexto: {
    fontSize: 11,
    fontWeight: '800',
  },

  tarjetaDescripcion: {
    fontSize: 13,
    color: Paleta.textoSecundario,
    marginTop: 8,
    lineHeight: 18,
  },

  lineaFecha: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 10,
  },

  textoFecha: {
    fontSize: 13,
    fontWeight: '700',
    color: Paleta.texto,
  },

  textoDias: {
    fontSize: 13,
    color: Paleta.textoSecundario,
    fontWeight: '600',
  },

  avisos: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  avisosTexto: {
    flex: 1,
    fontSize: 12,
    color: Paleta.textoSuave,
    lineHeight: 17,
  },

  /* -----------------------------
     ESTADOS
     ----------------------------- */

  cargandoTarjeta: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Paleta.tarjeta,
    borderRadius: Radios.tarjeta,
    borderWidth: 1,
    borderColor: '#EEF1F9',
    paddingVertical: 30,
    marginBottom: 12,
  },

  cargandoTexto: {
    fontSize: 13,
    color: Paleta.textoSecundario,
  },

  vacioTarjeta: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: Paleta.tarjeta,
    borderRadius: Radios.tarjeta,
    borderWidth: 1,
    borderColor: '#EEF1F9',
    padding: 24,
    marginBottom: 12,
  },

  vacioIcono: {
    fontSize: 34,
  },

  vacioTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: Paleta.texto,
  },

  vacioTexto: {
    fontSize: 13,
    color: Paleta.textoSecundario,
    textAlign: 'center',
    lineHeight: 19,
  },

  errorTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Paleta.peligroFondo,
    borderRadius: Radios.suave,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    marginTop: 14,
  },

  errorTexto: {
    flex: 1,
    fontSize: 13,
    color: '#B91C1C',
  },

  /* -----------------------------
     BOTONES
     ----------------------------- */

  botonPrimario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Paleta.primario,
    borderRadius: Radios.pastilla,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginTop: 6,
  },

  botonPrimarioTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
