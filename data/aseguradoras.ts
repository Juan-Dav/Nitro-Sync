/*
=======================================================
NITRO SYNC - DIRECTORIO DE ASEGURADORAS (COLOMBIA)
=======================================================

Datos de contacto de las aseguradoras de vehículos más
usadas en Colombia.

Cada registro tiene:

  - nombre              : nombre comercial.
  - telefono            : línea principal (marcable).
  - telefonoGratuito    : línea nacional gratuita.
  - whatsapp            : atención por WhatsApp (si tiene).
  - linea               : línea corta desde celular.
  - web                 : portal de atención.
  - color / colorTexto  : identidad visual en la app.
  - especialidad        : para qué sirve cada una.

El archivo Excel con esta misma información está en:

  assets/documentos/aseguradoras.xlsx

Para regenerarlo después de editar esta lista:

  npm run excel:aseguradoras

Los números se guardan en formato internacional para que
`tel:` funcione igual en Android, iOS y web.
=======================================================
*/

export interface Aseguradora {
  id: string;
  nombre: string;
  telefono: string;
  telefonoGratuito?: string;
  whatsapp?: string;
  linea?: string;
  web: string;
  color: string;
  colorTexto: string;
  especialidad: string;
}

export const ASEGURADORAS: Aseguradora[] = [
  {
    id: 'sura',
    nombre: 'SURA',
    telefono: '+576014378888',
    telefonoGratuito: '018000518888',
    whatsapp: '+573152757888',
    linea: '#888',
    web: 'https://www.sura.com',
    color: '#0033A0',
    colorTexto: '#FFFFFF',
    especialidad: 'Autos, motos y todo riesgo',
  },
  {
    id: 'bolivar',
    nombre: 'Seguros Bolívar',
    telefono: '+576013122122',
    telefonoGratuito: '018000123322',
    linea: '#322',
    web: 'https://www.segurosbolivar.com',
    color: '#00A94F',
    colorTexto: '#04220F',
    especialidad: 'Autos y motos',
  },
  {
    id: 'axa',
    nombre: 'AXA Colpatria',
    telefono: '+576014235757',
    telefonoGratuito: '018000512620',
    linea: '#247',
    web: 'https://www.axacolpatria.co',
    color: '#00008F',
    colorTexto: '#FFFFFF',
    especialidad: 'Autos, motos y asistencia',
  },
  {
    id: 'mapfre',
    nombre: 'MAPFRE',
    telefono: '+576013077024',
    telefonoGratuito: '018000519991',
    whatsapp: '+573188030276',
    linea: '#624',
    web: 'https://www.mapfre.com.co',
    color: '#C8102E',
    colorTexto: '#FFFFFF',
    especialidad: 'Autos y motos',
  },
  {
    id: 'allianz',
    nombre: 'Allianz',
    telefono: '+576015941133',
    telefonoGratuito: '018000513500',
    linea: '#265',
    web: 'https://www.allianz.co',
    color: '#003781',
    colorTexto: '#FFFFFF',
    especialidad: 'Autos y motos',
  },
  {
    id: 'liberty',
    nombre: 'Liberty Seguros',
    telefono: '+576019181600',
    whatsapp: '+573164821802',
    web: 'https://www.libertycolombia.com',
    color: '#0B3D91',
    colorTexto: '#FFFFFF',
    especialidad: 'Autos y motos',
  },
  {
    id: 'sbs',
    nombre: 'SBS Seguros',
    telefono: '+576013138700',
    telefonoGratuito: '018000911360',
    linea: '#360',
    web: 'https://www.sbsseguros.com',
    color: '#E30613',
    colorTexto: '#FFFFFF',
    especialidad: 'Autos y motos',
  },
  {
    id: 'estado',
    nombre: 'Seguros del Estado',
    telefono: '+576017443900',
    telefonoGratuito: '018000123010',
    linea: '#388',
    web: 'https://www.segurosdelestado.com',
    color: '#00539B',
    colorTexto: '#FFFFFF',
    especialidad: 'Autos, motos y SOAT',
  },
  {
    id: 'hdi',
    nombre: 'HDI Seguros',
    telefono: '+576013077050',
    telefonoGratuito: '018000113390',
    whatsapp: '+573164821802',
    linea: '#224',
    web: 'https://www.hdi.com.co',
    color: '#00A3E0',
    colorTexto: '#04222B',
    especialidad: 'Autos y motos',
  },
  {
    id: 'equidad',
    nombre: 'La Equidad Seguros',
    telefono: '+576019172127',
    telefonoGratuito: '018000919538',
    whatsapp: '+573185884515',
    linea: '#324',
    web: 'https://www.laequidadseguros.coop',
    color: '#00693E',
    colorTexto: '#FFFFFF',
    especialidad: 'Autos y motos',
  },
  {
    id: 'positiva',
    nombre: 'Positiva',
    telefono: '+576013307000',
    telefonoGratuito: '018000111170',
    web: 'https://www.positivacolombia.com',
    color: '#FFD100',
    colorTexto: '#231A00',
    especialidad: 'SOAT y riesgos laborales',
  },
];

/** Busca una aseguradora por su nombre (tolerante a mayúsculas). */
export function buscarAseguradora(
  nombre: string | null | undefined
): Aseguradora | undefined {
  if (!nombre) {
    return undefined;
  }

  const buscado = nombre.trim().toLowerCase();

  return ASEGURADORAS.find(
    (aseguradora) =>
      aseguradora.id === buscado ||
      aseguradora.nombre.toLowerCase() === buscado
  );
}

/** Quita todo lo que no sea dígito o "+" para usar en `tel:`. */
export function telefonoMarcable(telefono: string | null | undefined): string {
  return (telefono ?? '').replace(/[^\d+]/g, '');
}
