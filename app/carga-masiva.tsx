/*
=======================================================
NITRO SYNC - CARGA MASIVA DESDE EXCEL
=======================================================

Permite registrar muchos vehículos de una sola vez, con los
datos de su aseguradora, póliza y vencimiento del seguro.

FLUJO

  1. El usuario elige un Excel (.xlsx / .xls / .csv) o usa el
     archivo de ejemplo que viaja con la app.
  2. Se leen las filas y se validan (utils/cargaMasiva.ts).
  3. Vista previa: correctas, con errores y repetidas.
  4. Al confirmar, se guardan por lotes en Firestore
     (services/cargaMasiva.ts).

Solo se importan las filas correctas. Las que tienen
errores se muestran con lo que hay que corregir.

Archivos del proyecto:

  assets/documentos/carga-masiva-ejemplo.xlsx   (50 vehículos)
  assets/documentos/plantilla-carga-masiva.xlsx (plantilla)

Para regenerarlos:  npm run excel:carga-masiva
=======================================================
*/

import { useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import * as XLSX from 'xlsx';

import BotonNitro from '@/components/ui/boton-nitro';
import { useAlerta, useConfirm } from '@/components/ui/confirm-dialog';

import { Gradientes, Paleta, Radios, sombraDura } from '@/constants/theme';

import { useAuth } from '@/context/AuthContext';
import { useVehiculos } from '@/context/VehiculosContext';

import {
  importarVehiculos,
  type ProgresoCarga,
  type ResumenImportacion,
} from '@/services/cargaMasiva';

import {
  ENCABEZADOS_CARGA,
  MAX_FILAS_CARGA,
  procesarFilasCarga,
  type ResultadoCarga,
} from '@/utils/cargaMasiva';

/* Los Excel viajan con la app (ver metro.config.js). */
/* eslint-disable @typescript-eslint/no-require-imports */
const EXCEL_EJEMPLO = require('../assets/documentos/carga-masiva-ejemplo.xlsx');
const EXCEL_PLANTILLA = require('../assets/documentos/plantilla-carga-masiva.xlsx');
/* eslint-enable @typescript-eslint/no-require-imports */

const TIPOS_ARCHIVO = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
];

/** Cuántas filas se muestran en cada lista de la vista previa. */
const MAX_VISIBLES = 8;

type Etapa = 'inicio' | 'leyendo' | 'vista' | 'importando' | 'listo';

/* -------------------------------------------------------
   LECTURA DEL EXCEL
   ------------------------------------------------------- */

function leerHoja(buffer: ArrayBuffer): Record<string, unknown>[] {
  const libro = XLSX.read(buffer, { type: 'array' });

  /* Se prefiere la hoja "Vehículos"; si no existe, la primera. */
  const nombreHoja =
    libro.SheetNames.find((nombre) => /veh[ií]culos/i.test(nombre)) ??
    libro.SheetNames[0];

  const hoja = libro.Sheets[nombreHoja];

  if (!hoja) {
    throw new Error('El archivo no tiene hojas con datos.');
  }

  return XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, {
    defval: '',
  });
}

/* -------------------------------------------------------
   PANTALLA
   ------------------------------------------------------- */

export default function CargaMasivaScreen() {
  const router = useRouter();
  const alerta = useAlerta();
  const confirmar = useConfirm();

  const { user } = useAuth();
  const { vehiculos } = useVehiculos();

  const [etapa, setEtapa] = useState<Etapa>('inicio');
  const [archivo, setArchivo] = useState('');
  const [resultado, setResultado] = useState<ResultadoCarga | null>(null);
  const [progreso, setProgreso] = useState<ProgresoCarga | null>(null);
  const [resumen, setResumen] = useState<ResumenImportacion | null>(null);

  const placasExistentes = useMemo(
    () => vehiculos.map((vehiculo) => vehiculo.placa).filter(Boolean),
    [vehiculos]
  );

  /* ---------------------------------------------------
     PROCESAR UN ARCHIVO (elegido o de ejemplo)
     --------------------------------------------------- */

  const procesarBuffer = async (buffer: ArrayBuffer, nombre: string) => {
    try {
      setEtapa('leyendo');

      const filas = leerHoja(buffer);

      if (filas.length === 0) {
        throw new Error('No se encontraron filas debajo de los encabezados.');
      }

      setResultado(procesarFilasCarga(filas, { placasExistentes }));
      setArchivo(nombre);
      setEtapa('vista');
    } catch (error: any) {
      setEtapa('inicio');

      await alerta({
        titulo: 'No se pudo leer el archivo',
        mensaje:
          error?.message ??
          'Verifica que sea un Excel (.xlsx) con la plantilla de Nitro Sync.',
        tipo: 'error',
      });
    }
  };

  const elegirArchivo = async () => {
    try {
      const seleccion = await DocumentPicker.getDocumentAsync({
        type: TIPOS_ARCHIVO,
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (seleccion.canceled || !seleccion.assets?.[0]) {
        return;
      }

      const asset = seleccion.assets[0];

      /* En web el selector entrega el File; en móvil, una URI local. */
      const buffer = asset.file
        ? await asset.file.arrayBuffer()
        : await (await fetch(asset.uri)).arrayBuffer();

      await procesarBuffer(buffer, asset.name);
    } catch (error: any) {
      setEtapa('inicio');

      await alerta({
        titulo: 'No se pudo abrir el archivo',
        mensaje: error?.message ?? 'Inténtalo de nuevo.',
        tipo: 'error',
      });
    }
  };

  const usarEjemplo = async () => {
    try {
      setEtapa('leyendo');

      const asset = Asset.fromModule(EXCEL_EJEMPLO);

      await asset.downloadAsync();

      const buffer = await (
        await fetch(asset.localUri ?? asset.uri)
      ).arrayBuffer();

      await procesarBuffer(buffer, 'carga-masiva-ejemplo.xlsx');
    } catch (error: any) {
      setEtapa('inicio');

      await alerta({
        titulo: 'No se pudo cargar el ejemplo',
        mensaje: error?.message ?? 'Inténtalo de nuevo.',
        tipo: 'error',
      });
    }
  };

  /* En web se descarga; en móvil el archivo está en el proyecto. */
  const descargarPlantilla = async () => {
    try {
      const asset = Asset.fromModule(EXCEL_PLANTILLA);

      if (Platform.OS === 'web') {
        await asset.downloadAsync();
        await Linking.openURL(asset.uri);
        return;
      }

      await alerta({
        titulo: 'Plantilla de Excel',
        mensaje:
          'La plantilla está en assets/documentos/plantilla-carga-masiva.xlsx dentro del proyecto. Llénala en tu computador y súbela aquí.',
        tipo: 'info',
      });
    } catch {
      await alerta({
        titulo: 'No se pudo abrir la plantilla',
        mensaje: 'Está en assets/documentos/plantilla-carga-masiva.xlsx.',
        tipo: 'error',
      });
    }
  };

  /* ---------------------------------------------------
     IMPORTAR
     --------------------------------------------------- */

  const importar = async () => {
    if (!user || !resultado || resultado.validas.length === 0) {
      return;
    }

    const cantidad = resultado.validas.length;

    const acepta = await confirmar({
      titulo: 'Importar vehículos',
      mensaje: `Se agregarán ${cantidad} vehículo${
        cantidad === 1 ? '' : 's'
      } a tu garaje.`,
      textoConfirmar: 'Importar',
      icono: 'cloud-upload-outline',
    });

    if (!acepta) {
      return;
    }

    try {
      setEtapa('importando');
      setProgreso(null);

      const final = await importarVehiculos(
        user.uid,
        resultado.validas,
        setProgreso
      );

      setResumen(final);
      setEtapa('listo');
    } catch (error: any) {
      setEtapa('vista');

      await alerta({
        titulo: 'No se pudo importar',
        mensaje: error?.message ?? 'Ocurrió un error inesperado.',
        tipo: 'error',
      });
    }
  };

  const reiniciar = () => {
    setEtapa('inicio');
    setArchivo('');
    setResultado(null);
    setResumen(null);
    setProgreso(null);
  };

  /* ---------------------------------------------------
     TEXTO DEL PROGRESO
     --------------------------------------------------- */

  const textoProgreso = !progreso
    ? 'Preparando…'
    : progreso.fase === 'imagenes'
      ? `Buscando fotos (${progreso.hecho}/${progreso.total})`
      : `Guardando vehículos (${progreso.hecho}/${progreso.total})`;

  /* ---------------------------------------------------
     RENDER
     --------------------------------------------------- */

  return (
    <View style={styles.contenedor}>
      <Stack.Screen options={{ title: 'Carga masiva' }} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ENCABEZADO */}

        <LinearGradient
          colors={Gradientes.marcaViva}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroPill}>
            <Ionicons name="documents" size={14} color={Paleta.acento} />

            <Text style={styles.heroPillTexto}>Excel</Text>
          </View>

          <Text style={styles.heroTitulo}>Carga masiva</Text>

          <Text style={styles.heroTexto}>
            Registra muchos vehículos de una vez con su aseguradora, póliza y
            vencimiento. Hasta {MAX_FILAS_CARGA} por archivo.
          </Text>
        </LinearGradient>

        {/* ---------- INICIO ---------- */}

        {etapa === 'inicio' && (
          <>
            <View style={styles.tarjeta}>
              <Text style={styles.tarjetaTitulo}>1. Elige tu archivo</Text>

              <Text style={styles.texto}>
                Usa la plantilla de Nitro Sync (una fila por vehículo) y guárdala
                como .xlsx.
              </Text>

              <BotonNitro
                titulo="Elegir archivo Excel"
                icono="folder-open-outline"
                onPress={elegirArchivo}
                anchoCompleto
              />

              <BotonNitro
                titulo="Probar con datos de ejemplo (50)"
                icono="flask-outline"
                variante="oscuro"
                onPress={usarEjemplo}
                anchoCompleto
                style={styles.separado}
              />

              <BotonNitro
                titulo="Ver plantilla"
                icono="download-outline"
                variante="secundario"
                tamano="mediano"
                onPress={descargarPlantilla}
                anchoCompleto
                style={styles.separado}
              />
            </View>

            <View style={styles.tarjeta}>
              <Text style={styles.tarjetaTitulo}>Columnas del Excel</Text>

              <View style={styles.chips}>
                {ENCABEZADOS_CARGA.map((encabezado) => (
                  <View key={encabezado} style={styles.chip}>
                    <Text style={styles.chipTexto}>{encabezado}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.nota}>
                Obligatorias: Tipo (Carro o Moto), Marca, Modelo y Año. Si la
                aseguradora está en el directorio de la app, su teléfono se
                completa solo. Fechas: AAAA-MM-DD o DD/MM/AAAA.
              </Text>
            </View>
          </>
        )}

        {/* ---------- LEYENDO / IMPORTANDO ---------- */}

        {(etapa === 'leyendo' || etapa === 'importando') && (
          <View style={styles.tarjetaCentro}>
            <ActivityIndicator size="large" color={Paleta.primario} />

            <Text style={styles.tarjetaTitulo}>
              {etapa === 'leyendo' ? 'Leyendo archivo…' : textoProgreso}
            </Text>

            {etapa === 'importando' && (
              <Text style={styles.texto}>
                No cierres la pantalla hasta que termine.
              </Text>
            )}
          </View>
        )}

        {/* ---------- VISTA PREVIA ---------- */}

        {etapa === 'vista' && resultado && (
          <>
            <View style={styles.tarjeta}>
              <Text style={styles.archivo} numberOfLines={1}>
                {archivo}
              </Text>

              <View style={styles.contadores}>
                <Contador
                  numero={resultado.validas.length}
                  etiqueta="correctas"
                  color={Paleta.exito}
                  fondo={Paleta.exitoFondo}
                />

                <Contador
                  numero={resultado.errores.length}
                  etiqueta="con error"
                  color={Paleta.peligro}
                  fondo={Paleta.peligroFondo}
                />

                <Contador
                  numero={resultado.omitidas.length}
                  etiqueta="repetidas"
                  color={Paleta.advertencia}
                  fondo={Paleta.advertenciaFondo}
                />
              </View>

              {resultado.excedeLimite && (
                <Text style={styles.avisoLimite}>
                  El archivo tiene más de {MAX_FILAS_CARGA} filas: solo se
                  revisaron las primeras {MAX_FILAS_CARGA}.
                </Text>
              )}
            </View>

            {resultado.validas.length > 0 && (
              <View style={styles.tarjeta}>
                <Text style={styles.tarjetaTitulo}>Se importarán</Text>

                {resultado.validas.slice(0, MAX_VISIBLES).map(({ fila, datos }) => (
                  <View key={fila} style={styles.fila}>
                    <Ionicons
                      name={datos.tipo === 'Moto' ? 'bicycle' : 'car-sport'}
                      size={18}
                      color={Paleta.primario}
                    />

                    <View style={styles.filaInfo}>
                      <Text style={styles.filaTitulo} numberOfLines={1}>
                        {datos.nombre} · {datos.year}
                      </Text>

                      <Text style={styles.filaSub} numberOfLines={1}>
                        {datos.placa || 'Sin placa'}
                        {datos.aseguradora ? ` · ${datos.aseguradora}` : ''}
                        {datos.vencimientoSeguro
                          ? ` · vence ${datos.vencimientoSeguro}`
                          : ''}
                      </Text>
                    </View>
                  </View>
                ))}

                {resultado.validas.length > MAX_VISIBLES && (
                  <Text style={styles.mas}>
                    y {resultado.validas.length - MAX_VISIBLES} más…
                  </Text>
                )}
              </View>
            )}

            {resultado.errores.length > 0 && (
              <View style={styles.tarjeta}>
                <Text style={styles.tarjetaTitulo}>Filas por corregir</Text>

                {resultado.errores.slice(0, MAX_VISIBLES).map((error) => (
                  <View key={error.fila} style={styles.filaError}>
                    <Text style={styles.filaTitulo}>
                      Fila {error.fila} · {error.referencia}
                    </Text>

                    {error.problemas.map((problema) => (
                      <Text key={problema} style={styles.problema}>
                        • {problema}
                      </Text>
                    ))}
                  </View>
                ))}

                {resultado.errores.length > MAX_VISIBLES && (
                  <Text style={styles.mas}>
                    y {resultado.errores.length - MAX_VISIBLES} más con errores…
                  </Text>
                )}
              </View>
            )}

            {resultado.omitidas.length > 0 && (
              <View style={styles.tarjeta}>
                <Text style={styles.tarjetaTitulo}>Repetidas (se omiten)</Text>

                {resultado.omitidas.slice(0, MAX_VISIBLES).map((fila) => (
                  <Text key={fila.fila} style={styles.problema}>
                    Fila {fila.fila} · {fila.referencia}: {fila.problemas[0]}
                  </Text>
                ))}

                {resultado.omitidas.length > MAX_VISIBLES && (
                  <Text style={styles.mas}>
                    y {resultado.omitidas.length - MAX_VISIBLES} más…
                  </Text>
                )}
              </View>
            )}

            <View style={styles.acciones}>
              <BotonNitro
                titulo={
                  resultado.validas.length > 0
                    ? `Importar ${resultado.validas.length} vehículo${
                        resultado.validas.length === 1 ? '' : 's'
                      }`
                    : 'No hay filas para importar'
                }
                icono="cloud-upload-outline"
                onPress={importar}
                deshabilitado={resultado.validas.length === 0}
                anchoCompleto
              />

              <BotonNitro
                titulo="Elegir otro archivo"
                variante="secundario"
                onPress={reiniciar}
                anchoCompleto
                style={styles.separado}
              />
            </View>
          </>
        )}

        {/* ---------- LISTO ---------- */}

        {etapa === 'listo' && resumen && (
          <View style={styles.tarjetaCentro}>
            <Ionicons
              name={
                resumen.filasConError.length === 0
                  ? 'checkmark-circle'
                  : 'alert-circle'
              }
              size={56}
              color={
                resumen.filasConError.length === 0
                  ? Paleta.exito
                  : Paleta.advertencia
              }
            />

            <Text style={styles.tarjetaTitulo}>
              {resumen.importados} vehículo
              {resumen.importados === 1 ? '' : 's'} importado
              {resumen.importados === 1 ? '' : 's'}
            </Text>

            {resumen.filasConError.length > 0 && (
              <Text style={styles.texto}>
                {resumen.filasConError.length} fila
                {resumen.filasConError.length === 1 ? '' : 's'} no se guardaron
                por un error de conexión o permisos. Vuelve a cargar el archivo:
                las que ya están se omitirán por placa.
              </Text>
            )}

            <BotonNitro
              titulo="Ver mi garaje"
              icono="car-sport-outline"
              onPress={() => router.replace('/(tabs)/explore')}
              anchoCompleto
            />

            <BotonNitro
              titulo="Cargar otro archivo"
              variante="secundario"
              onPress={reiniciar}
              anchoCompleto
              style={styles.separado}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* -------------------------------------------------------
   CONTADOR
   ------------------------------------------------------- */

function Contador({
  numero,
  etiqueta,
  color,
  fondo,
}: {
  numero: number;
  etiqueta: string;
  color: string;
  fondo: string;
}) {
  return (
    <View style={[styles.contador, { backgroundColor: fondo }]}>
      <Text style={[styles.contadorNumero, { color }]}>{numero}</Text>

      <Text style={[styles.contadorEtiqueta, { color }]}>{etiqueta}</Text>
    </View>
  );
}

/* -------------------------------------------------------
   ESTILOS
   ------------------------------------------------------- */

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: Paleta.fondo },

  scroll: { paddingBottom: 32 },

  hero: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: Radios.grande,
    padding: 20,
    borderWidth: 2,
    borderColor: Paleta.tinta,
    overflow: 'hidden',
    ...sombraDura(6, 6),
  },

  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 10,
  },

  heroPillTexto: {
    color: Paleta.acento,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },

  heroTitulo: {
    color: Paleta.blanco,
    fontSize: 28,
    fontWeight: '900',
  },

  heroTexto: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },

  tarjeta: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderRadius: Radios.suave,
    backgroundColor: Paleta.tarjeta,
    borderWidth: 1,
    borderColor: Paleta.borde,
  },

  tarjetaCentro: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 24,
    gap: 12,
    alignItems: 'center',
    borderRadius: Radios.suave,
    backgroundColor: Paleta.tarjeta,
    borderWidth: 1,
    borderColor: Paleta.borde,
  },

  tarjetaTitulo: {
    color: Paleta.texto,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },

  texto: {
    color: Paleta.textoSecundario,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    textAlign: 'center',
  },

  nota: {
    color: Paleta.textoSecundario,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },

  separado: { marginTop: 10 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },

  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: Paleta.primarioClaro,
  },

  chipTexto: { color: Paleta.primarioOscuro, fontSize: 12, fontWeight: '700' },

  archivo: {
    color: Paleta.texto,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },

  contadores: { flexDirection: 'row', gap: 8 },

  contador: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
  },

  contadorNumero: { fontSize: 24, fontWeight: '900' },

  contadorEtiqueta: { fontSize: 12, fontWeight: '700' },

  avisoLimite: {
    color: Paleta.advertencia,
    fontSize: 13,
    marginTop: 12,
  },

  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Paleta.borde,
  },

  filaInfo: { flex: 1 },

  filaTitulo: { color: Paleta.texto, fontSize: 14, fontWeight: '700' },

  filaSub: { color: Paleta.textoSecundario, fontSize: 12, marginTop: 2 },

  filaError: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Paleta.borde,
  },

  problema: {
    color: Paleta.peligro,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },

  mas: {
    color: Paleta.textoSuave,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },

  acciones: { marginHorizontal: 16, marginTop: 16 },
});
