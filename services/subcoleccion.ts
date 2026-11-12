/*
=======================================================
NITRO SYNC - SUBCOLECCIONES GENÉRICAS
=======================================================

Primitivas reutilizables para cualquier subcolección de
un vehículo:

  usuarios/{uid}/vehiculos/{vehiculoId}/{nombre}/...

Se usan desde los servicios tipados:

  services/mantenimientos.ts
  services/recordatorios.ts
  services/gastos.ts

Se utiliza el SDK oficial de Firestore (nunca fetch).

=======================================================
*/

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  type DocumentData,
  type QuerySnapshot,
  type WithFieldValue,
} from 'firebase/firestore';

import { db } from '@/firebaseConfig';

/* -------------------------------------------------------
   REFERENCIAS
   ------------------------------------------------------- */

export function subcoleccionRef(
  uid: string,
  vehiculoId: string,
  nombre: string
) {
  return collection(db, 'usuarios', uid, 'vehiculos', vehiculoId, nombre);
}

export function documentoSubcoleccionRef(
  uid: string,
  vehiculoId: string,
  nombre: string,
  registroId: string
) {
  return doc(
    db,
    'usuarios',
    uid,
    'vehiculos',
    vehiculoId,
    nombre,
    registroId
  );
}

/* -------------------------------------------------------
   SUSCRIPCIÓN EN TIEMPO REAL

   orden: campo por el cual ordenar y 'asc' | 'desc'.
   La función devuelta limpia el listener al desmontar.
   ------------------------------------------------------- */

export function suscribirSubcoleccion<T>(
  uid: string,
  vehiculoId: string,
  nombre: string,
  orden: string,
  direccion: 'asc' | 'desc',
  onData: (registros: T[]) => void,
  onError?: (error: Error) => void
): () => void {
  const consulta = query(
    subcoleccionRef(uid, vehiculoId, nombre),
    orderBy(orden, direccion)
  );

  return onSnapshot(
    consulta,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const registros = snapshot.docs.map(
        (registro) =>
          ({
            id: registro.id,
            ...registro.data(),
          }) as T
      );

      onData(registros);
    },
    (error) => {
      onError?.(error);
    }
  );
}

/* -------------------------------------------------------
   CREAR (Firestore genera el id)
   ------------------------------------------------------- */

export async function crearEnSubcoleccion<T>(
  uid: string,
  vehiculoId: string,
  nombre: string,
  datos: T
): Promise<string> {
  const referencia = await addDoc(
    subcoleccionRef(uid, vehiculoId, nombre),
    datos as unknown as WithFieldValue<DocumentData>
  );

  return referencia.id;
}

/* -------------------------------------------------------
   ACTUALIZAR (solo los campos enviados)
   ------------------------------------------------------- */

export async function actualizarEnSubcoleccion(
  uid: string,
  vehiculoId: string,
  nombre: string,
  registroId: string,
  cambios: Record<string, unknown>
): Promise<void> {
  await updateDoc(
    documentoSubcoleccionRef(uid, vehiculoId, nombre, registroId),
    cambios
  );
}

/* -------------------------------------------------------
   ELIMINAR
   ------------------------------------------------------- */

export async function eliminarEnSubcoleccion(
  uid: string,
  vehiculoId: string,
  nombre: string,
  registroId: string
): Promise<void> {
  await deleteDoc(
    documentoSubcoleccionRef(uid, vehiculoId, nombre, registroId)
  );
}
