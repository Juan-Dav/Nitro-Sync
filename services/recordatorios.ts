/*
=======================================================
NITRO SYNC - RECORDATORIOS (FIRESTORE)
=======================================================

  usuarios/{uid}/vehiculos/{vehiculoId}/recordatorios

Recordatorios persistentes del vehículo (antes eran
locales y se perdían al cerrar la app).

SDK oficial de Firestore (nunca fetch).

=======================================================
*/

import {
  crearEnSubcoleccion,
  actualizarEnSubcoleccion,
  eliminarEnSubcoleccion,
  suscribirSubcoleccion,
} from './subcoleccion';

import type { NuevoRecordatorio, Recordatorio } from '@/types/models';

const NOMBRE = 'recordatorios';

export function suscribirRecordatorios(
  uid: string,
  vehiculoId: string,
  onData: (recordatorios: Recordatorio[]) => void,
  onError?: (error: Error) => void
): () => void {
  /* El más próximo primero. */

  return suscribirSubcoleccion<Recordatorio>(
    uid,
    vehiculoId,
    NOMBRE,
    'fecha',
    'asc',
    onData,
    onError
  );
}

export function crearRecordatorio(
  uid: string,
  vehiculoId: string,
  datos: NuevoRecordatorio
): Promise<string> {
  return crearEnSubcoleccion(uid, vehiculoId, NOMBRE, datos);
}

export function actualizarRecordatorio(
  uid: string,
  vehiculoId: string,
  recordatorioId: string,
  cambios: Partial<Recordatorio>
): Promise<void> {
  return actualizarEnSubcoleccion(
    uid,
    vehiculoId,
    NOMBRE,
    recordatorioId,
    cambios
  );
}

export function eliminarRecordatorio(
  uid: string,
  vehiculoId: string,
  recordatorioId: string
): Promise<void> {
  return eliminarEnSubcoleccion(
    uid,
    vehiculoId,
    NOMBRE,
    recordatorioId
  );
}
