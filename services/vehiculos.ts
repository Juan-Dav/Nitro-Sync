/*
=======================================================
NITRO SYNC - SERVICIO DE VEHÍCULOS (FIRESTORE)
=======================================================

Ubicación de los datos:

  usuarios/{uid}/vehiculos/{vehiculoId}

Todas las operaciones están limitadas al usuario
autenticado, por lo que cada persona solo puede leer
y modificar SUS vehículos (además de las reglas de
seguridad de firestore.rules).

Se utiliza el SDK oficial de Firestore (nunca fetch).

=======================================================
*/

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';

import { db } from '@/firebaseConfig';

import type { NuevoVehiculo, Vehiculo } from '@/types/models';

/*
=======================================================
REFERENCIAS
=======================================================
*/

export function vehiculosCol(uid: string) {
  return collection(db, 'usuarios', uid, 'vehiculos');
}

export function vehiculoRef(uid: string, vehiculoId: string) {
  return doc(db, 'usuarios', uid, 'vehiculos', vehiculoId);
}

/*
=======================================================
SUSCRIPCIÓN EN TIEMPO REAL
=======================================================

onSnapshot() mantiene un listener abierto. La función
devuelta es la "limpieza" del listener:

  const limpiar = suscribirVehiculos(uid, setVehiculos);
  ...
  limpiar();   // siempre al desmontar el componente

Los vehículos llegan ordenados del más reciente al más
antiguo según fechaRegistro.
=======================================================
*/

export function suscribirVehiculos(
  uid: string,
  onData: (vehiculos: Vehiculo[]) => void,
  onError?: (error: Error) => void
): () => void {
  const consulta = query(
    vehiculosCol(uid),
    orderBy('fechaRegistro', 'desc')
  );

  return onSnapshot(
    consulta,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const vehiculos = snapshot.docs.map(
        (documento) =>
          ({
            id: documento.id,
            ...documento.data(),
          }) as Vehiculo
      );

      onData(vehiculos);
    },
    (error) => {
      onError?.(error);
    }
  );
}

/*
=======================================================
CREAR VEHÍCULO
=======================================================

Firestore genera el id. Devuelve el id creado.
=======================================================
*/

export async function crearVehiculo(
  uid: string,
  datos: NuevoVehiculo
): Promise<string> {
  const referencia = await addDoc(vehiculosCol(uid), datos);

  return referencia.id;
}

/*
=======================================================
EDITAR VEHÍCULO
=======================================================

Solo se actualizan los campos enviados en cambios.
=======================================================
*/

export async function actualizarVehiculo(
  uid: string,
  vehiculoId: string,
  cambios: Partial<Vehiculo>
): Promise<void> {
  await updateDoc(vehiculoRef(uid, vehiculoId), cambios);
}

/*
=======================================================
ELIMINAR VEHÍCULO
=======================================================
*/

export async function eliminarVehiculo(
  uid: string,
  vehiculoId: string
): Promise<void> {
  await deleteDoc(vehiculoRef(uid, vehiculoId));
}

/*
=======================================================
ELIMINAR VEHÍCULO Y TODOS SUS DATOS
=======================================================

Firestore NO elimina las subcolecciones automáticamente
al borrar un documento: quedarían "huérfanas". Por eso
aquí se recorren y eliminan las subcolecciones:

  documentos, mantenimientos, recordatorios, gastos

y por último el documento del vehículo. Se usan lotes
(writeBatch) para agrupar las eliminaciones.
=======================================================
*/

const SUBCOLECCIONES_VEHICULO = [
  'documentos',
  'mantenimientos',
  'recordatorios',
  'gastos',
] as const;

/* Límite seguro por lote (Firestore permite hasta 500). */
const TAMANO_LOTE = 400;

export async function eliminarVehiculoConDatos(
  uid: string,
  vehiculoId: string
): Promise<void> {
  for (const nombre of SUBCOLECCIONES_VEHICULO) {
    const referencia = collection(
      db,
      'usuarios',
      uid,
      'vehiculos',
      vehiculoId,
      nombre
    );

    const snapshot = await getDocs(referencia);

    for (let i = 0; i < snapshot.docs.length; i += TAMANO_LOTE) {
      const lote = writeBatch(db);

      snapshot.docs
        .slice(i, i + TAMANO_LOTE)
        .forEach((documento) => lote.delete(documento.ref));

      await lote.commit();
    }
  }

  /* Finalmente, el documento principal del vehículo. */
  await deleteDoc(vehiculoRef(uid, vehiculoId));
}
