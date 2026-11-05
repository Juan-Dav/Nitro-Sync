/*
=======================================================
NITRO SYNC - UTILIDADES DE FECHAS Y ESTADOS
=======================================================

Las fechas se guardan en Firestore como texto ISO:
"AAAA-MM-DD". Estas funciones permiten calcular:

- Cuántos días faltan para una fecha.
- El estado de un documento:
    Vigente | Proximo a vencer | Vencido

De este modo el estado NUNCA queda desactualizado
porque se calcula en cada consulta.

=======================================================
*/

import type { EstadoDocumento } from '@/types/models';

/*
=======================================================
DÍAS RESTANTES
=======================================================

Devuelve:
  negativo -> la fecha ya pasó
  0        -> vence hoy
  positivo -> faltan N días
=======================================================
*/

export function diasRestantes(fechaISO: string): number {
  const partes = fechaISO.split('-');

  /*
  "AAAA-MM-DD" se interpreta en hora local para que el
  vencimiento ocurra al final del día en Colombia.
  */
  const objetivo =
    partes.length === 3
      ? new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]))
      : new Date(fechaISO);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const diferencia = objetivo.getTime() - hoy.getTime();

  return Math.round(diferencia / 86_400_000);
}

/*
=======================================================
CALCULAR ESTADO DE UN DOCUMENTO
=======================================================

diasUmbral:
Cantidad de días previos al vencimiento a partir de
los cuales el documento se considera "Proximo a vencer".
Por defecto: 30 días.
=======================================================
*/

export function calcularEstado(
  vencimientoISO: string,
  diasUmbral = 30
): EstadoDocumento {
  const dias = diasRestantes(vencimientoISO);

  if (dias < 0) {
    return 'Vencido';
  }

  if (dias <= diasUmbral) {
    return 'Proximo a vencer';
  }

  return 'Vigente';
}

/*
======================================================
VALIDAR FECHA ISO "AAAA-MM-DD"
======================================================

Devuelve true solo si el texto tiene formato de fecha
real (no existe un "31 de febrero").
======================================================
*/

export function esFechaISOValida(fecha: string): boolean {
  const partes = fecha.split('-');

  if (partes.length !== 3) {
    return false;
  }

  const [anio, mes, dia] = partes.map(Number);

  if (
    Number.isNaN(anio) ||
    Number.isNaN(mes) ||
    Number.isNaN(dia) ||
    anio < 1900 ||
    anio > 2200 ||
    mes < 1 ||
    mes > 12 ||
    dia < 1 ||
    dia > 31
  ) {
    return false;
  }

  /* Comprueba que el día exista realmente en el mes. */

  const fechaObj = new Date(anio, mes - 1, dia);

  return (
    fechaObj.getFullYear() === anio &&
    fechaObj.getMonth() === mes - 1 &&
    fechaObj.getDate() === dia
  );
}

/*
======================================================
HOY EN FORMATO ISO
======================================================

  hoyISO() -> "2026-10-07"
======================================================
*/

export function hoyISO(): string {
  const hoy = new Date();

  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');

  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

export function formatDateForNotification(fechaISO: string): string {
  return fechaISO;
}
