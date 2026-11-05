/*
=======================================================
NITRO SYNC - HOOK GENÉRICO DE REGISTROS
=======================================================

Suscribe en tiempo real cualquier subcolección de un
vehículo y limpia el listener al desmontar:

  const { registros, cargando, error } =
    useRegistrosVehiculo<Mantenimiento>(
      'mantenimientos', vehiculoId, 'fecha', 'desc'
    );

Se usa en el detalle del vehículo para:
  mantenimientos, recordatorios y gastos.

=======================================================
*/

import { useEffect, useState } from 'react';

import { useAuth } from '@/context/AuthContext';

import { suscribirSubcoleccion } from '@/services/subcoleccion';

import { describirErrorFirestore } from '@/utils/errorFirestore';

export function useRegistrosVehiculo<T>(
  nombre: string,
  vehiculoId?: string,
  orden = 'fecha',
  direccion: 'asc' | 'desc' = 'desc'
) {
  const { user } = useAuth();

  const [registros, setRegistros] = useState<T[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !vehiculoId) {
      setRegistros([]);
      setError(null);
      setCargando(false);
      return;
    }

    setCargando(true);

    const limpiar = suscribirSubcoleccion<T>(
      user.uid,
      vehiculoId,
      nombre,
      orden,
      direccion,
      (lista) => {
        setRegistros(lista);
        setError(null);
        setCargando(false);
      },
      (err) => {
        setError(describirErrorFirestore(err));
        setCargando(false);
      }
    );

    return limpiar;
  }, [user, vehiculoId, nombre, orden, direccion]);

  return { registros, cargando, error };
}
