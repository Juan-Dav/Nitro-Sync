import { nombreAseguradora, textoVencimiento } from '@/utils/admin';

import type { Vehiculo } from '@/types/models';

export function soloDigitos(texto: string): string {
  return texto.replace(/\D/g, '');
}

export function esCelularValido(texto: string): boolean {
  const digitos = soloDigitos(texto);

  return (
    (digitos.length === 10 && digitos.startsWith('3')) ||
    (digitos.length === 12 && digitos.startsWith('573'))
  );
}

export function telefonoInternacional(texto: string): string {
  const digitos = soloDigitos(texto);

  return digitos.length === 10 ? `57${digitos}` : digitos;
}

export function urlWhatsApp(telefono: string, mensaje: string): string {
  return `https://wa.me/${telefonoInternacional(telefono)}?text=${encodeURIComponent(mensaje)}`;
}

export function mensajeContacto(vehiculo: Vehiculo): string {
  const nombre = vehiculo.nombre || `${vehiculo.marca} ${vehiculo.modelo}`;
  const placa = vehiculo.placa ? ` (${vehiculo.placa})` : '';
  const aseguradora = nombreAseguradora(vehiculo);

  if (!aseguradora) {
    return `Hola, soy tu agente de seguros en Nitro Sync. Vi que tu ${nombre}${placa} no tiene seguro registrado. ¿Te cotizo una opción?`;
  }

  const vence = textoVencimiento(vehiculo).toLowerCase();

  return `Hola, soy tu agente de seguros en Nitro Sync. El seguro de ${aseguradora} de tu ${nombre}${placa} ${vence}. ¿Quieres que te ayude a renovarlo?`;
}
