/*
=======================================================
NITRO SYNC - NOTIFICACIONES (SOLO WEB)
=======================================================

En web, expo-notifications no tiene soporte nativo. Al
importarlo, su efecto secundario emite el aviso:

  «[expo-notifications] Listening to push token changes
   is not yet fully supported on web. Adding a listener
   will have no effect».

Para evitarlo, Metro usa ESTE archivo
(`notifications.web.ts`) en lugar de `notifications.ts`
cuando compila para web.

Aquí NO se importa expo-notifications en tiempo de
ejecución (solo se usan sus TIPOS, que se borran al
compilar). Toda la API queda como "no-op" segura para que
las pantallas compartidas funcionen igual en Android, iOS
y web.
=======================================================
*/

import type {
  Notification,
  NotificationPermissionsStatus,
  NotificationRequest,
  NotificationResponse,
  SchedulableNotificationTriggerInput,
} from 'expo-notifications';

export type NotificationStatus = 'undetermined' | 'granted' | 'denied';

/* En web no hay notificaciones nativas. */
export const notificacionesSoportadas = false;

/* Identificador del canal de Android (se mantiene por compatibilidad). */
export const CANAL_RECORDATORIOS = 'vehicular-recordatorios-v2';

export interface ScheduleOptions {
  title: string;
  body: string;
  data?: Record<string, any>;
  trigger: SchedulableNotificationTriggerInput;
}

/** Suscripción cancelable (misma forma que expo-notifications). */
export interface SuscripcionNotificacion {
  remove: () => void;
}

const SUSCRIPCION_VACIA: SuscripcionNotificacion = { remove: () => {} };

/* ------------------ Permisos ------------------ */

export function registerNotificationHandler(): void {
  /* No aplica en web. */
}

export async function getNotificationStatus(): Promise<NotificationPermissionsStatus> {
  return {
    granted: false,
    status: 'denied',
    canAskAgain: false,
  } as unknown as NotificationPermissionsStatus;
}

export function mapPermissionStatus(
  status: NotificationPermissionsStatus,
): NotificationStatus {
  if (status.granted) return 'granted';
  if ((status.status as string) === 'undetermined') return 'undetermined';
  return 'denied';
}

export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function openSystemSettings(): Promise<void> {
  /* No aplica en web. */
}

/* ------------------ Android ------------------ */

export async function ensureAndroidChannel(): Promise<void> {
  /* El canal solo existe en Android. */
}

/* ------------------ Programar / cancelar ------------------ */

export async function scheduleLocalNotification(
  _options: ScheduleOptions,
): Promise<string | null> {
  return null;
}

export async function programarNotificacionDePrueba(
  _segundos = 10,
): Promise<boolean> {
  return false;
}

export async function programarAvisoInmediato(
  _opciones: { title: string; body: string; data?: Record<string, any> },
): Promise<string | null> {
  return null;
}

export async function cancelNotification(_id: string): Promise<void> {
  /* No aplica en web. */
}

export async function cancelNotifications(_ids: string[]): Promise<void> {
  /* No aplica en web. */
}

export async function cancelAllNotifications(): Promise<void> {
  /* No aplica en web. */
}

export async function getScheduledNotifications(): Promise<NotificationRequest[]> {
  return [];
}

/* ------------------ Escuchar notificaciones ------------------ */

export async function getLastNotificationResponseAsync(): Promise<NotificationResponse | null> {
  return null;
}

export function addNotificationReceivedListener(
  _listener: (notification: Notification) => void,
): SuscripcionNotificacion {
  return SUSCRIPCION_VACIA;
}

export function addNotificationResponseReceivedListener(
  _listener: (response: NotificationResponse) => void,
): SuscripcionNotificacion {
  return SUSCRIPCION_VACIA;
}
