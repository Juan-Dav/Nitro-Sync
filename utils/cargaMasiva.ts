/*
=======================================================
NITRO SYNC - CARGA MASIVA DESDE EXCEL (VALIDACIÓN)
=======================================================

Convierte las filas leídas de un Excel en vehículos listos
para guardar en Firestore, con sus datos de seguro:

  Nombre | Tipo | Marca | Modelo | Año | Placa | Color |
  Kilometraje | Aseguradora | Teléfono aseguradora |
  N° póliza | Vencimiento seguro

Este módulo es PURO: no usa Firebase, ni React, ni el
lector de Excel. Recibe filas ya leídas (objetos) y
devuelve:

  - validas : filas correctas, listas para importar.
  - errores : filas con problemas y qué corregir.
  - omitidas: filas repetidas (placa ya registrada).

Reglas (las mismas del formulario de la app):

  - Tipo: Carro o Moto.
  - Marca, modelo y año son obligatorios.
  - Año entre 1950 y el año actual + 1.
  - La placa es opcional, pero si se escribe debe cumplir el
    patrón colombiano (carro AAA123, moto AAA12A).
  - Si la aseguradora está en el directorio, se usa su
    nombre oficial y se completa el teléfono si falta.
  - El vencimiento del seguro es opcional, pero si se
    escribe debe ser una fecha real.

Fechas aceptadas: AAAA-MM-DD, DD/MM/AAAA, fecha de Excel
(número de serie) o un objeto Date.
=======================================================
*/

import { buscarAseguradora } from '../data/aseguradoras';

import { esPlacaValida, limpiarPlaca } from './placa';

import type { TipoVehiculo, Vehiculo } from '../types/models';

/* -------------------------------------------------------
   CONSTANTES
   ------------------------------------------------------- */

/** Máximo de filas por archivo (protege la cuota de Firestore). */
export const MAX_FILAS_CARGA = 500;

/** Encabezados oficiales de la plantilla, en orden. */
export const ENCABEZADOS_CARGA = [
  'Nombre',
  'Tipo',
  'Marca',
  'Modelo',
  'Año',
  'Placa',
  'Color',
  'Kilometraje',
  'Aseguradora',
  'Teléfono aseguradora',
  'N° póliza',
  'Vencimiento seguro',
] as const;

/** Campos que se guardan de cada fila (el resto lo agrega la app). */
export type DatosFilaCarga = Pick<
  Vehiculo,
  | 'nombre'
  | 'tipo'
  | 'marca'
  | 'modelo'
  | 'year'
  | 'placa'
  | 'color'
  | 'kilometraje'
  | 'aseguradora'
  | 'telefonoAseguradora'
  | 'numeroPoliza'
  | 'vencimientoSeguro'
>;

export interface FilaValida {
  /** Número de fila en el Excel (la 1 es el encabezado). */
  fila: number;
  datos: DatosFilaCarga;
}

export interface FilaConError {
  fila: number;
  /** Texto corto para identificar la fila en la lista. */
  referencia: string;
  problemas: string[];
}

export interface ResultadoCarga {
  validas: FilaValida[];
  errores: FilaConError[];
  /** Filas cuya placa ya existe (en el garaje o antes en el archivo). */
  omitidas: FilaConError[];
  /** true si el archivo traía más filas que MAX_FILAS_CARGA. */
  excedeLimite: boolean;
  /** Filas con contenido que se revisaron (sin contar vacías). */
  totalLeidas: number;
}

/* -------------------------------------------------------
   NORMALIZACIÓN DE ENCABEZADOS
   ------------------------------------------------------- */

/** "Teléfono aseguradora" -> "telefonoaseguradora" */
function clave(texto: unknown): string {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Nombres alternativos aceptados para cada campo. */
const ALIAS: Record<string, string[]> = {
  nombre: ['nombre', 'alias', 'nombredelvehiculo'],
  tipo: ['tipo', 'tipovehiculo', 'clase'],
  marca: ['marca'],
  modelo: ['modelo', 'linea'],
  year: ['ano', 'anio', 'year', 'modeloano', 'anodelmodelo'],
  placa: ['placa', 'placas'],
  color: ['color'],
  kilometraje: ['kilometraje', 'km', 'kilometros'],
  aseguradora: ['aseguradora', 'seguro', 'compania', 'companiaaseguradora'],
  telefono: [
    'telefonoaseguradora',
    'telefono',
    'telefonoasistencia',
    'celularaseguradora',
  ],
  poliza: ['npoliza', 'numeropoliza', 'poliza', 'nropoliza', 'nopoliza'],
  vencimiento: [
    'vencimientoseguro',
    'vencimiento',
    'vencimientopoliza',
    'fechavencimiento',
  ],
};

/** Devuelve el valor de la columna buscada (por cualquier alias). */
function leer(fila: Record<string, unknown>, campo: keyof typeof ALIAS) {
  const alias = ALIAS[campo];

  for (const [encabezado, valor] of Object.entries(fila)) {
    if (alias.includes(clave(encabezado))) {
      return valor;
    }
  }

  return undefined;
}

function texto(valor: unknown): string {
  if (valor === null || valor === undefined) {
    return '';
  }

  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? String(valor) : '';
  }

  return String(valor).trim().replace(/\s+/g, ' ');
}

/* -------------------------------------------------------
   TIPO, NÚMEROS Y FECHAS
   ------------------------------------------------------- */

function normalizarTipo(valor: unknown): TipoVehiculo | null {
  const t = clave(valor);

  if (['carro', 'auto', 'automovil', 'coche', 'camioneta', 'car'].includes(t)) {
    return 'Carro';
  }

  if (['moto', 'motocicleta', 'motos', 'motorbike'].includes(t)) {
    return 'Moto';
  }

  return null;
}

/** Entero positivo desde "12.500", "12,500 km" o 12500. */
function entero(valor: unknown): number | null {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? Math.round(valor) : null;
  }

  const digitos = texto(valor).replace(/[^0-9]/g, '');

  return digitos ? Number(digitos) : null;
}

function dosDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

function comoISO(anio: number, mes: number, dia: number): string | null {
  const fecha = new Date(anio, mes - 1, dia);

  const real =
    fecha.getFullYear() === anio &&
    fecha.getMonth() === mes - 1 &&
    fecha.getDate() === dia &&
    anio >= 1900 &&
    anio <= 2200;

  return real ? `${anio}-${dosDigitos(mes)}-${dosDigitos(dia)}` : null;
}

/**
 * Convierte lo que venga en la celda a "AAAA-MM-DD".
 * Devuelve '' si está vacía y null si no es una fecha válida.
 */
export function normalizarFecha(valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === '') {
    return '';
  }

  /* Objeto Date (el lector puede entregarlo con cellDates). */
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime())
      ? null
      : comoISO(valor.getFullYear(), valor.getMonth() + 1, valor.getDate());
  }

  /* Número de serie de Excel (días desde 1899-12-30). */
  if (typeof valor === 'number') {
    if (valor < 1 || valor > 100000) {
      return null;
    }

    const fecha = new Date(Date.UTC(1899, 11, 30) + Math.floor(valor) * 86_400_000);

    return comoISO(
      fecha.getUTCFullYear(),
      fecha.getUTCMonth() + 1,
      fecha.getUTCDate()
    );
  }

  const cadena = texto(valor);

  if (!cadena) {
    return '';
  }

  /* AAAA-MM-DD  o  AAAA/MM/DD */
  let m = cadena.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);

  if (m) {
    return comoISO(Number(m[1]), Number(m[2]), Number(m[3]));
  }

  /* DD/MM/AAAA  o  DD-MM-AAAA (formato colombiano) */
  m = cadena.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);

  if (m) {
    return comoISO(Number(m[3]), Number(m[2]), Number(m[1]));
  }

  return null;
}

/* -------------------------------------------------------
   PROCESAMIENTO PRINCIPAL
   ------------------------------------------------------- */

function filaVacia(fila: Record<string, unknown>): boolean {
  return Object.values(fila).every((valor) => texto(valor) === '');
}

export function procesarFilasCarga(
  filas: Record<string, unknown>[],
  opciones: {
    /** Placas que ya existen en el garaje del usuario. */
    placasExistentes?: string[];
    /** Para pruebas: año actual fijo. */
    anioActual?: number;
  } = {}
): ResultadoCarga {
  const anioActual = opciones.anioActual ?? new Date().getFullYear();

  const placasVistas = new Set(
    (opciones.placasExistentes ?? []).map(limpiarPlaca).filter(Boolean)
  );

  const resultado: ResultadoCarga = {
    validas: [],
    errores: [],
    omitidas: [],
    excedeLimite: false,
    totalLeidas: 0,
  };

  const conContenido = filas
    .map((datos, indice) => ({ datos, fila: indice + 2 }))
    .filter(({ datos }) => !filaVacia(datos));

  resultado.excedeLimite = conContenido.length > MAX_FILAS_CARGA;

  const aProcesar = conContenido.slice(0, MAX_FILAS_CARGA);

  resultado.totalLeidas = aProcesar.length;

  for (const { datos: bruto, fila } of aProcesar) {
    const problemas: string[] = [];

    const marca = texto(leer(bruto, 'marca'));
    const modelo = texto(leer(bruto, 'modelo'));
    const tipo = normalizarTipo(leer(bruto, 'tipo'));
    const year = entero(leer(bruto, 'year'));

    /* ---------- Obligatorios ---------- */

    if (!tipo) {
      problemas.push('Tipo debe ser "Carro" o "Moto".');
    }

    if (!marca) {
      problemas.push('Falta la marca.');
    }

    if (!modelo) {
      problemas.push('Falta el modelo.');
    }

    if (year === null || year < 1950 || year > anioActual + 1) {
      problemas.push(`Año inválido (debe estar entre 1950 y ${anioActual + 1}).`);
    }

    /* ---------- Placa (opcional) ---------- */

    const placaTexto = texto(leer(bruto, 'placa'));
    let placa = '';

    if (placaTexto) {
      placa = limpiarPlaca(placaTexto);

      if (tipo && !esPlacaValida(placa, tipo)) {
        problemas.push(
          tipo === 'Carro'
            ? `Placa "${placaTexto}" inválida: un carro usa 3 letras y 3 números (ABC123).`
            : `Placa "${placaTexto}" inválida: una moto usa 3 letras, 2 números y 1 letra (ABC12A).`
        );
      }
    }

    /* ---------- Kilometraje ---------- */

    const kmBruto = leer(bruto, 'kilometraje');
    const kilometraje = texto(kmBruto) === '' ? 0 : entero(kmBruto);

    if (kilometraje === null) {
      problemas.push('Kilometraje debe ser un número.');
    }

    /* ---------- Seguro ---------- */

    const aseguradoraTexto = texto(leer(bruto, 'aseguradora'));
    const enDirectorio = buscarAseguradora(aseguradoraTexto);

    const aseguradora = enDirectorio?.nombre ?? aseguradoraTexto;

    const telefonoTexto = texto(leer(bruto, 'telefono'));
    const telefonoAseguradora =
      telefonoTexto || enDirectorio?.telefonoGratuito || enDirectorio?.telefono || '';

    const numeroPoliza = texto(leer(bruto, 'poliza'));

    const vencimiento = normalizarFecha(leer(bruto, 'vencimiento'));

    if (vencimiento === null) {
      problemas.push(
        'Vencimiento del seguro inválido (usa AAAA-MM-DD o DD/MM/AAAA).'
      );
    }

    /* ---------- Resultado de la fila ---------- */

    const referencia =
      [marca, modelo].filter(Boolean).join(' ') || placaTexto || 'Fila sin datos';

    if (problemas.length > 0 || !tipo || year === null || kilometraje === null) {
      resultado.errores.push({ fila, referencia, problemas });
      continue;
    }

    /* Placa repetida (en el garaje o dentro del mismo archivo). */

    if (placa && placasVistas.has(placa)) {
      resultado.omitidas.push({
        fila,
        referencia,
        problemas: [`La placa ${placa} ya está registrada.`],
      });
      continue;
    }

    if (placa) {
      placasVistas.add(placa);
    }

    resultado.validas.push({
      fila,
      datos: {
        nombre: texto(leer(bruto, 'nombre')) || `${marca} ${modelo}`,
        tipo,
        marca,
        modelo,
        year,
        placa,
        color: texto(leer(bruto, 'color')),
        kilometraje,
        aseguradora,
        telefonoAseguradora: aseguradora ? telefonoAseguradora : '',
        numeroPoliza,
        vencimientoSeguro: vencimiento ?? '',
      },
    });
  }

  return resultado;
}
