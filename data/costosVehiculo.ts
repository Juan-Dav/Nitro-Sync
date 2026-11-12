/*
=======================================================
NITRO SYNC - COSTOS MENSUALES DEL VEHÍCULO
=======================================================

Valores sugeridos (editables) de los gastos típicos de un
vehículo en Colombia:

  SOAT, Tecnomecánica, Seguro, Lavado, Mantenimiento y
  Combustible.

Cada vehículo puede ajustar sus valores: los que el
usuario cambia quedan guardados para ESE vehículo y los
demás usan el valor sugerido. Los valores sugeridos
también sirven para los vehículos nuevos.

Cada mes la app genera estos conceptos como gastos
"pendientes" del mes; el usuario confirma (a la derecha)
los que realmente pagó y el total del mes se calcula con
los confirmados. Al cambiar de mes se generan de nuevo y
el mes anterior queda en el historial.

=======================================================
*/

import type { CategoriaGasto, TipoVehiculo } from '@/types/models';

/* -------------------------------------------------------
   CONCEPTO
   ------------------------------------------------------- */

export interface ConceptoCosto {
  /** Identificador estable (no cambiar: se guarda en Firestore). */
  clave: string;

  /** Categoría de gasto asociada. */
  categoria: CategoriaGasto;

  /** Nombre visible. */
  nombre: string;

  /** Emoji decorativo. */
  icono: string;

  /** Valor sugerido para un carro (COP). */
  valorCarro: number;

  /** Valor sugerido para una moto (COP). */
  valorMoto: number;

  /** Explicación corta. */
  ayuda: string;
}

/* -------------------------------------------------------
   LOS SEIS COSTOS
   ------------------------------------------------------- */

export const CONCEPTOS_COSTO: ConceptoCosto[] = [
  {
    clave: 'soat',
    categoria: 'SOAT',
    nombre: 'SOAT',
    icono: '🛡️',
    valorCarro: 480000,
    valorMoto: 200000,
    ayuda: 'Seguro obligatorio de accidentes de tránsito.',
  },
  {
    clave: 'tecnomecanica',
    categoria: 'Tecnomecanica',
    nombre: 'Tecnomecánica',
    icono: '🔧',
    valorCarro: 280000,
    valorMoto: 150000,
    ayuda: 'Revisión técnico-mecánica y de emisiones.',
  },
  {
    clave: 'seguro',
    categoria: 'Seguro',
    nombre: 'Seguro',
    icono: '📄',
    valorCarro: 1200000,
    valorMoto: 500000,
    ayuda: 'Póliza todo riesgo o responsabilidad civil.',
  },
  {
    clave: 'lavado',
    categoria: 'Lavado',
    nombre: 'Lavado',
    icono: '🧼',
    valorCarro: 30000,
    valorMoto: 15000,
    ayuda: 'Lavado y aseo del vehículo.',
  },
  {
    clave: 'mantenimiento',
    categoria: 'Mantenimiento',
    nombre: 'Mantenimiento',
    icono: '⚙️',
    valorCarro: 350000,
    valorMoto: 180000,
    ayuda: 'Aceite, filtros y revisiones generales.',
  },
  {
    clave: 'combustible',
    categoria: 'Combustible',
    nombre: 'Combustible',
    icono: '⛽',
    valorCarro: 300000,
    valorMoto: 120000,
    ayuda: 'Gasolina, diésel o gas del mes.',
  },
];

/* -------------------------------------------------------
   AYUDAS
   ------------------------------------------------------- */

/** Valor sugerido de un concepto según el tipo de vehículo. */
export function valorSugerido(
  concepto: ConceptoCosto,
  tipo: TipoVehiculo
): number {
  return tipo === 'Moto' ? concepto.valorMoto : concepto.valorCarro;
}

/** Busca un concepto por su clave. */
export function conceptoPorClave(clave: string): ConceptoCosto | undefined {
  return CONCEPTOS_COSTO.find((concepto) => concepto.clave === clave);
}

/* -------------------------------------------------------
   MESES (para títulos e historial)
   ------------------------------------------------------- */

export const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

/**
 * Convierte el mes "AAAA-MM" en un texto legible.
 * "2026-10" -> "Octubre 2026"
 */
export function mesLegible(mes: string): string {
  const [anio, numero] = mes.split('-').map(Number);

  if (!anio || !numero || numero < 1 || numero > 12) {
    return mes;
  }

  return `${MESES[numero - 1]} ${anio}`;
}
