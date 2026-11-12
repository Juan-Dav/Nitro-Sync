import {
  collectionGroup,
  doc,
  onSnapshot,
  writeBatch,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';

import { db } from '@/firebaseConfig';

import { hoyISO } from '@/utils/fechas';

import type { Vehiculo, VehiculoAdmin } from '@/types/models';

export interface DatosSeguroAsignado {
  aseguradora: string;
  telefonoAseguradora: string;
  numeroPoliza: string;
  vencimientoSeguro: string;
}

export function suscribirTodosLosVehiculos(
  onData: (vehiculos: VehiculoAdmin[]) => void,
  onError?: (error: Error) => void
): () => void {
  return onSnapshot(
    collectionGroup(db, 'vehiculos'),
    (snapshot: QuerySnapshot<DocumentData>) => {
      const lista = snapshot.docs.map(
        (documento) =>
          ({
            id: documento.id,
            ...documento.data(),
            propietarioUid: documento.ref.parent.parent?.id ?? '',
          }) as VehiculoAdmin
      );

      onData(lista);
    },
    (error) => {
      onError?.(error);
    }
  );
}

export function suscribirVehiculoAdmin(
  propietarioUid: string,
  vehiculoId: string,
  onData: (vehiculo: Vehiculo | null) => void,
  onError?: (error: Error) => void
): () => void {
  return onSnapshot(
    doc(db, 'usuarios', propietarioUid, 'vehiculos', vehiculoId),
    (snapshot) => {
      onData(
        snapshot.exists()
          ? ({ id: snapshot.id, ...snapshot.data() } as Vehiculo)
          : null
      );
    },
    (error) => {
      onError?.(error);
    }
  );
}

export async function asignarSeguro(
  propietarioUid: string,
  vehiculoId: string,
  datos: DatosSeguroAsignado,
  adminUid: string,
  solicitudPendienteId?: string
): Promise<void> {
  const lote = writeBatch(db);

  lote.update(
    doc(db, 'usuarios', propietarioUid, 'vehiculos', vehiculoId),
    {
      ...datos,
      seguroAsignadoPor: adminUid,
      seguroAsignadoFecha: hoyISO(),
    }
  );

  if (solicitudPendienteId) {
    lote.update(doc(db, 'solicitudes', solicitudPendienteId), {
      estado: 'Atendida',
      atendidaPor: adminUid,
      atendidaFecha: hoyISO(),
    });
  }

  await lote.commit();
}
