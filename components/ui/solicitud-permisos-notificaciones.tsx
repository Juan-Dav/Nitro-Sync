/*
=======================================================
NITRO SYNC - SOLICITUD DE PERMISOS AL ABRIR
=======================================================

Al abrir la aplicación (con sesión iniciada) se pregunta
UNA sola vez, con el diseño de la app:

  "¿Permites activar las notificaciones en el dispositivo?"

  - Permitir  -> activa TODAS las categorías (SOAT,
                 técnico-mecánica, seguro, mantenimientos
                 y recordatorios) y pide el permiso real
                 del sistema; luego reagenda los avisos de
                 todos los vehículos.
  - Ahora no  -> las deja apagadas y no vuelve a
                 preguntar.

La decisión queda guardada en el propio teléfono (y en
Firestore), por eso no se repite.

Este componente no dibuja nada: vive montado en el layout
raíz (app/_layout.tsx), dentro de los proveedores.
=======================================================
*/

import { useEffect, useRef, useState } from 'react';

import { useConfirm } from '@/components/ui/confirm-dialog';

import { useAuth } from '@/context/AuthContext';
import { useVehiculos } from '@/context/VehiculosContext';

import {
  getNotificationStatus,
  mapPermissionStatus,
  notificacionesSoportadas,
  registerNotificationHandler,
  requestNotificationPermission,
} from '@/lib/notifications';

import {
  guardarPreferenciasLocales,
  marcarComoPreguntado,
  yaSePregunto,
} from '@/lib/preferenciasNotificaciones';

import {
  guardarPreferencias,
  sincronizarNotificacionesVehiculo,
  type PreferenciasNotificacion,
} from '@/services/notificationService';

function todas(activas: boolean): PreferenciasNotificacion {
  return {
    activas,
    soat: activas,
    tecnomecanica: activas,
    seguro: activas,
    mantenimientos: activas,
    recordatorios: activas,
  };
}

export default function SolicitudPermisosNotificaciones() {
  const { user } = useAuth();
  const { vehiculos } = useVehiculos();
  const confirmar = useConfirm();

  /* Evita que la pregunta se muestre dos veces. */
  const yaPreguntadoRef = useRef(false);

  /*
  Permiso recién concedido: se usa para reagendar los avisos
  de los vehículos (incluidos los que carguen más tarde).
  */
  const [recienConcedido, setRecienConcedido] = useState(false);

  /* Vehículos ya sincronizados (evita repetir el trabajo). */
  const sincronizadosRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    registerNotificationHandler();
  }, []);

  useEffect(() => {
    if (!notificacionesSoportadas || !user) {
      return;
    }

    if (yaPreguntadoRef.current) {
      return;
    }

    yaPreguntadoRef.current = true;

    let activo = true;

    const preguntar = async () => {
      /* Si ya se preguntó en este teléfono, no se repite. */
      let preguntadoAntes = false;

      try {
        preguntadoAntes = await yaSePregunto();
      } catch {
        /* Si el almacenamiento falla, se continúa. */
      }

      if (preguntadoAntes || !activo) {
        return;
      }

      const estado = mapPermissionStatus(await getNotificationStatus());

      /* Si el sistema ya decidió, solo se anota. */
      if (estado !== 'undetermined') {
        await marcarComoPreguntado();
        return;
      }

      const permitir = await confirmar({
        titulo: 'Activar notificaciones',
        mensaje:
          '¿Permites activar las notificaciones en el dispositivo?\n\nAsí te avisaremos de vencimientos (SOAT, técnico-mecánica, seguro) y de tus recordatorios, incluso con la pantalla bloqueada.\n\nSi eliges "Ahora no", no volveremos a preguntar.',
        textoConfirmar: 'Permitir',
        textoCancelar: 'Ahora no',
        icono: 'notifications-outline',
      });

      if (!activo) {
        return;
      }

      if (permitir) {
        const concedido = await requestNotificationPermission();
        const prefs = todas(concedido);

        await guardarPreferencias(user.uid, prefs);

        /*
        Este estado dispara el efecto de abajo, que reagenda
        los avisos de los vehículos (los actuales y los que
        lleguen después).
        */
        if (concedido) {
          setRecienConcedido(true);
        }
      } else {
        await guardarPreferenciasLocales(todas(false));
      }

      await marcarComoPreguntado();
    };

    preguntar();

    return () => {
      activo = false;
    };
  }, [user, confirmar]);

  /*
  Reagenda los avisos SOLO cuando el permiso acaba de
  concederse. Cada vehículo se procesa una sola vez y los
  que carguen más tarde también entran (el efecto se vuelve
  a ejecutar cuando cambia la lista de vehículos).
  */

  useEffect(() => {
    if (!recienConcedido || !user) {
      return;
    }

    vehiculos.forEach((vehiculo) => {
      if (sincronizadosRef.current.has(vehiculo.id)) {
        return;
      }

      sincronizadosRef.current.add(vehiculo.id);
      sincronizarNotificacionesVehiculo(user.uid, vehiculo.id);
    });
  }, [recienConcedido, user, vehiculos]);

  return null;
}
