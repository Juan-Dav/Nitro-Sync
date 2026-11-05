/*
=======================================================
NITRO SYNC - PRUEBA DE IMÁGENES DE VEHÍCULOS
=======================================================

Ejecutar con:

    npm run probar:imagenes

Comprueba, contra las APIs reales:

  1. Que se encuentre una foto para varios vehículos
     (carros y motos), incluido el McLaren 720S.
  2. Que la URL final responda 200 con un Content-Type
     de imagen incluso usando el User-Agent de Android
     (okhttp), que era la causa del fallo original.
=======================================================
*/

import { buscarFotoVehiculo } from '../lib/busquedaImagenVehiculo.ts';

const CASOS = [
  { marca: 'McLaren', modelo: '720S', tipo: 'Carro', year: 2019 },
  { marca: 'Renault', modelo: '5', tipo: 'Carro', year: 1985 },
  { marca: 'Yamaha', modelo: 'FZ', tipo: 'Moto', year: 2021 },
  { marca: 'Kawasaki', modelo: 'Ninja 400', tipo: 'Moto', year: 2022 },
  { marca: 'Mazda', modelo: '3', tipo: 'Carro', year: 2020 },
];

const UA_ANDROID =
  'okhttp/4.9.2';

function linea(caracter = '─', largo = 74) {
  console.log(caracter.repeat(largo));
}

function recortar(texto, maximo = 90) {
  return texto.length > maximo ? `${texto.slice(0, maximo)}…` : texto;
}

async function comprobarDescarga(url) {
  try {
    const respuesta = await fetch(url, {
      headers: { 'User-Agent': UA_ANDROID },
    });

    const tipo = respuesta.headers.get('content-type') ?? 'desconocido';
    const bytes = (await respuesta.arrayBuffer()).byteLength;

    return {
      ok: respuesta.ok && tipo.startsWith('image/') && bytes > 5000,
      estado: respuesta.status,
      tipo,
      kb: Math.round(bytes / 1024),
    };
  } catch (error) {
    return {
      ok: false,
      estado: 'ERROR',
      tipo: error instanceof Error ? error.message : String(error),
      kb: 0,
    };
  }
}

async function main() {
  linea('═');
  console.log('  NITRO SYNC · PRUEBA DE IMÁGENES AUTOMÁTICAS');
  linea('═');

  let fallos = 0;

  for (const caso of CASOS) {
    const nombre = `${caso.marca} ${caso.modelo} (${caso.tipo})`;

    console.log(`\n▶ ${nombre}`);

    const inicio = Date.now();
    const url = await buscarFotoVehiculo(caso, { ancho: 1200 });
    const ms = Date.now() - inicio;

    if (!url) {
      console.log('  ✗ Sin resultado');
      fallos += 1;
      continue;
    }

    console.log(`  URL: ${recortar(url)}`);
    console.log(`  Búsqueda: ${ms} ms`);

    const descarga = await comprobarDescarga(url);

    if (descarga.ok) {
      console.log(
        `  ✓ Descarga OK (${descarga.estado} ${descarga.tipo}, ${descarga.kb} KB, UA okhttp)`
      );
    } else {
      console.log(
        `  ✗ Falló la descarga: ${descarga.estado} · ${descarga.tipo}`
      );
      fallos += 1;
    }
  }

  console.log('');
  linea();

  if (fallos === 0) {
    console.log('✓ Todos los casos pasaron.');
  } else {
    console.log(`✗ ${fallos} caso(s) fallaron.`);
    process.exitCode = 1;
  }
}

main();
