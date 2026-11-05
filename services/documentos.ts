/*
=======================================================
NITRO SYNC - SERVICIO DE DOCUMENTOS (FIRESTORE)
=======================================================

Ubicación de los datos:

  usuarios/{uid}/vehiculos/{vehiculoId}/documentos/{id}

Documentos de cada vehículo: SOAT, tecnomecánica,
seguro, licencia y otros.

Todas las operaciones están limitadas al usuario
autenticado (además de firestore.rules).

El ESTADO (Vigente / Proximo a vencer / Vencido) NO se
guarda: se calcula con calcularEstado(vencimiento).

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
} from 'firebase/firestore';

import { db } from '@/firebaseConfig';

import type { Documento, NuevoDocumento } from '@/types/models';

/*
=======================================================
REFERENCIAS
=======================================================
*/

export function documentosCol(uid: string, vehiculoId: string) {
  return collection(
    db,
    'usuarios',
    uid,
    'vehiculos',
    vehiculoId,
    'documentos'
  );
}

export function documentoRef(
  uid: string,
  vehiculoId: string,
  documentoId: string
) {
  return doc(db, 'usuarios', uid, 'vehiculos', vehiculoId, 'documentos', documentoId);
}

/*
=======================================================
SUSCRIPCIÓN EN TIEMPO REAL

Los documentos llegan ordenados por fecha de
vencimiento (el más próximo primero). La función
devuelta limpia el listener al desmontar.
=======================================================
*/

export function suscribirDocumentos(
  uid: string,
  vehiculoId: string,
  onData: (documentos: Documento[]) => void,
  onError?: (error: Error) => void
): () => void {
  const consulta = query(
    documentosCol(uid, vehiculoId),
    orderBy('vencimiento', 'asc')
  );

  return onSnapshot(
    consulta,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const documentos = snapshot.docs.map(
        (documento) =>
          ({
            id: documento.id,
            ...documento.data(),
          }) as Documento
      );

      onData(documentos);
    },
    (error) => {
      onError?.(error);
    }
  );
}

/*
=======================================================
CREAR DOCUMENTO
=======================================================

Firestore genera el id. Devuelve el id creado.
=======================================================
*/

export async function crearDocumento(
  uid: string,
  vehiculoId: string,
  datos: NuevoDocumento
): Promise<string> {
  const referencia = await addDoc(documentosCol(uid, vehiculoId), datos);

  return referencia.id;
}

/*
=======================================================
EDITAR DOCUMENTO

Solo se actualizan los campos enviados en cambios.
=======================================================
*/

export async function actualizarDocumento(
  uid: string,
  vehiculoId: string,
  documentoId: string,
  cambios: Partial<Documento>
): Promise<void> {
  await updateDoc(documentoRef(uid, vehiculoId, documentoId), cambios);
}

/*
=======================================================
ELIMINAR DOCUMENTO
=======================================================
*/

export async function eliminarDocumento(
  uid: string,
  vehiculoId: string,
  documentoId: string
): Promise<void> {
  await deleteDoc(documentoRef(uid, vehiculoId, documentoId));
}
