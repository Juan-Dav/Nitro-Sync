/*
=======================================================
NITRO SYNC - MANTENIMIENTOS (FIRESTORE)
=======================================================

  usuarios/{uid}/vehiculos/{vehiculoId}/mantenimientos

Historial de mantenimientos del vehículo: cambios de
aceite, frenos, llantas, batería, etc.

SDK oficial de Firestore (nunca fetch).

=======================================================
*/

import {
  crearEnSubcoleccion,
  actualizarEnSubcoleccion,
  eliminarEnSubcoleccion,
  suscribirSubcoleccion,
} from './subcoleccion';

import type { Mantenimiento, NuevoMantenimiento } from '@/types/models';

const NOMBRE = 'mantenimientos';

export function suscribirMantenimientos(
  uid: string,
  vehiculoId: string,
  onData: (mantenimientos: Mantenimiento[]) => void,
  onError?: (error: Error) => void
): () => void {
  /* El más reciente primero. */

  return suscribirSubcoleccion<Mantenimiento>(
    uid,
    vehiculoId,
    NOMBRE,
    'fecha',
    'desc',
    onData,
    onError
  );
}

export function crearMantenimiento(
  uid: string,
  vehiculoId: string,
  datos: NuevoMantenimiento
): Promise<string> {
  return crearEnSubcoleccion(uid, vehiculoId, NOMBRE, datos);
}

export function actualizarMantenimiento(
  uid: string,
  vehiculoId: string,
  mantenimientoId: string,
  cambios: Partial<Mantenimiento>
): Promise<void> {
  return actualizarEnSubcoleccion(
    uid,
    vehiculoId,
    NOMBRE,
    mantenimientoId,
    cambios
  );
}

export function eliminarMantenimiento(
  uid: string,
  vehiculoId: string,
  mantenimientoId: string
): Promise<void> {
  return eliminarEnSubcoleccion(
    uid,
    vehiculoId,
    NOMBRE,
    mantenimientoId
  );
}
