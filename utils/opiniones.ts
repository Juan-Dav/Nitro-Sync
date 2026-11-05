import type { CaracteristicaFavorita, Opinion } from '@/types/models';

export const CARACTERISTICAS: CaracteristicaFavorita[] = [
  'Garaje',
  'Documentos',
  'Recordatorios',
  'Gastos',
  'Seguros',
  'Carga masiva',
];

function promedio(valores: number[]): number {
  if (valores.length === 0) {
    return 0;
  }

  return valores.reduce((suma, valor) => suma + valor, 0) / valores.length;
}

export function resumirOpiniones(opiniones: Opinion[]) {
  const total = opiniones.length;

  const distribucion = [5, 4, 3, 2, 1].map((estrellas) => ({
    estrellas,
    cantidad: opiniones.filter((o) => o.calificacion === estrellas).length,
  }));

  const favoritas = CARACTERISTICAS.map((nombre) => ({
    nombre,
    cantidad: opiniones.filter((o) => o.favorita === nombre).length,
  })).sort((a, b) => b.cantidad - a.cantidad);

  return {
    total,
    general: promedio(opiniones.map((o) => o.calificacion)),
    facilidad: promedio(opiniones.map((o) => o.facilidad)),
    diseno: promedio(opiniones.map((o) => o.diseno)),
    utilidad: promedio(opiniones.map((o) => o.utilidad)),
    recomiendan: total
      ? Math.round(
          (opiniones.filter((o) => o.recomienda).length / total) * 100
        )
      : 0,
    distribucion,
    favoritas,
  };
}
