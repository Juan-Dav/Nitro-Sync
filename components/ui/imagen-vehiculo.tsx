/*
=======================================================
NITRO SYNC - IMAGEN DEL VEHÍCULO
=======================================================

Imagen reutilizable del garaje con tres protecciones:

  1. Pasa la URL por `normalizarUrlImagen`: las fotos de
     Wikimedia se sirven a través de images.weserv.nl,
     porque Android (okhttp) recibe 403 directamente.
  2. Si la URL falla o viene vacía, muestra la imagen
     genérica de su tipo (carro o moto).
  3. Si la foto cambia, el respaldo se reinicia solo.

Así nunca queda un espacio en blanco, incluso si la foto
se guardó mal o el dispositivo está sin internet.

Uso:

  <ImagenVehiculo
    uri={vehiculo.imagen}
    tipo={vehiculo.tipo}
    style={styles.portada}
    contentFit="cover"
  />
=======================================================
*/

import { useState } from 'react';

import type { StyleProp, ImageStyle } from 'react-native';

import { Image, type ImageContentFit } from 'expo-image';

import {
  imagenPorDefecto,
  normalizarUrlImagen,
} from '@/services/imagenVehiculo';

import type { TipoVehiculo } from '@/types/models';

export interface ImagenVehiculoProps {
  /** URL de la foto real del vehículo (puede venir vacía). */
  uri?: string | null;

  /** Tipo de vehículo: decide la imagen genérica. */
  tipo: TipoVehiculo;

  /** Estilos de la imagen (ancho, alto, bordes...). */
  style?: StyleProp<ImageStyle>;

  /** Ajuste dentro del contenedor. */
  contentFit?: ImageContentFit;

  /** Etiqueta para accesibilidad. */
  accessibilityLabel?: string;
}

export default function ImagenVehiculo({
  uri,
  tipo,
  style,
  contentFit = 'cover',
  accessibilityLabel,
}: ImagenVehiculoProps) {
  /*
  Se guarda la URL que falló (no un simple true): así, si
  cambia la foto del vehículo, se vuelve a intentar sin
  necesidad de un efecto.
  */
  const [uriFallida, setUriFallida] = useState<string | null>(null);

  const falla = !!uri && uriFallida === uri;

  const fuente =
    !uri || falla ? imagenPorDefecto(tipo) : normalizarUrlImagen(uri);

  return (
    <Image
      source={{ uri: fuente }}
      style={style}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      transition={200}
      onError={() => setUriFallida(uri ?? null)}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
