import { buscarAseguradora } from '@/data/aseguradoras';

import { calcularEstado, diasRestantes } from '@/utils/fechas';

import type { EstadoDocumento, Vehiculo, VehiculoAdmin } from '@/types/models';

export type TipoFiltro = 'todos' | 'Carro' | 'Moto';

export const FILTRO_TODOS = 'todos';
export const FILTRO_SIN_SEGURO = 'sin-seguro';
export const FILTRO_POR_RENOVAR = 'por-renovar';
export const PREFIJO_ASEGURADORA = 'aseg:';

export type EstadoSeguro = EstadoDocumento | 'Sin seguro' | 'Sin fecha';

export function nombreAseguradora(vehiculo: Vehiculo): string {
  const nombre = vehiculo.aseguradora?.trim() ?? '';

  if (!nombre) {
    return '';
  }

  return buscarAseguradora(nombre)?.nombre ?? nombre;
}

export function tieneSeguro(vehiculo: Vehiculo): boolean {
  return nombreAseguradora(vehiculo) !== '';
}

export function estadoSeguro(vehiculo: Vehiculo): EstadoSeguro {
  if (!tieneSeguro(vehiculo)) {
    return 'Sin seguro';
  }

  if (!vehiculo.vencimientoSeguro) {
    return 'Sin fecha';
  }

  return calcularEstado(vehiculo.vencimientoSeguro);
}

export function requiereRenovacion(vehiculo: Vehiculo): boolean {
  const estado = estadoSeguro(vehiculo);

  return estado === 'Proximo a vencer' || estado === 'Vencido';
}

export function textoVencimiento(vehiculo: Vehiculo): string {
  if (!vehiculo.vencimientoSeguro) {
    return '';
  }

  const dias = diasRestantes(vehiculo.vencimientoSeguro);

  if (dias < 0) {
    return `Venció hace ${Math.abs(dias)} d`;
  }

  if (dias === 0) {
    return 'Vence hoy';
  }

  return `Vence en ${dias} d`;
}

export function resumirVehiculos(vehiculos: Vehiculo[]) {
  const conSeguro = vehiculos.filter(tieneSeguro).length;

  return {
    total: vehiculos.length,
    conSeguro,
    sinSeguro: vehiculos.length - conSeguro,
    porRenovar: vehiculos.filter(requiereRenovacion).length,
  };
}

export function contarPorAseguradora(
  vehiculos: Vehiculo[]
): { nombre: string; cantidad: number }[] {
  const conteo = new Map<string, number>();

  vehiculos.forEach((vehiculo) => {
    const nombre = nombreAseguradora(vehiculo);

    if (nombre) {
      conteo.set(nombre, (conteo.get(nombre) ?? 0) + 1);
    }
  });

  return Array.from(conteo.entries())
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre));
}

export function filtrarVehiculos(
  vehiculos: VehiculoAdmin[],
  filtro: string,
  texto: string
): VehiculoAdmin[] {
  const buscado = texto.trim().toLowerCase();

  return vehiculos.filter((vehiculo) => {
    if (filtro === FILTRO_SIN_SEGURO && tieneSeguro(vehiculo)) {
      return false;
    }

    if (filtro === FILTRO_POR_RENOVAR && !requiereRenovacion(vehiculo)) {
      return false;
    }

    if (filtro.startsWith(PREFIJO_ASEGURADORA)) {
      const nombre = filtro.slice(PREFIJO_ASEGURADORA.length);

      if (nombreAseguradora(vehiculo) !== nombre) {
        return false;
      }
    }

    if (!buscado) {
      return true;
    }

    return [
      vehiculo.nombre,
      vehiculo.marca,
      vehiculo.modelo,
      vehiculo.placa,
      vehiculo.numeroPoliza,
      nombreAseguradora(vehiculo),
    ]
      .filter(Boolean)
      .some((campo) => String(campo).toLowerCase().includes(buscado));
  });
}

export function unAnioDespues(): string {
  const fecha = new Date();

  fecha.setFullYear(fecha.getFullYear() + 1);

  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');

  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

export function generarNumeroPoliza(
  idAseguradora: string,
  placa: string
): string {
  const sufijo = String(Date.now()).slice(-6);

  return `${idAseguradora.toUpperCase()}-${placa.toUpperCase()}-${sufijo}`;
}
