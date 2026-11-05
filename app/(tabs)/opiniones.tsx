import { useEffect, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Estrellas from '@/components/ui/estrellas';
import { Gradientes, Paleta, Radios, Sombras, sombraDura } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { suscribirOpiniones } from '@/services/opiniones';
import { describirErrorFirestore } from '@/utils/errorFirestore';
import { resumirOpiniones } from '@/utils/opiniones';

import type { Opinion } from '@/types/models';

function Barra({
  etiqueta,
  proporcion,
  valor,
}: {
  etiqueta: string;
  proporcion: number;
  valor: string;
}) {
  return (
    <View style={styles.barraFila}>
      <Text style={styles.barraEtiqueta}>{etiqueta}</Text>
      <View style={styles.barraFondo}>
        <View
          style={[
            styles.barraRelleno,
            { width: `${Math.max(0, Math.min(1, proporcion)) * 100}%` },
          ]}
        />
      </View>
      <Text style={styles.barraValor}>{valor}</Text>
    </View>
  );
}

function ResultadosOpiniones() {
  const insets = useSafeAreaInsets();

  const [opiniones, setOpiniones] = useState<Opinion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return suscribirOpiniones(
      (lista) => {
        setOpiniones(lista);
        setError(null);
        setCargando(false);
      },
      (err) => {
        setError(describirErrorFirestore(err));
        setCargando(false);
      }
    );
  }, []);

  const resumen = useMemo(() => resumirOpiniones(opiniones), [opiniones]);

  const recientes = useMemo(
    () => [...opiniones].sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [opiniones]
  );

  const maximoFavorita = Math.max(1, ...resumen.favoritas.map((f) => f.cantidad));

  return (
    <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
      <LinearGradient
        colors={Gradientes.marca}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 20 }]}
      >
        <Text style={styles.heroEtiqueta}>ENCUESTA</Text>
        <Text style={styles.heroTitulo}>Opiniones de usuarios</Text>
        <Text style={styles.heroSubtitulo}>
          {resumen.total} {resumen.total === 1 ? 'respuesta' : 'respuestas'}
        </Text>
      </LinearGradient>

      {cargando && (
        <ActivityIndicator
          size="large"
          color={Paleta.primario}
          style={styles.cargando}
        />
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {!cargando && !error && resumen.total === 0 && (
        <Text style={styles.vacio}>Aún no hay opiniones registradas.</Text>
      )}

      {resumen.total > 0 && (
        <>
          <View style={[styles.tarjeta, styles.tarjetaPrincipal]}>
            <Text style={styles.promedio}>{resumen.general.toFixed(1)}</Text>
            <Estrellas valor={resumen.general} tamano={26} />
            <Text style={styles.recomiendan}>
              {resumen.recomiendan}% recomienda la app
            </Text>
          </View>

          <View style={styles.tarjeta}>
            <Text style={styles.seccion}>Promedio por criterio</Text>
            <Barra
              etiqueta="Facilidad"
              proporcion={resumen.facilidad / 5}
              valor={resumen.facilidad.toFixed(1)}
            />
            <Barra
              etiqueta="Diseño"
              proporcion={resumen.diseno / 5}
              valor={resumen.diseno.toFixed(1)}
            />
            <Barra
              etiqueta="Utilidad"
              proporcion={resumen.utilidad / 5}
              valor={resumen.utilidad.toFixed(1)}
            />
          </View>

          <View style={styles.tarjeta}>
            <Text style={styles.seccion}>Distribución de calificaciones</Text>
            {resumen.distribucion.map((item) => (
              <Barra
                key={item.estrellas}
                etiqueta={`${item.estrellas} ★`}
                proporcion={item.cantidad / resumen.total}
                valor={String(item.cantidad)}
              />
            ))}
          </View>

          <View style={styles.tarjeta}>
            <Text style={styles.seccion}>Función favorita</Text>
            {resumen.favoritas.map((item) => (
              <Barra
                key={item.nombre}
                etiqueta={item.nombre}
                proporcion={item.cantidad / maximoFavorita}
                valor={String(item.cantidad)}
              />
            ))}
          </View>

          <View style={styles.tarjeta}>
            <Text style={styles.seccion}>Comentarios</Text>
            {recientes.map((opinion) => (
              <View key={opinion.uid} style={styles.comentario}>
                <View style={styles.comentarioCabecera}>
                  <Estrellas valor={opinion.calificacion} tamano={16} />
                  <Text style={styles.comentarioFecha}>{opinion.fecha}</Text>
                </View>
                <Text style={styles.comentarioCorreo}>{opinion.email}</Text>
                <Text style={styles.comentarioTexto}>
                  {opinion.comentario || 'Sin comentario.'}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

export default function OpinionesRoute() {
  const { esAdmin } = useAuth();

  if (!esAdmin) {
    return <Redirect href="/" />;
  }

  return <ResultadosOpiniones />;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Paleta.fondo },
  contenido: { paddingBottom: 40 },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 56,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroEtiqueta: {
    color: Paleta.acento,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  heroTitulo: { color: '#FFFFFF', fontSize: 26, fontWeight: '900', marginTop: 4 },
  heroSubtitulo: { color: 'rgba(255,255,255,0.78)', fontSize: 14, marginTop: 4 },
  cargando: { marginTop: 30 },
  error: {
    margin: 16,
    padding: 12,
    borderRadius: Radios.suave,
    backgroundColor: Paleta.peligroFondo,
    color: '#B3123E',
    fontSize: 13,
  },
  vacio: {
    textAlign: 'center',
    color: Paleta.textoSecundario,
    marginTop: 40,
    fontSize: 14,
  },
  tarjeta: {
    backgroundColor: Paleta.tarjeta,
    borderRadius: Radios.tarjeta,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    gap: 10,
    ...Sombras.tarjeta,
  },
  tarjetaPrincipal: {
    alignItems: 'center',
    marginTop: -34,
    borderWidth: 2,
    borderColor: Paleta.tinta,
    ...sombraDura(5, 5),
  },
  promedio: { fontSize: 54, fontWeight: '900', color: Paleta.texto },
  recomiendan: { fontSize: 14, fontWeight: '800', color: Paleta.exito },
  seccion: { fontSize: 16, fontWeight: '900', color: Paleta.texto },
  barraFila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barraEtiqueta: {
    width: 84,
    fontSize: 12,
    fontWeight: '700',
    color: Paleta.textoSecundario,
  },
  barraFondo: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: Paleta.fondoAlterno,
    overflow: 'hidden',
  },
  barraRelleno: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: Paleta.primario,
  },
  barraValor: {
    width: 32,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '800',
    color: Paleta.texto,
  },
  comentario: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Paleta.borde,
    gap: 4,
  },
  comentarioCabecera: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comentarioFecha: { fontSize: 11, color: Paleta.textoSuave },
  comentarioCorreo: { fontSize: 12, fontWeight: '700', color: Paleta.textoSecundario },
  comentarioTexto: { fontSize: 14, color: Paleta.texto, lineHeight: 20 },
});
