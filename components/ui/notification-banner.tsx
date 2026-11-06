/*
=======================================================
NITRO SYNC - BANNER DE NOTIFICACIÓN
=======================================================

Muestra, DENTRO de la aplicación, un aviso con el diseño
de la app cuando llega una NOTIFICACIÓN LOCAL y la app
está abierta (primer plano).

Diseño:
- Tarjeta blanca redondeada con sombra flotante.
- Icono sobre un degradado de marca (índigo -> cian).
- Título y mensaje.
- Se puede tocar para abrir el vehículo relacionado.
- Se oculta solo a los 6 segundos.

USO:

  1. La app se envuelve con <NotificationBannerProvider>
     (en app/_layout.tsx).

  2. En cualquier pantalla / listener:

     const mostrarBanner = useNotificationBanner();

     mostrarBanner({
       titulo: 'Vence tu SOAT',
       mensaje: 'Vence en 3 días',
       onPress: () => router.push('/vehicle/123'),
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
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Gradientes, Paleta, Radios, Sombras } from '@/constants/theme';

/* -------------------------------------------------------
   TIPOS
   ------------------------------------------------------- */

export interface BannerOptions {
  titulo: string;
  mensaje: string;
  icono?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}

type MostrarBanner = (opciones: BannerOptions) => void;

/* -------------------------------------------------------
   CONTEXTO
   ------------------------------------------------------- */

const BannerContext = createContext<MostrarBanner>(() => {});

export function useNotificationBanner(): MostrarBanner {
  return useContext(BannerContext);
}

/* -------------------------------------------------------
   PROVEEDOR + BANNER
   ------------------------------------------------------- */

export function NotificationBannerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();

  const [actual, setActual] = useState<BannerOptions | null>(null);

  /*
  Los valores de Animated se guardan con useState (no con
  useRef) para poder leerlos durante el render sin romper la
  regla react-hooks/refs que exige el React Compiler.
  */
  const [translateY] = useState(() => new Animated.Value(-220));
  const [opacity] = useState(() => new Animated.Value(0));
  const ocultarTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (ocultarTimer.current) {
        clearTimeout(ocultarTimer.current);
      }
    };
  }, []);

  const ocultar = useCallback(() => {
    if (ocultarTimer.current) {
      clearTimeout(ocultarTimer.current);
      ocultarTimer.current = null;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -220,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => setActual(null));
  }, [opacity, translateY]);

  const mostrar = useCallback<MostrarBanner>(
    (opciones) => {
      if (ocultarTimer.current) {
        clearTimeout(ocultarTimer.current);
      }

      setActual(opciones);

      translateY.setValue(-220);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 6,
          speed: 14,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      ocultarTimer.current = setTimeout(ocultar, 6000);
    },
    [ocultar, opacity, translateY],
  );

  const alPresionar = () => {
    const accion = actual?.onPress;
    ocultar();
    accion?.();
  };

  return (
    <BannerContext.Provider value={mostrar}>
      {children}

      {actual && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.capa,
            {
              paddingTop: insets.top + 8,
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <Pressable
            style={styles.tarjeta}
            onPress={alPresionar}
            accessibilityRole="button"
            accessibilityLabel={`${actual.titulo}. ${actual.mensaje}`}
          >
            <LinearGradient
              colors={Gradientes.marca}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconoCaja}
            >
              <Ionicons
                name={actual.icono ?? 'notifications'}
                size={22}
                color="#FFFFFF"
              />
            </LinearGradient>

            <View style={styles.textos}>
              <Text style={styles.titulo} numberOfLines={1}>
                {actual.titulo}
              </Text>

              <Text style={styles.mensaje} numberOfLines={2}>
                {actual.mensaje}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={Paleta.textoSuave}
            />
          </Pressable>
        </Animated.View>
      )}
    </BannerContext.Provider>
  );
}

/* -------------------------------------------------------
   ESTILOS
   ------------------------------------------------------- */

const styles = StyleSheet.create({
  capa: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 24,
    paddingHorizontal: 12,
  },

  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Paleta.tarjeta,
    borderRadius: Radios.tarjeta,
    borderWidth: 1,
    borderColor: Paleta.borde,
    paddingVertical: 12,
    paddingHorizontal: 12,
    ...Sombras.flotante,
  },

  iconoCaja: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  textos: {
    flex: 1,
    marginRight: 8,
  },

  titulo: {
    fontSize: 15,
    fontWeight: '800',
    color: Paleta.texto,
  },

  mensaje: {
    fontSize: 13,
    color: Paleta.textoSecundario,
    marginTop: 2,
    lineHeight: 18,
  },
});
