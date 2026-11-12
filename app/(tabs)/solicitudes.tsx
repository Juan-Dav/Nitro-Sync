import { useEffect, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BotonNitro from '@/components/ui/boton-nitro';
import { useAlerta } from '@/components/ui/confirm-dialog';
import { ColoresTipo, Gradientes, Paleta, Radios, sombraDura } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { marcarSolicitudAtendida, suscribirSolicitudes } from '@/services/solicitudes';
import { urlWhatsApp } from '@/utils/contacto';
import { describirErrorFirestore } from '@/utils/errorFirestore';

import type { Solicitud } from '@/types/models';

function BandejaSolicitudes() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const alerta = useAlerta();

  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return suscribirSolicitudes(
      (lista) => {
        setSolicitudes(lista);
        setError(null);
        setCargando(false);
      },
      (err) => {
        setError(describirErrorFirestore(err));
        setCargando(false);
      }
    );
  }, []);

  const ordenadas = useMemo(
    () =>
      [...solicitudes].sort((a, b) => {
        if (a.estado !== b.estado) {
          return a.estado === 'Pendiente' ? -1 : 1;
        }

        return b.creadaEn - a.creadaEn;
      }),
    [solicitudes]
  );

  const pendientes = solicitudes.filter((s) => s.estado === 'Pendiente').length;

  const whatsapp = (solicitud: Solicitud) => {
    const mensaje = `Hola, soy tu agente de seguros en Nitro Sync. Recibí tu solicitud de ${solicitud.tipo.toLowerCase()} para tu ${solicitud.vehiculoNombre} (${solicitud.placa}). ¿Hablamos?`;

    Linking.openURL(urlWhatsApp(solicitud.telefono, mensaje));
  };

  const atender = async (solicitud: Solicitud) => {
    if (!user) {
      return;
    }

    try {
      await marcarSolicitudAtendida(solicitud.id, user.uid);
    } catch {
      await alerta({
        titulo: 'No se pudo actualizar',
        mensaje: 'Revisa tu conexión e inténtalo de nuevo.',
        tipo: 'error',
      });
    }
  };

  return (
    <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
      <LinearGradient
        colors={Gradientes.marca}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 20 }]}
      >
        <Text style={styles.heroEtiqueta}>BANDEJA</Text>
        <Text style={styles.heroTitulo}>Solicitudes de seguro</Text>
        <Text style={styles.heroSubtitulo}>
          {pendientes} {pendientes === 1 ? 'pendiente' : 'pendientes'}
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

      {!cargando && !error && ordenadas.length === 0 && (
        <Text style={styles.vacio}>Aún no hay solicitudes.</Text>
      )}

      {ordenadas.map((solicitud, indice) => {
        const pendiente = solicitud.estado === 'Pendiente';
        const colorTipo = ColoresTipo[solicitud.tipoVehiculo];

        return (
          <View
            key={solicitud.id}
            style={[styles.tarjeta, indice === 0 && styles.tarjetaPrimera]}
          >
            <View style={styles.cabecera}>
              <Text style={styles.nombre} numberOfLines={1}>
                {solicitud.vehiculoNombre}
              </Text>

              <View
                style={[
                  styles.pill,
                  pendiente ? styles.pillPendiente : styles.pillAtendida,
                ]}
              >
                <Text
                  style={[
                    styles.pillTexto,
                    { color: pendiente ? '#9A5B00' : '#067A55' },
                  ]}
                >
                  {solicitud.estado}
                </Text>
              </View>
            </View>

            <View style={styles.etiquetas}>
              <View
                style={[
                  styles.pill,
                  { backgroundColor: colorTipo.fondo, borderColor: colorTipo.borde },
                ]}
              >
                <Text style={[styles.pillTexto, { color: colorTipo.texto }]}>
                  {solicitud.tipoVehiculo} • {solicitud.placa || 'Sin placa'}
                </Text>
              </View>

              <View style={[styles.pill, styles.pillTipo]}>
                <Text style={[styles.pillTexto, { color: Paleta.primarioOscuro }]}>
                  {solicitud.tipo}
                </Text>
              </View>
            </View>

            <Text style={styles.detalle}>{solicitud.email}</Text>
            <Text style={styles.detalle}>
              Prefiere: {solicitud.aseguradoraPreferida || 'Sin preferencia'}
            </Text>
            {solicitud.nota ? (
              <Text style={styles.nota}>“{solicitud.nota}”</Text>
            ) : null}
            <Text style={styles.fecha}>Enviada el {solicitud.fecha}</Text>

            <View style={styles.botones}>
              <BotonNitro
                titulo="WhatsApp"
                icono="logo-whatsapp"
                variante="secundario"
                tamano="pequeno"
                onPress={() => whatsapp(solicitud)}
                deshabilitado={!solicitud.telefono}
              />

              <BotonNitro
                titulo={pendiente ? 'Atender' : 'Ver vehículo'}
                icono="shield-checkmark"
                tamano="pequeno"
                onPress={() =>
                  router.push({
                    pathname: '/admin/vehiculo',
                    params: { uid: solicitud.uid, id: solicitud.vehiculoId },
                  })
                }
              />

              {pendiente && (
                <BotonNitro
                  titulo="Marcar atendida"
                  variante="fantasma"
                  tamano="pequeno"
                  onPress={() => atender(solicitud)}
                />
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

export default function SolicitudesRoute() {
  const { esAdmin } = useAuth();

  if (!esAdmin) {
    return <Redirect href="/" />;
  }

  return <BandejaSolicitudes />;
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
    borderWidth: 2,
    borderColor: Paleta.tinta,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 14,
    gap: 6,
    ...sombraDura(4, 4),
  },
  tarjetaPrimera: { marginTop: -34 },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  nombre: { flex: 1, fontSize: 17, fontWeight: '900', color: Paleta.texto },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    borderWidth: 1,
    borderRadius: Radios.pastilla,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillPendiente: { backgroundColor: Paleta.advertenciaFondo, borderColor: '#FADB8A' },
  pillAtendida: { backgroundColor: Paleta.exitoFondo, borderColor: '#A9EBD2' },
  pillTipo: { backgroundColor: Paleta.primarioClaro, borderColor: '#C3CFFF' },
  pillTexto: { fontSize: 11, fontWeight: '800' },
  detalle: { fontSize: 13, color: Paleta.textoSecundario },
  nota: { fontSize: 13, fontStyle: 'italic', color: Paleta.texto },
  fecha: { fontSize: 11, color: Paleta.textoSuave },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
});
