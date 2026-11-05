/*
=======================================================
NITRO SYNC - NAVEGACIÓN DE NOTIFICACIONES
=======================================================

Valida y procesa rutas internas para notificaciones.
=======================================================
*/

import { router } from 'expo-router';
import type { NotificationResponse } from 'expo-notifications';

export type NotificationRouteType = 'soat' | 'tecnomecanica' | 'mantenimiento' | 'recordatorio' | 'gasto' | 'aceite';

export interface NotificationData {
  type?: string;
  url?: string;
  vehicleId?: string;
  userId?: string;
  documentId?: string;
  maintenanceId?: string;
  reminderId?: string;
  gastoId?: string;
  [key: string]: any;
}

const VALID_PATHS = new Set([
  '/(tabs)',
  '/(tabs)/index',
  '/(tabs)/explore',
  '/(tabs)/ajustes',
  '/vehicle/[id]',
  '/vehicle/formulario',
  '/vehicle/documento',
  '/vehicle/mantenimiento',
  '/vehicle/recordatorio',
  '/vehicle/gasto',
  '/vehicle/kilometraje',
]);

export function navigateFromNotificationData(data: NotificationData): void {
  try {
    const url = data.url;
    if (url && typeof url === 'string') {
      // Check if it's a relative internal path
      if (url.startsWith('/')) {
        router.push(url as any);
        return;
      }
    }

    const type = data.type;
    const vehicleId = data.vehicleId;

    if (!type || !vehicleId) return;

    switch (type) {
      case 'soat':
      case 'tecnomecanica':
      case 'documento':
        router.push(`/vehicle/${vehicleId}`);
        break;
      case 'mantenimiento':
        router.push(`/vehicle/${vehicleId}`);
        break;
      case 'recordatorio':
      case 'reminder':
        router.push(`/vehicle/${vehicleId}`);
        break;
      case 'gasto':
        router.push(`/vehicle/${vehicleId}`);
        break;
      default:
        if (vehicleId) {
          router.push(`/vehicle/${vehicleId}`);
        }
        break;
    }
  } catch (error) {
    console.error('Error navegando desde notificación:', error);
  }
}

export function handleNotificationResponse(response: NotificationResponse): void {
  const data = response.notification.request.content.data as NotificationData;
  navigateFromNotificationData(data);
}
