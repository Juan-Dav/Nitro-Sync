/*
=======================================================
NITRO SYNC - PREFERENCIAS DE NOTIFICACIÓN
=======================================================

Guarda en EL PROPIO TELÉFONO (AsyncStorage) las
preferencias de notificación del usuario, además de la
copia que ya existe en Firestore.

¿Por qué también en el celular?

- Así la pantalla de Ajustes conoce al instante la
  decisión del usuario, incluso sin internet.
- El permiso concedido/denegado queda recordado en el
  dispositivo y no se vuelve a preguntar.
- Si Firestore falla al leer, la app sigue respetando lo
  que el usuario eligió aquí.

Firestore sigue siendo la fuente principal (para que las
preferencias viajen entre dispositivos); esto es un espejo
local.
=======================================================
*/

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PreferenciasNotificacion {
  activas: boolean;
  soat: boolean;
  tecnomecanica: boolean;
  seguro: boolean;
  mantenimientos: boolean;
  recordatorios: boolean;
}

export const PREFERENCIAS_POR_DEFECTO: PreferenciasNotificacion = {
  activas: true,
  soat: true,
  tecnomecanica: true,
  seguro: true,
  mantenimientos: true,
  recordatorios: true,
};

const CLAVE_PREFERENCIAS = '@servicio_vehicular/preferencias_notificaciones';

/** Clave con la que se recuerda que ya se preguntó (o que el sistema ya decidió). */
export const CLAVE_PREGUNTA_NOTIFICACIONES =
  '@servicio_vehicular/notificaciones_preguntado';

/** Lee las preferencias guardadas en el teléfono. */
export async function leerPreferenciasLocales(): Promise<PreferenciasNotificacion> {
  try {
    const crudo = await AsyncStorage.getItem(CLAVE_PREFERENCIAS);

    if (crudo) {
      return {
        ...PREFERENCIAS_POR_DEFECTO,
        ...(JSON.parse(crudo) as Partial<PreferenciasNotificacion>),
      };
    }
  } catch {
    /* El almacenamiento es opcional: nunca rompemos la app. */
  }

  return PREFERENCIAS_POR_DEFECTO;
}

/** Guarda una copia local de las preferencias. */
export async function guardarPreferenciasLocales(
  preferencias: PreferenciasNotificacion,
): Promise<void> {
  try {
    await AsyncStorage.setItem(CLAVE_PREFERENCIAS, JSON.stringify(preferencias));
  } catch {
    /* Ignorado a propósito. */
  }
}

/** ¿Ya se preguntó (o el sistema ya decidió) en este teléfono? */
export async function yaSePregunto(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CLAVE_PREGUNTA_NOTIFICACIONES)) === 'true';
  } catch {
    return false;
  }
}

/** Marca que ya se preguntó para no volver a hacerlo. */
export async function marcarComoPreguntado(): Promise<void> {
  try {
    await AsyncStorage.setItem(CLAVE_PREGUNTA_NOTIFICACIONES, 'true');
  } catch {
    /* Ignorado a propósito. */
  }
}

/* -------------------------------------------------------
   AVISOS DE KILOMETRAJE (cambio de aceite)
   -------------------------------------------------------
   Se recuerda en el teléfono el último kilometraje que ya
   se avisó, para no repetir la misma notificación.
   ------------------------------------------------------- */

const CLAVE_AVISO_ACEITE = '@servicio_vehicular/aviso_aceite/';

export interface AvisoAceiteGuardado {
  /** Kilometraje con el que se disparó el último aviso. */
  kilometraje: number;
  /** Nivel avisado: "proximo" o "vencido". */
  nivel: 'proximo' | 'vencido';
}

export async function leerAvisoAceite(
  vehiculoId: string,
): Promise<AvisoAceiteGuardado | null> {
  try {
    const crudo = await AsyncStorage.getItem(CLAVE_AVISO_ACEITE + vehiculoId);
    return crudo ? (JSON.parse(crudo) as AvisoAceiteGuardado) : null;
  } catch {
    return null;
  }
}

export async function guardarAvisoAceite(
  vehiculoId: string,
  aviso: AvisoAceiteGuardado,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      CLAVE_AVISO_ACEITE + vehiculoId,
      JSON.stringify(aviso),
    );
  } catch {
    /* Ignorado a propósito. */
  }
}

/** Olvida el aviso (por ejemplo, cuando se registra un cambio de aceite). */
export async function borrarAvisoAceite(vehiculoId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(CLAVE_AVISO_ACEITE + vehiculoId);
  } catch {
    /* Ignorado a propósito. */
  }
}
