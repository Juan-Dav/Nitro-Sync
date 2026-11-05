/*
=======================================================
NITRO SYNC - FORMULARIO DE VEHÍCULO
=======================================================

Sirve para DOS tareas:

  /vehicle/formulario               -> registrar
  /vehicle/formulario?vehiculoId=X  -> editar

Datos guardados en Firestore (subcolección vehiculos):

  nombre, tipo, marca, modelo, year,
  placa, color, kilometraje, imagen,
  fechaRegistro y uid (agrega el contexto).

El diseño se organiza en tarjetas con secciones:
  1. Información principal
  2. Especificaciones
  3. Identificación y uso
  4. Imagen

=======================================================
*/

import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import {
  ColoresTipo,
  Gradientes,
  Paleta,
  Radios,
  Sombras,
  sombraDura,
} from '@/constants/theme';

import { ASEGURADORAS } from '@/data/aseguradoras';

import BotonNitro from '@/components/ui/boton-nitro';
import ImagenVehiculo from '@/components/ui/imagen-vehiculo';
import SelectorFecha from '@/components/ui/selector-fecha';
import { useAlerta } from '@/components/ui/confirm-dialog';
import { useVehiculos, type DatosVehiculo } from '@/context/VehiculosContext';
import {
  buscarImagenVehiculo,
  imagenPorDefecto,
} from '@/services/imagenVehiculo';
import type { TipoVehiculo } from '@/types/models';
import { formatoKm, formatoPlaca } from '@/utils/formato';
import {
  AYUDA_PLACA,
  EJEMPLO_PLACA,
  formatearPlaca,
  esPlacaValida,
  LARGO_PLACA,
  progresoPlaca,
} from '@/utils/placa';

/*
=======================================================
AÑO ACTUAL (para validar el campo "Año")
=======================================================
*/

const ANIO_ACTUAL = new Date().getFullYear();

export default function FormularioVehiculoScreen() {
  const { vehiculoId } = useLocalSearchParams<{ vehiculoId?: string }>();

  const { obtenerVehiculo, crear, actualizar } = useVehiculos();

  const alerta = useAlerta();

  const vehiculoOriginal = vehiculoId
    ? obtenerVehiculo(vehiculoId)
    : undefined;

  const modo: 'crear' | 'editar' = vehiculoId ? 'editar' : 'crear';

  /*
  ======================================================
  ESTADOS DEL FORMULARIO
  ======================================================

  Se inicializan con los datos del vehículo cuando la
  pantalla está en modo edición.
  ======================================================
  */

  const [nombre, setNombre] = useState(vehiculoOriginal?.nombre ?? '');
  const [tipo, setTipo] = useState<TipoVehiculo>(
    vehiculoOriginal?.tipo ?? 'Carro'
  );
  const [marca, setMarca] = useState(vehiculoOriginal?.marca ?? '');
  const [modelo, setModelo] = useState(vehiculoOriginal?.modelo ?? '');
  const [year, setYear] = useState(
    vehiculoOriginal ? String(vehiculoOriginal.year) : ''
  );
  const [placa, setPlaca] = useState(() =>
    vehiculoOriginal
      ? formatearPlaca(vehiculoOriginal.placa, vehiculoOriginal.tipo)
      : ''
  );
  const [color, setColor] = useState(vehiculoOriginal?.color ?? '');
  const [kilometraje, setKilometraje] = useState(
    vehiculoOriginal ? String(vehiculoOriginal.kilometraje) : ''
  );

  /*
  ======================================================
  SEGURO (opcional)

  Se guarda junto al vehículo para que el detalle muestre
  la aseguradora, la póliza y un botón de llamada directa.
  ======================================================
  */

  const [aseguradora, setAseguradora] = useState(
    vehiculoOriginal?.aseguradora ?? ''
  );

  const [telefonoAseguradora, setTelefonoAseguradora] = useState(
    vehiculoOriginal?.telefonoAseguradora ?? ''
  );

  const [numeroPoliza, setNumeroPoliza] = useState(
    vehiculoOriginal?.numeroPoliza ?? ''
  );

  const [vencimientoSeguro, setVencimientoSeguro] = useState(
    vehiculoOriginal?.vencimientoSeguro ?? ''
  );

  /*
  ======================================================
  IMAGEN DEL VEHÍCULO

  Ya NO existe el campo de enlace de la foto: la imagen
  se genera sola a partir de marca + modelo.

  imagenActual guarda la foto que se está mostrando; si el
  vehículo ya existía, arranca con la que tenía guardada.
  ======================================================
  */

  const imagenGuardada = vehiculoOriginal?.imagen ?? '';

  const [imagenActual, setImagenActual] = useState<string | null>(
    imagenGuardada || null
  );

  const [buscandoImagen, setBuscandoImagen] = useState(false);

  const [guardando, setGuardando] = useState(false);

  /*
  ======================================================
  IMAGEN AUTOMÁTICA (marca + modelo)
  ======================================================

  Se busca una foto real del vehículo a partir de la marca
  y el modelo (por ejemplo: "McLaren 720S" -> foto de un
  McLaren). Se espera un poco entre teclas para no lanzar
  una consulta por cada letra.

  También se ejecuta al ABRIR un vehículo ya guardado: así
  una foto equivocada (por ejemplo un McLaren con imagen
  de BMW) se corrige sola. Si la búsqueda no encuentra una
  foto real, se conserva la que el vehículo ya tenía.
  ======================================================
  */

  useEffect(() => {
    if (!marca.trim() && !modelo.trim()) {
      return;
    }

    let activo = true;

    const temporizador = setTimeout(() => {
      if (!activo) {
        return;
      }

      setBuscandoImagen(true);

      buscarImagenVehiculo({
        marca,
        modelo,
        tipo,
        year: Number(year) || ANIO_ACTUAL,
      }).then((url) => {
        if (!activo) {
          return;
        }

        const generica = imagenPorDefecto(tipo);

        /*
        Si la búsqueda solo devolvió la imagen genérica y el
        vehículo ya tenía una foto propia, se conserva la que
        ya estaba (búsqueda fallida o sin internet).
        */
        if (url === generica && imagenGuardada) {
          setImagenActual(imagenGuardada);
        } else {
          setImagenActual(url);
        }

        setBuscandoImagen(false);
      });
    }, 650);

    return () => {
      activo = false;
      clearTimeout(temporizador);
    };
  }, [marca, modelo, tipo, year, imagenGuardada]);

  /*
  El aviso "buscando…" solo se muestra cuando de verdad
  hay datos con los que buscar (así nunca queda encendido
  si el usuario borra la marca o el modelo).
  */
  const mostrandoBusqueda =
    buscandoImagen && (!!marca.trim() || !!modelo.trim());

  /*
  ======================================================
  VEHÍCULO NO ENCONTRADO (modo edición)
  ======================================================
  */

  if (vehiculoId && !vehiculoOriginal) {
    return (
      <View style={styles.avisoContenedor}>
        <Text style={styles.avisoTitulo}>Vehículo no encontrado</Text>

        <Text style={styles.avisoTexto}>
          No se encontró el vehículo solicitado. Vuelve a la lista e
          inténtalo de nuevo.
        </Text>

        <Pressable
          style={styles.avisoBoton}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/explore');
          }}
        >
          <Text style={styles.avisoBotonTexto}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  /*
  ======================================================
  VALIDACIÓN
  ======================================================
  */

  const validar = async (): Promise<boolean> => {
    if (!nombre.trim()) {
      await alerta({
        titulo: 'Falta el nombre',
        mensaje: 'Escribe el nombre del vehículo.',
        tipo: 'advertencia',
      });
      return false;
    }

    const anio = Number(year);

    if (
      !year.trim() ||
      Number.isNaN(anio) ||
      anio < 1950 ||
      anio > ANIO_ACTUAL + 1
    ) {
      await alerta({
        titulo: 'Año inválido',
        mensaje: `Escribe un año entre 1950 y ${ANIO_ACTUAL + 1}.`,
        tipo: 'advertencia',
      });
      return false;
    }

    if (placa.trim() && !esPlacaValida(placa, tipo)) {
      await alerta({
        titulo: 'Placa incompleta',
        mensaje: `La placa de ${
          tipo === 'Carro' ? 'un carro' : 'una moto'
        } debe tener ${AYUDA_PLACA[tipo]}.`,
        tipo: 'advertencia',
      });
      return false;
    }

    return true;
  };

  /*
  ======================================================
  GUARDAR
  ======================================================
  */

  const guardar = async () => {
    if (!(await validar())) {
      return;
    }

    const kilometrajeNumerico = Number(
      kilometraje.replace(/[^0-9]/g, '') || '0'
    );

    /*
    La foto: la que ya se sugirió automáticamente por
    marca/modelo y, si aún no hay ninguna, se busca ahora.
    Ya no existe enlace escrito a mano.
    */
    const imagenFinal =
      imagenActual ||
      (await buscarImagenVehiculo({
        marca,
        modelo,
        tipo,
        year: Number(year) || ANIO_ACTUAL,
      }));

    const datos: DatosVehiculo = {
      nombre: nombre.trim(),
      tipo,
      marca: marca.trim(),
      modelo: modelo.trim(),
      year: Number(year),
      placa,
      color: color.trim(),
      kilometraje: kilometrajeNumerico,
      imagen: imagenFinal,
      fechaRegistro:
        vehiculoOriginal?.fechaRegistro ??
        new Date().toISOString().slice(0, 10),
      aseguradora: aseguradora.trim(),
      telefonoAseguradora: telefonoAseguradora.trim(),
      numeroPoliza: numeroPoliza.trim(),
      vencimientoSeguro: vencimientoSeguro || '',
    };

    try {
      setGuardando(true);

      if (modo === 'editar' && vehiculoId) {
        await actualizar(vehiculoId, datos);
      } else {
        await crear(datos);
      }

      await alerta({
        titulo:
          modo === 'editar' ? 'Vehículo actualizado' : 'Vehículo registrado',
        mensaje:
          modo === 'editar'
            ? 'Los cambios se guardaron correctamente.'
            : 'Tu vehículo quedó guardado en tu garaje.',
        tipo: 'exito',
        textoAceptar: 'Continuar',
      });

      router.back();
    } catch (error: any) {
      await alerta({
        titulo: 'No se pudo guardar',
        mensaje: error?.message ?? 'Ocurrió un error inesperado.',
        tipo: 'error',
      });
    } finally {
      setGuardando(false);
    }
  };

  /*
  ======================================================
  INTERFAZ
  ======================================================
  */

  return (
    <KeyboardAvoidingView
      style={styles.contenedor}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Título dinámico según el modo */}
      <Stack.Screen
        options={{
          title: modo === 'editar' ? 'Editar vehículo' : 'Registrar vehículo',
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={true} persistentScrollbar
        keyboardShouldPersistTaps="handled"
      >
        {/* =================================================
            PORTADA DEL FORMULARIO
            ================================================= */}

        <LinearGradient
          colors={Gradientes.marca}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <Text style={styles.bannerMarca}>
            NITRO <Text style={styles.bannerAcento}>SYNC</Text>
          </Text>

          <Text style={styles.bannerTitulo}>
            {modo === 'editar' ? 'Afina tu vehículo' : 'Suma un vehículo'}
          </Text>

          <Text style={styles.bannerTexto}>
            Estos datos alimentan tu garaje, el seguro y los recordatorios.
          </Text>
        </LinearGradient>

        {/* =================================================
            SECCIÓN 1: INFORMACIÓN PRINCIPAL
            ================================================= */}

        <View style={styles.tarjeta}>
          <Text style={styles.seccionTitulo}>Información principal</Text>

          <Text style={styles.etiqueta}>Nombre *</Text>

          <TextInput
            style={styles.input}
            placeholder="Ej: Mazda 3"
            placeholderTextColor={Paleta.textoSuave}
            value={nombre}
            onChangeText={setNombre}
            maxLength={40}
          />

          <Text style={styles.etiqueta}>Tipo de vehículo</Text>

          {/* Selector Carro / Moto */}

          <View style={styles.segmento}>
            {(['Carro', 'Moto'] as TipoVehiculo[]).map((opcion) => {
              const activo = tipo === opcion;

              return (
                <Pressable
                  key={opcion}
                  style={[
                    styles.segmentoOpcion,
                    activo && styles.segmentoActivo,
                  ]}
                  onPress={() => {
                    setTipo(opcion);
                    setPlaca((actual) => formatearPlaca(actual, opcion));
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: activo }}
                >
                  <Text
                    style={[
                      styles.segmentoTexto,
                      activo && styles.segmentoTextoActivo,
                    ]}
                  >
                    {opcion === 'Carro' ? '🚗 ' : '🏍️ '}
                    {opcion}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* =================================================
            SECCIÓN 2: ESPECIFICACIONES
            ================================================= */}

        <View style={styles.tarjeta}>
          <Text style={styles.seccionTitulo}>Especificaciones</Text>

          <Text style={styles.etiqueta}>Marca</Text>

          <TextInput
            style={styles.input}
            placeholder="Ej: Mazda, Yamaha"
            placeholderTextColor={Paleta.textoSuave}
            value={marca}
            onChangeText={setMarca}
            maxLength={30}
          />

          <View style={styles.fila}>
            <View style={styles.mitad}>
              <Text style={styles.etiqueta}>Modelo</Text>

              <TextInput
                style={styles.input}
                placeholder="Ej: 3, FZ 2.0"
                placeholderTextColor={Paleta.textoSuave}
                value={modelo}
                onChangeText={setModelo}
                maxLength={30}
              />
            </View>

            <View style={styles.mitad}>
              <Text style={styles.etiqueta}>Año *</Text>

              <TextInput
                style={styles.input}
                placeholder="Ej: 2022"
                placeholderTextColor={Paleta.textoSuave}
                keyboardType="number-pad"
                value={year}
                onChangeText={setYear}
                maxLength={4}
              />
            </View>
          </View>

          <Text style={styles.etiqueta}>Color</Text>

          <TextInput
            style={styles.input}
            placeholder="Ej: Gris"
            placeholderTextColor={Paleta.textoSuave}
            value={color}
            onChangeText={setColor}
            maxLength={30}
          />
        </View>

        {/* =================================================
            SECCIÓN 3: IDENTIFICACIÓN Y USO
            ================================================= */}

        <View style={styles.tarjeta}>
          <Text style={styles.seccionTitulo}>Identificación y uso</Text>

          <View style={styles.fila}>
            <View style={styles.mitad}>
              <Text style={styles.etiqueta}>Placa</Text>

              <TextInput
                style={[styles.input, styles.inputPlaca]}
                placeholder={EJEMPLO_PLACA[tipo]}
                placeholderTextColor={Paleta.textoSuave}
                autoCapitalize="characters"
                autoCorrect={false}
                value={placa}
                onChangeText={(texto) =>
                  setPlaca(formatearPlaca(texto, tipo))
                }
                maxLength={LARGO_PLACA}
              />

              <Text
                style={[
                  styles.ayudaPlaca,
                  esPlacaValida(placa, tipo) && styles.ayudaPlacaOk,
                ]}
              >
                {esPlacaValida(placa, tipo)
                  ? '✓ Placa válida'
                  : `${AYUDA_PLACA[tipo]} · ${progresoPlaca(placa, tipo)}/${LARGO_PLACA}`}
              </Text>
            </View>

            <View style={styles.mitad}>
              <Text style={styles.etiqueta}>Kilometraje</Text>

              <TextInput
                style={styles.input}
                placeholder="Ej: 36500"
                placeholderTextColor={Paleta.textoSuave}
                keyboardType="number-pad"
                value={kilometraje}
                onChangeText={(texto) =>
                  setKilometraje(texto.replace(/[^0-9]/g, ''))
                }
                maxLength={8}
              />
            </View>
          </View>

          {kilometraje.trim() !== '' && (
            <Text style={styles.vistaPrevia}>
              {formatoKm(Number(kilometraje.replace(/[^0-9]/g, '') || '0'))}
            </Text>
          )}
        </View>

        {/* =================================================
            SECCIÓN 3.1: SEGURO (OPCIONAL)
            ================================================= */}

        <View style={styles.tarjeta}>
          <View style={styles.seccionFila}>
            <Text style={styles.seccionTitulo}>Seguro</Text>

            <View style={styles.pillOpcional}>
              <Text style={styles.pillOpcionalTexto}>Opcional</Text>
            </View>
          </View>

          <Text style={styles.ayudaImagen}>
            Guarda la aseguradora y su teléfono de atención para llamar
            directo desde el detalle del vehículo.
          </Text>

          <Text style={styles.etiqueta}>Aseguradora</Text>

          <TextInput
            style={styles.input}
            placeholder="Ej: SURA, Bolívar, AXA..."
            placeholderTextColor={Paleta.textoSuave}
            value={aseguradora}
            onChangeText={setAseguradora}
            maxLength={40}
          />

          <Text style={styles.chipsAyuda}>Toca una para autocompletar:</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsFila}
          >
            {ASEGURADORAS.map((item) => {
              const activo = aseguradora === item.nombre;

              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setAseguradora(item.nombre);
                    setTelefonoAseguradora(item.telefono);
                  }}
                  style={[
                    styles.chipSeguro,
                    activo && styles.chipSeguroActivo,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activo }}
                  accessibilityLabel={`Usar ${item.nombre}`}
                >
                  <Text
                    style={[
                      styles.chipSeguroTexto,
                      activo && styles.chipSeguroTextoActivo,
                    ]}
                  >
                    {item.nombre}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.fila}>
            <View style={styles.mitad}>
              <Text style={styles.etiqueta}>Teléfono</Text>

              <TextInput
                style={styles.input}
                placeholder="+57 601 000 0000"
                placeholderTextColor={Paleta.textoSuave}
                keyboardType="phone-pad"
                value={telefonoAseguradora}
                onChangeText={setTelefonoAseguradora}
                maxLength={22}
              />
            </View>

            <View style={styles.mitad}>
              <Text style={styles.etiqueta}>N.º de póliza</Text>

              <TextInput
                style={styles.input}
                placeholder="Ej: 12345678"
                placeholderTextColor={Paleta.textoSuave}
                value={numeroPoliza}
                onChangeText={setNumeroPoliza}
                maxLength={30}
              />
            </View>
          </View>

          <SelectorFecha
            etiqueta="Vencimiento del seguro"
            valor={vencimientoSeguro}
            onChange={setVencimientoSeguro}
            placeholder="AAAA-MM-DD"
            ayuda="Se usa para avisarte antes de que venza."
          />
        </View>

        {/* =================================================
            SECCIÓN 4: IMAGEN
            ================================================= */}

        <View style={styles.tarjeta}>
          <Text style={styles.seccionTitulo}>Imagen</Text>

          <Text style={styles.ayudaImagen}>
            Ya no es necesario pegar enlaces: la foto se elige sola según la
            marca y el modelo que escribas.
          </Text>

          <View style={styles.autoFila}>
            {mostrandoBusqueda ? (
              <>
                <ActivityIndicator size="small" color={Paleta.primario} />

                <Text style={styles.autoTexto}>
                  Buscando una foto del vehículo…
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="sparkles-outline"
                  size={15}
                  color={Paleta.primario}
                />

                <Text style={styles.autoTexto}>
                  Foto automática por marca y modelo
                </Text>
              </>
            )}
          </View>

          <ImagenVehiculo
            uri={imagenActual}
            tipo={tipo}
            style={styles.vistaImagen}
            accessibilityLabel={`Foto de ${
              `${marca} ${modelo}`.trim() || 'un vehículo nuevo'
            }`}
          />
        </View>

        {/* =================================================
            VISTA PREVIA DEL VEHÍCULO
            ================================================= */}

        <View style={styles.tarjeta}>
          <Text style={styles.seccionTitulo}>Vista previa</Text>

          <View style={styles.previewFila}>
            <View
              style={[
                styles.previewTipo,
                {
                  backgroundColor: ColoresTipo[tipo].fondo,
                  borderColor: ColoresTipo[tipo].borde,
                },
              ]}
            >
              <Text
                style={[
                  styles.previewTipoTexto,
                  { color: ColoresTipo[tipo].texto },
                ]}
              >
                {tipo}
              </Text>
            </View>

            <View style={styles.previewInfo}>
              <Text style={styles.previewNombre}>
                {nombre.trim() || 'Nombre del vehículo'}
              </Text>

              <Text style={styles.previewDatos}>
                {year.trim() || 'Año'}
                {placa.trim() ? ` • ${formatoPlaca(placa)}` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* =================================================
            BOTÓN GUARDAR
            ================================================= */}

        <BotonNitro
          titulo={
            guardando
              ? 'Guardando...'
              : modo === 'editar'
                ? 'Guardar cambios'
                : 'Registrar vehículo'
          }
          icono={modo === 'editar' ? 'checkmark' : 'add'}
          onPress={guardar}
          cargando={guardando}
          anchoCompleto
          style={styles.botonGuardar}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/*
=======================================================
ESTILOS
=======================================================
*/

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: Paleta.fondo,
  },

  scroll: {
    padding: 16,
    paddingBottom: 40,
  },

  banner: {
    borderRadius: Radios.grande,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
    ...sombraDura(4, 4),
  },

  bannerMarca: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
    color: Paleta.blanco,
  },

  bannerAcento: {
    color: Paleta.acento,
  },

  bannerTitulo: {
    fontSize: 24,
    fontWeight: '900',
    color: Paleta.blanco,
    marginTop: 8,
    letterSpacing: -0.4,
  },

  bannerTexto: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 6,
    lineHeight: 18,
  },

  tarjeta: {
    backgroundColor: Paleta.tarjeta,
    borderRadius: Radios.tarjeta,
    borderWidth: 1.5,
    borderColor: Paleta.borde,
    padding: 16,
    marginBottom: 14,
    ...Sombras.tarjeta,
  },

  seccionFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  pillOpcional: {
    backgroundColor: Paleta.acentoClaro,
    borderWidth: 1,
    borderColor: '#D2F57A',
    borderRadius: Radios.pastilla,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },

  pillOpcionalTexto: {
    fontSize: 10,
    fontWeight: '900',
    color: '#3E5A08',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  chipsAyuda: {
    fontSize: 11,
    color: Paleta.textoSuave,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 8,
  },

  chipsScroll: {
    marginBottom: 10,
    marginHorizontal: -4,
  },

  chipsFila: {
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },

  chipSeguro: {
    backgroundColor: Paleta.fondo,
    borderWidth: 1.5,
    borderColor: Paleta.borde,
    borderRadius: Radios.pastilla,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  chipSeguroActivo: {
    backgroundColor: Paleta.acento,
    borderColor: Paleta.tinta,
    ...sombraDura(2, 2),
  },

  chipSeguroTexto: {
    fontSize: 12,
    fontWeight: '700',
    color: Paleta.textoSecundario,
  },

  chipSeguroTextoActivo: {
    color: Paleta.tinta,
    fontWeight: '900',
  },

  seccionTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: Paleta.texto,
    marginBottom: 12,
  },

  etiqueta: {
    fontSize: 13,
    fontWeight: '600',
    color: Paleta.textoSecundario,
    marginBottom: 6,
    marginTop: 4,
  },

  input: {
    height: 50,
    backgroundColor: Paleta.fondo,
    borderWidth: 1,
    borderColor: Paleta.borde,
    borderRadius: Radios.suave,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Paleta.texto,
    marginBottom: 6,
  },

  inputPlaca: {
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '800',
  },

  ayudaPlaca: {
    fontSize: 11,
    color: Paleta.textoSuave,
    marginTop: 2,
  },

  ayudaPlacaOk: {
    color: Paleta.exito,
    fontWeight: '700',
  },

  ayudaImagen: {
    fontSize: 13,
    color: Paleta.textoSecundario,
    marginTop: 6,
    marginBottom: 6,
    lineHeight: 18,
  },

  autoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 2,
  },

  autoTexto: {
    flex: 1,
    fontSize: 12,
    color: Paleta.textoSecundario,
    fontWeight: '600',
  },

  fila: {
    flexDirection: 'row',
    gap: 12,
  },

  mitad: {
    flex: 1,
  },

  vistaPrevia: {
    fontSize: 13,
    fontWeight: '700',
    color: Paleta.primario,
    marginTop: 4,
  },

  vistaImagen: {
    width: '100%',
    height: 150,
    borderRadius: Radios.suave,
    marginTop: 8,
    backgroundColor: Paleta.fondo,
  },

  segmento: {
    flexDirection: 'row',
    backgroundColor: Paleta.fondo,
    borderRadius: Radios.suave,
    padding: 4,
    gap: 4,
  },

  segmentoOpcion: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  segmentoActivo: {
    backgroundColor: Paleta.primario,
  },

  segmentoTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: Paleta.textoSecundario,
  },

  segmentoTextoActivo: {
    color: '#FFFFFF',
  },

  botonGuardar: {
    marginTop: 6,
    marginBottom: 18,
  },

  /* -----------------------------
     VISTA PREVIA
     ----------------------------- */

  previewFila: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  previewTipo: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radios.pastilla,
    borderWidth: 1,
    marginRight: 10,
  },

  previewTipoTexto: {
    fontSize: 12,
    fontWeight: '800',
  },

  previewInfo: {
    flex: 1,
  },

  previewNombre: {
    fontSize: 15,
    fontWeight: '800',
    color: Paleta.texto,
  },

  previewDatos: {
    fontSize: 13,
    color: Paleta.textoSecundario,
    marginTop: 2,
  },

  /* -----------------------------
     VEHÍCULO NO ENCONTRADO
     ----------------------------- */

  avisoContenedor: {
    flex: 1,
    backgroundColor: Paleta.fondo,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  avisoTitulo: {
    fontSize: 20,
    fontWeight: '800',
    color: Paleta.texto,
    marginBottom: 8,
    textAlign: 'center',
  },

  avisoTexto: {
    fontSize: 14,
    color: Paleta.textoSecundario,
    textAlign: 'center',
    marginBottom: 20,
  },

  avisoBoton: {
    backgroundColor: Paleta.primario,
    borderRadius: Radios.suave,
    paddingHorizontal: 26,
    paddingVertical: 13,
  },

  avisoBotonTexto: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
