/*
=======================================================
NITRO SYNC - AJUSTES Y NOTIFICACIONES
=======================================================

Solo NOTIFICACIONES LOCALES.

Las notificaciones REMOTAS (push) se eliminaron:
en Expo Go para Android ya no están soportadas desde
el SDK 53 y provocaban un error al importar el paquete.

Incluye una PRUEBA RÁPIDA para comprobar que las
notificaciones locales funcionan en el teléfono.
=======================================================
*/

import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useVehiculos } from '@/context/VehiculosContext';
import { useConfirm, useAlerta } from '@/components/ui/confirm-dialog';
import { Paleta, Radios, Sombras, Gradientes } from '@/constants/theme';
import {
  getNotificationStatus,
  requestNotificationPermission,
  openSystemSettings,
  mapPermissionStatus,
  registerNotificationHandler,
  programarNotificacionDePrueba,
  notificacionesSoportadas,
} from '@/lib/notifications';
import {
  guardarPreferencias,
  leerPreferencias,
  sincronizarNotificacionesVehiculo,
  type PreferenciasNotificacion,
} from '@/services/notificationService';
import {
  guardarPreferenciasLocales,
  leerPreferenciasLocales,
} from '@/lib/preferenciasNotificaciones';

/* Texto del permiso en español (para la interfaz). */
function textoPermiso(estado: string): string {
  switch (estado) {
    case 'granted':
      return 'Concedido';
    case 'denied':
      return 'Denegado';
    default:
      return 'Sin decidir';
  }
}

export default function AjustesScreen() {
  const { user, logout } = useAuth();
  const { vehiculos } = useVehiculos();
  const confirmar = useConfirm();
  const alerta = useAlerta();
  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');
  const [loading, setLoading] = useState(false);
  const [notificaciones, setNotificaciones] = useState({
    activas: true,
    soat: true,
    tecnomecanica: true,
    seguro: true,
    mantenimientos: true,
    recordatorios: true,
  });

  const loadPermissionStatus = async (): Promise<string> => {
    const status = await getNotificationStatus();
    const estado = mapPermissionStatus(status);
    setPermissionStatus(estado);
    return estado;
  };

  const loadPreferences = async (): Promise<PreferenciasNotificacion> => {
    /* 1) Lo guardado en ESTE teléfono: inmediato y sin internet. */
    const locales = await leerPreferenciasLocales();
    setNotificaciones(locales);

    if (!user) return locales;

    /* 2) Firestore: mantiene las preferencias entre dispositivos. */
    const remotas = await leerPreferencias(user.uid);
    setNotificaciones(remotas);

    return remotas;
  };

  /*
  Al entrar a Ajustes: se registra el manejador de avisos y
  se leen el permiso del sistema y las preferencias.
  (La pregunta de permiso vive en el componente global
  components/ui/solicitud-permisos-notificaciones.tsx.)
  */
  const inicializar = async () => {
    await loadPermissionStatus();
    await loadPreferences();
  };

  useEffect(() => {
    registerNotificationHandler();

    /*
    Carga el permiso del sistema y las preferencias (locales y
    Firestore) al abrir Ajustes. Es una lectura externa intencional.
    */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    inicializar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const savePreferences = async (prefs: PreferenciasNotificacion) => {
    /*
    Se guarda SIEMPRE en el teléfono y, si hay sesión,
    también en Firestore (para conservarlas entre equipos).
    */
    if (!user) {
      await guardarPreferenciasLocales(prefs);
      return;
    }

    await guardarPreferencias(user.uid, prefs);
  };

  const solicitarPermisos = async () => {
    setLoading(true);
    const granted = await requestNotificationPermission();
    await loadPermissionStatus();
    setLoading(false);

    if (!granted) {
      const abrirAjustes = await confirmar({
        titulo: 'Permiso denegado',
        mensaje:
          'Las notificaciones están desactivadas. Puedes habilitarlas en los ajustes del sistema.',
        textoConfirmar: 'Abrir Ajustes',
        textoCancelar: 'Cancelar',
        icono: 'notifications-off-outline',
        peligro: true,
      });

      if (abrirAjustes) {
        await openSystemSettings();
      }
    }
  };

  /*
  ======================================================
  PRUEBA RÁPIDA DE NOTIFICACIONES LOCALES
  ======================================================

  Programa una notificación local para dentro de 10
  segundos. Sirve para verificar que funcionan:

   - Con la app ABIERTA: aparece el banner con el
     diseño de la aplicación (parte superior).
   - Con la app CERRADA o en segundo plano: aparece la
     notificación del sistema.
  ======================================================
  */
  const probarNotificacion = async () => {
    if (!notificacionesSoportadas) {
      await alerta({
        titulo: 'No disponible en web',
        mensaje:
          'Las notificaciones locales solo funcionan en el teléfono (Android o iOS). Abre la app en tu dispositivo para probarlas.',
        tipo: 'info',
        icono: 'phone-portrait-outline',
      });
      return;
    }

    setLoading(true);

    const conPermiso = await requestNotificationPermission();
    await loadPermissionStatus();

    if (!conPermiso) {
      setLoading(false);
      await alerta({
        titulo: 'Permiso necesario',
        mensaje:
          'Activa las notificaciones para poder ver la prueba. Toca "Solicitar permisos" o habilítalas en los ajustes del sistema.',
        tipo: 'advertencia',
        icono: 'notifications-off-outline',
      });
      return;
    }

    const programada = await programarNotificacionDePrueba(10);
    setLoading(false);

    if (programada) {
      await alerta({
        titulo: '¡Prueba programada!',
        mensaje:
          'En 10 segundos llegará una notificación de prueba. Déjala en la parte superior: verás el aviso con el diseño de la app.',
        tipo: 'exito',
        icono: 'checkmark-circle-outline',
      });
    } else {
      await alerta({
        titulo: 'No se pudo programar',
        mensaje:
          'Ocurrió un problema al programar la notificación. Inténtalo de nuevo.',
        tipo: 'error',
        icono: 'close-circle-outline',
      });
    }
  };

  const togglePreference = (key: keyof typeof notificaciones, value: boolean) => {
    const newPrefs = { ...notificaciones, [key]: value };
    setNotificaciones(newPrefs);
    savePreferences(newPrefs);

    /* Reprograma los avisos de todos los vehículos con las
       nuevas preferencias (por ejemplo, apagar una categoría
       cancela sus notificaciones). */
    if (user) {
      vehiculos.forEach((vehiculo) => {
        sincronizarNotificacionesVehiculo(user.uid, vehiculo.id);
      });
    }
  };

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
        mensaje: error?.message ?? 'Ocurrió un error inesperado. Inténtalo de nuevo.',
        tipo: 'error',
        icono: 'alert-circle-outline',
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <LinearGradient colors={Gradientes.marca} style={styles.hero}>
          <Text style={styles.heroTitle}>Ajustes</Text>
          <Text style={styles.heroSubtitle}>Notificaciones y preferencias</Text>
        </LinearGradient>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <LinearGradient
              colors={Gradientes.marca}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardIcono}
            >
              <Ionicons name="notifications" size={20} color="#ffffff" />
            </LinearGradient>

            <View style={styles.cardHeaderTexto}>
              <Text style={styles.sectionTitle}>
                Permisos de notificaciones
              </Text>

              <Text style={styles.cardSubtitulo}>
                {permissionStatus === 'granted'
                  ? '🔔 Permiso guardado en este dispositivo'
                  : 'Sin permiso guardado en este dispositivo'}
              </Text>
            </View>
          </View>

          {!notificacionesSoportadas ? (
            <Text style={styles.info}>
              Las notificaciones no están disponibles en la versión web. Instala
              la app en tu teléfono (Android o iOS) para recibir recordatorios de
              vencimientos, kilometraje y mantenimientos.
            </Text>
          ) : (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Estado actual:</Text>
                <Text style={styles.value}>{textoPermiso(permissionStatus)}</Text>
              </View>
              {permissionStatus === 'undetermined' && (
                <TouchableOpacity style={styles.button} onPress={solicitarPermisos} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Solicitar permisos</Text>}
                </TouchableOpacity>
              )}
              {permissionStatus === 'denied' && (
                <TouchableOpacity style={styles.button} onPress={openSystemSettings}>
                  <Text style={styles.buttonText}>Abrir ajustes del sistema</Text>
                </TouchableOpacity>
              )}
              {permissionStatus === 'granted' && (
                <Text style={styles.info}>Las notificaciones están habilitadas</Text>
              )}
            </>
          )}
        </View>

        {/* PRUEBA RÁPIDA DE NOTIFICACIONES LOCALES */}
        {notificacionesSoportadas && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Probar notificaciones</Text>

            <Text style={styles.info}>
              Envía una notificación local de prueba en 10 segundos para
              comprobar que funcionan en tu teléfono.
            </Text>

            <TouchableOpacity
              style={[styles.testButton, loading && styles.testButtonDisabled]}
              onPress={probarNotificacion}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={Gradientes.boton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.testButtonRelleno}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="notifications-outline" size={18} color="#fff" />
                    <Text style={styles.testButtonText}>Probar notificación (10 s)</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.hint}>
              Deja la app abierta: verás el aviso con el diseño de la app en la
              parte superior. Si la cierras, aparecerá la notificación del sistema.
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Notificaciones y recordatorios</Text>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Activar todas</Text>
            <Switch
              value={notificaciones.activas}
              onValueChange={(v) => togglePreference('activas', v)}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>SOAT</Text>
            <Switch
              value={notificaciones.soat && notificaciones.activas}
              disabled={!notificaciones.activas}
              onValueChange={(v) => togglePreference('soat', v)}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Revisión Técnico-Mecánica</Text>
            <Switch
              value={notificaciones.tecnomecanica && notificaciones.activas}
              disabled={!notificaciones.activas}
              onValueChange={(v) => togglePreference('tecnomecanica', v)}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Seguros</Text>
            <Switch
              value={notificaciones.seguro && notificaciones.activas}
              disabled={!notificaciones.activas}
              onValueChange={(v) => togglePreference('seguro', v)}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>
              Cambio de aceite (por kilometraje)
            </Text>
            <Switch
              value={notificaciones.mantenimientos && notificaciones.activas}
              disabled={!notificaciones.activas}
              onValueChange={(v) => togglePreference('mantenimientos', v)}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Recordatorios personalizados</Text>
            <Switch
              value={notificaciones.recordatorios && notificaciones.activas}
              disabled={!notificaciones.activas}
              onValueChange={(v) => togglePreference('recordatorios', v)}
            />
          </View>

          <Text style={styles.hint}>
            El aviso de cambio de aceite se calcula con el kilometraje que
            actualizas en cada vehículo (carro cada 5.000 km, moto cada 3.000 km)
            y llega con el sonido y la vibración del teléfono.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Aseguradoras</Text>

          <Text style={styles.info}>
            Consulta los teléfonos de asistencia, WhatsApp y portales de las
            aseguradoras de vehículos más usadas en Colombia.
          </Text>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push('/aseguradoras')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Abrir directorio de aseguradoras"
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={Paleta.primario}
            />

            <Text style={styles.linkRowTexto}>Abrir directorio</Text>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={Paleta.textoSuave}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Carga masiva</Text>

          <Text style={styles.info}>
            Importa muchos vehículos de una vez desde un Excel, con su
            aseguradora, póliza y vencimiento del seguro.
          </Text>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push('/carga-masiva')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Abrir carga masiva desde Excel"
          >
            <Ionicons
              name="documents-outline"
              size={20}
              color={Paleta.primario}
            />

            <Text style={styles.linkRowTexto}>Importar desde Excel</Text>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={Paleta.textoSuave}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cuenta</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={cerrarSesion}>
            <Ionicons name="log-out-outline" size={20} color="#B91C1C" />
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Paleta.fondo },
  scroll: { paddingBottom: 30 },
  hero: { padding: 24, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  heroTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  card: { backgroundColor: Paleta.tarjeta, borderRadius: Radios.tarjeta, padding: 16, margin: 16, marginTop: 16, ...Sombras.tarjeta },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Paleta.texto, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardIcono: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardHeaderTexto: { flex: 1 },
  cardSubtitulo: { fontSize: 12, color: Paleta.textoSecundario, marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  label: { fontSize: 13, color: Paleta.textoSecundario },
  value: { fontSize: 13, fontWeight: '700', color: Paleta.texto, textTransform: 'capitalize' },
  button: { backgroundColor: Paleta.primario, borderRadius: Radios.suave, padding: 12, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '700' },
  info: { fontSize: 13, color: Paleta.textoSecundario, marginTop: 6, lineHeight: 19 },
  hint: { fontSize: 12, color: Paleta.textoSuave, marginTop: 10, lineHeight: 17 },
  testButton: { height: 50, borderRadius: Radios.suave, overflow: 'hidden', marginTop: 14 },
  testButtonDisabled: { opacity: 0.7 },
  testButtonRelleno: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  testButtonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Paleta.borde },
  switchLabel: { fontSize: 14, color: Paleta.texto, flex: 1, marginRight: 10 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: Paleta.borde, marginTop: 10 },
  linkRowTexto: { flex: 1, fontSize: 14, fontWeight: '800', color: Paleta.primario },
  logoutButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  logoutText: { color: '#B91C1C', fontWeight: '700' },
});
