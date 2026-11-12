/*
=======================================================
NITRO SYNC - VALIDACIÓN Y FORMATO DE PLACAS
=======================================================

En Colombia las placas siguen dos patrones:

  CARRO  ->  3 letras + 3 números      AAA123
  MOTO   ->  3 letras + 2 números + 1 letra   AAA12A

Este módulo centraliza las reglas para que el formulario
solo permita escribir caracteres válidos y avise cuando
la placa está incompleta.

Todas las funciones son puras (no acceden a la red ni a
Firestore), así que se pueden usar en cualquier pantalla.
=======================================================
*/

import type { TipoVehiculo } from '@/types/models';

/** Largo exacto de una placa (carro y moto comparten 6). */
export const LARGO_PLACA = 6;

/** Clase esperada en cada posición: L = letra, N = número. */
type Clase = 'L' | 'N';

const PATRONES: Record<TipoVehiculo, readonly Clase[]> = {
  Carro: ['L', 'L', 'L', 'N', 'N', 'N'],
  Moto: ['L', 'L', 'L', 'N', 'N', 'L'],
};

/** Ejemplos de ayuda para el usuario. */
export const EJEMPLO_PLACA: Record<TipoVehiculo, string> = {
  Carro: 'ABC123',
  Moto: 'ABC12A',
};

/** Pista que se muestra debajo del campo. */
export const AYUDA_PLACA: Record<TipoVehiculo, string> = {
  Carro: '3 letras y 3 números (ej: ABC123)',
  Moto: '3 letras, 2 números y 1 letra (ej: ABC12A)',
};

/**
 * Deja solo letras y números en mayúscula, sin espacios
 * ni guiones. Sirve como primer filtro de entrada.
 */
export function limpiarPlaca(texto: string): string {
  return texto.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

const ES_LETRA = /[A-Z]/;
const ES_NUMERO = /[0-9]/;

/**
 * Aplica el patrón (letras/números) al texto escrito.
 *
 * Es "tolerante": si el usuario escribe un carácter que no
 * corresponde en esa posición, se ignora y se sigue con el
 * siguiente. Así nunca queda una placa con forma inválida.
 */
export function formatearPlaca(texto: string, tipo: TipoVehiculo): string {
  const limpio = limpiarPlaca(texto);
  const patron = PATRONES[tipo];

  let salida = '';
  let indice = 0;

  for (const clase of patron) {
    while (indice < limpio.length) {
      const caracter = limpio[indice];
      indice += 1;

      const coincide =
        (clase === 'L' && ES_LETRA.test(caracter)) ||
        (clase === 'N' && ES_NUMERO.test(caracter));

      if (coincide) {
        salida += caracter;
        break;
      }
    }
  }

  return salida;
}

/** true cuando la placa ya cumple el patrón completo. */
export function esPlacaValida(texto: string, tipo: TipoVehiculo): boolean {
  const normalizada = limpiarPlaca(texto);

  return (
    normalizada.length === LARGO_PLACA &&
    normalizada === formatearPlaca(normalizada, tipo)
  );
}

/** Cuántos caracteres válidos lleva la placa (para el contador). */
export function progresoPlaca(texto: string, tipo: TipoVehiculo): number {
  return formatearPlaca(texto, tipo).length;
}
