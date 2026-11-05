/*
=======================================================
NITRO SYNC - GENERADOR DE LOS EXCEL DE CARGA MASIVA
=======================================================

Ejecutar con:

    npm run excel:carga-masiva

Escribe dos archivos en assets/documentos/:

  - carga-masiva-ejemplo.xlsx : 50 vehículos de ejemplo con
    su aseguradora, póliza y vencimiento (para probar y
    para la demostración).

  - plantilla-carga-masiva.xlsx : plantilla casi vacía para
    que el usuario escriba sus propios vehículos.

Los dos tienen una hoja "Vehículos" y una hoja de
"Instrucciones". Los encabezados deben coincidir con
ENCABEZADOS_CARGA de utils/cargaMasiva.ts.

Los datos son inventados (placas y pólizas de ejemplo);
solo los nombres de las aseguradoras vienen del directorio
real de data/aseguradoras.ts.
=======================================================
*/

import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as XLSX from 'xlsx';

import { ASEGURADORAS } from '../data/aseguradoras.ts';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const carpeta = join(raiz, 'assets', 'documentos');

mkdirSync(carpeta, { recursive: true });

/* -----------------------------------------------------
   ENCABEZADOS (mismo orden que utils/cargaMasiva.ts)
   ----------------------------------------------------- */

const ENCABEZADOS = [
  'Nombre',
  'Tipo',
  'Marca',
  'Modelo',
  'Año',
  'Placa',
  'Color',
  'Kilometraje',
  'Aseguradora',
  'Teléfono aseguradora',
  'N° póliza',
  'Vencimiento seguro',
];

const ANCHOS = [22, 9, 14, 16, 7, 10, 12, 13, 22, 22, 14, 19];

/* -----------------------------------------------------
   DATOS DE EJEMPLO (deterministas: siempre salen igual)
   ----------------------------------------------------- */

const CARROS = [
  ['Chevrolet', 'Spark GT'],
  ['Chevrolet', 'Onix'],
  ['Renault', 'Logan'],
  ['Renault', 'Duster'],
  ['Mazda', '3'],
  ['Mazda', 'CX-30'],
  ['Kia', 'Picanto'],
  ['Kia', 'Sportage'],
  ['Toyota', 'Corolla'],
  ['Toyota', 'Hilux'],
  ['Nissan', 'Versa'],
  ['Hyundai', 'Tucson'],
  ['Suzuki', 'Swift'],
  ['Ford', 'Fiesta'],
  ['Volkswagen', 'Gol'],
  ['Honda', 'Civic'],
];

const MOTOS = [
  ['Yamaha', 'FZ 2.0'],
  ['Yamaha', 'MT-03'],
  ['Honda', 'CB 190R'],
  ['Honda', 'XR 150L'],
  ['Suzuki', 'Gixxer 150'],
  ['Bajaj', 'Pulsar NS200'],
  ['AKT', 'NKD 125'],
  ['TVS', 'Apache RTR 160'],
  ['Kawasaki', 'Ninja 400'],
  ['KTM', 'Duke 200'],
];

const COLORES = [
  'Blanco',
  'Negro',
  'Gris',
  'Rojo',
  'Azul',
  'Plata',
  'Verde',
  'Naranja',
];

const APODOS = ['Mi diario', 'El de la familia', 'Para trabajar', 'El de fines de semana'];

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function placaCarro(i) {
  const a = LETRAS[i % 26];
  const b = LETRAS[Math.floor(i / 26) % 26];
  const c = LETRAS[(i * 7 + 3) % 26];
  const numero = String(100 + ((i * 53) % 900));

  return `${a}${b}${c}${numero}`;
}

function placaMoto(i) {
  const a = LETRAS[(i + 11) % 26];
  const b = LETRAS[Math.floor(i / 26 + 5) % 26];
  const c = LETRAS[(i * 5 + 1) % 26];
  const numero = String(10 + ((i * 17) % 90));
  const letra = LETRAS[(i * 3 + 2) % 26];

  return `${a}${b}${c}${numero}${letra}`;
}

function sumarDias(base, dias) {
  const fecha = new Date(Date.UTC(base[0], base[1] - 1, base[2]) + dias * 86_400_000);

  return fecha.toISOString().slice(0, 10);
}

const NOMBRES_ASEGURADORAS = ASEGURADORAS.map((a) => a.nombre);

function filasEjemplo(cantidad) {
  const filas = [];

  for (let i = 0; i < cantidad; i += 1) {
    const esMoto = i % 5 === 3 || i % 5 === 4;
    const catalogo = esMoto ? MOTOS : CARROS;
    const [marca, modelo] = catalogo[(i * 3) % catalogo.length];

    const sinSeguro = i % 11 === 10;
    const aseguradora = sinSeguro ? '' : NOMBRES_ASEGURADORAS[i % NOMBRES_ASEGURADORAS.length];

    /* Vencimientos repartidos: algunos ya vencidos, otros próximos y el resto vigentes. */
    const vencimiento = sinSeguro ? '' : sumarDias([2026, 10, 15], ((i * 23) % 400) - 30);

    filas.push([
      i % 4 === 0 ? APODOS[(i / 4) % APODOS.length] : '',
      esMoto ? 'Moto' : 'Carro',
      marca,
      modelo,
      2012 + ((i * 5) % 15),
      esMoto ? placaMoto(i) : placaCarro(i),
      COLORES[(i * 3) % COLORES.length],
      esMoto ? 2000 + ((i * 1373) % 38000) : 5000 + ((i * 2791) % 120000),
      aseguradora,
      '',
      sinSeguro ? '' : `POL-${String(2026000 + i * 37).padStart(7, '0')}`,
      vencimiento,
    ]);
  }

  return filas;
}

/* -----------------------------------------------------
   HOJA DE INSTRUCCIONES
   ----------------------------------------------------- */

const INSTRUCCIONES = [
  ['CARGA MASIVA DE VEHÍCULOS - NITRO SYNC'],
  [''],
  ['Cómo usar este archivo'],
  ['1. Escribe un vehículo por fila en la hoja "Vehículos" (no cambies los encabezados).'],
  ['2. Guarda el archivo como .xlsx.'],
  ['3. En la app: Ajustes > Carga masiva > Elegir archivo Excel.'],
  ['4. Revisa la vista previa (correctas, con error y repetidas) y confirma.'],
  [''],
  ['Columnas'],
  ['Nombre: opcional. Si lo dejas vacío se usa "Marca Modelo".'],
  ['Tipo: obligatorio. Carro o Moto.'],
  ['Marca y Modelo: obligatorios.'],
  ['Año: obligatorio, entre 1950 y el año actual + 1.'],
  ['Placa: opcional. Carro = 3 letras + 3 números (ABC123). Moto = 3 letras + 2 números + 1 letra (ABC12A).'],
  ['Color y Kilometraje: opcionales (el kilometraje debe ser un número).'],
  ['Aseguradora: opcional. Si coincide con el directorio de la app (SURA, Seguros Bolívar, MAPFRE...) se completa sola.'],
  ['Teléfono aseguradora: opcional. Si lo dejas vacío y la aseguradora está en el directorio, se usa su línea gratuita.'],
  ['N° póliza: opcional.'],
  ['Vencimiento seguro: opcional. Formato AAAA-MM-DD (2027-03-15) o DD/MM/AAAA (15/03/2027).'],
  [''],
  ['Reglas'],
  ['Máximo 500 filas por archivo.'],
  ['Si una placa ya existe en tu garaje (o está repetida en el archivo), esa fila se omite.'],
  ['Las filas con errores no se importan; la app te dice qué corregir en cada una.'],
  ['Las placas, pólizas y datos de este archivo de ejemplo son inventados.'],
];

/* -----------------------------------------------------
   ESCRITURA
   ----------------------------------------------------- */

function crearLibro(filas) {
  const hoja = XLSX.utils.aoa_to_sheet([ENCABEZADOS, ...filas]);

  hoja['!cols'] = ANCHOS.map((wch) => ({ wch }));
  hoja['!autofilter'] = { ref: `A1:L${filas.length + 1}` };

  const ayuda = XLSX.utils.aoa_to_sheet(INSTRUCCIONES);

  ayuda['!cols'] = [{ wch: 110 }];

  const libro = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(libro, hoja, 'Vehículos');
  XLSX.utils.book_append_sheet(libro, ayuda, 'Instrucciones');

  return libro;
}

const ejemplo = filasEjemplo(50);

XLSX.writeFile(crearLibro(ejemplo), join(carpeta, 'carga-masiva-ejemplo.xlsx'));

/* La plantilla trae solo dos filas guía. */
const plantilla = [
  ['Mi carro', 'Carro', 'Mazda', '3', 2020, 'ABC123', 'Rojo', 45000, 'SURA', '', 'POL-0000001', '2027-03-15'],
  ['', 'Moto', 'Yamaha', 'FZ 2.0', 2022, 'ABC12D', 'Negro', 8000, 'Seguros Bolívar', '', '', ''],
];

XLSX.writeFile(crearLibro(plantilla), join(carpeta, 'plantilla-carga-masiva.xlsx'));

console.log('✓ assets/documentos/carga-masiva-ejemplo.xlsx  (' + ejemplo.length + ' vehículos)');
console.log('✓ assets/documentos/plantilla-carga-masiva.xlsx (2 filas guía)');
