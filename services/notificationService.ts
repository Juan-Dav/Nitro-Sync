/*
=======================================================
NITRO SYNC - SERVICIO DE NOTIFICACIONES
=======================================================

Sincroniza las notificaciones LOCALES con los datos
reales de Firestore del usuario.

Qué programa:

- Vencimiento de documentos (SOAT, tecnomecánica,
  seguro) en los días de anticipación definidos
  (30, 15, 7 y 1 día antes).
- Recordatorios personalizados pendientes, el mismo día.

Reglas importantes:

- NUNCA se inventan fechas. Solo se programan fechas
  futuras que existen en Firestore.
- Los mantenimientos son registros históricos (no
  tienen "próximo servicio"), por lo que no se
  programan fechas ficticias a partir de ellos.
- Se respetan las preferencias del usuario guardadas
  en usuarios/{uid}/config/notificaciones.
- Antes de reprogramar un vehículo se cancelan sus
  notificaciones anteriores para evitar duplicados.
- En web no hay soporte nativo: todas las funciones
  son "no-op" seguras.

=======================================================
*/

import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { db } from '@/firebaseConfig';

import {
  CANAL_RECORDATORIOS,
  cancelNotification,
  getScheduledNotifications,
  notificacionesSoportadas,
  programarAvisoInmediato,
  scheduleLocalNotification,
} from '@/lib/notifications';

import {
  PREFERENCIAS_POR_DEFECTO,
  borrarAvisoAceite,
  guardarPreferenciasLocales,
  guardarAvisoAceite,
  leerAvisoAceite,
  leerPreferenciasLocales,
  type PreferenciasNotificacion,
} from '@/lib/preferenciasNotificaciones';

import type {
  Documento,
  Mantenimiento,
  Recordatorio,
  TipoDocumento,
  TipoVehiculo,
} from '@/types/models';

import {
  calcularEstadoAceite,
  type EstadoAceite,
} from '@/utils/mantenimiento';

import { formatoKm } from '@/utils/formato';

/*
=======================================================
PREFERENCIAS
=======================================================

La copia principal está en Firestore
(usuarios/{uid}/config/notificaciones) para que viajen
entre dispositivos, pero SIEMPRE se guarda también una
copia en el teléfono. Si no hay internet, se respeta lo
que el usuario eligió aquí.
=======================================================
*/

export type { PreferenciasNotificacion };
export { PREFERENCIAS_POR_DEFECTO };

export async function leerPreferencias(
  uid: string
): Promise<PreferenciasNotificacion> {
  /* 1) Copia local: instantánea y funciona sin internet. */
  const locales = await leerPreferenciasLocales();

  try {
    const referencia = doc(
      db,
      'usuarios',
      uid,
      'config',
      'notificaciones'
    );

    const snapshot = await getDoc(referencia);

    if (snapshot.exists()) {
      const prefs = {
        ...PREFERENCIAS_POR_DEFECTO,
        ...locales,
        ...snapshot.data(),
      } as PreferenciasNotificacion;

      /* Refresca el espejo local. */
      await guardarPreferenciasLocales(prefs);

      return prefs;
    }
  } catch (error) {
    console.warn('No se pudieron leer las preferencias:', error);
  }

  return locales;
}

/*
=======================================================
GUARDAR PREFERENCIAS (Firestore + teléfono)
=======================================================
*/
export async function guardarPreferencias(
  uid: string,
  preferencias: PreferenciasNotificacion
): Promise<void> {
  /* Primero el teléfono: la decisión queda guardada igual. */
  await guardarPreferenciasLocales(preferencias);

  try {
    const referencia = doc(
      db,
      'usuarios',
      uid,
      'config',
      'notificaciones'
    );

    await setDoc(
      referencia,
      { ...preferencias, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (error) {
    console.warn('No se pudieron guardar las preferencias:', error);
  }
}

/*
=======================================================
DÍAS DE ANTICIPACIÓN
=======================================================
*/

const DIAS_ANTICIPACION = [30, 15, 7, 1];

/*
Convierte "AAAA-MM-DD" en la fecha de disparo (9:00 a.m.)
restando los días de anticipación.

Devuelve null si la fecha ya pasó o es inválida, para no
programar notificaciones en el pasado.
*/
function calcularDisparo(
  fechaISO: string,
  diasAntes: number
): Date | null {
  const partes = fechaISO.split('-').map(Number);

  if (
    partes.length !== 3 ||
    partes.some((valor) => Number.isNaN(valor))
  ) {
    return null;
  }

  const disparo = new Date(
    partes[0],
    partes[1] - 1,
    partes[2],
    9,
    0,
    0,
    0
  );

  disparo.setDate(disparo.getDate() - diasAntes);

  if (disparo.getTime() <= Date.now()) {
    return null;
  }

  return disparo;
}

/*
=======================================================
RELACIÓN TIPO DE DOCUMENTO -> PREFERENCIA
=======================================================
*/

function clavePreferencia(
  tipo: TipoDocumento
): 'soat' | 'tecnomecanica' | 'seguro' | null {
  switch (tipo) {
    case 'SOAT':
      return 'soat';
    case 'Tecnomecanica':
      return 'tecnomecanica';
    case 'Seguro':
      return 'seguro';
    default:
      return null;
  }
}

function nombreDocumento(tipo: TipoDocumento): string {
  switch (tipo) {
    case 'SOAT':
      return 'SOAT';
    case 'Tecnomecanica':
      return 'revisión técnico-mecánica';
    case 'Seguro':
      return 'seguro';
    case 'Licencia':
      return 'licencia de conducción';
    default:
      return 'documento';
  }
}

/*
=======================================================
PROGRAMAR UNA NOTIFICACIÓN PARA UNA FECHA
=======================================================
*/
async function programar(
  titulo: string,
  cuerpo: string,
  fechaISO: string,
  diasAntes: number,
  data: Record<string, any>
): Promise<void> {
  const disparo = calcularDisparo(fechaISO, diasAntes);

  if (!disparo) {
    return;
  }

  await scheduleLocalNotification({
    title: titulo,
    body: cuerpo,
    data,
    trigger: {
      type: 'date',
      date: disparo,
      channelId: CANAL_RECORDATORIOS,
    } as any,
  });
}

/*
=======================================================
CANCELAR NOTIFICACIONES DE UN VEHÍCULO
=======================================================

Recorre las notificaciones programadas y cancela las que
pertenecen a este vehículo (según data.vehicleId).
=======================================================
*/

export async function cancelarNotificacionesVehiculo(
  vehiculoId: string
): Promise<void> {
  if (!notificacionesSoportadas) {
    return;
  }

  try {
    const programadas = await getScheduledNotifications();

    const delVehiculo = programadas.filter(
      (programada) =>
        (programada.content.data as Record<string, any> | null)
          ?.vehicleId === vehiculoId
    );

    await Promise.all(
      delVehiculo.map((programada) =>
        cancelNotification(programada.identifier)
      )
    );
  } catch (error) {
    console.warn('No se pudieron cancelar las notificaciones:', error);
  }
}

/*
=======================================================
AVISO DE CAMBIO DE ACEITE (POR KILOMETRAJE)
=======================================================

El kilometraje se actualiza desde la propia aplicación
(pantalla "Actualizar kilometraje"). Cada vez que cambia,
se comprueba aquí si toca el cambio de aceite y se lanza
una notificación LOCAL con el sonido y la vibración del
dispositivo.

Para no molestar, se recuerda en el teléfono el último
kilometraje avisado: solo se vuelve a avisar cuando el
kilometraje avanza (o cuando se pide expresamente).
=======================================================
*/

export interface AvisoAceiteOpciones {
  uid: string;
  vehiculoId: string;
  nombreVehiculo: string;
  tipo: TipoVehiculo;
  kilometraje: number;
  mantenimientos: Mantenimiento[];
  /** Fuerza el aviso aunque ya se hubiera avisado antes. */
  forzar?: boolean;
}

/* Kilómetros que deben pasar para repetir un mismo nivel de aviso. */
const REAVISO_KM = 200;

export async function verificarAvisoAceite(
  opciones: AvisoAceiteOpciones
): Promise<EstadoAceite> {
  const estado = calcularEstadoAceite({
    tipo: opciones.tipo,
    kilometraje: opciones.kilometraje,
    mantenimientos: opciones.mantenimientos,
  });

  if (!notificacionesSoportadas) {
    return estado;
  }

  const nivel: 'proximo' | 'vencido' | null =
    estado.estado === 'Vencido'
      ? 'vencido'
      : estado.estado === 'Próximo'
        ? 'proximo'
        : null;

  /*
  Si está "Al día" (o se registró un cambio de aceite nuevo),
  se olvida el aviso anterior para poder volver a avisar más
  adelante.
  */
  if (!nivel) {
    await borrarAvisoAceite(opciones.vehiculoId);
    return estado;
  }

  const anterior = await leerAvisoAceite(opciones.vehiculoId);

  /*
  No se repite el mismo nivel si el kilometraje no ha
  avanzado al menos REAVISO_KM desde el último aviso.
  */
  const yaAvisado =
    !!anterior &&
    anterior.nivel === nivel &&
    opciones.kilometraje < anterior.kilometraje + REAVISO_KM;

  if (yaAvisado && !opciones.forzar) {
    return estado;
  }

  const titulo =
    nivel === 'vencido'
      ? '¡Cambio de aceite vencido! 🛢️'
      : 'Cambio de aceite próximo 🛢️';

  const cuerpo =
    nivel === 'vencido'
      ? `${opciones.nombreVehiculo}: te pasaste ${formatoKm(
          Math.abs(estado.kmRestantes)
        )} del cambio. Llevas ${formatoKm(
          estado.kmRecorridos
        )} desde el último (${formatoKm(estado.kilometrajeCambio)}).`
      : `${opciones.nombreVehiculo}: faltan ${formatoKm(
          estado.kmRestantes
        )} para el cambio de aceite (a los ${formatoKm(
          estado.proximoCambio
        )}).`;

  const id = await programarAvisoInmediato({
    title: titulo,
    body: cuerpo,
    data: {
      type: 'aceite',
      vehicleId: opciones.vehiculoId,
      userId: opciones.uid,
      url: `/vehicle/${opciones.vehiculoId}`,
    },
  });

  if (id) {
    await guardarAvisoAceite(opciones.vehiculoId, {
      kilometraje: opciones.kilometraje,
      nivel,
    });
  }

  return estado;
}

/*
=======================================================
SINCRONIZAR TODAS LAS NOTIFICACIONES DE UN VEHÍCULO
=======================================================
*/
export async function sincronizarNotificacionesVehiculo(
  uid: string,
  vehiculoId: string
): Promise<void> {
  if (!notificacionesSoportadas) {
    return;
  }

  try {
    const preferencias = await leerPreferencias(uid);

    /* Primero se limpia lo anterior (evita duplicados). */
    await cancelarNotificacionesVehiculo(vehiculoId);

    if (!preferencias.activas) {
      return;
    }

    /* ------------------------------
       DOCUMENTOS (SOAT, tecnomecánica, seguro)
       ------------------------------ */

    const documentosSnapshot = await getDocs(
      collection(
        db,
        'usuarios',
        uid,
        'vehiculos',
        vehiculoId,
        'documentos'
      )
    );

    for (const documentoDoc of documentosSnapshot.docs) {
      const documento = documentoDoc.data() as Documento;
      const clave = clavePreferencia(documento.tipo);

      if (!clave || !preferencias[clave]) {
        continue;
      }

      for (const dias of DIAS_ANTICIPACION) {
        await programar(
          `Vence tu ${nombreDocumento(documento.tipo)}`,
          `El ${nombreDocumento(documento.tipo)} de tu vehículo vence el ${
            documento.vencimiento
          }${dias === 0 ? '.' : ` (en ${dias} día(s)).`}`,
          documento.vencimiento,
          dias,
          {
            type:
              documento.tipo === 'SOAT'
                ? 'soat'
                : documento.tipo === 'Tecnomecanica'
                  ? 'tecnomecanica'
                  : 'documento',
            vehicleId: vehiculoId,
            userId: uid,
            documentId: documentoDoc.id,
            url: `/vehicle/${vehiculoId}`,
          }
        );
      }
    }

    /* ------------------------------
       RECORDATORIOS PENDIENTES
       ------------------------------ */

    if (preferencias.recordatorios) {
      const recordatoriosSnapshot = await getDocs(
        collection(
          db,
          'usuarios',
          uid,
          'vehiculos',
          vehiculoId,
          'recordatorios'
        )
      );

      for (const recordatorioDoc of recordatoriosSnapshot.docs) {
        const recordatorio = recordatorioDoc.data() as Recordatorio;

        if (recordatorio.estado === 'Completado') {
          continue;
        }

        await programar(
          `Recordatorio: ${recordatorio.titulo}`,
          recordatorio.descripcion || 'Es hoy.',
          recordatorio.fecha,
          0,
          {
            type: 'recordatorio',
            vehicleId: vehiculoId,
            userId: uid,
            reminderId: recordatorioDoc.id,
            url: `/vehicle/${vehiculoId}`,
          }
        );
      }
    }

    /*
    ------------------------------
    CAMBIO DE ACEITE (KILOMETRAJE)
    ------------------------------

    Se comprueba con el kilometraje real del vehículo y sus
    mantenimientos. Si ya toca (o se pasó) el cambio, se
    lanza una notificación local inmediata.
    */

    if (preferencias.mantenimientos) {
      const mantenimientosSnapshot = await getDocs(
        collection(
          db,
          'usuarios',
          uid,
          'vehiculos',
          vehiculoId,
          'mantenimientos'
        )
      );

      const vehiculoSnapshot = await getDoc(
        doc(db, 'usuarios', uid, 'vehiculos', vehiculoId)
      );

      if (vehiculoSnapshot.exists()) {
        const datosVehiculo = vehiculoSnapshot.data() as {
          nombre?: string;
          tipo?: TipoVehiculo;
          kilometraje?: number;
        };

        await verificarAvisoAceite({
          uid,
          vehiculoId,
          nombreVehiculo: datosVehiculo.nombre ?? 'Tu vehículo',
          tipo: datosVehiculo.tipo ?? 'Carro',
          kilometraje: datosVehiculo.kilometraje ?? 0,
          mantenimientos: mantenimientosSnapshot.docs.map(
            (documento) => documento.data() as Mantenimiento
          ),
        });
      }
    }

    /*
    NOTA: los mantenimientos son registros históricos y no
    guardan una "próxima fecha" real, por lo que no se
    programan fechas inventadas a partir de ellos. El único
    aviso relacionado es el del cambio de aceite, que se
    calcula con el kilometraje.
    */
  } catch (error) {
    console.warn('No se pudieron sincronizar las notificaciones:', error);
  }
}

/*
=======================================================
CANCELAR TODAS LAS NOTIFICACIONES DEL USUARIO
=======================================================

Se usa al cerrar sesión para no dejar avisos de una
cuenta que ya no está activa en el dispositivo.
=======================================================
*/

export async function cancelarNotificacionesUsuario(
  uid: string
): Promise<void> {
  if (!notificacionesSoportadas) {
    return;
  }

  try {
    const programadas = await getScheduledNotifications();

    const delUsuario = programadas.filter(
      (programada) =>
        (programada.content.data as Record<string, any> | null)
          ?.userId === uid
    );

    await Promise.all(
      delUsuario.map((programada) =>
        cancelNotification(programada.identifier)
      )
    );
  } catch (error) {
    console.warn(
      'No se pudieron cancelar las notificaciones del usuario:',
      error
    );
  }
}

export async function cancelarRecordatorios(
  ids: string[]
): Promise<void> {
  await Promise.all(ids.map((id) => cancelNotification(id)));
}
