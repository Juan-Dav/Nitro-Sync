/*
=======================================================
NITRO SYNC - PERFIL DEL USUARIO (FIRESTORE)
=======================================================

Ubicación de los datos:

  usuarios/{uid}   -> documento con el perfil

El perfil se crea de forma idempotente (merge: true),
por lo que llamar varias veces no duplica ni borra
información.

=======================================================
*/

import {
  doc,
  onSnapshot,
  setDoc,
  type DocumentSnapshot,
} from 'firebase/firestore';

import { db } from '@/firebaseConfig';

import type { Perfil } from '@/types/models';

/*
=======================================================
REFERENCIA AL PERFIL
=======================================================
*/

export function perfilRef(uid: string) {
  return doc(db, 'usuarios', uid);
}

/*
=======================================================
CREAR PERFIL (SI NO EXISTE)
=======================================================

Se llama al registrarse o al iniciar sesión.
=======================================================
*/

export async function crearPerfil(
  uid: string,
  email: string
): Promise<void> {
  const fechaRegistro = new Date().toISOString().slice(0, 10);

  await setDoc(
    perfilRef(uid),
    {
      uid,
      email,
      fechaRegistro,
    },
    { merge: true }
  );
}

/*
=======================================================
SUSCRIPCIÓN AL PERFIL EN TIEMPO REAL
=======================================================

Devuelve la función de limpieza del listener.
=======================================================
*/

export function suscribirPerfil(
  uid: string,
  onData: (perfil: Perfil | null) => void,
  onError?: (error: Error) => void
): () => void {
  return onSnapshot(
    perfilRef(uid),
    (snapshot: DocumentSnapshot) => {
      onData(
        snapshot.exists() ? (snapshot.data() as Perfil) : null
      );
    },
    (error) => {
      onError?.(error);
    }
  );
}
