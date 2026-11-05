/*
=======================================================
NITRO SYNC - DETALLE DEL VEHÍCULO
=======================================================

Centro de información del vehículo seleccionado.

RUTA DINÁMICA [id].tsx:
  /vehicle/<id-del-documento-de-Firestore>

DATOS REALES:
El vehículo se busca en VehiculosContext (Firestore),
por lo que siempre refleja la información actual.

SECCIONES:
  1. Portada con foto y datos clave
  2. Acciones: editar / eliminar
  3. Información general
  4. Documentos (SOAT, tecnomecánica, seguro...) con
     estado calculado: Vigente / Próximo a vencer /
     Vencido, y CRUD en Firestore
  5. Mantenimientos (historial con costos) - CRUD
  6. Recordatorios (persistentes) - CRUD + completar
  7. Gastos (categorías y valores) - CRUD + total

=======================================================
*/

import React, { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';

import {
  ColoresEstado,
  ColoresRecordatorio,
  ColoresTipo,
  Paleta,
  Radios,
  Sombras,
  sombraDura,
} from '@/constants/theme';

import { buscarAseguradora, telefonoMarcable } from '@/data/aseguradoras';

import { useAuth } from '@/context/AuthContext';
import { useVehiculos } from '@/context/VehiculosContext';
import BotonNitro from '@/components/ui/boton-nitro';
import { useAlerta, useConfirm } from '@/components/ui/confirm-dialog';
import ImagenVehiculo from '@/components/ui/imagen-vehiculo';
import GastosMensuales from '@/components/vehiculo/gastos-mensuales';

import { useDocumentos } from '@/hooks/use-documentos';

import { useRegistrosVehiculo } from '@/hooks/use-registros-vehiculo';

import { eliminarDocumento } from '@/services/documentos';
import { eliminarGasto } from '@/services/gastos';
import { eliminarMantenimiento } from '@/services/mantenimientos';
import {
  actualizarRecordatorio,
  eliminarRecordatorio,
} from '@/services/recordatorios';

import { sincronizarNotificacionesVehiculo } from '@/services/notificationService';

import type { Gasto, Mantenimiento, Recordatorio } from '@/types/models';

import { calcularEstado, diasRestantes } from '@/utils/fechas';

import { calcularEstadoAceite } from '@/utils/mantenimiento';

import {
  ICONO_DOCUMENTO,
  ICONO_GASTO,
  NOMBRES_DOCUMENTO,
  NOMBRES_GASTO,
  formatoDinero,
  formatoFecha,
  formatoKm,
  formatoPlaca,
  textoDiasVencimiento,
} from '@/utils/formato';

/* Colores de la píldora del cambio de aceite. */
const COLORES_ACEITE: Record<
  string,
  { texto: string; fondo: string; borde: string }
> = {
  'Al día': { texto: '#047857', fondo: '#D1FAE5', borde: '#A7F3D0' },
  Próximo: { texto: '#B45309', fondo: '#FEF3C7', borde: '#FDE68A' },
  Vencido: { texto: '#B91C1C', fondo: '#FEE2E2', borde: '#FECACA' },
  'Sin registro': { texto: '#475569', fondo: '#F1F5F9', borde: '#E2E8F0' },
};

export default function VehicleDetailScreen() {
  /* -------------------------------------------------
     PARÁMETRO DINÁMICO DE LA RUTA
     Lee el valor de "id" enviado por la navegación.
     ------------------------------------------------- */

  const { id } = useLocalSearchParams<{ id: string }>();

  /* -------------------------------------------------
     VEHÍCULO DESDE FIRESTORE (contexto)
     ------------------------------------------------- */

  const { obtenerVehiculo, eliminar, cargando } = useVehiculos();

  const vehiculo = id ? obtenerVehiculo(id) : undefined;

  /* -------------------------------------------------
     SESIÓN Y DOCUMENTOS DEL VEHÍCULO (Firestore)
     ------------------------------------------------- */

  const { user } = useAuth();

  const confirmar = useConfirm();
  const alerta = useAlerta();

  const {
    documentos,
    cargando: cargandoDocumentos,
    error: errorDocumentos,
  } = useDocumentos(id);

  /* -------------------------------------------------
     MANTENIMIENTOS, RECORDATORIOS Y GASTOS
     (subcolecciones en tiempo real)
     ------------------------------------------------- */

  const {
    registros: mantenimientos,
    cargando: cargandoMantenimientos,
    error: errorMantenimientos,
  } = useRegistrosVehiculo<Mantenimiento>(
    'mantenimientos',
    id,
    'fecha',
    'desc'
  );

  const {
    registros: recordatorios,
    cargando: cargandoRecordatorios,
    error: errorRecordatorios,
  } = useRegistrosVehiculo<Recordatorio>(
    'recordatorios',
    id,
    'fecha',
    'asc'
  );

  const {
    registros: gastos,
    cargando: cargandoGastos,
    error: errorGastos,
  } = useRegistrosVehiculo<Gasto>('gastos', id, 'fecha', 'desc');

  /* -------------------------------------------------
     SINCRONIZACIÓN DE NOTIFICACIONES LOCALES
     -------------------------------------------------
     Al abrir el detalle se reprograman los avisos reales
     (vencimientos y recordatorios) de este vehículo.
     En web es una operación segura que no hace nada.
     ------------------------------------------------- */

  useEffect(() => {
    if (user && id) {
      sincronizarNotificacionesVehiculo(user.uid, id);
    }
  }, [user, id]);

  /* -------------------------------------------------
     ACCIONES: EDITAR Y ELIMINAR
     ------------------------------------------------- */

  const editarVehiculo = () => {
    if (!vehiculo) {
      return;
    }

    router.push(`/vehicle/formulario?vehiculoId=${vehiculo.id}`);
  };

  const [eliminando, setEliminando] = useState(false);

  const confirmarEliminacion = async () => {
    if (!vehiculo || eliminando) {
      return;
    }

    const confirmado = await confirmar({
      titulo: 'Eliminar vehículo',
      mensaje: `¿Seguro que deseas eliminar "${vehiculo.nombre}"${
        vehiculo.placa ? ` (placa ${formatoPlaca(vehiculo.placa)})` : ''
      }?\n\nSe eliminarán también sus documentos, mantenimientos, recordatorios y gastos. Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar',
      textoCancelar: 'Cancelar',
      icono: 'trash-outline',
      peligro: true,
    });

    if (!confirmado) {
      return;
    }

    try {
      setEliminando(true);
      await eliminar(vehiculo.id);
      // Navegar a una ruta segura tras eliminar.
      router.replace('/(tabs)/explore');
    } catch (error: any) {
      await alerta({
        titulo: 'No se pudo eliminar',
        mensaje: error?.message ?? 'Ocurrió un error inesperado.',
        tipo: 'error',
      });
    } finally {
      setEliminando(false);
    }
  };

  /* -------------------------------------------------
     ESTADO: CARGANDO
     ------------------------------------------------- */

  if (cargando && !vehiculo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={Paleta.primario} />

          <Text style={styles.centroTexto}>Cargando vehículo...</Text>
        </View>
      </SafeAreaView>
    );
  }

  /* -------------------------------------------------
     VEHÍCULO NO ENCONTRADO
     ------------------------------------------------- */

  if (!vehiculo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centro}>
          <Text style={styles.headerTitle}>Vehículo no encontrado</Text>

          <Text style={styles.noFoundText}>
            {`No existe un vehículo con el id "${id}". Puede haber sido eliminado.`}
          </Text>

          <TouchableOpacity
            style={styles.botonVolver}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/explore');
              }
            }}
          >
            <Text style={styles.botonVolverTexto}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /* -------------------------------------------------
     COLORES SEGÚN EL TIPO
     ------------------------------------------------- */

  const coloresTipo = ColoresTipo[vehiculo.tipo];

  /* -------------------------------------------------
     SEGURO DEL VEHÍCULO
     ------------------------------------------------- */

  const aseguradoraInfo = buscarAseguradora(vehiculo.aseguradora);

  const telefonoSeguro =
    vehiculo.telefonoAseguradora || aseguradoraInfo?.telefono || '';

  const llamarAseguradora = async () => {
    if (!telefonoSeguro) {
      return;
    }

    try {
      await Linking.openURL(`tel:${telefonoMarcable(telefonoSeguro)}`);
    } catch {
      await alerta({
        titulo: 'No se pudo llamar',
        mensaje: `Marca manualmente al ${telefonoSeguro}.`,
        tipo: 'advertencia',
      });
    }
  };

  const estadoSeguro = vehiculo.vencimientoSeguro
    ? calcularEstado(vehiculo.vencimientoSeguro)
    : null;

  const coloresSeguro = estadoSeguro ? ColoresEstado[estadoSeguro] : null;

  const sinDatosSeguro =
    !vehiculo.aseguradora &&
    !telefonoSeguro &&
    !vehiculo.numeroPoliza &&
    !vehiculo.vencimientoSeguro;

  /* -------------------------------------------------
     ESTADO DEL CAMBIO DE ACEITE (kilometraje)
     -------------------------------------------------
     Se calcula con el kilometraje real del vehículo y
     su último "Cambio de aceite" registrado.
     ------------------------------------------------- */

  const estadoAceite = calcularEstadoAceite({
    tipo: vehiculo.tipo,
    kilometraje: vehiculo.kilometraje || 0,
    mantenimientos,
  });

  const coloresAceite =
    COLORES_ACEITE[estadoAceite.estado] ?? COLORES_ACEITE['Sin registro'];

  const actualizarKilometraje = () => {
    router.push(`/vehicle/kilometraje?vehiculoId=${vehiculo.id}`);
  };

  /* -------------------------------------------------
     ACCIONES DE DOCUMENTOS
     ------------------------------------------------- */

  const agregarDocumento = () => {
    router.push(`/vehicle/documento?vehiculoId=${vehiculo.id}`);
  };

  const editarDocumento = (documentoId: string) => {
    router.push(
      `/vehicle/documento?vehiculoId=${vehiculo.id}&documentoId=${documentoId}`
    );
  };

  const confirmarEliminarDocumento = async (
    documentoId: string,
    nombre: string
  ) => {
    if (!user) {
      return;
    }

    const confirmado = await confirmar({
      titulo: 'Eliminar documento',
      mensaje: `¿Seguro que deseas eliminar "${nombre}"? Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar',
      icono: 'trash-outline',
      peligro: true,
    });

    if (!confirmado) {
      return;
    }

    try {
      await eliminarDocumento(user.uid, vehiculo.id, documentoId);
      await sincronizarNotificacionesVehiculo(user.uid, vehiculo.id);
    } catch (error: any) {
      await alerta({
        titulo: 'No se pudo eliminar',
        mensaje: error?.message ?? 'Ocurrió un error inesperado.',
        tipo: 'error',
      });
    }
  };

  /* -------------------------------------------------
     ACCIONES: MANTENIMIENTOS
     ------------------------------------------------- */

  const agregarMantenimiento = () => {
    router.push(`/vehicle/mantenimiento?vehiculoId=${vehiculo.id}`);
  };

  /*
  Acceso rápido al CAMBIO DE ACEITE: abre el formulario de
  mantenimiento con el tipo ya elegido y el kilometraje
  actual del vehículo precargado.
  */
  const registrarCambioAceite = () => {
    const tipo = encodeURIComponent('Cambio de aceite');

    router.push(
      `/vehicle/mantenimiento?vehiculoId=${vehiculo.id}&tipo=${tipo}&kilometraje=${vehiculo.kilometraje || 0}`
    );
  };

  const editarMantenimiento = (mantenimientoId: string) => {
    router.push(
      `/vehicle/mantenimiento?vehiculoId=${vehiculo.id}&mantenimientoId=${mantenimientoId}`
    );
  };

  const confirmarEliminarMantenimiento = async (
    mantenimientoId: string,
    nombre: string
  ) => {
    if (!user) {
      return;
    }

    const confirmado = await confirmar({
      titulo: 'Eliminar mantenimiento',
      mensaje: `¿Seguro que deseas eliminar "${nombre}"? Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar',
      icono: 'trash-outline',
      peligro: true,
    });

    if (!confirmado) {
      return;
    }

    try {
      await eliminarMantenimiento(user.uid, vehiculo.id, mantenimientoId);
    } catch (error: any) {
      await alerta({
        titulo: 'No se pudo eliminar',
        mensaje: error?.message ?? 'Ocurrió un error inesperado.',
        tipo: 'error',
      });
    }
  };

  /* -------------------------------------------------
     ACCIONES: RECORDATORIOS
     ------------------------------------------------- */

  const agregarRecordatorio = () => {
    router.push(`/vehicle/recordatorio?vehiculoId=${vehiculo.id}`);
  };

  const editarRecordatorio = (recordatorioId: string) => {
    router.push(
      `/vehicle/recordatorio?vehiculoId=${vehiculo.id}&recordatorioId=${recordatorioId}`
    );
  };

  /* Alterna entre Completado y Pendiente. */

  const alternarRecordatorio = async (recordatorio: Recordatorio) => {
    if (!user) {
      return;
    }

    const nuevoEstado =
      recordatorio.estado === 'Completado' ? 'Pendiente' : 'Completado';

    try {
      await actualizarRecordatorio(user.uid, vehiculo.id, recordatorio.id, {
        estado: nuevoEstado,
      });
      await sincronizarNotificacionesVehiculo(user.uid, vehiculo.id);
    } catch (error: any) {
      await alerta({
        titulo: 'No se pudo actualizar',
        mensaje: error?.message ?? 'Ocurrió un error inesperado.',
        tipo: 'error',
      });
    }
  };

  const confirmarEliminarRecordatorio = async (recordatorioId: string) => {
    if (!user) {
      return;
    }

    const confirmado = await confirmar({
      titulo: 'Eliminar recordatorio',
      mensaje:
        '¿Seguro que deseas eliminar este recordatorio? Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar',
      icono: 'trash-outline',
      peligro: true,
    });

    if (!confirmado) {
      return;
    }

    try {
      await eliminarRecordatorio(user.uid, vehiculo.id, recordatorioId);
      await sincronizarNotificacionesVehiculo(user.uid, vehiculo.id);
    } catch (error: any) {
      await alerta({
        titulo: 'No se pudo eliminar',
        mensaje: error?.message ?? 'Ocurrió un error inesperado.',
        tipo: 'error',
      });
    }
  };

  /* -------------------------------------------------
     ACCIONES: GASTOS
     ------------------------------------------------- */

  const agregarGasto = () => {
    router.push(`/vehicle/gasto?vehiculoId=${vehiculo.id}`);
  };

  const editarGasto = (gastoId: string) => {
    router.push(
      `/vehicle/gasto?vehiculoId=${vehiculo.id}&gastoId=${gastoId}`
    );
  };

  const confirmarEliminarGasto = async (gastoId: string, nombre: string) => {
    if (!user) {
      return;
    }

    const confirmado = await confirmar({
      titulo: 'Eliminar gasto',
      mensaje: `¿Seguro que deseas eliminar "${nombre}"? Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar',
      icono: 'trash-outline',
      peligro: true,
    });

    if (!confirmado) {
      return;
    }

    try {
      await eliminarGasto(user.uid, vehiculo.id, gastoId);
    } catch (error: any) {
      await alerta({
        titulo: 'No se pudo eliminar',
        mensaje: error?.message ?? 'Ocurrió un error inesperado.',
        tipo: 'error',
      });
    }
  };

  /* -------------------------------------------------
     TOTAL DE GASTOS
     -------------------------------------------------
     Los gastos mensuales "pendientes" todavía no se han
     pagado, así que no se suman al total registrado.
     ------------------------------------------------- */

  const gastosManuales = gastos.filter((gasto) => !gasto.concepto);

  const totalGastos = gastos
    .filter((gasto) => gasto.estado !== 'pendiente')
    .reduce((total, gasto) => total + (gasto.valor || 0), 0);

  /*
  ======================================================
  INTERFAZ
  ======================================================
  */

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true} persistentScrollbar
      >
        {/* =================================================
            PORTADA CON FOTO
            =================================================
            La imagen se muestra COMPLETA y CENTRADA
            (contentFit="contain"), sin recortes y sin que
            ningún botón la tape.
            ================================================= */}

        <View style={styles.portada}>
          <View style={styles.portadaMarco}>
            <ImagenVehiculo
              uri={vehiculo.imagen}
              tipo={vehiculo.tipo}
              style={styles.portadaFoto}
              contentFit="contain"
              accessibilityLabel={`Foto de ${vehiculo.nombre}`}
            />
          </View>

          <View style={styles.portadaInfo}>
            <View
              style={[
                styles.portadaPill,
                {
                  backgroundColor: coloresTipo.fondo,
                  borderColor: coloresTipo.borde,
                },
              ]}
            >
              <Text
                style={[
                  styles.portadaPillTexto,
                  { color: coloresTipo.texto },
                ]}
              >
                {vehiculo.tipo === 'Carro' ? '🚗' : '🏍️'} {vehiculo.tipo}
              </Text>
            </View>

            <Text style={styles.portadaNombre}>{vehiculo.nombre}</Text>

            <Text style={styles.portadaPlaca}>
              {vehiculo.year}
              {vehiculo.placa ? ` • Placa ${formatoPlaca(vehiculo.placa)}` : ''}
            </Text>
          </View>
        </View>

        {/* =================================================
            INFORMACIÓN GENERAL
            ================================================= */}

        <View style={styles.card}>
          <Text style={styles.seccionTitulo}>Información general</Text>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Marca</Text>

            <Text style={styles.dataValue}>
              {vehiculo.marca || '—'}
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Modelo</Text>

            <Text style={styles.dataValue}>
              {vehiculo.modelo || '—'}
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Año</Text>

            <Text style={styles.dataValue}>{vehiculo.year}</Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Color</Text>

            <Text style={styles.dataValue}>
              {vehiculo.color || '—'}
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Kilometraje</Text>

            <Text style={styles.dataValue}>
              {formatoKm(vehiculo.kilometraje || 0)}
            </Text>
          </View>

          <View style={[styles.dataRow, styles.dataRowUltimo]}>
            <Text style={styles.dataLabel}>Registrado el</Text>

            <Text style={styles.dataValue}>
              {formatoFecha(vehiculo.fechaRegistro)}
            </Text>
          </View>
        </View>

        {/* =================================================
            SEGURO DEL VEHÍCULO
            =================================================
            Aseguradora, póliza, teléfono de asistencia y
            vencimiento. Si la aseguradora está en el
            directorio, el teléfono se completa solo y se
            puede llamar con un toque.
            ================================================= */}

        <View style={styles.card}>
          <View style={styles.seguroHeader}>
            <View style={styles.seguroIcono}>
              <Ionicons
                name="shield-checkmark"
                size={18}
                color={Paleta.primario}
              />
            </View>

            <View style={styles.seguroHeaderInfo}>
              <Text style={styles.seccionTitulo}>Seguro</Text>

              <Text style={styles.seguroSubtitulo} numberOfLines={1}>
                {sinDatosSeguro
                  ? 'Sin datos de la póliza'
                  : vehiculo.aseguradora || 'Aseguradora sin registrar'}
              </Text>
            </View>

            {estadoSeguro && coloresSeguro && (
              <View
                style={[
                  styles.docPill,
                  {
                    backgroundColor: coloresSeguro.fondo,
                    borderColor: coloresSeguro.borde,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.docPillTexto,
                    { color: coloresSeguro.texto },
                  ]}
                >
                  {estadoSeguro}
                </Text>
              </View>
            )}
          </View>

          {sinDatosSeguro ? (
            <>
              <Text style={styles.seguroVacioTexto}>
                Guarda la aseguradora, el número de póliza y el vencimiento
                para tener el teléfono de asistencia siempre a mano.
              </Text>

              <BotonNitro
                titulo="Agregar seguro"
                icono="add"
                variante="secundario"
                tamano="mediano"
                anchoCompleto
                onPress={editarVehiculo}
                style={styles.seguroBoton}
              />
            </>
          ) : (
            <>
              {vehiculo.numeroPoliza ? (
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Póliza</Text>

                  <Text style={styles.dataValue}>
                    {vehiculo.numeroPoliza}
                  </Text>
                </View>
              ) : null}

              {telefonoSeguro ? (
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Teléfono</Text>

                  <Text style={styles.dataValue}>{telefonoSeguro}</Text>
                </View>
              ) : null}

              {vehiculo.vencimientoSeguro ? (
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Vence</Text>

                  <Text style={styles.dataValue}>
                    {formatoFecha(vehiculo.vencimientoSeguro)}
                  </Text>
                </View>
              ) : null}

              {aseguradoraInfo ? (
                <Text style={styles.seguroEspecialidad}>
                  {aseguradoraInfo.especialidad}
                </Text>
              ) : null}

              <View style={styles.seguroAcciones}>
                {telefonoSeguro ? (
                  <BotonNitro
                    titulo="Llamar"
                    icono="call"
                    variante="primario"
                    tamano="mediano"
                    onPress={llamarAseguradora}
                    style={styles.seguroBotonMitad}
                  />
                ) : null}

                <BotonNitro
                  titulo="Editar"
                  icono="create-outline"
                  variante="secundario"
                  tamano="mediano"
                  onPress={editarVehiculo}
                  style={styles.seguroBotonMitad}
                />
              </View>
            </>
          )}
        </View>

        {/* =================================================
            KILOMETRAJE Y CAMBIO DE ACEITE
            =================================================
            El kilometraje se actualiza desde la app y con él
            se avisa (sonido + vibración) cuando toca el
            cambio de aceite.
            ================================================= */}

        <View style={styles.card}>
          <View style={styles.aceiteHeader}>
            <View style={styles.aceiteIcono}>
              <Ionicons
                name="water-outline"
                size={18}
                color={Paleta.primario}
              />
            </View>

            <View style={styles.aceiteInfo}>
              <Text style={styles.seccionTitulo}>Cambio de aceite</Text>

              <Text style={styles.aceiteSubtitulo}>
                Kilometraje: {formatoKm(vehiculo.kilometraje || 0)}
              </Text>
            </View>

            <View
              style={[
                styles.docPill,
                {
                  backgroundColor: coloresAceite.fondo,
                  borderColor: coloresAceite.borde,
                },
              ]}
            >
              <Text
                style={[styles.docPillTexto, { color: coloresAceite.texto }]}
              >
                {estadoAceite.estado}
              </Text>
            </View>
          </View>

          <View style={styles.aceiteBarra}>
            <View
              style={[
                styles.aceiteBarraRelleno,
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
              {estadoAceite.fechaCambio
                ? ` (${formatoFecha(estadoAceite.fechaCambio)})`
                : ''}
              {'  ·  '}Próximo: {formatoKm(estadoAceite.proximoCambio)}
            </Text>
          )}

          <TouchableOpacity
            style={styles.aceiteBoton}
            onPress={actualizarKilometraje}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Actualizar kilometraje"
          >
            <Ionicons name="speedometer-outline" size={18} color="#FFFFFF" />

            <Text style={styles.aceiteBotonTexto}>Actualizar kilometraje</Text>
          </TouchableOpacity>

          {/* REGISTRO RÁPIDO DEL CAMBIO DE ACEITE */}

          <TouchableOpacity
            style={styles.aceiteBotonSecundario}
            onPress={registrarCambioAceite}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Registrar cambio de aceite"
          >
            <Ionicons name="water-outline" size={18} color={Paleta.primario} />

            <Text style={styles.aceiteBotonSecundarioTexto}>
              Registrar cambio de aceite
            </Text>
          </TouchableOpacity>
        </View>

        {/* =================================================
            DOCUMENTOS (SOAT, tecnomecánica, seguro...)
            ================================================= */}

        <View style={styles.sectionHeaderFila}>
          <Text style={styles.sectionTituloFila}>Documentos</Text>

          <TouchableOpacity
            style={styles.botonAgregar}
            onPress={agregarDocumento}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Agregar documento"
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />

            <Text style={styles.botonAgregarTexto}>Agregar</Text>
          </TouchableOpacity>
        </View>

        {/* ESTADO: ERROR */}

        {errorDocumentos && (
          <View style={styles.errorDocs}>
            <Text style={styles.errorDocsTexto}>{errorDocumentos}</Text>
          </View>
        )}

        {/* ESTADO: CARGANDO */}

        {cargandoDocumentos && !errorDocumentos && (
          <View style={styles.cargandoDocs}>
            <ActivityIndicator size="small" color={Paleta.primario} />

            <Text style={styles.cargandoDocsTexto}>Cargando documentos...</Text>
          </View>
        )}

        {/* ESTADO: SIN DOCUMENTOS */}

        {!cargandoDocumentos && !errorDocumentos && documentos.length === 0 && (
          <View style={styles.vacioDocumentos}>
            <Text style={styles.vacioDocumentosIcono}>📄</Text>

            <Text style={styles.vacioDocumentosTitulo}>
              Sin documentos registrados
            </Text>

            <Text style={styles.vacioDocumentosTexto}>
              Registra el SOAT, la tecnomecánica y el seguro de{' '}
              {vehiculo.nombre} para conocer su estado en todo momento.
            </Text>

            <TouchableOpacity
              style={styles.vacioDocumentosBoton}
              onPress={agregarDocumento}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle" size={18} color="#FFFFFF" />

              <Text style={styles.vacioDocumentosBotonTexto}>
                Registrar documento
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* LISTA DE DOCUMENTOS */}

        {!errorDocumentos &&
          documentos.map((documento) => {
            const estado = calcularEstado(documento.vencimiento);
            const dias = diasRestantes(documento.vencimiento);
            const colores = ColoresEstado[estado];

            return (
              <View key={documento.id} style={styles.docCard}>
                <View style={styles.docFila}>
                  <View style={styles.docIcono}>
                    <Text style={styles.docIconoTexto}>
                      {ICONO_DOCUMENTO[documento.tipo]}
                    </Text>
                  </View>

                  <View style={styles.docInfo}>
                    <Text style={styles.docTitulo}>
                      {NOMBRES_DOCUMENTO[documento.tipo]}
                    </Text>

                    <Text style={styles.docMeta} numberOfLines={1}>
                      {documento.descripcion}
                      {documento.numero ? ` · N.º ${documento.numero}` : ''}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.docPill,
                      {
                        backgroundColor: colores.fondo,
                        borderColor: colores.borde,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.docPillTexto, { color: colores.texto }]}
                    >
                      {estado}
                    </Text>
                  </View>
                </View>

                <View style={styles.docFechas}>
                  <Text style={styles.docFecha}>
                    Vence {formatoFecha(documento.vencimiento)}
                  </Text>

                  <Text style={[styles.docDias, { color: colores.texto }]}>
                    {textoDiasVencimiento(dias)}
                  </Text>
                </View>

                <View style={styles.docAcciones}>
                  <TouchableOpacity
                    style={styles.docAccion}
                    onPress={() => editarDocumento(documento.id)}
                    accessibilityRole="button"
                    accessibilityLabel="Editar documento"
                  >
                    <Ionicons
                      name="create-outline"
                      size={15}
                      color={Paleta.primario}
                    />

                    <Text style={styles.docAccionTexto}>Editar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.docAccion}
                    onPress={() =>
                      confirmarEliminarDocumento(
                        documento.id,
                        `${NOMBRES_DOCUMENTO[documento.tipo]}: ${documento.descripcion}`
                      )
                    }
                    accessibilityRole="button"
                    accessibilityLabel="Eliminar documento"
                  >
                    <Ionicons name="trash-outline" size={15} color="#B91C1C" />

                    <Text style={[styles.docAccionTexto, styles.docAccionTextoPeligro]}>
                      Eliminar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

        {/* =================================================
            MANTENIMIENTOS (historial)
            ================================================= */}

        <View style={styles.sectionHeaderFila}>
          <Text style={styles.sectionTituloFila}>Mantenimientos</Text>

          <TouchableOpacity
            style={styles.botonAgregar}
            onPress={agregarMantenimiento}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Agregar mantenimiento"
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />

            <Text style={styles.botonAgregarTexto}>Agregar</Text>
          </TouchableOpacity>
        </View>

        {/* ESTADO: ERROR */}

        {errorMantenimientos && (
          <View style={styles.errorDocs}>
            <Text style={styles.errorDocsTexto}>{errorMantenimientos}</Text>
          </View>
        )}

        {/* ESTADO: CARGANDO */}

        {cargandoMantenimientos && !errorMantenimientos && (
          <View style={styles.cargandoDocs}>
            <ActivityIndicator size="small" color={Paleta.primario} />

            <Text style={styles.cargandoDocsTexto}>
              Cargando mantenimientos...
            </Text>
          </View>
        )}

        {/* ESTADO: SIN MANTENIMIENTOS */}

        {!cargandoMantenimientos &&
          !errorMantenimientos &&
          mantenimientos.length === 0 && (
            <View style={styles.vacioDocumentos}>
              <Text style={styles.vacioDocumentosIcono}>🛠️</Text>

              <Text style={styles.vacioDocumentosTitulo}>
                Sin mantenimientos registrados
              </Text>

              <Text style={styles.vacioDocumentosTexto}>
                Registra cambios de aceite, frenos, llantas y demás servicios
                de {vehiculo.nombre}.
              </Text>

              <TouchableOpacity
                style={styles.vacioDocumentosBoton}
                onPress={agregarMantenimiento}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle" size={18} color="#FFFFFF" />

                <Text style={styles.vacioDocumentosBotonTexto}>
                  Registrar mantenimiento
                </Text>
              </TouchableOpacity>
            </View>
          )}

        {/* LISTA DE MANTENIMIENTOS */}

        {!errorMantenimientos &&
          mantenimientos.map((mantenimiento) => (
            <View key={mantenimiento.id} style={styles.docCard}>
              <View style={styles.docFila}>
                <View style={styles.docIcono}>
                  <Text style={styles.docIconoTexto}>🔧</Text>
                </View>

                <View style={styles.docInfo}>
                  <Text style={styles.docTitulo}>{mantenimiento.tipo}</Text>

                  <Text style={styles.docMeta} numberOfLines={1}>
                    {mantenimiento.descripcion}
                  </Text>
                </View>

                <View
                  style={[
                    styles.docPill,
                    {
                      backgroundColor: Paleta.primarioClaro,
                      borderColor: '#C7D2FE',
                    },
                  ]}
                >
                  <Text
                    style={[styles.docPillTexto, { color: Paleta.primario }]}
                  >
                    {formatoDinero(mantenimiento.costo)}
                  </Text>
                </View>
              </View>

              <View style={styles.docFechas}>
                <Text style={styles.docFecha}>
                  {formatoFecha(mantenimiento.fecha)}
                  {mantenimiento.taller
                    ? ` · ${mantenimiento.taller}`
                    : ''}
                </Text>

                <Text style={[styles.docDias, { color: Paleta.primario }]}>
                  {formatoKm(mantenimiento.kilometraje)}
                </Text>
              </View>

              {mantenimiento.observaciones.trim() !== '' && (
                <Text style={styles.docNota}>
                  {mantenimiento.observaciones}
                </Text>
              )}

              <View style={styles.docAcciones}>
                <TouchableOpacity
                  style={styles.docAccion}
                  onPress={() => editarMantenimiento(mantenimiento.id)}
                  accessibilityRole="button"
                  accessibilityLabel="Editar mantenimiento"
                >
                  <Ionicons
                    name="create-outline"
                    size={15}
                    color={Paleta.primario}
                  />

                  <Text style={styles.docAccionTexto}>Editar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.docAccion}
                  onPress={() =>
                    confirmarEliminarMantenimiento(
                      mantenimiento.id,
                      mantenimiento.tipo
                    )
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Eliminar mantenimiento"
                >
                  <Ionicons name="trash-outline" size={15} color="#B91C1C" />

                  <Text
                    style={[
                      styles.docAccionTexto,
                      styles.docAccionTextoPeligro,
                    ]}
                  >
                    Eliminar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

        {/* =================================================
            RECORDATORIOS (persistentes)
            ================================================= */}

        <View style={styles.sectionHeaderFila}>
          <Text style={styles.sectionTituloFila}>Recordatorios</Text>

          <TouchableOpacity
            style={styles.botonAgregar}
            onPress={agregarRecordatorio}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Agregar recordatorio"
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />

            <Text style={styles.botonAgregarTexto}>Agregar</Text>
          </TouchableOpacity>
        </View>

        {/* ESTADO: ERROR */}

        {errorRecordatorios && (
          <View style={styles.errorDocs}>
            <Text style={styles.errorDocsTexto}>{errorRecordatorios}</Text>
          </View>
        )}

        {/* ESTADO: CARGANDO */}

        {cargandoRecordatorios && !errorRecordatorios && (
          <View style={styles.cargandoDocs}>
            <ActivityIndicator size="small" color={Paleta.primario} />

            <Text style={styles.cargandoDocsTexto}>
              Cargando recordatorios...
            </Text>
          </View>
        )}

        {/* ESTADO: SIN RECORDATORIOS */}

        {!cargandoRecordatorios &&
          !errorRecordatorios &&
          recordatorios.length === 0 && (
            <View style={styles.vacioDocumentos}>
              <Text style={styles.vacioDocumentosIcono}>🔔</Text>

              <Text style={styles.vacioDocumentosTitulo}>
                Sin recordatorios
              </Text>

              <Text style={styles.vacioDocumentosTexto}>
                Crea recordatorios de lavados, revisiones o trámites y se
                guardarán en tu cuenta.
              </Text>

              <TouchableOpacity
                style={styles.vacioDocumentosBoton}
                onPress={agregarRecordatorio}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle" size={18} color="#FFFFFF" />

                <Text style={styles.vacioDocumentosBotonTexto}>
                  Crear recordatorio
                </Text>
              </TouchableOpacity>
            </View>
          )}

        {/* LISTA DE RECORDATORIOS */}

        {!errorRecordatorios &&
          recordatorios.map((recordatorio) => {
            const colores = ColoresRecordatorio[recordatorio.estado];

            return (
              <View key={recordatorio.id} style={styles.docCard}>
                <View style={styles.docFila}>
                  <View style={styles.docIcono}>
                    <Text style={styles.docIconoTexto}>🔔</Text>
                  </View>

                  <View style={styles.docInfo}>
                    <Text style={styles.docTitulo} numberOfLines={1}>
                      {recordatorio.titulo}
                    </Text>

                    <Text style={styles.docMeta} numberOfLines={1}>
                      {recordatorio.descripcion || 'Sin descripción'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.docPill,
                      {
                        backgroundColor: colores.fondo,
                        borderColor: colores.borde,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.docPillTexto, { color: colores.texto }]}
                    >
                      {recordatorio.estado}
                    </Text>
                  </View>
                </View>

                <View style={styles.docFechas}>
                  <Text style={styles.docFecha}>
                    {formatoFecha(recordatorio.fecha)}
                  </Text>

                  <Text style={[styles.docDias, { color: colores.texto }]}>
                    {textoDiasVencimiento(diasRestantes(recordatorio.fecha))}
                  </Text>
                </View>

                <View style={styles.docAcciones}>
                  <TouchableOpacity
                    style={styles.docAccion}
                    onPress={() => alternarRecordatorio(recordatorio)}
                    accessibilityRole="button"
                    accessibilityLabel="Cambiar estado del recordatorio"
                  >
                    <Ionicons
                      name={
                        recordatorio.estado === 'Completado'
                          ? 'arrow-undo-outline'
                          : 'checkmark-circle-outline'
                      }
                      size={15}
                      color={Paleta.primario}
                    />

                    <Text style={styles.docAccionTexto}>
                      {recordatorio.estado === 'Completado'
                        ? 'Reabrir'
                        : 'Completar'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.docAccion}
                    onPress={() => editarRecordatorio(recordatorio.id)}
                    accessibilityRole="button"
                    accessibilityLabel="Editar recordatorio"
                  >
                    <Ionicons
                      name="create-outline"
                      size={15}
                      color={Paleta.primario}
                    />

                    <Text style={styles.docAccionTexto}>Editar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.docAccion}
                    onPress={() =>
                      confirmarEliminarRecordatorio(recordatorio.id)
                    }
                    accessibilityRole="button"
                    accessibilityLabel="Eliminar recordatorio"
                  >
                    <Ionicons name="trash-outline" size={15} color="#B91C1C" />

                    <Text
                      style={[
                        styles.docAccionTexto,
                        styles.docAccionTextoPeligro,
                      ]}
                    >
                      Eliminar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

        {/* =================================================
            GASTOS
            ================================================= */}

        <View style={styles.sectionHeaderFila}>
          <Text style={styles.sectionTituloFila}>Gastos</Text>

          <TouchableOpacity
            style={styles.botonAgregar}
            onPress={agregarGasto}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Agregar gasto"
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />

            <Text style={styles.botonAgregarTexto}>Agregar</Text>
          </TouchableOpacity>
        </View>

        {/* COSTOS MENSUALES AUTOMÁTICOS (SOAT, seguro, ...) */}

        <GastosMensuales vehiculoId={vehiculo.id} tipo={vehiculo.tipo} />

        {/* TOTAL ACUMULADO */}

        {!cargandoGastos && gastos.length > 0 && (
          <Text style={styles.totalGastos}>
            Total registrado: {formatoDinero(totalGastos)}
          </Text>
        )}

        {/* ESTADO: ERROR */}

        {errorGastos && (
          <View style={styles.errorDocs}>
            <Text style={styles.errorDocsTexto}>{errorGastos}</Text>
          </View>
        )}

        {/* ESTADO: CARGANDO */}

        {cargandoGastos && !errorGastos && (
          <View style={styles.cargandoDocs}>
            <ActivityIndicator size="small" color={Paleta.primario} />

            <Text style={styles.cargandoDocsTexto}>Cargando gastos...</Text>
          </View>
        )}

        {/* ESTADO: SIN GASTOS PROPIOS */}
        {/* (los costos mensuales se muestran arriba en su propia tarjeta) */}

        {!cargandoGastos && !errorGastos && gastosManuales.length === 0 && (
          <View style={styles.vacioDocumentos}>
            <Text style={styles.vacioDocumentosIcono}>💰</Text>

            <Text style={styles.vacioDocumentosTitulo}>
              Sin otros gastos registrados
            </Text>

            <Text style={styles.vacioDocumentosTexto}>
              Registra combustible extra, repuestos, lavados y otros gastos de{' '}
              {vehiculo.nombre} para conocer su costo real.
            </Text>

            <TouchableOpacity
              style={styles.vacioDocumentosBoton}
              onPress={agregarGasto}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle" size={18} color="#FFFFFF" />

              <Text style={styles.vacioDocumentosBotonTexto}>
                Registrar gasto
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* LISTA DE GASTOS */}

        {!errorGastos &&
          gastosManuales.map((gasto) => (
            <View key={gasto.id} style={styles.docCard}>
              <View style={styles.docFila}>
                <View style={styles.docIcono}>
                  <Text style={styles.docIconoTexto}>
                    {ICONO_GASTO[gasto.categoria]}
                  </Text>
                </View>

                <View style={styles.docInfo}>
                  <Text style={styles.docTitulo} numberOfLines={1}>
                    {NOMBRES_GASTO[gasto.categoria]}
                  </Text>

                  <Text style={styles.docMeta} numberOfLines={1}>
                    {gasto.descripcion}
                  </Text>
                </View>

                <View
                  style={[
                    styles.docPill,
                    {
                      backgroundColor: '#D1FAE5',
                      borderColor: '#A7F3D0',
                    },
                  ]}
                >
                  <Text style={[styles.docPillTexto, { color: '#047857' }]}>
                    {formatoDinero(gasto.valor)}
                  </Text>
                </View>
              </View>

              <View style={styles.docFechas}>
                <Text style={styles.docFecha}>
                  {formatoFecha(gasto.fecha)}
                </Text>
              </View>

              <View style={styles.docAcciones}>
                <TouchableOpacity
                  style={styles.docAccion}
                  onPress={() => editarGasto(gasto.id)}
                  accessibilityRole="button"
                  accessibilityLabel="Editar gasto"
                >
                  <Ionicons
                    name="create-outline"
                    size={15}
                    color={Paleta.primario}
                  />

                  <Text style={styles.docAccionTexto}>Editar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.docAccion}
                  onPress={() =>
                    confirmarEliminarGasto(
                      gasto.id,
                      `${NOMBRES_GASTO[gasto.categoria]}: ${gasto.descripcion}`
                    )
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Eliminar gasto"
                >
                  <Ionicons name="trash-outline" size={15} color="#B91C1C" />

                  <Text
                    style={[
                      styles.docAccionTexto,
                      styles.docAccionTextoPeligro,
                    ]}
                  >
                    Eliminar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

        {/* =================================================
            ACCIONES: EDITAR / ELIMINAR (al final)
            =================================================
            Van abajo del todo para no tapar la foto ni el
            resto de la información.
            ================================================= */}

        <View style={styles.accionesFila}>
          <BotonNitro
            titulo="Editar"
            icono="create-outline"
            variante="primario"
            tamano="mediano"
            onPress={editarVehiculo}
            style={styles.accionMitad}
          />

          <BotonNitro
            titulo="Eliminar"
            icono="trash-outline"
            variante="peligro"
            tamano="mediano"
            cargando={eliminando}
            onPress={confirmarEliminacion}
            style={styles.accionMitad}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/*
=======================================================
ESTILOS
=======================================================
Colores, gradientes, radios y sombras desde
constants/theme.ts.
=======================================================
*/

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Paleta.fondo,
  },

  content: {
    paddingBottom: 30,
  },

  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  centroTexto: {
    marginTop: 12,
    fontSize: 14,
    color: Paleta.textoSecundario,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Paleta.texto,
    marginBottom: 8,
    textAlign: 'center',
  },

  noFoundText: {
    fontSize: 14,
    color: Paleta.textoSecundario,
    textAlign: 'center',
    lineHeight: 20,
  },

  botonVolver: {
    marginTop: 20,
    backgroundColor: Paleta.primario,
    borderRadius: Radios.suave,
    paddingHorizontal: 26,
    paddingVertical: 13,
  },

  botonVolverTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },

  /* -----------------------------
     PORTADA
     ----------------------------- */

  portada: {
    paddingHorizontal: 16,
    marginTop: 16,
  },

  portadaMarco: {
    height: 250,
    width: '100%',
    borderRadius: Radios.grande,
    backgroundColor: '#F8FAFF',
    borderWidth: 1,
    borderColor: Paleta.borde,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...Sombras.tarjeta,
  },

  portadaFoto: {
    width: '100%',
    height: '100%',
  },

  portadaInfo: {
    marginTop: 14,
    paddingHorizontal: 4,
  },

  portadaPill: {
    alignSelf: 'flex-start',
    borderRadius: Radios.pastilla,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },

  portadaPillTexto: {
    fontSize: 12,
    fontWeight: '800',
  },

  portadaNombre: {
    fontSize: 24,
    fontWeight: '800',
    color: Paleta.texto,
  },

  portadaPlaca: {
    fontSize: 13,
    color: Paleta.textoSecundario,
    marginTop: 4,
  },

  /* -----------------------------
     ACCIONES
     ----------------------------- */

  accionesFila: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 26,
    marginBottom: 10,
  },

  accionMitad: {
    flex: 1,
  },

  /* -----------------------------
     TARJETA DE INFORMACIÓN
     ----------------------------- */

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
    marginBottom: 6,
  },

  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: Paleta.borde,
  },

  dataRowUltimo: {
    borderBottomWidth: 0,
  },

  dataLabel: {
    fontSize: 13,
    color: Paleta.textoSecundario,
    fontWeight: '600',
  },

  dataValue: {
    fontSize: 14,
    color: Paleta.texto,
    fontWeight: '700',
    maxWidth: '60%',
    textAlign: 'right',
  },

  /* -----------------------------
     SEGURO
     ----------------------------- */

  seguroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  seguroIcono: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Paleta.primarioClaro,
    borderWidth: 2,
    borderColor: Paleta.tinta,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    ...sombraDura(2, 2),
  },

  seguroHeaderInfo: {
    flex: 1,
    marginRight: 8,
  },

  seguroSubtitulo: {
    fontSize: 12,
    color: Paleta.textoSecundario,
    marginTop: 2,
  },

  seguroEspecialidad: {
    fontSize: 12,
    color: Paleta.textoSecundario,
    marginTop: 10,
  },

  seguroVacioTexto: {
    fontSize: 13,
    color: Paleta.textoSecundario,
    lineHeight: 19,
    marginTop: 12,
  },

  seguroBoton: {
    marginTop: 14,
  },

  seguroAcciones: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },

  seguroBotonMitad: {
    flex: 1,
  },

  /* -----------------------------
     CAMBIO DE ACEITE
     ----------------------------- */

  aceiteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  aceiteIcono: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Paleta.primarioClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  aceiteInfo: {
    flex: 1,
    marginRight: 8,
  },

  aceiteSubtitulo: {
    fontSize: 12,
    color: Paleta.textoSecundario,
    marginTop: 2,
  },

  aceiteBarra: {
    height: 8,
    borderRadius: 999,
    backgroundColor: Paleta.fondo,
    overflow: 'hidden',
    marginTop: 14,
  },

  aceiteBarraRelleno: {
    height: '100%',
    borderRadius: 999,
  },

  aceiteResumen: {
    fontSize: 13,
    color: Paleta.textoSecundario,
    marginTop: 10,
    lineHeight: 19,
  },

  aceiteMeta: {
    fontSize: 12,
    color: Paleta.textoSuave,
    marginTop: 6,
  },

  aceiteBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    borderRadius: Radios.suave,
    backgroundColor: Paleta.primario,
    marginTop: 16,
  },

  aceiteBotonTexto: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  aceiteBotonSecundario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    borderRadius: Radios.suave,
    borderWidth: 1.5,
    borderColor: Paleta.primario,
    backgroundColor: Paleta.primarioClaro,
    marginTop: 10,
  },

  aceiteBotonSecundarioTexto: {
    color: Paleta.primario,
    fontSize: 14,
    fontWeight: '800',
  },

  /* -----------------------------
     SECCIONES
     ----------------------------- */

  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: Paleta.texto,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 10,
  },

  /* -----------------------------
     CABECERA DE SECCIÓN CON BOTÓN
     ----------------------------- */

  sectionHeaderFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 10,
  },

  sectionTituloFila: {
    fontSize: 19,
    fontWeight: '800',
    color: Paleta.texto,
  },

  botonAgregar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Paleta.primario,
    borderRadius: Radios.pastilla,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  botonAgregarTexto: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* -----------------------------
     DOCUMENTOS: ESTADOS
     ----------------------------- */

  errorDocs: {
    backgroundColor: Paleta.peligroFondo,
    marginHorizontal: 16,
    borderRadius: Radios.suave,
    padding: 14,
  },

  errorDocsTexto: {
    fontSize: 13,
    color: '#B91C1C',
    lineHeight: 18,
  },

  cargandoDocs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Paleta.tarjeta,
    marginHorizontal: 16,
    borderRadius: Radios.tarjeta,
    padding: 16,
    ...Sombras.tarjeta,
  },

  cargandoDocsTexto: {
    fontSize: 13,
    color: Paleta.textoSecundario,
  },

  vacioDocumentos: {
    alignItems: 'center',
    backgroundColor: Paleta.tarjeta,
    marginHorizontal: 16,
    borderRadius: Radios.tarjeta,
    padding: 22,
    ...Sombras.tarjeta,
  },

  vacioDocumentosIcono: {
    fontSize: 36,
    marginBottom: 8,
  },

  vacioDocumentosTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: Paleta.texto,
  },

  vacioDocumentosTexto: {
    fontSize: 13,
    color: Paleta.textoSecundario,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },

  vacioDocumentosBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Paleta.primario,
    borderRadius: Radios.suave,
    paddingHorizontal: 20,
    height: 46,
    marginTop: 16,
  },

  vacioDocumentosBotonTexto: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* -----------------------------
     TARJETA DE DOCUMENTO
     ----------------------------- */

  docCard: {
    backgroundColor: Paleta.tarjeta,
    borderRadius: Radios.tarjeta,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    ...Sombras.tarjeta,
  },

  docFila: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  docIcono: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Paleta.fondo,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  docIconoTexto: {
    fontSize: 18,
  },

  docInfo: {
    flex: 1,
    marginRight: 8,
  },

  docTitulo: {
    fontSize: 15,
    fontWeight: '800',
    color: Paleta.texto,
  },

  docMeta: {
    fontSize: 12,
    color: Paleta.textoSecundario,
    marginTop: 2,
  },

  docPill: {
    borderRadius: Radios.pastilla,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },

  docPillTexto: {
    fontSize: 11,
    fontWeight: '800',
  },

  docFechas: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Paleta.borde,
  },

  docFecha: {
    fontSize: 13,
    color: Paleta.textoSecundario,
  },

  docDias: {
    fontSize: 12,
    fontWeight: '800',
  },

  docAcciones: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 10,
  },

  docAccion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  docAccionTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: Paleta.primario,
  },

  docAccionTextoPeligro: {
    color: '#B91C1C',
  },

  docNota: {
    fontSize: 12,
    color: Paleta.textoSecundario,
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 17,
  },

  totalGastos: {
    fontSize: 13,
    fontWeight: '800',
    color: Paleta.primario,
    marginHorizontal: 16,
    marginTop: -4,
    marginBottom: 10,
  },

  /* -----------------------------
     "PRÓXIMAMENTE" (fases futuras)
     ----------------------------- */

  proximamenteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Paleta.tarjeta,
    borderRadius: Radios.tarjeta,
    padding: 14,
    marginHorizontal: 16,
    ...Sombras.tarjeta,
  },

  proximamenteIcono: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Paleta.primarioClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  proximamenteInfo: {
    flex: 1,
  },

  proximamenteTitulo: {
    fontSize: 14,
    fontWeight: '800',
    color: Paleta.texto,
  },

  proximamenteTexto: {
    fontSize: 12,
    color: Paleta.textoSecundario,
    marginTop: 2,
    lineHeight: 17,
  },

  badgeProximamente: {
    backgroundColor: Paleta.fondo,
    borderRadius: Radios.pastilla,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },

  badgeProximamenteTexto: {
    fontSize: 9,
    fontWeight: '800',
    color: Paleta.textoSuave,
    textTransform: 'uppercase',
  },

  /* -----------------------------
     FORMULARIO DE RECORDATORIOS
     ----------------------------- */

  formCard: {
    backgroundColor: Paleta.tarjeta,
    borderRadius: Radios.tarjeta,
    padding: 16,
    marginHorizontal: 16,
    ...Sombras.tarjeta,
  },

  formLabel: {
    fontSize: 13,
    color: Paleta.textoSecundario,
    marginBottom: 10,
    fontWeight: '600',
  },

  formInput: {
    height: 48,
    backgroundColor: Paleta.fondo,
    borderWidth: 1,
    borderColor: Paleta.borde,
    borderRadius: Radios.suave,
    paddingHorizontal: 14,
    fontSize: 14,
    color: Paleta.texto,
  },

  formButton: {
    height: 48,
    borderRadius: Radios.suave,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },

  formButtonTouch: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radios.suave,
  },

  formButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  emptyCard: {
    backgroundColor: Paleta.tarjeta,
    borderRadius: Radios.tarjeta,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 10,
    alignItems: 'center',
    ...Sombras.tarjeta,
  },

  emptyText: {
    fontSize: 13,
    color: Paleta.textoSecundario,
    textAlign: 'center',
  },

  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Paleta.tarjeta,
    borderRadius: Radios.tarjeta,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 10,
    ...Sombras.tarjeta,
  },

  reminderItemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radios.suave,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  reminderItemIcon: {
    fontSize: 18,
  },

  reminderItemText: {
    flex: 1,
    fontSize: 13,
    color: Paleta.texto,
  },
});
