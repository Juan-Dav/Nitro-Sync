/*
=======================================================
NITRO SYNC - GASTOS (FIRESTORE)
=======================================================

  usuarios/{uid}/vehiculos/{vehiculoId}/gastos

Gastos del vehículo: combustible, mantenimiento,
repuestos, SOAT, seguro, lavado, etc.

SDK oficial de Firestore (nunca fetch).

=======================================================
*/

import {
  crearEnSubcoleccion,
  actualizarEnSubcoleccion,
  eliminarEnSubcoleccion,
  suscribirSubcoleccion,
} from './subcoleccion';

import type { Gasto, NuevoGasto } from '@/types/models';

const NOMBRE = 'gastos';

export function suscribirGastos(
  uid: string,
  vehiculoId: string,
  onData: (gastos: Gasto[]) => void,
  onError?: (error: Error) => void
): () => void {
  /* El más reciente primero. */

  return suscribirSubcoleccion<Gasto>(
    uid,
    vehiculoId,
    NOMBRE,
    'fecha',
    'desc',
    onData,
    onError
  );
}

export function crearGasto(
  uid: string,
  vehiculoId: string,
  datos: NuevoGasto
): Promise<string> {
  return crearEnSubcoleccion(uid, vehiculoId, NOMBRE, datos);
}

export function actualizarGasto(
  uid: string,
  vehiculoId: string,
  gastoId: string,
  cambios: Partial<Gasto>
): Promise<void> {
  return actualizarEnSubcoleccion(uid, vehiculoId, NOMBRE, gastoId, cambios);
}

export function eliminarGasto(
  uid: string,
  vehiculoId: string,
  gastoId: string
): Promise<void> {
  return eliminarEnSubcoleccion(uid, vehiculoId, NOMBRE, gastoId);
}
