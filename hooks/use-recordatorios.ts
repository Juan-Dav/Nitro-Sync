/*
=======================================================
NITRO SYNC - HOOKS DE RECORDATORIOS
=======================================================

- useRecordatorios(vehiculoId)
    Recordatorios de UN vehículo (detalle del vehículo).

- useRecordatoriosDeVehiculos(vehiculos)
    Recordatorios de TODOS los vehículos del usuario
    (pantalla "Recordatorios" de Acciones rápidas).

Ambos mantienen listeners de Firestore con onSnapshot
y los limpian al desmontar o cuando cambian los datos.

=======================================================
*/

import { useEffect, useState } from 'react';

import { useAuth } from '@/context/AuthContext';

import { suscribirRecordatorios } from '@/services/recordatorios';

import type { Recordatorio, Vehiculo } from '@/types/models';

import { describirErrorFirestore } from '@/utils/errorFirestore';

/* -------------------------------------------------------
   RECORDATORIO CON SU VEHÍCULO
   ------------------------------------------------------- */

export type RecordatorioConVehiculo = Recordatorio & {
  vehiculoId: string;
  nombreVehiculo: string;
};

/* -------------------------------------------------------
   RECORDATORIOS DE UN VEHÍCULO
   ------------------------------------------------------- */

export function useRecordatorios(vehiculoId?: string) {
  const { user } = useAuth();

  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !vehiculoId) {
      setRecordatorios([]);
      setError(null);
      setCargando(false);
      return;
    }

    setCargando(true);

    const limpiar = suscribirRecordatorios(
      user.uid,
      vehiculoId,
      (lista) => {
        setRecordatorios(lista);
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

  return { recordatorios, cargando, error };
}

/* -------------------------------------------------------
   RECORDATORIOS DE TODOS LOS VEHÍCULOS
   ------------------------------------------------------- */

export function useRecordatoriosDeVehiculos(vehiculos: Vehiculo[]) {
  const { user } = useAuth();

  const [porVehiculo, setPorVehiculo] = useState<
    Record<string, Recordatorio[]>
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
      suscribirRecordatorios(
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

  /* Lista plana ordenada por fecha más próxima. */

  const recordatorios: RecordatorioConVehiculo[] = Object.entries(
    porVehiculo
  )
    .flatMap(([vehiculoId, lista]) =>
      lista.map((recordatorio) => ({
        ...recordatorio,
        vehiculoId,
        nombreVehiculo:
          vehiculos.find((vehiculo) => vehiculo.id === vehiculoId)?.nombre ??
          'Vehículo',
      }))
    )
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  return { recordatorios, cargando, error };
}
