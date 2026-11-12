/*
=======================================================
NITRO SYNC - BOTÓN "R5"
=======================================================

Botón chunky inspirado en la interfaz del Renault 5:

  - borde grueso de tinta
  - esquinas generosas
  - sombra DURA desplazada (sin difuminado)
  - mayúsculas con espaciado amplio
  - al presionar "se hunde" hacia su sombra

Variantes:

  primario   -> lima nitro (acción principal)
  oscuro     -> tinta con texto lima (acción alterna)
  secundario -> blanco con borde de tinta
  peligro    -> coral suave (eliminar)
  fantasma   -> sin borde ni sombra (enlaces)

Uso:

  <BotonNitro
    titulo="Registrar vehículo"
    icono="add"
    onPress={registrar}
  />
=======================================================
*/

import type { ComponentProps } from 'react';

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { Paleta, Radios, sombraDura } from '@/constants/theme';

/* -------------------------------------------------------
   TIPOS
   ------------------------------------------------------- */

export type VarianteBoton =
  | 'primario'
  | 'oscuro'
  | 'secundario'
  | 'peligro'
  | 'fantasma';

export type TamanoBoton = 'grande' | 'mediano' | 'pequeno';

export interface BotonNitroProps {
  titulo: string;
  onPress?: () => void;

  variante?: VarianteBoton;
  tamano?: TamanoBoton;

  icono?: ComponentProps<typeof Ionicons>['name'];
  iconoDerecha?: ComponentProps<typeof Ionicons>['name'];

  cargando?: boolean;
  deshabilitado?: boolean;

  /** Ocupa todo el ancho disponible. */
  anchoCompleto?: boolean;

  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/* -------------------------------------------------------
   COLORES POR VARIANTE
   ------------------------------------------------------- */

const COLORES: Record<
  VarianteBoton,
  { fondo: string; texto: string; borde: string; sombra: string }
> = {
  primario: {
    fondo: Paleta.acento,
    texto: Paleta.tinta,
    borde: Paleta.tinta,
    sombra: Paleta.tinta,
  },
  oscuro: {
    fondo: Paleta.tinta,
    texto: Paleta.acento,
    borde: Paleta.tinta,
    sombra: Paleta.tinta,
  },
  secundario: {
    fondo: Paleta.tarjeta,
    texto: Paleta.tinta,
    borde: Paleta.tinta,
    sombra: Paleta.tinta,
  },
  peligro: {
    fondo: Paleta.coralClaro,
    texto: '#B3123E',
    borde: '#B3123E',
    sombra: Paleta.tinta,
  },
  fantasma: {
    fondo: 'transparent',
    texto: Paleta.primario,
    borde: 'transparent',
    sombra: 'transparent',
  },
};

/* -------------------------------------------------------
   MEDIDAS POR TAMAÑO
   ------------------------------------------------------- */

const MEDIDAS: Record<
  TamanoBoton,
  { alto: number; fuente: number; icono: number; padding: number; radio: number }
> = {
  grande: { alto: 56, fuente: 16, icono: 20, padding: 22, radio: Radios.suave },
  mediano: { alto: 48, fuente: 14, icono: 18, padding: 16, radio: Radios.suave },
  pequeno: { alto: 38, fuente: 12, icono: 15, padding: 12, radio: 12 },
};

/* -------------------------------------------------------
   COMPONENTE
   ------------------------------------------------------- */

export default function BotonNitro({
  titulo,
  onPress,
  variante = 'primario',
  tamano = 'grande',
  icono,
  iconoDerecha,
  cargando = false,
  deshabilitado = false,
  anchoCompleto = false,
  style,
  accessibilityLabel,
}: BotonNitroProps) {
  const colores = COLORES[variante];
  const medidas = MEDIDAS[tamano];

  const inactivo = deshabilitado || cargando;
  const solido = variante !== 'fantasma';

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? titulo}
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: medidas.alto,
          paddingHorizontal: medidas.padding,
          borderRadius: medidas.radio,
          backgroundColor: colores.fondo,
          borderWidth: solido ? 2 : 0,
          borderColor: colores.borde,
        },
        solido && sombraDura(4, 4, colores.sombra),
        anchoCompleto && styles.ancho,
        inactivo && styles.inactivo,
        pressed &&
          !inactivo && {
            transform: [{ translateX: 4 }, { translateY: 4 }],
            ...(solido ? sombraDura(0, 0, '#00000000') : null),
          },
        style,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={colores.texto} size="small" />
      ) : (
        <View style={styles.contenido}>
          {icono && (
            <Ionicons name={icono} size={medidas.icono} color={colores.texto} />
          )}

          <Text
            style={[
              styles.texto,
              {
                color: colores.texto,
                fontSize: medidas.fuente,
              },
            ]}
            numberOfLines={1}
          >
            {titulo}
          </Text>

          {iconoDerecha && (
            <Ionicons
              name={iconoDerecha}
              size={medidas.icono}
              color={colores.texto}
            />
          )}
        </View>
      )}
    </Pressable>
  );
}

/* -------------------------------------------------------
   ESTILOS
   ------------------------------------------------------- */

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  ancho: {
    alignSelf: 'stretch',
  },

  contenido: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  texto: {
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    flexShrink: 1,
  },

  inactivo: {
    opacity: 0.55,
  },
});
