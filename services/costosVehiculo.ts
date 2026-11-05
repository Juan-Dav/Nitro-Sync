/*
=======================================================
NITRO SYNC - CONFIGURACIÓN DE COSTOS (FIRESTORE)
=======================================================

Guarda, por vehículo, DOS cosas en un mismo documento:

  usuarios/{uid}/vehiculos/{vehiculoId}/config/gastos

  {
    valores:     { soat: 480000, lavado: 25000, ... },
    mesGenerado: "2026-10"
  }

- valores: solo los conceptos que el usuario cambió (los
  demás usan el valor sugerido de data/costosVehiculo.ts).
- mesGenerado: el último mes para el que ya se crearon los
  gastos pendientes. Sirve para NO volver a crearlos si el
  usuario borra alguno y para reiniciar el ciclo al
  cambiar de mes.

Se usa el SDK oficial de Firestore (nunca fetch).

=======================================================
*/

import { doc, getDoc, setDoc } from 'firebase/firestore';

import { db } from '@/firebaseConfig';

export interface ConfigCostos {
  /** Valores personalizados por clave de concepto. */
  valores: Record<string, number>;

  /** Último mes generado ("AAAA-MM") o null. */
  mesGenerado: string | null;
}

function referencia(uid: string, vehiculoId: string) {
  return doc(
    db,
    'usuarios',
    uid,
    'vehiculos',
    vehiculoId,
    'config',
    'gastos'
  );
}

/* -------------------------------------------------------
   LEER
   ------------------------------------------------------- */

export async function leerConfigCostos(
  uid: string,
  vehiculoId: string
): Promise<ConfigCostos> {
  const foto = await getDoc(referencia(uid, vehiculoId));

  if (!foto.exists()) {
    return { valores: {}, mesGenerado: null };
  }

  const datos = foto.data() as {
    valores?: Record<string, number>;
    mesGenerado?: string | null;
  };

  return {
    valores: datos.valores ?? {},
    mesGenerado: datos.mesGenerado ?? null,
  };
}

/* -------------------------------------------------------
   GUARDAR (merge: no borra lo demás)
   ------------------------------------------------------- */

export async function guardarConfigCostos(
  uid: string,
  vehiculoId: string,
  cambios: Partial<ConfigCostos>
): Promise<void> {
  await setDoc(referencia(uid, vehiculoId), cambios, { merge: true });
}
