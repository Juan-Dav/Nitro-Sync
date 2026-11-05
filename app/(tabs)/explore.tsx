/*
=======================================================
NITRO SYNC - EXPLORAR VEHÍCULOS (GARAJE)
=======================================================

Pestaña que muestra TODOS los vehículos del usuario
registrados en Firestore.

Los vehículos provienen de VehiculosContext (onSnapshot en
tiempo real): si el usuario registra un vehículo desde otra
pantalla, esta lista se actualiza sola.

ESTADOS DE LA PANTALLA:
  1. Cargando
  2. Error (reglas de Firestore / base de datos)
  3. Vacío (sin vehículos) con botón para registrar
  4. Lista de vehículos
=======================================================
*/

import React from 'react';

import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import {
  ColoresTipo,
  Gradientes,
  Paleta,
  Radios,
  sombraDura,
} from '@/constants/theme';

import BotonNitro from '@/components/ui/boton-nitro';
import ImagenVehiculo from '@/components/ui/imagen-vehiculo';

import { useVehiculos } from '@/context/VehiculosContext';

import { formatoKm, formatoPlaca } from '@/utils/formato';

export default function ExploreScreen() {
  const router = useRouter();

  const { vehiculos, cargando, error } = useVehiculos();

  /* -------------------------------------------------
     NAVEGAR AL DETALLE DEL VEHÍCULO
     ------------------------------------------------- */

  const abrirDetalle = (vehiculoId: string) => {
    router.push({
      pathname: '/vehicle/[id]',
      params: { id: vehiculoId },
    });
  };

  const registrar = () => {
    router.push('/vehicle/formulario');
  };

  const irAAseguradoras = () => {
    router.push('/aseguradoras');
  };

  /* -------------------------------------------------
     ESTADO: CARGANDO
     ------------------------------------------------- */

  if (cargando) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={Paleta.primario} />

          <Text style={styles.centroTexto}>Cargando tu garaje...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={true}
        persistentScrollbar
      >
        {/* =================================================
            ENCABEZADO (HERO)
            ================================================= */}

        <LinearGradient
          colors={Gradientes.marca}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View pointerEvents="none" style={styles.heroBurbuja} />

          <Text style={styles.heroEyebrow}>
            NITRO <Text style={styles.heroEyebrowAcento}>SYNC</Text>
          </Text>

          <View style={styles.heroFila}>
            <Text style={styles.title}>Mi garaje</Text>

            <View style={styles.contador}>
              <Text style={styles.contadorTexto}>{vehiculos.length}</Text>
            </View>
          </View>

          <Text style={styles.subtitle}>
            Toca un vehículo para ver su información completa.
          </Text>

          <View style={styles.heroBotones}>
            <BotonNitro
              titulo="Registrar vehículo"
              icono="add"
              onPress={registrar}
              tamano="mediano"
              anchoCompleto
            />

            <TouchableOpacity
              style={styles.heroSecundario}
              onPress={irAAseguradoras}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel="Directorio de aseguradoras"
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={Paleta.blanco}
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* =================================================
            ESTADO: ERROR (FIRESTORE)
            ================================================= */}

        {error && (
          <View style={styles.errorTarjeta}>
            <Ionicons name="cloud-offline-outline" size={22} color="#B3123E" />

            <Text style={styles.errorTexto}>{error}</Text>
          </View>
        )}

        {/* =================================================
            ESTADO: SIN VEHÍCULOS
            ================================================= */}

        {!error && vehiculos.length === 0 && (
          <View style={styles.vacio}>
            <View style={styles.vacioIcono}>
              <Ionicons name="car-sport" size={38} color={Paleta.primario} />
            </View>

            <Text style={styles.vacioTitulo}>Tu garaje está vacío</Text>

            <Text style={styles.vacioTexto}>
              Registra tu primer carro o moto para centralizar su
              documentación, mantenimientos y gastos.
            </Text>

            <BotonNitro
              titulo="Registrar mi primer vehículo"
              icono="add-circle"
              onPress={registrar}
              style={styles.vacioBoton}
            />
          </View>
        )}

        {/* =================================================
            LISTA DE VEHÍCULOS
            ================================================= */}

        <View style={styles.list}>
          {vehiculos.map((vehiculo) => (
            <TouchableOpacity
              key={vehiculo.id}
              style={styles.vehicleCard}
              onPress={() => abrirDetalle(vehiculo.id)}
              activeOpacity={0.9}
            >
              <View style={styles.vehicleImageFrame}>
                <ImagenVehiculo
                  uri={vehiculo.imagen}
                  tipo={vehiculo.tipo}
                  style={styles.vehicleImage}
                  accessibilityLabel={`Foto de ${vehiculo.nombre}`}
                />
              </View>

              <View style={styles.vehicleInfo}>
                <View style={styles.vehicleNameRow}>
                  <Text style={styles.vehicleName} numberOfLines={1}>
                    {vehiculo.nombre}
                  </Text>

                  <View
                    style={[
                      styles.typeBadge,
                      {
                        backgroundColor: ColoresTipo[vehiculo.tipo].fondo,
                        borderColor: ColoresTipo[vehiculo.tipo].borde,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeBadgeText,
                        { color: ColoresTipo[vehiculo.tipo].texto },
                      ]}
                    >
                      {vehiculo.tipo}
                    </Text>
                  </View>
                </View>

                <Text style={styles.vehicleDetails} numberOfLines={1}>
                  {vehiculo.year}
                  {vehiculo.placa ? ` • ${formatoPlaca(vehiculo.placa)}` : ''}
                  {vehiculo.marca ? ` • ${vehiculo.marca}` : ''}
                </Text>

                <View style={styles.kmFila}>
                  <Ionicons
                    name="speedometer-outline"
                    size={13}
                    color={Paleta.primario}
                  />

                  <Text style={styles.vehicleKm}>
                    {formatoKm(vehiculo.kilometraje)}
                  </Text>
                </View>
              </View>

              <View style={styles.arrowCircle}>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={Paleta.tinta}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =======================================================
   ESTILOS
   ======================================================= */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Paleta.fondo,
  },

  container: {
    paddingBottom: 34,
  },

  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  centroTexto: {
    marginTop: 12,
    fontSize: 14,
    color: Paleta.textoSecundario,
  },

  /* -----------------------------
     HERO
     ----------------------------- */

  hero: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },

  heroBurbuja: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(200,255,61,0.10)',
    top: -80,
    right: -50,
  },

  heroEyebrow: {
    fontSize: 12,
    color: Paleta.blanco,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: 3,
  },

  heroEyebrowAcento: {
    color: Paleta.acento,
  },

  heroFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  title: {
    fontSize: 32,
    fontWeight: '900',
    color: Paleta.blanco,
    letterSpacing: -0.6,
  },

  contador: {
    minWidth: 46,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: Paleta.acento,
    borderWidth: 2,
    borderColor: Paleta.tinta,
    alignItems: 'center',
    justifyContent: 'center',
    ...sombraDura(3, 3, 'rgba(0,0,0,0.35)'),
  },

  contadorTexto: {
    fontSize: 17,
    fontWeight: '900',
    color: Paleta.tinta,
  },

  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 8,
  },

  heroBotones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },

  heroSecundario: {
    width: 48,
    height: 48,
    borderRadius: Radios.suave,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },

  /* -----------------------------
     ERROR
     ----------------------------- */

  errorTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Paleta.peligroFondo,
    borderWidth: 1.5,
    borderColor: '#B3123E',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: Radios.suave,
    padding: 14,
  },

  errorTexto: {
    flex: 1,
    fontSize: 13,
    color: '#B3123E',
    lineHeight: 18,
    fontWeight: '600',
  },

  /* -----------------------------
     ESTADO VACÍO
     ----------------------------- */

  vacio: {
    alignItems: 'center',
    backgroundColor: Paleta.tarjeta,
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: Radios.grande,
    borderWidth: 2,
    borderColor: Paleta.tinta,
    padding: 24,
    ...sombraDura(4, 4),
  },

  vacioIcono: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: Paleta.primarioClaro,
    borderWidth: 2,
    borderColor: Paleta.tinta,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  vacioTitulo: {
    fontSize: 18,
    fontWeight: '900',
    color: Paleta.texto,
  },

  vacioTexto: {
    fontSize: 13,
    color: Paleta.textoSecundario,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },

  vacioBoton: {
    marginTop: 18,
  },

  /* -----------------------------
     LISTA
     ----------------------------- */

  list: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Paleta.tarjeta,
    borderRadius: Radios.tarjeta,
    borderWidth: 2,
    borderColor: Paleta.tinta,
    padding: 10,
    marginBottom: 14,
    ...sombraDura(4, 4),
  },

  vehicleImageFrame: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Paleta.borde,
    marginRight: 12,
    backgroundColor: Paleta.fondo,
  },

  vehicleImage: {
    width: 92,
    height: 72,
  },

  vehicleInfo: {
    flex: 1,
  },

  vehicleNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  vehicleName: {
    fontSize: 16,
    fontWeight: '900',
    color: Paleta.texto,
    flexShrink: 1,
    marginRight: 8,
  },

  typeBadge: {
    borderRadius: Radios.pastilla,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },

  typeBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  vehicleDetails: {
    fontSize: 12,
    color: Paleta.textoSecundario,
    marginTop: 4,
    fontWeight: '600',
  },

  kmFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },

  vehicleKm: {
    fontSize: 12,
    color: Paleta.primario,
    fontWeight: '800',
  },

  arrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: Paleta.primarioClaro,
    borderWidth: 1.5,
    borderColor: Paleta.tinta,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
});
