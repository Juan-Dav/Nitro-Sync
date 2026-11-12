import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';

import { db } from '@/firebaseConfig';

import { hoyISO } from '@/utils/fechas';

import type { NuevaOpinion, Opinion } from '@/types/models';

export function opinionRef(uid: string) {
  return doc(db, 'opiniones', uid);
}

export async function leerMiOpinion(uid: string): Promise<Opinion | null> {
  const snapshot = await getDoc(opinionRef(uid));

  return snapshot.exists() ? (snapshot.data() as Opinion) : null;
}

export async function guardarOpinion(
  uid: string,
  email: string,
  datos: NuevaOpinion
): Promise<void> {
  const opinion: Opinion = {
    ...datos,
    uid,
    email,
    fecha: hoyISO(),
  };

  await setDoc(opinionRef(uid), opinion);
}

export function suscribirOpiniones(
  onData: (opiniones: Opinion[]) => void,
  onError?: (error: Error) => void
): () => void {
  return onSnapshot(
    collection(db, 'opiniones'),
    (snapshot) => {
      onData(snapshot.docs.map((documento) => documento.data() as Opinion));
    },
    (error) => {
      onError?.(error);
    }
  );
}
