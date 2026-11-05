/*
=======================================================
NITRO SYNC - HOOKS DE DOCUMENTOS
=======================================================

Dos hooks reutilizables:

- useDocumentos(vehiculoId)
    Documentos de UN vehículo (usado en el detalle).

- useDocumentosDeVehiculos(vehiculos)
    Documentos de TODOS los vehículos del usuario
    (usado en Inicio para "Próximos vencimientos").

Ambos mantienen listeners de Firestore con onSnapshot
y los limpian al desmontar o cuando cambian los datos.

=======================================================
*/

import { useEffect, useState } from 'react';

import { useAuth } from '@/context/AuthContext';

import { suscribirDocumentos } from '@/services/documentos';

import type { Documento, Vehiculo } from '@/types/models';

import { describirErrorFirestore } from '@/utils/errorFirestore';

/* -------------------------------------------------------
   DOCUMENTO CON SU VEHÍCULO

   Para mostrar en Inicio de qué vehículo es cada
   documento (el modelo Documento no guarda el id).
   ------------------------------------------------------- */

export type DocumentoConVehiculo = Documento & {
  vehiculoId: string;
};

/* -------------------------------------------------------
   DOCUMENTOS DE UN VEHÍCULO
   ------------------------------------------------------- */

export function useDocumentos(vehiculoId?: string) {
  const { user } = useAuth();

  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !vehiculoId) {
      setDocumentos([]);
      setError(null);
      setCargando(false);
      return;
    }

    setCargando(true);

    const limpiar = suscribirDocumentos(
      user.uid,
      vehiculoId,
      (lista) => {
        setDocumentos(lista);
        setError(null);
        setCargando(false);
      },
      (err) => {
        setError(describirErrorFirestore(err));
        setCargando(false);
      }
    );

    return limpiar;
  }, [user, vehiculoId]);

  return { documentos, cargando, error };
}

/* -------------------------------------------------------
   DOCUMENTOS DE TODOS LOS VEHÍCULOS
   -------------------------------------------------------

   Crea un listener por vehículo y consolida todo en una
   sola lista (con el id del vehículo al que pertenece).
   ------------------------------------------------------- */

export function useDocumentosDeVehiculos(vehiculos: Vehiculo[]) {
  const { user } = useAuth();

  const [porVehiculo, setPorVehiculo] = useState<
    Record<string, Documento[]>
  >({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || vehiculos.length === 0) {
      setPorVehiculo({});
      setError(null);
      setCargando(false);
      return;
    }

    setCargando(true);
    setPorVehiculo({});

    let pendientes = vehiculos.length;

    const limpiadores = vehiculos.map((vehiculo) =>
      suscribirDocumentos(
        user.uid,
        vehiculo.id,
        (lista) => {
          setPorVehiculo((anteriores) => ({
            ...anteriores,
            [vehiculo.id]: lista,
          }));

          pendientes -= 1;

          if (pendientes === 0) {
            setCargando(false);
          }
        },
        (err) => {
          setError(describirErrorFirestore(err));
          setCargando(false);
        }
      )
    );

    return () => {
      limpiadores.forEach((limpiar) => limpiar());
    };
  }, [user, vehiculos]);

  /* Lista plana ordenada por vencimiento más próximo. */

  const documentos: DocumentoConVehiculo[] = Object.entries(porVehiculo)
    .flatMap(([vehiculoId, lista]) =>
      lista.map((documento) => ({ ...documento, vehiculoId }))
    )
    .sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));

  return { documentos, cargando, error };
}
