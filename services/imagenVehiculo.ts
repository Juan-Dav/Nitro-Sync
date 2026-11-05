/*
=======================================================
NITRO SYNC - IMAGEN AUTOMÁTICA DEL VEHÍCULO
=======================================================

Cuando el usuario registra un vehículo solo escribe marca y
modelo (por ejemplo "McLaren" / "720S" o "Yamaha" / "FZ")
y este módulo busca una foto real del vehículo para usarla
como imagen del garaje.

¿Cómo funciona?

  1. lib/busquedaImagenVehiculo.ts consulta Wikimedia
     Commons y, si hace falta, Wikipedia.
  2. La URL encontrada pasa por images.weserv.nl para que
     Android pueda descargarla (Wikimedia responde 403 a
     okhttp, que es el cliente de expo-image).
  3. El resultado se guarda en memoria y en AsyncStorage
     para no repetir la consulta.

Si no hay internet o no se encuentra nada, se devuelve una
imagen genérica (carro o moto) para que la app nunca quede
sin foto.

Si ya hay vehículos guardados con URLs viejas de Wikimedia,
`normalizarUrlImagen` las arregla al momento de mostrarlas
(ver components/ui/imagen-vehiculo.tsx).
=======================================================
*/

import { Platform } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  buscarFotoVehiculo,
  normalizarUrlImagen,
  type DatosBusquedaImagen,
} from '@/lib/busquedaImagenVehiculo';

import type { TipoVehiculo } from '@/types/models';

export { normalizarUrlImagen };

/* -------------------------------------------------------
   IMÁGENES GENÉRICAS (siempre cargan)
   ------------------------------------------------------- */

const IMAGEN_CARRO =
  'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=70';

const IMAGEN_MOTO =
  'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=70';

export function imagenPorDefecto(tipo: TipoVehiculo): string {
  return tipo === 'Moto' ? IMAGEN_MOTO : IMAGEN_CARRO;
}

/* -------------------------------------------------------
   PARÁMETROS Y CACHÉ
   ------------------------------------------------------- */

export interface DatosImagen {
  marca: string;
  modelo: string;
  tipo: TipoVehiculo;
  year?: number;
}

/*
Versión de la caché: al cambiarla, las imágenes malas que ya
estaban guardadas (por ejemplo un McLaren con foto de BMW)
se vuelven a buscar automáticamente.
*/
const CLAVE_CACHE = '@nitro_sync/imagenes_vehiculo_v4/';

/** Caché en memoria: evita llamadas repetidas en la misma sesión. */
const cacheMemoria = new Map<string, string>();

function claveCache(datos: DatosImagen): string {
  const marca = datos.marca.trim().toLowerCase();
  const modelo = datos.modelo.trim().toLowerCase();

  return `${datos.tipo}:${marca}:${modelo}:${datos.year ?? ''}`;
}

/* -------------------------------------------------------
   API PÚBLICA
   ------------------------------------------------------- */

/**
 * Devuelve la mejor imagen posible para el vehículo.
 * Nunca lanza error: si algo falla, entrega la genérica.
 */
export async function buscarImagenVehiculo(
  datos: DatosImagen
): Promise<string> {
  const clave = claveCache(datos);

  if (cacheMemoria.has(clave)) {
    return cacheMemoria.get(clave)!;
  }

  /* 1. Caché persistente (AsyncStorage). */
  try {
    const guardada = await AsyncStorage.getItem(CLAVE_CACHE + clave);

    if (guardada) {
      cacheMemoria.set(clave, guardada);
      return guardada;
    }
  } catch {
    /* La caché es opcional: se ignora cualquier fallo. */
  }

  /* 2. Búsqueda real (Commons -> Wikipedia). */
  const datosBusqueda: DatosBusquedaImagen = {
    marca: datos.marca,
    modelo: datos.modelo,
    tipo: datos.tipo,
    year: datos.year,
  };

  let encontrada: string | null = null;

  try {
    encontrada = await buscarFotoVehiculo(datosBusqueda, {
      esWeb: Platform.OS === 'web',
    });
  } catch {
    encontrada = null;
  }

  if (encontrada) {
    cacheMemoria.set(clave, encontrada);

    try {
      await AsyncStorage.setItem(CLAVE_CACHE + clave, encontrada);
    } catch {
      /* Ignorado a propósito. */
    }

    return encontrada;
  }

  /* 3. Genérica. */
  return imagenPorDefecto(datos.tipo);
}
