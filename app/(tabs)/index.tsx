/*
=======================================================
NITRO SYNC - PANTALLA PRINCIPAL (INICIO)
=======================================================

Dashboard del propietario: sus vehículos en tiempo real,
búsqueda, resumen, vencimientos y acciones rápidas.

DATOS REALES:
Los vehículos provienen de VehiculosContext (Firestore
con onSnapshot). Si se registra un vehículo en otra
pantalla, este dashboard se actualiza solo.

DISEÑO "NITRO":
  - Portada azul noche con acento lima.
  - Botones y tarjetas con borde de tinta y sombra dura
    (estilo R5).
  - Tipografía en mayúsculas para las acciones.

BÚSQUEDA:
Por nombre, placa, tipo, color y marca
(sin distinguir mayúsculas de minúsculas).

ESTADOS:
- Cargando
- Error de Firestore (reglas / base de datos)
- Vacío con botón para registrar
- Lista de vehículos
=======================================================
*/

import React, { useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';

import {
  ColoresEstado,
  ColoresTipo,
  Gradientes,
  Paleta,
  Radios,
  Sombras,
  sombraDura,
} from '@/constants/theme';

import { useAuth } from '@/context/AuthContext';
import { useVehiculos } from '@/context/VehiculosContext';
import { useAlerta, useConfirm } from '@/components/ui/confirm-dialog';
import BotonNitro from '@/components/ui/boton-nitro';
import ImagenVehiculo from '@/components/ui/imagen-vehiculo';
import MisSegurosResumen from '@/components/mis-seguros-resumen';

import { useDocumentosDeVehiculos } from '@/hooks/use-documentos';

import type { Vehiculo } from '@/types/models';

import { calcularEstado, diasRestantes } from '@/utils/fechas';

import {
  ICONO_DOCUMENTO,
  NOMBRES_DOCUMENTO,
  formatoFecha,
  formatoKm,
  iniciales,
  saludo,
  textoDiasVencimiento,
} from '@/utils/formato';

export default function HomeScreen() {
  /* -------------------------------------------------
     ESTADOS DEL BUSCADOR
     ------------------------------------------------- */

  const [search, setSearch] = useState('');
  const [searchSubmitted, setSearchSubmitted] = useState('');

  /* -------------------------------------------------
     BARRA DE ESTADO (Android) Y MUESQUEO (notch)
     ------------------------------------------------- */

  const insets = useSafeAreaInsets();

  /* -------------------------------------------------
     SESIÓN Y VEHÍCULOS (Firestore)
     ------------------------------------------------- */

  const { user, logout, esAdmin } = useAuth();
  const { vehiculos, cargando, error } = useVehiculos();
  const confirmar = useConfirm();
  const alerta = useAlerta();

  /* -------------------------------------------------
     PRÓXIMOS VENCIMIENTOS (documentos reales)
     ------------------------------------------------- */

  const { documentos: todosDocumentos } =
    useDocumentosDeVehiculos(vehiculos);

  const proximosVencimientos = useMemo(
    () =>
      todosDocumentos
        .filter(
          (documento) => diasRestantes(documento.vencimiento) <= 30
        )
        .slice(0, 4),
    [todosDocumentos]
  );

  /* -------------------------------------------------
     CERRAR SESIÓN
     ------------------------------------------------- */

  const cerrarSesion = async () => {
    const confirmado = await confirmar({
      titulo: 'Cerrar sesión',
      mensaje: '¿Seguro que deseas cerrar la sesión en este dispositivo?',
      textoConfirmar: 'Cerrar sesión',
      textoCancelar: 'Cancelar',
      icono: 'log-out-outline',
      peligro: true,
    });

    if (!confirmado) {
      return;
    }

    try {
      await logout();
    } catch (error: any) {
      await alerta({
        titulo: 'No se pudo cerrar sesión',
        mensaje:
          error?.message ??
          'Ocurrió un error inesperado. Inténtalo de nuevo.',
        tipo: 'error',
      });
    }
  };

  /* -------------------------------------------------
     BÚSQUEDA
     ------------------------------------------------- */

  const vehiculosEncontrados =
    searchSubmitted !== ''
      ? vehiculos.filter((vehiculo) => {
          const texto = searchSubmitted.toLowerCase();

          return (
            vehiculo.nombre.toLowerCase().includes(texto) ||
            vehiculo.placa.toLowerCase().includes(texto) ||
            vehiculo.tipo.toLowerCase().includes(texto) ||
            vehiculo.color.toLowerCase().includes(texto) ||
            vehiculo.marca.toLowerCase().includes(texto)
          );
        })
      : [];

  /* -------------------------------------------------
     NAVEGACIÓN
     ------------------------------------------------- */

  const abrirVehiculo = (id: string) => {
    router.push(`/vehicle/${id}`);
  };

  const irAGaraje = () => {
    router.push('/(tabs)/explore');
  };

  const registrarVehiculo = () => {
    router.push('/vehicle/formulario');
  };

  const irAAseguradoras = () => {
    router.push('/aseguradoras');
  };

  /* -------------------------------------------------
     RESUMEN (datos reales)
     ------------------------------------------------- */

  const kilometrajeTotal = vehiculos.reduce(
    (total, vehiculo) => total + (vehiculo.kilometraje || 0),
    0
  );

  /* -------------------------------------------------
     TARJETA DE VEHÍCULO (compartida)
     ------------------------------------------------- */

  const renderTarjeta = (vehiculo: Vehiculo) => (
    <TouchableOpacity
      key={vehiculo.id}
      style={styles.vehicleCard}
      onPress={() => abrirVehiculo(vehiculo.id)}
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
          {vehiculo.placa ? ` • ${vehiculo.placa}` : ''}
          {vehiculo.marca ? ` • ${vehiculo.marca}` : ''}
        </Text>

        <View style={styles.kmFila}>
          <Ionicons
            name="speedometer-outline"
            size={13}
            color={Paleta.primario}
          />

          <Text style={styles.vehicleKm}>
            {formatoKm(vehiculo.kilometraje || 0)}
          </Text>
        </View>
      </View>

      <View style={styles.arrowCircle}>
        <Ionicons name="chevron-forward" size={18} color={Paleta.tinta} />
      </View>
    </TouchableOpacity>
  );

  if (esAdmin) {
    return <Redirect href="/panel" />;
  }

  /* -------------------------------------------------
     INTERFAZ
     ------------------------------------------------- */

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={true}
        persistentScrollbar
        contentContainerStyle={styles.container}
      >
        {/* =================================================
            ENCABEZADO (HERO)
            ================================================= */}

        <LinearGradient
          colors={Gradientes.marca}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.hero,
            {
              paddingTop: (Platform.OS === 'android' ? insets.top : 0) + 16,
            },
          ]}
        >
          {/* Adornos decorativos */}
          <View pointerEvents="none" style={styles.heroBurbujaA} />
          <View pointerEvents="none" style={styles.heroBurbujaB} />
          <View pointerEvents="none" style={styles.heroFranja} />

          <View style={styles.header}>
            <View style={styles.headerInfo}>
              <Text style={styles.marca}>
                NITRO <Text style={styles.marcaAcento}>SYNC</Text>
              </Text>

              <Text style={styles.logo}>{saludo()}</Text>

              <Text style={styles.subtitle} numberOfLines={1}>
                {user?.email ?? 'Mi cuenta'}
              </Text>
            </View>

            <View style={styles.headerAcciones}>
              <View style={styles.avatar}>
                <Text style={styles.avatarTexto}>
                  {iniciales(user?.email ?? 'U')}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.logoutButton}
                onPress={cerrarSesion}
                accessibilityRole="button"
                accessibilityLabel="Cerrar sesión"
              >
                <Ionicons name="log-out-outline" size={20} color={Paleta.tinta} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Chips de estado del garaje */}

          <View style={styles.heroChips}>
            <View style={styles.heroChip}>
              <Ionicons name="car-sport" size={14} color={Paleta.acento} />
              <Text style={styles.heroChipTexto}>
                {vehiculos.length}{' '}
                {vehiculos.length === 1 ? 'vehículo' : 'vehículos'}
              </Text>
            </View>

            <View style={styles.heroChip}>
              <Ionicons name="navigate" size={14} color={Paleta.acento} />
              <Text style={styles.heroChipTexto}>
                {formatoKm(kilometrajeTotal)}
              </Text>
            </View>
          </View>

          {/* BUSCADOR */}

          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={18}
              color={Paleta.textoSuave}
              style={styles.searchIcon}
            />

            <TextInput
              style={styles.searchInput}
              placeholder="Buscar placa, marca o modelo..."
              placeholderTextColor={Paleta.textoSuave}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              onSubmitEditing={() => {
                setSearchSubmitted(search.trim());
              }}
            />

            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => {
                setSearchSubmitted(search.trim());
              }}
              accessibilityRole="button"
              accessibilityLabel="Buscar"
            >
              <Ionicons name="arrow-forward" size={18} color={Paleta.tinta} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* =================================================
            ESTADO: ERROR DE FIRESTORE
            ================================================= */}

        {error && (
          <View style={styles.errorTarjeta}>
            <Ionicons
              name="cloud-offline-outline"
              size={22}
              color="#B3123E"
            />

            <Text style={styles.errorTexto}>{error}</Text>
          </View>
        )}

        {/* =================================================
            RESULTADOS DE BÚSQUEDA
            ================================================= */}

        {searchSubmitted !== '' ? (
          <View>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleFilaInline}>
                <View style={styles.sectionPunto} />

                <Text style={styles.sectionTitle}>
                  {vehiculosEncontrados.length > 0
                    ? 'Resultados'
                    : 'Sin resultados'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setSearch('');
                  setSearchSubmitted('');
                }}
              >
                <Text style={styles.clearSearch}>Limpiar</Text>
              </TouchableOpacity>
            </View>

            {vehiculosEncontrados.length > 0 && (
              <Text style={styles.searchCount}>
                {vehiculosEncontrados.length} vehículo(s) para &ldquo;
                {searchSubmitted}&rdquo;
              </Text>
            )}

            {vehiculosEncontrados.map((vehiculo) => renderTarjeta(vehiculo))}

            {vehiculosEncontrados.length === 0 && (
              <View style={styles.noResults}>
                <Ionicons
                  name="search-outline"
                  size={34}
                  color={Paleta.textoSuave}
                />

                <Text style={styles.noResultsTitle}>
                  No se encontró ningún vehículo
                </Text>

                <Text style={styles.noResultsText}>
                  Intenta buscar por nombre, placa o marca.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <>
            {/* =================================================
                MIS VEHÍCULOS
                ================================================= */}

            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleFila}>
                <View style={styles.sectionPunto} />
                <Text style={styles.sectionTitle}>Mi garaje</Text>
              </View>

              <View style={styles.sectionAcciones}>
                <TouchableOpacity
                  style={styles.botonMini}
                  onPress={registrarVehiculo}
                  accessibilityLabel="Registrar vehículo"
                >
                  <Ionicons name="add" size={18} color={Paleta.tinta} />
                </TouchableOpacity>

                <TouchableOpacity onPress={irAGaraje}>
                  <Text style={styles.seeMore}>Ver todos</Text>
                </TouchableOpacity>
              </View>
            </View>

            {cargando && !error && (
              <View style={styles.cargandoTarjeta}>
                <ActivityIndicator size="large" color={Paleta.primario} />

                <Text style={styles.cargandoTexto}>
                  Cargando tus vehículos...
                </Text>
              </View>
            )}

            {!cargando && !error && vehiculos.length === 0 && (
              <View style={styles.vacioTarjeta}>
                <View style={styles.vacioIconoCaja}>
                  <Ionicons
                    name="car-sport"
                    size={40}
                    color={Paleta.primario}
                  />
                </View>

                <Text style={styles.vacioTitulo}>
                  Tu garaje está esperando
                </Text>

                <Text style={styles.vacioTexto}>
                  Registra tu primer carro o moto y centraliza su
                  documentación, mantenimiento y seguro.
                </Text>

                <BotonNitro
                  titulo="Registrar vehículo"
                  icono="add"
                  onPress={registrarVehiculo}
                  style={styles.vacioBoton}
                />
              </View>
            )}

            {!cargando && vehiculos.map((vehiculo) => renderTarjeta(vehiculo))}

            {/* =================================================
                RESUMEN
                ================================================= */}

            {!cargando && vehiculos.length > 0 && (
              <>
                <View style={styles.sectionTitleFila}>
                  <View style={styles.sectionPunto} />
                  <Text style={styles.sectionTitle}>Resumen</Text>
                </View>

                <View style={styles.summaryRow}>
                  <View
                    style={[
                      styles.summaryCard,
                      styles.summaryCardAzul,
                    ]}
                  >
                    <View style={styles.summaryIcono}>
                      <Ionicons
                        name="car-sport"
                        size={20}
                        color={Paleta.blanco}
                      />
                    </View>

                    <Text style={styles.summaryNumber}>
                      {vehiculos.length}
                    </Text>

                    <Text style={styles.summaryText}>Vehículos</Text>
                  </View>

                  <View
                    style={[styles.summaryCard, styles.summaryCardLima]}
                  >
                    <View
                      style={[
                        styles.summaryIcono,
                        { backgroundColor: 'rgba(11,16,48,0.12)' },
                      ]}
                    >
                      <Ionicons
                        name="speedometer"
                        size={20}
                        color={Paleta.tinta}
                      />
                    </View>

                    <Text
                      style={[styles.summaryNumber, { color: Paleta.tinta }]}
                    >
                      {formatoKm(kilometrajeTotal).replace(' km', '')}
                    </Text>

                    <Text
                      style={[styles.summaryText, { color: '#3E5A08' }]}
                    >
                      Km totales
                    </Text>
                  </View>
                </View>
              </>
            )}

            {/* =================================================
                PRÓXIMOS VENCIMIENTOS
                ================================================= */}

            {proximosVencimientos.length > 0 && (
              <>
                <View style={styles.sectionTitleFila}>
                  <View style={styles.sectionPunto} />
                  <Text style={styles.sectionTitle}>
                    Próximos vencimientos
                  </Text>
                </View>

                {proximosVencimientos.map((documento) => {
                  const estado = calcularEstado(documento.vencimiento);
                  const dias = diasRestantes(documento.vencimiento);
                  const colores = ColoresEstado[estado];

                  const nombreVehiculo =
                    vehiculos.find(
                      (vehiculo) => vehiculo.id === documento.vehiculoId
                    )?.nombre ?? 'Vehículo';

                  return (
                    <View key={documento.id} style={styles.vencCard}>
                      <View style={styles.vencFila}>
                        <View
                          style={[
                            styles.vencIcono,
                            { backgroundColor: colores.fondo },
                          ]}
                        >
                          <Text style={styles.vencIconoTexto}>
                            {ICONO_DOCUMENTO[documento.tipo]}
                          </Text>
                        </View>

                        <View style={styles.vencInfo}>
                          <Text style={styles.vencTitulo} numberOfLines={1}>
                            {NOMBRES_DOCUMENTO[documento.tipo]} ·{' '}
                            {nombreVehiculo}
                          </Text>

                          <Text style={styles.vencTexto} numberOfLines={1}>
                            {textoDiasVencimiento(dias)}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.vencPill,
                            {
                              backgroundColor: colores.fondo,
                              borderColor: colores.borde,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.vencPillTexto,
                              { color: colores.texto },
                            ]}
                          >
                            {estado}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.vencFecha}>
                        Vence el {formatoFecha(documento.vencimiento)}
                      </Text>
                    </View>
                  );
                })}
              </>
            )}

            <MisSegurosResumen />

            {/* =================================================
                ACCIONES RÁPIDAS
                ================================================= */}

            <View style={styles.sectionTitleFila}>
              <View style={styles.sectionPunto} />
              <Text style={styles.sectionTitle}>Acciones rápidas</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              <TouchableOpacity
                style={[styles.actionCard, styles.actionLima]}
                onPress={registrarVehiculo}
                activeOpacity={0.9}
              >
                <View
                  style={[
                    styles.actionIcono,
                    { backgroundColor: 'rgba(11,16,48,0.14)' },
                  ]}
                >
                  <Ionicons name="add" size={24} color={Paleta.tinta} />
                </View>

                <Text style={styles.actionText}>Registrar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, styles.actionAzul]}
                onPress={irAGaraje}
                activeOpacity={0.9}
              >
                <View
                  style={[
                    styles.actionIcono,
                    { backgroundColor: 'rgba(255,255,255,0.18)' },
                  ]}
                >
                  <Ionicons
                    name="car-sport-outline"
                    size={22}
                    color={Paleta.blanco}
                  />
                </View>

                <Text style={[styles.actionText, { color: Paleta.blanco }]}>
                  Garaje
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={irAAseguradoras}
                activeOpacity={0.9}
              >
                <View style={styles.actionIcono}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={22}
                    color={Paleta.primario}
                  />
                </View>

                <Text style={styles.actionText}>Aseguradoras</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/recordatorios')}
                activeOpacity={0.9}
              >
                <View style={styles.actionIcono}>
                  <Ionicons
                    name="notifications-outline"
                    size={22}
                    color={Paleta.primario}
                  />
                </View>

                <Text style={styles.actionText}>Recordatorios</Text>
              </TouchableOpacity>
            </ScrollView>
          </>
        )}
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

  /* -----------------------------
     HERO + HEADER
     ----------------------------- */

  hero: {
    paddingHorizontal: 18,
    paddingBottom: 26,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },

  heroBurbujaA: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(200,255,61,0.10)',
    top: -90,
    right: -60,
  },

  heroBurbujaB: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(43,75,255,0.45)',
    bottom: -70,
    left: -40,
  },

  heroFranja: {
    position: 'absolute',
    width: 220,
    height: 22,
    backgroundColor: 'rgba(200,255,61,0.16)',
    top: 44,
    right: -70,
    transform: [{ rotate: '-24deg' }],
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerInfo: {
    flex: 1,
    marginRight: 12,
  },

  marca: {
    fontSize: 13,
    fontWeight: '900',
    color: Paleta.blanco,
    letterSpacing: 3,
  },

  marcaAcento: {
    color: Paleta.acento,
  },

  logo: {
    fontSize: 27,
    fontWeight: '900',
    color: Paleta.blanco,
    marginTop: 8,
    letterSpacing: -0.4,
  },

  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 4,
  },

  headerAcciones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: Paleta.acento,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Paleta.tinta,
    ...sombraDura(3, 3, 'rgba(0,0,0,0.35)'),
  },

  avatarTexto: {
    fontSize: 17,
    fontWeight: '900',
    color: Paleta.tinta,
  },

  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: Paleta.blanco,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Paleta.tinta,
  },

  /* -----------------------------
     CHIPS DEL HERO
     ----------------------------- */

  heroChips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },

  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radios.pastilla,
  },

  heroChipTexto: {
    fontSize: 12,
    fontWeight: '700',
    color: Paleta.blanco,
  },

  /* -----------------------------
     BUSCADOR
     ----------------------------- */

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Paleta.blanco,
    borderRadius: Radios.pastilla,
    paddingLeft: 16,
    height: 56,
    marginTop: 16,
    borderWidth: 2,
    borderColor: Paleta.tinta,
    ...sombraDura(4, 4, 'rgba(0,0,0,0.35)'),
  },

  searchIcon: {
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    height: 56,
    fontSize: 14,
    color: Paleta.texto,
    padding: 0,
  },

  searchButton: {
    width: 44,
    height: 44,
    backgroundColor: Paleta.acento,
    borderRadius: Radios.pastilla,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
    borderWidth: 2,
    borderColor: Paleta.tinta,
  },

  /* -----------------------------
     SECCIONES
     ----------------------------- */

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
  },

  sectionTitleFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },

  sectionTitleFilaInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  sectionPunto: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: Paleta.acento,
    borderWidth: 1.5,
    borderColor: Paleta.tinta,
  },

  sectionAcciones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  botonMini: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: Paleta.acento,
    borderWidth: 2,
    borderColor: Paleta.tinta,
    alignItems: 'center',
    justifyContent: 'center',
    ...sombraDura(2, 2),
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: Paleta.tinta,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  seeMore: {
    fontSize: 12,
    fontWeight: '800',
    color: Paleta.primario,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  searchCount: {
    fontSize: 13,
    color: Paleta.textoSecundario,
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 4,
  },

  clearSearch: {
    fontSize: 12,
    color: '#B3123E',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  /* -----------------------------
     TARJETA DE VEHÍCULO
     ----------------------------- */

  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Paleta.tarjeta,
    borderRadius: Radios.tarjeta,
    borderWidth: 2,
    borderColor: Paleta.tinta,
    padding: 10,
    marginHorizontal: 16,
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
    width: 88,
    height: 70,
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

  /* -----------------------------
     ERROR / CARGA / VACÍO
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

  cargandoTarjeta: {
    alignItems: 'center',
    backgroundColor: Paleta.tarjeta,
    borderWidth: 1.5,
    borderColor: Paleta.borde,
    marginHorizontal: 16,
    borderRadius: Radios.tarjeta,
    padding: 26,
    ...Sombras.tarjeta,
  },

  cargandoTexto: {
    marginTop: 10,
    fontSize: 13,
    color: Paleta.textoSecundario,
  },

  vacioTarjeta: {
    alignItems: 'center',
    backgroundColor: Paleta.tarjeta,
    borderWidth: 2,
    borderColor: Paleta.tinta,
    marginHorizontal: 16,
    borderRadius: Radios.grande,
    padding: 24,
    ...sombraDura(4, 4),
  },

  vacioIconoCaja: {
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
    textAlign: 'center',
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
     RESUMEN
     ----------------------------- */

  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
  },

  summaryCard: {
    flex: 1,
    borderRadius: Radios.tarjeta,
    borderWidth: 2,
    borderColor: Paleta.tinta,
    padding: 16,
    ...sombraDura(4, 4),
  },

  summaryCardAzul: {
    backgroundColor: Paleta.primario,
  },

  summaryCardLima: {
    backgroundColor: Paleta.acento,
  },

  summaryIcono: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryNumber: {
    fontSize: 27,
    fontWeight: '900',
    color: Paleta.blanco,
    marginTop: 10,
    letterSpacing: -0.5,
  },

  summaryText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 2,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  /* -----------------------------
     PRÓXIMOS VENCIMIENTOS
     ----------------------------- */

  vencCard: {
    backgroundColor: Paleta.tarjeta,
    borderRadius: Radios.tarjeta,
    borderWidth: 1.5,
    borderColor: Paleta.borde,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    ...Sombras.tarjeta,
  },

  vencFila: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  vencIcono: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  vencIconoTexto: {
    fontSize: 18,
  },

  vencInfo: {
    flex: 1,
    marginRight: 8,
  },

  vencTitulo: {
    fontSize: 14,
    fontWeight: '800',
    color: Paleta.texto,
  },

  vencTexto: {
    fontSize: 12,
    color: Paleta.textoSecundario,
    marginTop: 2,
  },

  vencPill: {
    borderRadius: Radios.pastilla,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  vencPillTexto: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  vencFecha: {
    fontSize: 12,
    color: Paleta.textoSecundario,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Paleta.borde,
  },

  /* -----------------------------
     ACCIONES RÁPIDAS
     ----------------------------- */

  horizontalScroll: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    marginBottom: 18,
  },

  actionCard: {
    width: 118,
    height: 120,
    backgroundColor: Paleta.tarjeta,
    borderRadius: Radios.tarjeta,
    borderWidth: 2,
    borderColor: Paleta.tinta,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    ...sombraDura(4, 4),
  },

  actionLima: {
    backgroundColor: Paleta.acento,
  },

  actionAzul: {
    backgroundColor: Paleta.primario,
  },

  actionIcono: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Paleta.primarioClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  actionText: {
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    color: Paleta.tinta,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* -----------------------------
     RESULTADOS VACÍOS
     ----------------------------- */

  noResults: {
    backgroundColor: Paleta.tarjeta,
    borderRadius: Radios.tarjeta,
    borderWidth: 1.5,
    borderColor: Paleta.borde,
    marginHorizontal: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    ...Sombras.tarjeta,
  },

  noResultsTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: Paleta.texto,
    textAlign: 'center',
    marginTop: 10,
  },

  noResultsText: {
    fontSize: 13,
    color: Paleta.textoSecundario,
    textAlign: 'center',
    marginTop: 5,
  },
});
