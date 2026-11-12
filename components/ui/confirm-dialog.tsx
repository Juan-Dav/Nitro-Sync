/*
=======================================================
NITRO SYNC - DIÁLOGOS CON EL DISEÑO DE LA APP
=======================================================

Reemplaza a Alert.alert() por ventanas con el mismo
estilo y diseño de la aplicación (colores, gradientes,
radios y sombras del tema). Funciona igual en Android,
iOS y Web.

DOS MODOS:

  1. CONFIRMACIÓN (dos botones: Cancelar / Confirmar)
     -> useConfirm()

     const confirmar = useConfirm();

     const ok = await confirmar({
       titulo: 'Cerrar sesión',
       mensaje: '¿Seguro que deseas cerrar la sesión?',
       textoConfirmar: 'Cerrar sesión',
       icono: 'log-out-outline',
       peligro: true,
     });

  2. AVISO (un solo botón: Entendido)
     -> useAlerta()

     const alerta = useAlerta();

     await alerta({
       titulo: 'Recordatorio creado',
       mensaje: 'Se guardó correctamente.',
       tipo: 'exito',
       icono: 'checkmark-circle-outline',
     });

=======================================================
*/

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Gradientes, Paleta, Radios, Sombras } from '@/constants/theme';

/* -------------------------------------------------------
   TIPOS
   ------------------------------------------------------- */

export interface ConfirmOptions {
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  /** Nombre del ícono de Ionicons. */
  icono?: keyof typeof Ionicons.glyphMap;
  /** true = acción destructiva (rojo). */
  peligro?: boolean;
}

export type TipoAlerta = 'exito' | 'error' | 'info' | 'advertencia';

export interface AlertaOptions {
  titulo: string;
  mensaje: string;
  textoAceptar?: string;
  /** Nombre del ícono de Ionicons (si no se indica, se usa uno según el tipo). */
  icono?: keyof typeof Ionicons.glyphMap;
  /** Color/ícono del aviso. Por defecto: 'info'. */
  tipo?: TipoAlerta;
}

type Confirmar = (opciones: ConfirmOptions) => Promise<boolean>;
type Alertar = (opciones: AlertaOptions) => Promise<void>;

interface DialogoContexto {
  confirmar: Confirmar;
  alerta: Alertar;
}

/* -------------------------------------------------------
   CONTEXTO
   ------------------------------------------------------- */

const DialogoContext = createContext<DialogoContexto>({
  confirmar: () => Promise.resolve(false),
  alerta: () => Promise.resolve(),
});

export function useConfirm(): Confirmar {
  return useContext(DialogoContext).confirmar;
}

export function useAlerta(): Alertar {
  return useContext(DialogoContext).alerta;
}

/* -------------------------------------------------------
   APARIENCIA SEGÚN EL TIPO DE AVISO
   ------------------------------------------------------- */

function aparienciaAlerta(tipo: TipoAlerta) {
  switch (tipo) {
    case 'exito':
      return {
        icono: 'checkmark-circle-outline' as const,
        color: '#047857',
        fondo: Paleta.exitoFondo,
      };
    case 'error':
      return {
        icono: 'close-circle-outline' as const,
        color: '#B91C1C',
        fondo: Paleta.peligroFondo,
      };
    case 'advertencia':
      return {
        icono: 'alert-circle-outline' as const,
        color: '#B45309',
        fondo: Paleta.advertenciaFondo,
      };
    default:
      return {
        icono: 'information-circle-outline' as const,
        color: Paleta.primario,
        fondo: Paleta.primarioClaro,
      };
  }
}

/* -------------------------------------------------------
   ESTADO INTERNO DEL DIÁLOGO
   ------------------------------------------------------- */

type Contenido =
  | { modo: 'confirmar'; opciones: ConfirmOptions }
  | { modo: 'alerta'; opciones: AlertaOptions };

/* -------------------------------------------------------
   PROVEEDOR + DIÁLOGO
   ------------------------------------------------------- */

export function ConfirmProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [contenido, setContenido] = useState<Contenido | null>(null);
  const [visible, setVisible] = useState(false);
  const resolverRef = useRef<((valor: boolean) => void) | null>(null);
  const limpiezaRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Limpia cualquier temporizador pendiente al desmontar. */
  useEffect(() => {
    return () => {
      if (limpiezaRef.current) {
        clearTimeout(limpiezaRef.current);
      }
    };
  }, []);

  const preparar = useCallback(() => {
    /* Cancela cualquier diálogo previo. */
    resolverRef.current?.(false);
    resolverRef.current = null;

    if (limpiezaRef.current) {
      clearTimeout(limpiezaRef.current);
      limpiezaRef.current = null;
    }

    setVisible(true);
  }, []);

  const confirmar = useCallback<Confirmar>(
    (opciones) => {
      preparar();
      setContenido({ modo: 'confirmar', opciones });

      return new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;
      });
    },
    [preparar],
  );

  const alerta = useCallback<Alertar>(
    (opciones) => {
      preparar();
      setContenido({ modo: 'alerta', opciones });

      return new Promise<void>((resolve) => {
        resolverRef.current = () => resolve();
      });
    },
    [preparar],
  );

  const cerrar = useCallback((valor: boolean) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;

    setVisible(false);
    resolver?.(valor);

    /*
    Se conserva "contenido" durante la animación de cierre
    para que el texto no parpadee, y se limpia después.
    */
    limpiezaRef.current = setTimeout(() => {
      setContenido(null);
      limpiezaRef.current = null;
    }, 300);
  }, []);

  /* ---- Datos de presentación ---- */

  const modo = contenido?.modo ?? 'confirmar';

  const esConfirmar = modo === 'confirmar';
  const opcionesConfirmar = contenido?.modo === 'confirmar' ? contenido.opciones : null;
  const opcionesAlerta = contenido?.modo === 'alerta' ? contenido.opciones : null;

  const peligro = opcionesConfirmar?.peligro ?? false;

  const apariencia = opcionesAlerta
    ? aparienciaAlerta(opcionesAlerta.tipo ?? 'info')
    : null;

  const icono =
    opcionesConfirmar?.icono ??
    opcionesAlerta?.icono ??
    apariencia?.icono ??
    'alert-circle-outline';

  const colorIcono = esConfirmar
    ? peligro
      ? '#B91C1C'
      : Paleta.primario
    : apariencia!.color;

  const fondoIcono = esConfirmar
    ? peligro
      ? Paleta.peligroFondo
      : Paleta.primarioClaro
    : apariencia!.fondo;

  const titulo = esConfirmar ? opcionesConfirmar?.titulo : opcionesAlerta?.titulo;
  const mensaje = esConfirmar ? opcionesConfirmar?.mensaje : opcionesAlerta?.mensaje;

  return (
    <DialogoContext.Provider value={{ confirmar, alerta }}>
      {children}

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => cerrar(false)}
      >
        <View style={styles.fondo}>
          {/* Capa de fondo: cierra al tocar fuera de la tarjeta. */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => cerrar(false)}
            accessibilityLabel="Cerrar"
          />

          <View style={styles.tarjeta}>
            <View style={[styles.iconoCaja, { backgroundColor: fondoIcono }]}>
              <Ionicons name={icono} size={30} color={colorIcono} />
            </View>

            <Text style={styles.titulo}>{titulo}</Text>

            <Text style={styles.mensaje}>{mensaje}</Text>

            {esConfirmar ? (
              <View style={styles.botones}>
                <Pressable
                  style={[styles.boton, styles.botonCancelar]}
                  onPress={() => cerrar(false)}
                  accessibilityRole="button"
                  accessibilityLabel={opcionesConfirmar?.textoCancelar ?? 'Cancelar'}
                >
                  <Text style={styles.botonCancelarTexto}>
                    {opcionesConfirmar?.textoCancelar ?? 'Cancelar'}
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.boton, styles.botonConfirmar]}
                  onPress={() => cerrar(true)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    opcionesConfirmar?.textoConfirmar ?? 'Confirmar'
                  }
                >
                  {peligro ? (
                    <View style={[styles.relleno, styles.rellenoPeligro]}>
                      <Text style={styles.botonConfirmarTexto}>
                        {opcionesConfirmar?.textoConfirmar ?? 'Confirmar'}
                      </Text>
                    </View>
                  ) : (
                    <LinearGradient
                      colors={Gradientes.boton}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.relleno}
                    >
                      <Text style={styles.botonConfirmarTexto}>
                        {opcionesConfirmar?.textoConfirmar ?? 'Confirmar'}
                      </Text>
                    </LinearGradient>
                  )}
                </Pressable>
              </View>
            ) : (
              <View style={styles.botonesUnico}>
                <Pressable
                  style={[styles.boton, styles.botonConfirmar]}
                  onPress={() => cerrar(true)}
                  accessibilityRole="button"
                  accessibilityLabel={opcionesAlerta?.textoAceptar ?? 'Entendido'}
                >
                  {(opcionesAlerta?.tipo === 'error') ? (
                    <View style={[styles.relleno, styles.rellenoPeligro]}>
                      <Text style={styles.botonConfirmarTexto}>
                        {opcionesAlerta?.textoAceptar ?? 'Entendido'}
                      </Text>
                    </View>
                  ) : (
                    <LinearGradient
                      colors={Gradientes.boton}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.relleno}
                    >
                      <Text style={styles.botonConfirmarTexto}>
                        {opcionesAlerta?.textoAceptar ?? 'Entendido'}
                      </Text>
                    </LinearGradient>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </DialogoContext.Provider>
  );
}

/* -------------------------------------------------------
   ESTILOS
   ------------------------------------------------------- */

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  tarjeta: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Paleta.tarjeta,
    borderRadius: Radios.grande,
    padding: 24,
    alignItems: 'center',
    ...Sombras.flotante,
  },

  iconoCaja: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  titulo: {
    fontSize: 19,
    fontWeight: '800',
    color: Paleta.texto,
    textAlign: 'center',
  },

  mensaje: {
    fontSize: 14,
    lineHeight: 21,
    color: Paleta.textoSecundario,
    textAlign: 'center',
    marginTop: 8,
  },

  botones: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },

  botonesUnico: {
    marginTop: 24,
    width: '100%',
  },

  boton: {
    flex: 1,
    height: 50,
    borderRadius: Radios.suave,
    overflow: 'hidden',
  },

  botonCancelar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Paleta.borde,
  },

  botonCancelarTexto: {
    fontSize: 15,
    fontWeight: '800',
    color: Paleta.textoSecundario,
  },

  botonConfirmar: {
    overflow: 'hidden',
  },

  relleno: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rellenoPeligro: {
    backgroundColor: Paleta.peligro,
  },

  botonConfirmarTexto: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
