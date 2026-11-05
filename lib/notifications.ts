/*
=======================================================
NITRO SYNC - MÓDULO DE NOTIFICACIONES (LOCALES)
=======================================================

Módulo reutilizable para manejar permisos y
NOTIFICACIONES LOCALES.

NOTA IMPORTANTE:
Las notificaciones REMOTAS (push) fueron ELIMINADAS.

En Expo Go para Android las push ya no están soportadas
desde el SDK 53. Además, importar el paquete COMPLETO
(`import * as Notifications from 'expo-notifications'`)
rompe la app porque su índice reexporta `topicSubscription`
y exige el módulo nativo `ExpoTopicSubscriptionModule`, que
Expo Go no incluye. Por eso abajo se importan solo los
submódulos de notificaciones LOCALES (ver "IMPORTACIÓN
SEGURA DE expo-notifications").

Ahora solo se usan notificaciones LOCALES, que sí
funcionan en Expo Go y en un development build.

Características:
- Consultar y solicitar permisos de notificaciones.
- Abrir los ajustes del sistema.
- Configurar el canal de Android con el color de marca.
- Programar, cancelar y listar notificaciones locales.
- Programar una notificación de PRUEBA.
=======================================================
*/

/*
=======================================================
IMPORTACIÓN SEGURA DE expo-notifications
=======================================================

Al importar el paquete completo:

  import * as Notifications from 'expo-notifications';

Expo Go (Android) lanza este error al cargar la app:

  Error: Cannot find native module 'ExpoTopicSubscriptionModule'

La causa es que el índice del paquete reexporta
`topicSubscription` (suscripción a temas push de Firebase)
y ese submódulo ejecuta `requireNativeModule(...)` de un
módulo nativo que Expo Go NO incluye. Como los reexports se
evalúan de forma anticipada, el error ocurre al importar el
paquete, aunque nunca usemos los temas push.

La solución es importar SOLO los submódulos que esta app
realmente usa (notificaciones LOCALES), que sí existen en
Expo Go. Los TIPOS se siguen importando del paquete: al ser
`import type`, se borran al compilar y no ejecutan nada.
=======================================================
*/
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import {
  getPermissionsAsync,
  requestPermissionsAsync,
} from 'expo-notifications/build/NotificationPermissions';
import { setNotificationChannelAsync } from 'expo-notifications/build/setNotificationChannelAsync';
import { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
import { cancelScheduledNotificationAsync } from 'expo-notifications/build/cancelScheduledNotificationAsync';
import { cancelAllScheduledNotificationsAsync } from 'expo-notifications/build/cancelAllScheduledNotificationsAsync';
import { getAllScheduledNotificationsAsync } from 'expo-notifications/build/getAllScheduledNotificationsAsync';
import {
  addNotificationReceivedListener as addNotificationReceivedListenerNativo,
  addNotificationResponseReceivedListener as addNotificationResponseReceivedListenerNativo,
  getLastNotificationResponseAsync as getLastNotificationResponseAsyncNativo,
} from 'expo-notifications/build/NotificationsEmitter';
import {
  AndroidImportance,
  AndroidNotificationVisibility,
} from 'expo-notifications/build/NotificationChannelManager.types';
import {
  AndroidNotificationPriority,
  SchedulableTriggerInputTypes,
} from 'expo-notifications/build/Notifications.types';

import { AppState, Platform, Linking } from 'react-native';
import type {
  Notification,
  NotificationPermissionsStatus,
  NotificationRequest,
  NotificationResponse,
  SchedulableNotificationTriggerInput,
} from 'expo-notifications';

export type NotificationStatus = 'undetermined' | 'granted' | 'denied';

/*
expo-notifications no ofrece soporte real en web: sus
métodos lanzan errores ("not available on web"). Este
indicador permite omitir la lógica nativa en navegador.
*/
export const notificacionesSoportadas = Platform.OS !== 'web';

/*
Identificador del canal de Android.

IMPORTANTE: Android NO permite cambiar la configuración de un
canal que ya existe (importancia, sonido, pantalla bloqueada).
Por eso, cuando se mejoró el canal para que los avisos se vean
sobre otras aplicaciones y en la pantalla bloqueada, se cambió
el identificador a la versión "v2": así el teléfono crea un
canal NUEVO con la configuración correcta en lugar de
reutilizar el antiguo.
*/
export const CANAL_RECORDATORIOS = 'vehicular-recordatorios-v2';

/* Color de marca para el icono de la notificación. */
const COLOR_MARCA = '#6366F1';

/* Patrón de vibración (espera, vibra, pausa, vibra...). */
const VIBRACION = [0, 250, 250, 250];

export interface ScheduleOptions {
  title: string;
  body: string;
  data?: Record<string, any>;
  trigger: SchedulableNotificationTriggerInput;
}

/*
=======================================================
CONFIGURACIÓN DEL HANDLER DE NOTIFICACIONES
=======================================================

Debe ejecutarse una sola vez en la inicialización.
=======================================================
*/
let handlerRegistered = false;

export function registerNotificationHandler() {
  if (handlerRegistered || !notificacionesSoportadas) {
    return;
  }

  setNotificationHandler({
    handleNotification: async () => {
      /*
      Cuando la aplicación está ABIERTA mostramos nuestro
      propio banner (con el diseño de la app), por eso no
      pedimos el banner nativo. Cuando está en segundo
      plano o cerrada, el sistema muestra la notificación
      normalmente.
      */
      const appAbierta = AppState.currentState === 'active';

      return {
        shouldShowBanner: !appAbierta,
        shouldShowList: !appAbierta,
        shouldPlaySound: true,
        shouldSetBadge: false,
      };
    },
  });

  handlerRegistered = true;
}

/*
=======================================================
PERMISOS
=======================================================
*/

export async function getNotificationStatus(): Promise<NotificationPermissionsStatus> {
  if (!notificacionesSoportadas) {
    return {
      granted: false,
      status: 'denied',
      canAskAgain: false,
    } as unknown as NotificationPermissionsStatus;
  }

  return await getPermissionsAsync();
}

export function mapPermissionStatus(status: NotificationPermissionsStatus): NotificationStatus {
  if (status.granted) return 'granted';
  if ((status.status as string) === 'undetermined') return 'undetermined';
  return 'denied';
}

/*
=======================================================
SOLICITAR PERMISOS
=======================================================

Devuelve true si se concedieron permisos.
=======================================================
*/
export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificacionesSoportadas) {
    return false;
  }

  const current = await getNotificationStatus();
  if (current.granted) return true;

  const result = await requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
    android: {
      allowAlert: true,
      allowSound: true,
      allowBadge: true,
    },
  } as any);

  return result.granted;
}

/*
=======================================================
ABRIR AJUSTES DEL SISTEMA
=======================================================
*/
export async function openSystemSettings(): Promise<void> {
  await Linking.openSettings();
}

/*
=======================================================
CONFIGURACIÓN DE ANDROID
=======================================================

Crea el canal de notificaciones necesario para Android,
con el color y la vibración de la marca.
=======================================================
*/
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  /*
  Si el canal ya existe, Android no permite cambiarlo; si
  algo no estuviera soportado en Expo Go, tampoco debe
  romper el resto de la aplicación.
  */
  try {
    await setNotificationChannelAsync(CANAL_RECORDATORIOS, {
      name: 'Recordatorios del vehículo',
      description:
        'Avisos de vencimiento de documentos, kilometraje y recordatorios de Nitro Sync.',
      /* MAX = aparece como aviso en pantalla, con sonido y vibración. */
      importance: AndroidImportance.MAX as any,
      vibrationPattern: VIBRACION,
      lightColor: COLOR_MARCA,
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      showBadge: true,
      lockscreenVisibility: AndroidNotificationVisibility.PUBLIC as any,
    });
  } catch (error) {
    console.warn('No se pudo configurar el canal de notificaciones:', error);
  }
}

/*
=======================================================
NOTIFICACIONES LOCALES
=======================================================
*/

export async function scheduleLocalNotification(
  options: ScheduleOptions,
): Promise<string | null> {
  if (!notificacionesSoportadas) {
    return null;
  }

  try {
    /* Garantiza que el canal de Android exista antes de programar. */
    await ensureAndroidChannel();

    const id = await scheduleNotificationAsync({
      content: {
        title: options.title,
        body: options.body,
        data: options.data || {},
        color: COLOR_MARCA,
        sound: 'default',
        vibrate: VIBRACION,
        priority: AndroidNotificationPriority.HIGH as any,
      },
      trigger: options.trigger as any,
    });
    return id;
  } catch (error) {
    console.error('Error al programar notificación:', error);
    return null;
  }
}

/*
=======================================================
AVISO INMEDIATO
=======================================================

Muestra una notificación local AHORA MISMO (por ejemplo,
cuando el cambio de aceite ya se pasó del kilometraje).
Usa el mismo diseño (color de marca, sonido y vibración).
=======================================================
*/
export async function programarAvisoInmediato(opciones: {
  title: string;
  body: string;
  data?: Record<string, any>;
}): Promise<string | null> {
  if (!notificacionesSoportadas) {
    return null;
  }

  try {
    await ensureAndroidChannel();

    const id = await scheduleNotificationAsync({
      content: {
        title: opciones.title,
        body: opciones.body,
        data: opciones.data || {},
        color: COLOR_MARCA,
        sound: 'default',
        vibrate: VIBRACION,
        priority: AndroidNotificationPriority.HIGH as any,
      },
      /* trigger null = mostrar inmediatamente. */
      trigger: null,
    });

    return id;
  } catch (error) {
    console.error('Error al mostrar la notificación:', error);
    return null;
  }
}

/*
=======================================================
NOTIFICACIÓN DE PRUEBA
=======================================================

Programa una notificación local unos segundos después,
para comprobar que las notificaciones funcionan.
=======================================================
*/
export async function programarNotificacionDePrueba(
  segundos = 10,
): Promise<boolean> {
  if (!notificacionesSoportadas) {
    return false;
  }

  await ensureAndroidChannel();

  const id = await scheduleLocalNotification({
    title: '¡Notificaciones activas! 🔔',
    body: 'Prueba de Nitro Sync. Si ves este aviso, las notificaciones locales funcionan.',
    data: { type: 'prueba' },
    trigger: {
      type: SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: segundos,
      channelId: CANAL_RECORDATORIOS,
    } as any,
  });

  return !!id;
}

export async function cancelNotification(id: string): Promise<void> {
  try {
    await cancelScheduledNotificationAsync(id);
  } catch (error) {
    console.error('Error al cancelar notificación:', error);
  }
}

export async function cancelNotifications(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => cancelNotification(id)));
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    await cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error al cancelar todas las notificaciones:', error);
  }
}

export async function getScheduledNotifications(): Promise<NotificationRequest[]> {
  if (!notificacionesSoportadas) {
    return [];
  }

  return await getAllScheduledNotificationsAsync();
}

/*
=======================================================
ESCUCHAR NOTIFICACIONES
=======================================================

Estas funciones envuelven los "listeners" de
expo-notifications para que las pantallas NO tengan que
importar el paquete directamente. Así, en web, Metro usa
`notifications.web.ts` (sin expo-notifications) y
desaparece el aviso:

  «[expo-notifications] Listening to push token changes
   is not yet fully supported on web».

En web devuelven una suscripción vacía (no-op).
=======================================================
*/

/** Suscripción cancelable (misma forma que expo-notifications). */
export interface SuscripcionNotificacion {
  remove: () => void;
}

const SUSCRIPCION_VACIA: SuscripcionNotificacion = { remove: () => {} };

/** Última notificación tocada por el usuario (o null). */
export async function getLastNotificationResponseAsync(): Promise<NotificationResponse | null> {
  if (!notificacionesSoportadas) {
    return null;
  }

  return await getLastNotificationResponseAsyncNativo();
}

/** Se dispara cuando llega una notificación con la app abierta. */
export function addNotificationReceivedListener(
  listener: (notification: Notification) => void,
): SuscripcionNotificacion {
  if (!notificacionesSoportadas) {
    return SUSCRIPCION_VACIA;
  }

  return addNotificationReceivedListenerNativo(listener);
}

/** Se dispara cuando el usuario TOCA una notificación. */
export function addNotificationResponseReceivedListener(
  listener: (response: NotificationResponse) => void,
): SuscripcionNotificacion {
  if (!notificacionesSoportadas) {
    return SUSCRIPCION_VACIA;
  }

  return addNotificationResponseReceivedListenerNativo(listener);
}
