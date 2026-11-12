import { useEffect, useState } from 'react';

import { suscribirSolicitudes } from '@/services/solicitudes';

export function useSolicitudesPendientes(activo: boolean): number {
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    if (!activo) {
      return;
    }

    return suscribirSolicitudes(
      (lista) =>
        setPendientes(lista.filter((s) => s.estado === 'Pendiente').length),
      () => setPendientes(0)
    );
  }, [activo]);

  return activo ? pendientes : 0;
}
