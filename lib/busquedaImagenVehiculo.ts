/*
=======================================================
NITRO SYNC - BUSCADOR DE FOTOS DE VEHÍCULOS
=======================================================

Módulo PURO (sin React Native, sin AsyncStorage y sin
alias "@/...") para poder probarlo con Node:

    node scripts/probar-imagenes.mjs

¿Qué hace?

  1. Busca fotos reales en Wikimedia Commons
     (namespace 6 = archivos) usando marca + modelo.
  2. Si Commons no tiene nada útil, cae a la imagen
     principal del artículo de Wikipedia.
  3. Puntúa los resultados para descartar logos, motores,
     interiores y otros archivos que no sirven de portada.
  4. Devuelve la URL ya "proxificada" para que Android la
     pueda descargar.

¿Por qué el proxy?

Las URLs de Wikimedia (upload.wikimedia.org y
thumb.wikimedia.org) responden 403 cuando el cliente se
identifica como `okhttp` o no envía User-Agent, que es
justo lo que hace expo-image en Android. images.weserv.nl
descarga la imagen desde sus servidores y la entrega con
un Content-Type normal, así que se ve en Android, iOS y
web.
=======================================================
*/

/* -----------------------------------------------------
   TIPOS
   ----------------------------------------------------- */

export type TipoVehiculoBusqueda = 'Carro' | 'Moto';

export interface DatosBusquedaImagen {
  marca: string;
  modelo: string;
  tipo: TipoVehiculoBusqueda;
  year?: number;
}

export interface OpcionesBusqueda {
  /** Ancho de la imagen entregada por el proxy. */
  ancho?: number;

  /** Permite inyectar un fetch distinto (pruebas). */
  fetch?: typeof fetch;

  /** Evita cabeceras personalizadas en web (CORS). */
  esWeb?: boolean;

  /** Tiempo máximo por petición, en milisegundos. */
  tiempoLimite?: number;
}

interface Candidato {
  titulo: string;
  url: string;
  ancho: number;
  alto: number;
  fuente: 'commons' | 'wikipedia';
  puntaje: number;
}

/* -----------------------------------------------------
   PROXY DE IMÁGENES
   ----------------------------------------------------- */

const PROXY = 'https://images.weserv.nl/';

/** Dominios de Wikimedia que bloquean a okhttp en Android. */
const HOSTS_BLOQUEADOS = /^(?:upload|thumb)\.wikimedia\.org$/i;

/**
 * Convierte una URL de Wikimedia en una URL servida por
 * images.weserv.nl. Cualquier otro dominio se devuelve tal
 * cual (Unsplash, Firebase Storage...).
 */
export function normalizarUrlImagen(
  url: string | null | undefined,
  ancho = 1200
): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const limpia = url.trim();

  if (!limpia) {
    return '';
  }

  /* Protocolo relativo: "//upload.wikimedia.org/..." */
  const absoluta = limpia.startsWith('//') ? `https:${limpia}` : limpia;

  let host = '';

  try {
    host = new URL(absoluta).hostname;
  } catch {
    return absoluta;
  }

  if (!HOSTS_BLOQUEADOS.test(host)) {
    return absoluta;
  }

  const sinProtocolo = absoluta.replace(/^https?:\/\//i, '');
  const destino = encodeURIComponent(sinProtocolo);

  const parametros = [`url=${destino}`, `w=${ancho}`, 'output=jpg', 'q=80'];

  /*
  "we" = without enlargement: no agranda imágenes pequeñas,
  así no se ven borrosas.
  */
  parametros.push('we');

  return `${PROXY}?${parametros.join('&')}`;
}

/* -----------------------------------------------------
   NORMALIZACIÓN DE TEXTO
   ----------------------------------------------------- */

/** Minúsculas, sin acentos y sin signos: "McLaren 720S" -> "mclaren 720s". */
export function normalizarTexto(texto: string): string {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compacto(texto: string): string {
  return normalizarTexto(texto).replace(/\s+/g, '');
}

/* -----------------------------------------------------
   PALABRAS QUE NO SIRVEN COMO PORTADA
   ----------------------------------------------------- */

const PALABRAS_PROHIBIDAS = [
  'logo',
  'logos',
  'emblem',
  'emblema',
  'badge',
  'insignia',
  'wordmark',
  'engine',
  'motor bay',
  'interior',
  'dashboard',
  'steering',
  'wheel',
  'seat',
  'map',
  'sign',
  'signal',
  'document',
  'brochure',
  'catalog',
  'manual',
  'blueprint',
  'drawing',
  'diagram',
  'sketch',
  'render',
  'cutaway',
  'patent',
  'toy',
  'model car',
  'diecast',
  'police',
  'taxi',
  'crash',
  'accident',
  'wreck',
  'junkyard',
  'museum plate',
  'poster',
  'advert',
  'advertisement',
];

/*
Edificios, fábricas, tiendas y personas: aparecen cuando la
marca es también una empresa (por ejemplo "Auteco"). Se
comparan como palabra COMPLETA para no descartar títulos como
"restored" (que contiene "store").
*/
const PALABRAS_NO_VEHICULO = [
  'building',
  'buildings',
  'factory',
  'plant',
  'headquarters',
  'office',
  'offices',
  'store',
  'shop',
  'dealership',
  'dealer',
  'showroom',
  'warehouse',
  'facade',
  'campus',
  'exterior',
  'fachada',
  'planta',
  'sede',
  'edificio',
  'tienda',
  'concesionario',
  'bodega',
  'fabrica',
  'ensambladora',
  'people',
  'crowd',
  'staff',
  'employees',
  'stand',
  'booth',
  'expo',
  'fair',
];

function tienePalabraCompleta(titulo: string, palabras: string[]): boolean {
  const separadas = new Set(titulo.split(' '));

  return palabras.some((palabra) => separadas.has(palabra));
}

const PALABRAS_VEHICULO = [
  'car',
  'cars',
  'automobile',
  'vehicle',
  'coupe',
  'sedan',
  'hatchback',
  'suv',
  'roadster',
  'supercar',
  'motorcycle',
  'motorbike',
  'motorcycles',
  'bike',
  'scooter',
  'moto',
];

/* -----------------------------------------------------
   CONSULTAS
   ----------------------------------------------------- */

function consultas(datos: DatosBusquedaImagen): string[] {
  const marca = datos.marca.trim();
  const modelo = datos.modelo.trim();
  const sustantivo = datos.tipo === 'Moto' ? 'motorcycle' : 'car';

  const lista: string[] = [];

  if (marca && modelo) {
    lista.push(`${marca} ${modelo}`);
    lista.push(`${marca} ${modelo} ${sustantivo}`);
  }

  if (datos.year && marca && modelo) {
    lista.push(`${marca} ${modelo} ${datos.year}`);
  }

  if (marca) {
    lista.push(`${marca} ${sustantivo}`);
  }

  if (modelo) {
    lista.push(`${modelo} ${sustantivo}`);
  }

  return Array.from(new Set(lista.filter((texto) => texto.length > 1)));
}

/* -----------------------------------------------------
   PETICIÓN HTTP CON TIEMPO LÍMITE
   ----------------------------------------------------- */

async function pedirJson(
  url: string,
  opciones: OpcionesBusqueda
): Promise<any | null> {
  const hacerFetch = opciones.fetch ?? fetch;
  const tiempo = opciones.tiempoLimite ?? 9000;

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), tiempo);

  try {
    const respuesta = await hacerFetch(url, {
      signal: controlador.signal,
      headers: opciones.esWeb
        ? undefined
        : { 'Api-User-Agent': 'NitroSync/1.0 (app movil de vehiculos)' },
    });

    if (!respuesta.ok) {
      return null;
    }

    return await respuesta.json();
  } catch {
    return null;
  } finally {
    clearTimeout(temporizador);
  }
}

/* -----------------------------------------------------
   WIKIMEDIA COMMONS (archivos)
   ----------------------------------------------------- */

const EXTENSION_VALIDA = /\.(?:jpe?g|png|webp)$/i;

async function candidatosCommons(
  termino: string,
  opciones: OpcionesBusqueda
): Promise<Candidato[]> {
  const url =
    'https://commons.wikimedia.org/w/api.php' +
    '?action=query' +
    '&generator=search' +
    `&gsrsearch=${encodeURIComponent(termino)}` +
    '&gsrnamespace=6' +
    '&gsrlimit=12' +
    '&prop=imageinfo' +
    '&iiprop=url|size|mime' +
    '&iiurlwidth=1200' +
    '&format=json' +
    '&origin=*';

  const datos = await pedirJson(url, opciones);
  const paginas = datos?.query?.pages;

  if (!paginas) {
    return [];
  }

  return Object.values(paginas)
    .map((pagina: any) => {
      const info = pagina?.imageinfo?.[0];

      /*
      thumburl es la versión de 1200 px; si no viene, se usa
      la original (url).
      */
      const enlace: string | undefined = info?.thumburl ?? info?.url;
      const titulo = String(pagina?.title ?? '').replace(/^File:/i, '');

      return {
        titulo,
        url: enlace ?? '',
        ancho: Number(info?.width ?? 0),
        alto: Number(info?.height ?? 0),
        fuente: 'commons' as const,
        puntaje: 0,
      };
    })
    .filter(
      (candidato) =>
        candidato.url.startsWith('http') &&
        EXTENSION_VALIDA.test(candidato.titulo)
    );
}

/* -----------------------------------------------------
   WIKIPEDIA (imagen del artículo)
   ----------------------------------------------------- */

async function candidatosWikipedia(
  termino: string,
  opciones: OpcionesBusqueda
): Promise<Candidato[]> {
  const url =
    'https://en.wikipedia.org/w/api.php' +
    '?action=query' +
    '&generator=search' +
    `&gsrsearch=${encodeURIComponent(termino)}` +
    '&gsrnamespace=0' +
    '&gsrlimit=6' +
    '&prop=pageimages' +
    '&piprop=thumbnail|pageimages' +
    '&pithumbsize=1200' +
    '&format=json' +
    '&origin=*';

  const datos = await pedirJson(url, opciones);
  const paginas = datos?.query?.pages;

  if (!paginas) {
    return [];
  }

  return Object.values(paginas)
    .map((pagina: any) => {
      const foto: string | undefined = pagina?.thumbnail?.source;
      const ancho = Number(pagina?.thumbnail?.width ?? 0);
      const alto = Number(pagina?.thumbnail?.height ?? 0);

      return {
        titulo: String(pagina?.title ?? ''),
        url: foto ?? '',
        ancho,
        alto,
        fuente: 'wikipedia' as const,
        puntaje: 0,
      };
    })
    .filter((candidato) => candidato.url.startsWith('http'));
}

/* -----------------------------------------------------
   PUNTAJE
   ----------------------------------------------------- */

function puntuar(
  candidato: Candidato,
  datos: DatosBusquedaImagen
): number {
  const titulo = normalizarTexto(candidato.titulo);
  const tituloCompacto = compacto(candidato.titulo);

  const marca = normalizarTexto(datos.marca);
  const marcaCompacta = compacto(datos.marca);

  const modelo = normalizarTexto(datos.modelo);
  const modeloCompacto = compacto(datos.modelo);

  let puntaje = 0;

  /* 1. La marca debe aparecer: es el filtro más importante. */
  const tieneMarca =
    !!marcaCompacta &&
    (tituloCompacto.includes(marcaCompacta) || titulo.includes(marca));

  if (marcaCompacta) {
    if (!tieneMarca) {
      return -100;
    }

    puntaje += 6;
  }

  /* 2. El modelo suma, pero no es obligatorio (hay modelos
        escritos distinto a como los titula Wikimedia). */
  if (modeloCompacto) {
    if (tituloCompacto.includes(modeloCompacto)) {
      puntaje += 7;
    } else {
      const palabras = modelo
        .split(' ')
        .filter((palabra) => palabra.length >= 2);

      const encontradas = palabras.filter((palabra) =>
        tituloCompacto.includes(palabra)
      ).length;

      puntaje += encontradas * 2;
    }
  }

  /* 3. Que el título hable de un vehículo ayuda mucho. */
  const hablaDeVehiculo = PALABRAS_VEHICULO.some((palabra) =>
    titulo.includes(palabra)
  );

  if (hablaDeVehiculo) {
    puntaje += 3;
  }

  /*
  3b. La marca sola NO basta. Si el título no menciona el
      modelo (ni una palabra del modelo) ni dice que es un
      vehículo, probablemente es la empresa (edificio, logo,
      evento...). Mejor no mostrar nada que mostrar eso.
  */
  const modeloPalabras = modelo
    .split(' ')
    .filter((palabra) => palabra.length >= 2);

  const mencionaModelo =
    !!modeloCompacto &&
    (tituloCompacto.includes(modeloCompacto) ||
      modeloPalabras.some((palabra) => tituloCompacto.includes(palabra)));

  if (!mencionaModelo && !hablaDeVehiculo) {
    return -100;
  }

  /* 3c. Edificios, fábricas, tiendas, personas... */
  if (tienePalabraCompleta(titulo, PALABRAS_NO_VEHICULO)) {
    puntaje -= 20;
  }

  /* 4. Fotos horizontales se ven mejor de portada. */
  if (candidato.ancho > 0 && candidato.alto > 0) {
    const proporcion = candidato.ancho / candidato.alto;

    if (proporcion >= 1.2) {
      puntaje += 2;
    }

    if (proporcion < 0.8) {
      puntaje -= 1;
    }

    if (candidato.ancho < 500) {
      puntaje -= 3;
    }
  }

  /* 5. Descartar logos, motores, interiores... */
  if (PALABRAS_PROHIBIDAS.some((palabra) => titulo.includes(palabra))) {
    puntaje -= 20;
  }

  /* 6. Las fotos de Commons suelen ser más variadas y reales. */
  if (candidato.fuente === 'commons') {
    puntaje += 1;
  }

  return puntaje;
}

/* -----------------------------------------------------
   BÚSQUEDA PRINCIPAL
   ----------------------------------------------------- */

/**
 * Devuelve la URL de la mejor foto encontrada (ya pasada
 * por el proxy) o `null` si no hay nada aceptable.
 */
export async function buscarFotoVehiculo(
  datos: DatosBusquedaImagen,
  opciones: OpcionesBusqueda = {}
): Promise<string | null> {
  const ancho = opciones.ancho ?? 1200;

  if (!datos.marca.trim() && !datos.modelo.trim()) {
    return null;
  }

  const vistos = new Set<string>();

  for (const consulta of consultas(datos)) {
    /* 1. Commons. */
    const deCommons = await candidatosCommons(consulta, opciones);

    /* 2. Si Commons no trajo nada, Wikipedia. */
    const deWikipedia =
      deCommons.length > 0
        ? []
        : await candidatosWikipedia(consulta, opciones);

    const candidatos = [...deCommons, ...deWikipedia]
      .map((candidato) => ({
        ...candidato,
        puntaje: puntuar(candidato, datos),
      }))
      .filter((candidato) => candidato.puntaje > 0)
      .sort((a, b) => b.puntaje - a.puntaje);

    for (const candidato of candidatos) {
      if (vistos.has(candidato.url)) {
        continue;
      }

      vistos.add(candidato.url);

      /*
      Se devuelve la mejor opción de esta consulta. Si el
      puntaje es alto (marca + modelo) no hace falta seguir
      probando consultas más generales.
      */
      if (candidato.puntaje >= 9) {
        return normalizarUrlImagen(candidato.url, ancho);
      }
    }

    /* Guarda la mejor opción de esta consulta por si las
       siguientes no encuentran nada. */
    if (candidatos.length > 0) {
      return normalizarUrlImagen(candidatos[0].url, ancho);
    }
  }

  return null;
}
