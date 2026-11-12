/*
=======================================================
NITRO SYNC - UTILIDADES DE FORMATO
=======================================================

Funciones para presentar los datos guardados en
Firestore de forma clara en la interfaz:

- formatoKm(36500)        -> "36.500 km"
- formatoDinero(180000)   -> "$ 180.000"
- formatoFecha(...)       -> "15 de octubre, 2026"
- iniciales("juan@...")   -> "J"
- saludo()                -> "Buenos días"

Se evita Intl/toLocaleString para que el formato sea
igual en todos los dispositivos (Hermes).

=======================================================
*/

import type { EstadoDocumento, EstadoRecordatorio, TipoDocumento, CategoriaGasto } from '@/types/models';

/* -------------------------------------------------------
   SEPARADOR DE MILES (estilo colombiano: punto)
   ------------------------------------------------------- */

function miles(valor: number): string {
  const entero = Math.abs(Math.round(valor));

  return entero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/* -------------------------------------------------------
   KILOMETRAJE
   ------------------------------------------------------- */

export function formatoKm(kilometraje: number): string {
  return `${miles(kilometraje)} km`;
}

/* -------------------------------------------------------
   DINERO
   ------------------------------------------------------- */

export function formatoDinero(valor: number): string {
  return `$ ${miles(valor)}`;
}

/* -------------------------------------------------------
   FECHA "AAAA-MM-DD" -> "15 de octubre, 2026"
   ------------------------------------------------------- */

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export function formatoFecha(fechaISO: string): string {
  const partes = fechaISO.split('-').map(Number);

  if (partes.length !== 3 || partes.some((p) => Number.isNaN(p))) {
    return fechaISO;
  }

  const [anio, mes, dia] = partes;

  return `${dia} de ${MESES[mes - 1] ?? ''}, ${anio}`;
}

/* -------------------------------------------------------
   INICIALES PARA EL AVATAR
   "juan@gmail.com" -> "J"
   ------------------------------------------------------- */

export function iniciales(texto: string): string {
  const base = texto.split('@')[0]?.trim() ?? '';

  return (base.charAt(0) || 'U').toUpperCase();
}

/* -------------------------------------------------------
   SALUDO SEGÚN LA HORA
   ------------------------------------------------------- */

export function saludo(): string {
  const hora = new Date().getHours();

  if (hora < 12) {
    return 'Buenos días';
  }

  if (hora < 19) {
    return 'Buenas tardes';
  }

  return 'Buenas noches';
}

/* -------------------------------------------------------
   PLACA EN MAYÚSCULAS
   ------------------------------------------------------- */

export function formatoPlaca(placa: string): string {
  return placa.trim().toUpperCase();
}

/* -------------------------------------------------------
   DOCUMENTOS: NOMBRES E ÍCONOS

   "Tecnomecanica" se muestra como "Tecnomecánica" y
   cada tipo tiene un ícono (emoji) consistente en toda
   la aplicación.
   ------------------------------------------------------- */

export const NOMBRES_DOCUMENTO: Record<TipoDocumento, string> = {
  SOAT: 'SOAT',
  Tecnomecanica: 'Tecnomecánica',
  Seguro: 'Seguro',
  Licencia: 'Licencia',
  Otro: 'Otro',
};

export const ICONO_DOCUMENTO: Record<TipoDocumento, string> = {
  SOAT: '🛡️',
  Tecnomecanica: '🛠️',
  Seguro: '📋',
  Licencia: '🪪',
  Otro: '📁',
};

/* -------------------------------------------------------
   TEXTO DE VENCIMIENTO SEGÚN LOS DÍAS

   -15 -> "Vencido hace 15 día(s)"
     0 -> "Vence hoy"
    13 -> "Vence en 13 día(s)"
   ------------------------------------------------------- */

export function textoDiasVencimiento(dias: number): string {
  if (dias < 0) {
    return `Vencido hace ${Math.abs(dias)} día(s)`;
  }

  if (dias === 0) {
    return 'Vence hoy';
  }

  return `Vence en ${dias} día(s)`;
}

/* -------------------------------------------------------
   GASTOS: NOMBRES E ÍCONOS POR CATEGORÍA
   ------------------------------------------------------- */

export const NOMBRES_GASTO: Record<CategoriaGasto, string> = {
  Mantenimiento: 'Mantenimiento',
  Combustible: 'Combustible',
  Repuestos: 'Repuestos',
  SOAT: 'SOAT',
  Seguro: 'Seguro',
  Tecnomecanica: 'Tecnomecánica',
  Lavado: 'Lavado',
  Otros: 'Otros',
};

export const ICONO_GASTO: Record<CategoriaGasto, string> = {
  Mantenimiento: '🔧',
  Combustible: '⛽',
  Repuestos: '⚙️',
  SOAT: '🛡️',
  Seguro: '📋',
  Tecnomecanica: '🛠️',
  Lavado: '🫧',
  Otros: '💰',
};
