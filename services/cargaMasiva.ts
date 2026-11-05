/*
=======================================================
NITRO SYNC - CARGA MASIVA DE VEHÍCULOS (FIRESTORE)
=======================================================

Guarda de una sola vez los vehículos validados desde el
Excel (ver utils/cargaMasiva.ts):

  usuarios/{uid}/vehiculos/{id}

Pasos:

  1. Busca la foto de cada marca/modelo distinto (una sola
     búsqueda por modelo, con 4 consultas en paralelo). Si
     algo falla se usa la imagen genérica: nunca se bloquea.
  2. Escribe los vehículos en lotes (writeBatch) de hasta
     400 documentos. Cada lote es atómico: o se guarda
     completo o no se guarda.

Se utiliza el SDK oficial de Firestore (nunca fetch).
=======================================================
*/

import { doc, writeBatch } from 'firebase/firestore';

import { db } from '@/firebaseConfig';

import {
  buscarImagenVehiculo,
  imagenPorDefecto,
} from '@/services/imagenVehiculo';

import { vehiculosCol } from '@/services/vehiculos';

import type { FilaValida } from '@/utils/cargaMasiva';
import { hoyISO } from '@/utils/fechas';

/* Firestore permite 500 operaciones por lote; se deja margen. */
const TAMANO_LOTE = 400;

/* Búsquedas de foto simultáneas. */
const CONCURRENCIA_IMAGENES = 4;

export type FaseCarga = 'imagenes' | 'guardando';

export interface ProgresoCarga {
  fase: FaseCarga;
  hecho: number;
  total: number;
}

export interface ResumenImportacion {
  importados: number;
  /** Lotes que fallaron: sus filas NO se guardaron. */
  filasConError: { fila: number; mensaje: string }[];
}

/* -------------------------------------------------------
   FOTOS (una búsqueda por modelo distinto)
   ------------------------------------------------------- */

function claveModelo(datos: FilaValida['datos']): string {
  return `${datos.tipo}|${datos.marca.toLowerCase()}|${datos.modelo.toLowerCase()}|${datos.year}`;
}

async function resolverImagenes(
  filas: FilaValida[],
  alAvanzar: (hecho: number, total: number) => void
): Promise<Map<string, string>> {
  const unicos = new Map<string, FilaValida['datos']>();

  filas.forEach(({ datos }) => {
    const clave = claveModelo(datos);

    if (!unicos.has(clave)) {
      unicos.set(clave, datos);
    }
  });

  const pendientes = [...unicos.entries()];
  const imagenes = new Map<string, string>();

  let hecho = 0;
  let siguiente = 0;

  const trabajador = async () => {
    while (siguiente < pendientes.length) {
      const [clave, datos] = pendientes[siguiente];

      siguiente += 1;

      try {
        imagenes.set(
          clave,
          await buscarImagenVehiculo({
            marca: datos.marca,
            modelo: datos.modelo,
            tipo: datos.tipo,
            year: datos.year,
          })
        );
      } catch {
        imagenes.set(clave, imagenPorDefecto(datos.tipo));
      }

      hecho += 1;
      alAvanzar(hecho, pendientes.length);
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(CONCURRENCIA_IMAGENES, pendientes.length) },
      trabajador
    )
  );

  return imagenes;
}

/* -------------------------------------------------------
   IMPORTACIÓN
   ------------------------------------------------------- */

export async function importarVehiculos(
  uid: string,
  filas: FilaValida[],
  alProgresar?: (progreso: ProgresoCarga) => void
): Promise<ResumenImportacion> {
  const resumen: ResumenImportacion = { importados: 0, filasConError: [] };

  if (filas.length === 0) {
    return resumen;
  }

  /* 1. Fotos. */

  const imagenes = await resolverImagenes(filas, (hecho, total) =>
    alProgresar?.({ fase: 'imagenes', hecho, total })
  );

  /* 2. Escritura por lotes. */

  const fechaRegistro = hoyISO();
  const coleccion = vehiculosCol(uid);

  for (let i = 0; i < filas.length; i += TAMANO_LOTE) {
    const grupo = filas.slice(i, i + TAMANO_LOTE);
    const lote = writeBatch(db);

    grupo.forEach(({ datos }) => {
      lote.set(doc(coleccion), {
        ...datos,
        uid,
        imagen: imagenes.get(claveModelo(datos)) ?? imagenPorDefecto(datos.tipo),
        fechaRegistro,
      });
    });

    try {
      await lote.commit();

      resumen.importados += grupo.length;
    } catch (error: any) {
      const mensaje = error?.message ?? 'No se pudo guardar este grupo.';

      grupo.forEach(({ fila }) =>
        resumen.filasConError.push({ fila, mensaje })
      );
    }

    alProgresar?.({
      fase: 'guardando',
      hecho: Math.min(i + TAMANO_LOTE, filas.length),
      total: filas.length,
    });
  }

  return resumen;
}
