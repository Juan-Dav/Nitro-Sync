/*
=======================================================
NITRO SYNC - CÁLCULO DEL CAMBIO DE ACEITE
=======================================================

Con el kilometraje actual del vehículo y el último
"Cambio de aceite" registrado, calcula:

  - Cuántos km se han recorrido desde ese cambio.
  - Cuántos km faltan para el próximo.
  - El estado: Al día / Próximo / Vencido.

Los intervalos son los habituales:

  - Carro: cada 5.000 km
  - Moto : cada 3.000 km

No se inventan datos: si el vehículo no tiene ningún
"Cambio de aceite" registrado, el estado es
"Sin registro" y no se generan avisos.
=======================================================
*/

import type { Mantenimiento, TipoVehiculo } from '@/types/models';

/** Intervalo de cambio de aceite en kilómetros. */
export const INTERVALO_ACEITE: Record<TipoVehiculo, number> = {
  Carro: 5000,
  Moto: 3000,
};

/** Se considera "próximo" cuando faltan estos km o menos. */
export const UMBRAL_AVISO_ACEITE = 500;

export function intervaloAceite(tipo: TipoVehiculo): number {
  return INTERVALO_ACEITE[tipo] ?? INTERVALO_ACEITE.Carro;
}

export type EstadoNivelAceite = 'Sin registro' | 'Al día' | 'Próximo' | 'Vencido';

export interface EstadoAceite {
  /** Hay al menos un cambio de aceite registrado. */
  tieneRegistro: boolean;
  /** Kilometraje del último cambio de aceite (0 si no hay). */
  kilometrajeCambio: number;
  /** Fecha del último cambio ("" si no hay). */
  fechaCambio: string;
  intervalo: number;
  /** Kilometraje al que tocará el próximo cambio (0 si no hay). */
  proximoCambio: number;
  kmRecorridos: number;
  /** Negativo cuando ya se pasó del cambio. */
  kmRestantes: number;
  /** 0 a 100, para la barra de progreso. */
  porcentaje: number;
  estado: EstadoNivelAceite;
  /** Texto corto listo para mostrar. */
  resumen: string;
}

/** Devuelve el último "Cambio de aceite" por kilometraje (o por fecha). */
export function ultimoCambioAceite(
  mantenimientos: Mantenimiento[],
): Mantenimiento | undefined {
  const cambios = mantenimientos.filter(
    (mantenimiento) => mantenimiento.tipo === 'Cambio de aceite',
  );

  if (cambios.length === 0) {
    return undefined;
  }

  return cambios.reduce((mejor, actual) => {
    if (actual.kilometraje !== mejor.kilometraje) {
      return actual.kilometraje > mejor.kilometraje ? actual : mejor;
    }

    return actual.fecha > mejor.fecha ? actual : mejor;
  });
}

/*
=======================================================
CÁLCULO PRINCIPAL
=======================================================
*/
export function calcularEstadoAceite(opciones: {
  tipo: TipoVehiculo;
  kilometraje: number;
  mantenimientos: Mantenimiento[];
}): EstadoAceite {
  const { tipo, kilometraje, mantenimientos } = opciones;

  const intervalo = intervaloAceite(tipo);
  const ultimo = ultimoCambioAceite(mantenimientos);

  if (!ultimo) {
    return {
      tieneRegistro: false,
      kilometrajeCambio: 0,
      fechaCambio: '',
      intervalo,
      proximoCambio: 0,
      kmRecorridos: 0,
      kmRestantes: intervalo,
      porcentaje: 0,
      estado: 'Sin registro',
      resumen:
        'Registra tu último cambio de aceite (con su kilometraje) para llevar el control.',
    };
  }

  const kmRecorridos = Math.max(0, kilometraje - ultimo.kilometraje);
  const kmRestantes = intervalo - kmRecorridos;
  const proximoCambio = ultimo.kilometraje + intervalo;
  const porcentaje = Math.min(
    100,
    Math.max(0, Math.round((kmRecorridos / intervalo) * 100)),
  );

  let estado: EstadoNivelAceite = 'Al día';
  let resumen = `Faltan ${kmRestantes.toLocaleString('es-CO')} km para el próximo cambio.`;

  if (kmRestantes <= 0) {
    estado = 'Vencido';
    resumen = `¡Cambio de aceite vencido! Te pasaste ${Math.abs(
      kmRestantes,
    ).toLocaleString('es-CO')} km.`;
  } else if (kmRestantes <= UMBRAL_AVISO_ACEITE) {
    estado = 'Próximo';
    resumen = `El cambio de aceite está cerca: faltan ${kmRestantes.toLocaleString(
      'es-CO',
    )} km.`;
  }

  return {
    tieneRegistro: true,
    kilometrajeCambio: ultimo.kilometraje,
    fechaCambio: ultimo.fecha,
    intervalo,
    proximoCambio,
    kmRecorridos,
    kmRestantes,
    porcentaje,
    estado,
    resumen,
  };
}
