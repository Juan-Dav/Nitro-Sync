/*
========================================================
NITRO SYNC - BASE DE DATOS LOCAL DE VEHÍCULOS
========================================================

Esta carpeta centraliza la información de los vehículos
para que TODAS las pantallas consuman los mismos datos
(una sola fuente de verdad).

- app/(tabs)/index.tsx  -> lee VEHICULOS para el buscador.
- app/(tabs)/explore.tsx -> lee VEHICULOS para el listado.
- app/vehicle/[id].tsx  -> busca un vehículo por su id.

Más adelante estos datos podrán reemplazarse por una
consulta a una base de datos o backend sin cambiar las
pantallas.
========================================================
*/

export type EstadoDocumento = 'Vigente' | 'Vence pronto';

export interface Vehiculo {
  id: string;
  nombre: string;
  tipo: 'Carro' | 'Moto';
  year: number;
  placa: string;
  kilometraje: string;
  imagen: string;
  color: string;

  aceite: {
    tipo: string;
    proximoCambio: string;
    estado: EstadoDocumento;
  };

  soat: {
    vigencia: string;
    fechaVencimiento: string;
    estado: EstadoDocumento;
  };

  revision: {
    tipo: string;
    proximaRevision: string;
    estado: EstadoDocumento;
  };

  seguro: {
    compania: string;
    poliza: string;
    vencimiento: string;
    estado: EstadoDocumento;
  };

  mantenimiento: {
    ultimo: string;
    fecha: string;
    costo: string;
  };
}

export const VEHICULOS: Vehiculo[] = [
  {
    id: "1",
    nombre: "Mazda 3",
    tipo: "Carro",
    year: 2022,
    placa: "ABC-123",
    kilometraje: "36.500 km",
    imagen: "https://images.unsplash.com/photo-1555215695-3004980ad54e",
    color: "Gris",

    aceite: {
      tipo: "Sintético 5W-30",
      proximoCambio: "5 de septiembre, 2026",
      estado: "Vence pronto",
    },

    soat: {
      vigencia: "2026",
      fechaVencimiento: "15 de octubre, 2026",
      estado: "Vigente",
    },

    revision: {
      tipo: "Técnico-mecánica",
      proximaRevision: "23 de septiembre, 2026",
      estado: "Vence pronto",
    },

    seguro: {
      compania: "Seguros SURA",
      poliza: "#POL-2026-4455",
      vencimiento: "1 de marzo, 2027",
      estado: "Vigente",
    },

    mantenimiento: {
      ultimo: "Cambio de frenos delanteros",
      fecha: "20 de julio, 2026",
      costo: "$180.000",
    },
  },

  {
    id: "2",
    nombre: "Yamaha FZ 2.0",
    tipo: "Moto",
    year: 2023,
    placa: "XYZ-789",
    kilometraje: "15.200 km",
    imagen: "https://images.unsplash.com/photo-1558981806-ec527fa84c39",
    color: "Negro",

    aceite: {
      tipo: "Mineral 10W-40",
      proximoCambio: "18 de septiembre, 2026",
      estado: "Vigente",
    },

    soat: {
      vigencia: "2026",
      fechaVencimiento: "30 de noviembre, 2026",
      estado: "Vigente",
    },

    revision: {
      tipo: "Técnico-mecánica",
      proximaRevision: "10 de diciembre, 2026",
      estado: "Vigente",
    },

    seguro: {
      compania: "Seguros Bolívar",
      poliza: "#POL-2026-7788",
      vencimiento: "15 de junio, 2027",
      estado: "Vigente",
    },

    mantenimiento: {
      ultimo: "Cambio de cadena",
      fecha: "1 de agosto, 2026",
      costo: "$120.000",
    },
  },
];