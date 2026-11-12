/*
=======================================================
NITRO SYNC - ACTUALIZAR KILOMETRAJE
=======================================================

  /vehicle/kilometraje?vehiculoId=X

Cada vez que el usuario conduce, entra aquí y actualiza
el kilometraje (o suma los km recorridos con los botones
rápidos). Al guardar:

  1. Se actualiza el vehículo en Firestore.
  2. Se comprueba el estado del cambio de aceite.
  3. Si toca (o ya se pasó), se lanza una NOTIFICACIÓN
     LOCAL con el sonido y la vibración del teléfono.

Con esto el kilometraje refleja lo recorrido desde la
propia aplicación.
=======================================================
*/

import { useEffect, useRef, useState } from 'react';

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
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';

import { Gradientes, Paleta, Radios, Sombras } from '@/constants/theme';

import BotonNitro from '@/components/ui/boton-nitro';
import { useAlerta, useConfirm } from '@/components/ui/confirm-dialog';

import { useAuth } from '@/context/AuthContext';
import { useVehiculos } from '@/context/VehiculosContext';

import { useRegistrosVehiculo } from '@/hooks/use-registros-vehiculo';

import { verificarAvisoAceite } from '@/services/notificationService';

import type { Mantenimiento } from '@/types/models';

import { calcularEstadoAceite } from '@/utils/mantenimiento';

import { formatoKm } from '@/utils/formato';

/* Kilómetros que se pueden sumar con un toque. */
const SUMAS_RAPIDAS = [10, 50, 100, 500];

const COLORES_ACEITE: Record<
  string,
  { texto: string; fondo: string; borde: string }
> = {
  'Al día': { texto: '#047857', fondo: '#D1FAE5', borde: '#A7F3D0' },
  Próximo: { texto: '#B45309', fondo: '#FEF3C7', borde: '#FDE68A' },
  Vencido: { texto: '#B91C1C', fondo: '#FEE2E2', borde: '#FECACA' },
  'Sin registro': { texto: '#475569', fondo: '#F1F5F9', borde: '#E2E8F0' },
};

export default function ActualizarKilometrajeScreen() {
  const { vehiculoId } = useLocalSearchParams<{ vehiculoId?: string }>();

  const { user } = useAuth();
  const { obtenerVehiculo, actualizar } = useVehiculos();

  const alerta = useAlerta();
  const confirmar = useConfirm();

  const vehiculo = vehiculoId ? obtenerVehiculo(vehiculoId) : undefined;

  const { registros: mantenimientos } = useRegistrosVehiculo<Mantenimiento>(
    'mantenimientos',
    vehiculoId,
    'fecha',
    'desc'
  );

  const [kilometraje, setKilometraje] = useState('');
  const [guardando, setGuardando] = useState(false);

  /* Se prellena una sola vez con el kilometraje actual. */
  const prellenado = useRef(false);

  useEffect(() => {
    if (vehiculo && !prellenado.current) {
      prellenado.current = true;
      setKilometraje(String(vehiculo.kilometraje || 0));
    }
  }, [vehiculo]);

  /* -------------------------------------------------
     VALORES CALCULADOS (vista previa)
     ------------------------------------------------- */

  const valorActual = Number(kilometraje.replace(/[^0-9]/g, '')) || 0;

  const recorrido = vehiculo
    ? Math.max(0, valorActual - (vehiculo.kilometraje || 0))
    : 0;

  const estadoAceite = vehiculo
    ? calcularEstadoAceite({
        tipo: vehiculo.tipo,
        kilometraje: valorActual,
        mantenimientos,
      })
    : null;

  const coloresAceite = estadoAceite
    ? COLORES_ACEITE[estadoAceite.estado] ?? COLORES_ACEITE['Sin registro']
    : COLORES_ACEITE['Sin registro'];

  /* -------------------------------------------------
     DATOS FALTANTES
     ------------------------------------------------- */

  if (!vehiculoId || !vehiculo) {
    return (
      <View style={styles.avisoContenedor}>
        <Text style={styles.avisoTitulo}>Vehículo no encontrado</Text>

        <Text style={styles.avisoTexto}>
          Puede haber sido eliminado. Vuelve al garaje e inténtalo de nuevo.
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
     ACCIONES
     ------------------------------------------------- */

  const sumar = (km: number) => {
    setKilometraje(String(valorActual + km));
  };

  const guardar = async () => {
    const valor = Number(kilometraje.replace(/[^0-9]/g, ''));

    if (!Number.isFinite(valor) || valor <= 0) {
      await alerta({
        titulo: 'Kilometraje inválido',
        mensaje: 'Escribe un número mayor que cero.',
        tipo: 'error',
        icono: 'alert-circle-outline',
      });
      return;
    }

    if (valor < (vehiculo.kilometraje || 0)) {
      const confirmado = await confirmar({
        titulo: 'Kilometraje menor',
        mensaje: `El kilometraje guardado es ${formatoKm(
          vehiculo.kilometraje || 0
        )} y escribiste ${formatoKm(
          valor
        )}.\n\n¿Seguro que quieres reducirlo?`,
        textoConfirmar: 'Sí, actualizar',
        textoCancelar: 'Cancelar',
        icono: 'speedometer-outline',
      });

      if (!confirmado) return;
    }

    try {
      setGuardando(true);

      await actualizar(vehiculo.id, { kilometraje: valor });

      const estado = calcularEstadoAceite({
        tipo: vehiculo.tipo,
        kilometraje: valor,
        mantenimientos,
      });

      /* Comprueba el cambio de aceite y avisa si toca. */
      if (user) {
        await verificarAvisoAceite({
          uid: user.uid,
          vehiculoId: vehiculo.id,
          nombreVehiculo: vehiculo.nombre,
          tipo: vehiculo.tipo,
          kilometraje: valor,
          mantenimientos,
        });
      }

      await alerta({
        titulo: 'Kilometraje actualizado',
        mensaje: `${vehiculo.nombre} ahora marca ${formatoKm(
          valor
        )}.\n\n${estado.resumen}`,
        tipo: 'exito',
        icono: 'checkmark-circle-outline',
      });

      if (router.canGoBack()) router.back();
    } catch (error: any) {
      await alerta({
        titulo: 'No se pudo actualizar',
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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <LinearGradient colors={Gradientes.marca} style={styles.hero}>
          <Text style={styles.heroTitle}>Kilometraje</Text>

          <Text style={styles.heroSubtitle}>
            {vehiculo.nombre} · {vehiculo.tipo}
          </Text>
        </LinearGradient>

        {/* ------------------ KILOMETRAJE ------------------ */}

        <View style={styles.card}>
          <Text style={styles.seccionTitulo}>¿Cuántos kilómetros marca?</Text>

          <View style={styles.resumenFila}>
            <Text style={styles.resumenLabel}>Guardado:</Text>
            <Text style={styles.resumenValor}>
              {formatoKm(vehiculo.kilometraje || 0)}
            </Text>
          </View>

          <View style={styles.inputCaja}>
            <Ionicons
              name="speedometer-outline"
              size={20}
              color={Paleta.textoSecundario}
            />

            <TextInput
              style={styles.input}
              value={kilometraje}
              onChangeText={(texto) =>
                setKilometraje(texto.replace(/[^0-9]/g, ''))
              }
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={Paleta.textoSuave}
              maxLength={7}
              accessibilityLabel="Kilometraje actual"
            />

            <Text style={styles.inputUnidad}>km</Text>
          </View>

          <Text style={styles.hint}>
            Recorrido desde la última actualización:{' '}
            <Text style={styles.hintFuerte}>+{formatoKm(recorrido)}</Text>
          </Text>

          <View style={styles.chips}>
            {SUMAS_RAPIDAS.map((km) => (
              <Pressable
                key={km}
                style={styles.chip}
                onPress={() => sumar(km)}
                accessibilityRole="button"
                accessibilityLabel={`Sumar ${km} kilómetros`}
              >
                <Text style={styles.chipTexto}>+{km} km</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ------------------ CAMBIO DE ACEITE ------------------ */}

        {estadoAceite && (
          <View style={styles.card}>
            <View style={styles.aceiteHeader}>
              <View style={styles.aceiteIcono}>
                <Ionicons name="water-outline" size={18} color={Paleta.primario} />
              </View>

              <Text style={styles.seccionTituloFlex}>Cambio de aceite</Text>

              <View
                style={[
                  styles.pill,
                  {
                    backgroundColor: coloresAceite.fondo,
                    borderColor: coloresAceite.borde,
                  },
                ]}
              >
                <Text style={[styles.pillTexto, { color: coloresAceite.texto }]}>
                  {estadoAceite.estado}
                </Text>
              </View>
            </View>

            <View style={styles.barra}>
              <View
                style={[
                  styles.barraRelleno,
                  {
                    width: `${estadoAceite.porcentaje}%`,
                    backgroundColor: coloresAceite.texto,
                  },
                ]}
              />
            </View>

            <Text style={styles.aceiteResumen}>{estadoAceite.resumen}</Text>

            {estadoAceite.tieneRegistro && (
              <Text style={styles.aceiteMeta}>
                Último cambio: {formatoKm(estadoAceite.kilometrajeCambio)}
                {'  ·  '}Próximo: {formatoKm(estadoAceite.proximoCambio)}
              </Text>
            )}
          </View>
        )}

        {/* ------------------ GUARDAR ------------------ */}

        <BotonNitro
          titulo="Guardar kilometraje"
          icono="checkmark-circle"
          cargando={guardando}
          anchoCompleto
          onPress={guardar}
          accessibilityLabel="Guardar kilometraje"
          style={styles.botonGuardar}
        />

        <Text style={styles.nota}>
          🔔 Si el kilometraje está cerca del próximo cambio de aceite, recibirás
          la notificación con sonido y vibración (actívalas en Ajustes).
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Paleta.fondo },
  scroll: { paddingBottom: 30 },

  hero: {
    padding: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },

  card: {
    backgroundColor: Paleta.tarjeta,
    borderRadius: Radios.tarjeta,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    ...Sombras.tarjeta,
  },

  seccionTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: Paleta.texto,
    marginBottom: 10,
  },
  seccionTituloFlex: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: Paleta.texto,
    marginLeft: 10,
  },

  resumenFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resumenLabel: { fontSize: 13, color: Paleta.textoSecundario },
  resumenValor: { fontSize: 13, fontWeight: '800', color: Paleta.texto },

  inputCaja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 56,
    backgroundColor: Paleta.fondo,
    borderWidth: 1,
    borderColor: Paleta.borde,
    borderRadius: Radios.suave,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: Paleta.texto,
  },
  inputUnidad: { fontSize: 15, fontWeight: '800', color: Paleta.textoSecundario },

  hint: { fontSize: 12, color: Paleta.textoSecundario, marginTop: 10 },
  hintFuerte: { fontWeight: '800', color: Paleta.primario },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: {
    backgroundColor: Paleta.primarioClaro,
    borderRadius: Radios.pastilla,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipTexto: { fontSize: 13, fontWeight: '800', color: Paleta.primarioOscuro },

  aceiteHeader: { flexDirection: 'row', alignItems: 'center' },
  aceiteIcono: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Paleta.primarioClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    borderRadius: Radios.pastilla,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  pillTexto: { fontSize: 11, fontWeight: '800' },

  barra: {
    height: 8,
    borderRadius: 999,
    backgroundColor: Paleta.fondo,
    overflow: 'hidden',
    marginTop: 14,
  },
  barraRelleno: { height: '100%', borderRadius: 999 },

  aceiteResumen: {
    fontSize: 13,
    color: Paleta.textoSecundario,
    marginTop: 10,
    lineHeight: 19,
  },
  aceiteMeta: { fontSize: 12, color: Paleta.textoSuave, marginTop: 6 },

  botonGuardar: {
    marginHorizontal: 16,
    marginTop: 20,
  },

  nota: {
    fontSize: 12,
    color: Paleta.textoSuave,
    marginHorizontal: 20,
    marginTop: 14,
    lineHeight: 18,
  },

  avisoContenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Paleta.fondo,
  },
  avisoTitulo: {
    fontSize: 20,
    fontWeight: '800',
    color: Paleta.texto,
    textAlign: 'center',
  },
  avisoTexto: {
    fontSize: 14,
    color: Paleta.textoSecundario,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  avisoBoton: {
    marginTop: 20,
    backgroundColor: Paleta.primario,
    borderRadius: Radios.suave,
    paddingHorizontal: 26,
    paddingVertical: 13,
  },
  avisoBotonTexto: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
