import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '@/firebaseConfig';

import { hoyISO } from '@/utils/fechas';

import type { NuevaSolicitud, Solicitud } from '@/types/models';

export function solicitudId(uid: string, vehiculoId: string): string {
  return `${uid}_${vehiculoId}`;
}

export function solicitudRef(id: string) {
  return doc(db, 'solicitudes', id);
}

export async function crearSolicitud(datos: NuevaSolicitud): Promise<void> {
  const id = solicitudId(datos.uid, datos.vehiculoId);

  const solicitud: Omit<Solicitud, 'id'> = {
    ...datos,
    estado: 'Pendiente',
    fecha: hoyISO(),
    creadaEn: Date.now(),
  };

  await setDoc(solicitudRef(id), solicitud);
}

export async function marcarSolicitudAtendida(
  id: string,
  adminUid: string
): Promise<void> {
  await updateDoc(solicitudRef(id), {
    estado: 'Atendida',
    atendidaPor: adminUid,
    atendidaFecha: hoyISO(),
  });
}

export function suscribirMisSolicitudes(
  uid: string,
  onData: (solicitudes: Solicitud[]) => void,
  onError?: (error: Error) => void
): () => void {
  return onSnapshot(
    query(collection(db, 'solicitudes'), where('uid', '==', uid)),
    (snapshot) => {
      onData(
        snapshot.docs.map(
          (documento) => ({ id: documento.id, ...documento.data() }) as Solicitud
        )
      );
    },
    (error) => {
      onError?.(error);
    }
  );
}

export function suscribirSolicitudes(
  onData: (solicitudes: Solicitud[]) => void,
  onError?: (error: Error) => void
): () => void {
  return onSnapshot(
    collection(db, 'solicitudes'),
    (snapshot) => {
      onData(
        snapshot.docs.map(
          (documento) => ({ id: documento.id, ...documento.data() }) as Solicitud
        )
      );
    },
    (error) => {
      onError?.(error);
    }
  );
}

export function suscribirSolicitud(
  id: string,
  onData: (solicitud: Solicitud | null) => void,
  onError?: (error: Error) => void
): () => void {
  return onSnapshot(
    solicitudRef(id),
    (snapshot) => {
      onData(
        snapshot.exists()
          ? ({ id: snapshot.id, ...snapshot.data() } as Solicitud)
          : null
      );
    },
    (error) => {
      onError?.(error);
    }
  );
}
