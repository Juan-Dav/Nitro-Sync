/*
=======================================================
NITRO SYNC - GENERADOR DEL EXCEL DE ASEGURADORAS
=======================================================

Ejecutar con:

    npm run excel:aseguradoras

Toma la lista de data/aseguradoras.ts (fuente única de
verdad) y escribe:

    assets/documentos/aseguradoras.xlsx

El .xlsx se arma a mano (OOXML + zip de PowerShell) para no
agregar dependencias al proyecto.
=======================================================
*/

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ASEGURADORAS } from '../data/aseguradoras.ts';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(raiz, 'assets', 'documentos', 'aseguradoras.xlsx');
const temporal = join(raiz, '.tmp-excel');

/* -----------------------------------------------------
   UTILIDADES
   ----------------------------------------------------- */

function escaparXml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function columna(indice) {
  let numero = indice + 1;
  let letra = '';

  while (numero > 0) {
    const resto = (numero - 1) % 26;
    letra = String.fromCharCode(65 + resto) + letra;
    numero = Math.floor((numero - 1) / 26);
  }

  return letra;
}

function celda(fila, columnaIndice, valor, estilo = 0) {
  const ref = `${columna(columnaIndice)}${fila}`;
  const esNumero = typeof valor === 'number';
  const atributoEstilo = estilo ? ` s="${estilo}"` : '';

  if (esNumero) {
    return `<c r="${ref}"${atributoEstilo}><v>${valor}</v></c>`;
  }

  return `<c r="${ref}"${atributoEstilo} t="inlineStr"><is><t xml:space="preserve">${escaparXml(
    valor
  )}</t></is></c>`;
}

/* -----------------------------------------------------
   FILAS
   ----------------------------------------------------- */

const ENCABEZADOS = [
  'Aseguradora',
  'Teléfono principal',
  'Línea gratuita',
  'WhatsApp',
  'Línea corta',
  'Sitio web',
  'Especialidad',
];

const FILAS = ASEGURADORAS.map((aseguradora) => [
  aseguradora.nombre,
  aseguradora.telefono,
  aseguradora.telefonoGratuito ?? '',
  aseguradora.whatsapp ?? '',
  aseguradora.linea ?? '',
  aseguradora.web,
  aseguradora.especialidad,
]);

/* -----------------------------------------------------
   HOJA DE CÁLCULO
   ----------------------------------------------------- */

const anchos = [24, 22, 20, 20, 14, 40, 34];

const filasXml = [
  `<row r="1" ht="26" customHeight="1">${ENCABEZADOS.map((titulo, indice) =>
    celda(1, indice, titulo, 1)
  ).join('')}</row>`,
  ...FILAS.map((valores, indiceFila) => {
    const numeroFila = indiceFila + 2;

    return `<row r="${numeroFila}">${valores
      .map((valor, indice) => celda(numeroFila, indice, valor))
      .join('')}</row>`;
  }),
].join('');

const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView tabSelected="1" workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>
    ${anchos
      .map(
        (ancho, indice) =>
          `<col min="${indice + 1}" max="${indice + 1}" width="${ancho}" customWidth="1"/>`
      )
      .join('')}
  </cols>
  <sheetData>${filasXml}</sheetData>
  <autoFilter ref="A1:G${FILAS.length + 1}"/>
</worksheet>`;

const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Aseguradoras" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0B1030"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const ahora = new Date().toISOString();

const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Aseguradoras de vehículos en Colombia</dc:title>
  <dc:creator>Nitro Sync</dc:creator>
  <cp:lastModifiedBy>Nitro Sync</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${ahora}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${ahora}</dcterms:modified>
</cp:coreProperties>`;

const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Nitro Sync</Application>
</Properties>`;

/* -----------------------------------------------------
   ESCRITURA
   ----------------------------------------------------- */

rmSync(temporal, { recursive: true, force: true });

const archivos = {
  '[Content_Types].xml': contentTypes,
  '_rels/.rels': rels,
  'docProps/core.xml': core,
  'docProps/app.xml': app,
  'xl/workbook.xml': workbook,
  'xl/_rels/workbook.xml.rels': workbookRels,
  'xl/styles.xml': styles,
  'xl/worksheets/sheet1.xml': sheet,
};

for (const [ruta, contenido] of Object.entries(archivos)) {
  const completa = join(temporal, ruta);
  mkdirSync(dirname(completa), { recursive: true });
  writeFileSync(completa, contenido, 'utf8');
}

mkdirSync(dirname(destino), { recursive: true });

const origen = temporal.replace(/'/g, "''");
const salida = destino.replace(/'/g, "''");

/*
Se crea el zip entrada por entrada para que las rutas usen
"/" (lo exige el formato OOXML). CreateFromDirectory usa "\"
en Windows y algunos lectores de Excel lo rechazan.
*/
execFileSync(
  'powershell',
  [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    `Add-Type -AssemblyName System.IO.Compression.FileSystem; ` +
      `if (Test-Path '${salida}') { Remove-Item '${salida}' -Force }; ` +
      `$zip = [System.IO.Compression.ZipFile]::Open('${salida}','Create'); ` +
      `Get-ChildItem -Path '${origen}' -Recurse -File | ForEach-Object { ` +
      `$rel = $_.FullName.Substring('${origen}'.Length + 1).Replace('\\','/'); ` +
      `$entry = $zip.CreateEntry($rel,[System.IO.Compression.CompressionLevel]::Optimal); ` +
      `$stream = $entry.Open(); ` +
      `$file = [System.IO.File]::OpenRead($_.FullName); ` +
      `$file.CopyTo($stream); ` +
      `$file.Dispose(); $stream.Dispose() }; ` +
      `$zip.Dispose()`,
  ],
  { stdio: 'inherit' }
);

rmSync(temporal, { recursive: true, force: true });

console.log(`✓ Excel generado: ${destino}`);
console.log(`  ${FILAS.length} aseguradoras · ${ENCABEZADOS.length} columnas`);
