import { useEffect, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ImagenVehiculo from '@/components/ui/imagen-vehiculo';
import {
  ColoresEstado,
  ColoresTipo,
  Gradientes,
  Paleta,
  Radios,
  Sombras,
} from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { buscarAseguradora } from '@/data/aseguradoras';
import { suscribirTodosLosVehiculos } from '@/services/admin';
import {
  FILTRO_POR_RENOVAR,
  FILTRO_SIN_SEGURO,
  FILTRO_TODOS,
  PREFIJO_ASEGURADORA,
  contarPorAseguradora,
  estadoSeguro,
  filtrarVehiculos,
  nombreAseguradora,
  resumirVehiculos,
  textoVencimiento,
  type TipoFiltro,
} from '@/utils/admin';
import { describirErrorFirestore } from '@/utils/errorFirestore';

import type { VehiculoAdmin } from '@/types/models';

const TIPOS: { clave: TipoFiltro; texto: string }[] = [
  { clave: 'todos', texto: 'Todos' },
  { clave: 'Carro', texto: 'Carros' },
  { clave: 'Moto', texto: 'Motos' },
];

function Chip({
  texto,
  activo,
  onPress,
}: {
  texto: string;
  activo: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, activo && styles.chipActivo]}
      accessibilityRole="button"
    >
      <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>
        {texto}
      </Text>
    </Pressable>
  );
}

function Estadistica({
  valor,
  etiqueta,
  icono,
  color,
}: {
  valor: number;
  etiqueta: string;
  icono: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return (
    <View style={styles.estadistica}>
      <Ionicons name={icono} size={20} color={color} />
      <Text style={styles.estadisticaValor}>{valor}</Text>
      <Text style={styles.estadisticaEtiqueta}>{etiqueta}</Text>
    </View>
  );
}

function FilaVehiculo({ vehiculo }: { vehiculo: VehiculoAdmin }) {
  const aseguradora = nombreAseguradora(vehiculo);
  const marca = buscarAseguradora(aseguradora);
  const estado = estadoSeguro(vehiculo);
  const colorTipo = ColoresTipo[vehiculo.tipo];
  const colorEstado =
    estado === 'Vigente' || estado === 'Proximo a vencer' || estado === 'Vencido'
      ? ColoresEstado[estado]
      : null;

  return (
    <TouchableOpacity
      style={styles.fila}
      activeOpacity={0.85}
      onPress={() =>
        router.push({
          pathname: '/admin/vehiculo',
          params: { uid: vehiculo.propietarioUid, id: vehiculo.id },
        })
      }
    >
      <ImagenVehiculo
        uri={vehiculo.imagen}
        tipo={vehiculo.tipo}
        style={styles.filaImagen}
      />

      <View style={styles.filaCuerpo}>
        <View style={styles.filaTitulo}>
          <Text style={styles.filaNombre} numberOfLines={1}>
            {vehiculo.nombre}
          </Text>

          <View
            style={[
              styles.badge,
              { backgroundColor: colorTipo.fondo, borderColor: colorTipo.borde },
            ]}
          >
            <Text style={[styles.badgeTexto, { color: colorTipo.texto }]}>
              {vehiculo.tipo}
            </Text>
          </View>
        </View>

        <Text style={styles.filaDetalle} numberOfLines={1}>
          {vehiculo.year}
          {vehiculo.placa ? ` • ${vehiculo.placa}` : ''}
          {vehiculo.marca ? ` • ${vehiculo.marca}` : ''}
        </Text>

        <View style={styles.filaSeguro}>
          {aseguradora ? (
            <View
              style={[
                styles.aseguradoraPill,
                { backgroundColor: marca?.color ?? Paleta.primario },
              ]}
            >
              <Text
                style={[
                  styles.aseguradoraTexto,
                  { color: marca?.colorTexto ?? '#FFFFFF' },
                ]}
                numberOfLines={1}
              >
                {aseguradora}
              </Text>
            </View>
          ) : (
            <View style={[styles.aseguradoraPill, styles.sinSeguroPill]}>
              <Text style={[styles.aseguradoraTexto, { color: '#B3123E' }]}>
                Sin seguro
              </Text>
            </View>
          )}

          {colorEstado && (
            <Text style={[styles.vencimiento, { color: colorEstado.texto }]}>
              {textoVencimiento(vehiculo)}
            </Text>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={Paleta.textoSuave} />
    </TouchableOpacity>
  );
}

function PanelAdmin() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [vehiculos, setVehiculos] = useState<VehiculoAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState(FILTRO_TODOS);
  const [tipo, setTipo] = useState<TipoFiltro>('todos');
  const [texto, setTexto] = useState('');

  useEffect(() => {
    return suscribirTodosLosVehiculos(
      (lista) => {
        setVehiculos(lista);
        setError(null);
        setCargando(false);
      },
      (err) => {
        setError(describirErrorFirestore(err));
        setCargando(false);
      }
    );
  }, []);

  const base = useMemo(
    () =>
      tipo === 'todos'
        ? vehiculos
        : vehiculos.filter((vehiculo) => vehiculo.tipo === tipo),
    [vehiculos, tipo]
  );

  const resumen = useMemo(() => resumirVehiculos(base), [base]);
  const aseguradoras = useMemo(() => contarPorAseguradora(base), [base]);

  const lista = useMemo(
    () =>
      filtrarVehiculos(base, filtro, texto).sort((a, b) =>
        a.nombre.localeCompare(b.nombre)
      ),
    [base, filtro, texto]
  );

  const encabezado = (
    <View>
      <LinearGradient
        colors={Gradientes.marca}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.heroFila}>
          <View style={styles.heroTextos}>
            <Text style={styles.heroEtiqueta}>ADMINISTRADOR</Text>
            <Text style={styles.heroTitulo}>Vehículos afiliados</Text>
            <Text style={styles.heroSubtitulo} numberOfLines={1}>
              {user?.email}
            </Text>
          </View>

          <View style={styles.heroIcono}>
            <Ionicons name="shield-checkmark" size={26} color={Paleta.tinta} />
          </View>
        </View>
      </LinearGradient>

      <View style={styles.estadisticas}>
        <Estadistica
          valor={resumen.total}
          etiqueta="Vehículos"
          icono="car-sport"
          color={Paleta.primario}
        />
        <Estadistica
          valor={resumen.conSeguro}
          etiqueta="Asegurados"
          icono="shield-checkmark"
          color={Paleta.exito}
        />
        <Estadistica
          valor={resumen.sinSeguro}
          etiqueta="Sin seguro"
          icono="shield-outline"
          color={Paleta.peligro}
        />
        <Estadistica
          valor={resumen.porRenovar}
          etiqueta="Por renovar"
          icono="time"
          color={Paleta.advertencia}
        />
      </View>

      <View style={styles.buscador}>
        <Ionicons name="search" size={18} color={Paleta.textoSuave} />
        <TextInput
          style={styles.buscadorInput}
          placeholder="Buscar por placa, marca o póliza"
          placeholderTextColor="#94A3B8"
          value={texto}
          onChangeText={setTexto}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.segmentos}>
        {TIPOS.map((item) => (
          <Pressable
            key={item.clave}
            onPress={() => setTipo(item.clave)}
            style={[styles.segmento, tipo === item.clave && styles.segmentoActivo]}
          >
            <Text
              style={[
                styles.segmentoTexto,
                tipo === item.clave && styles.segmentoTextoActivo,
              ]}
            >
              {item.texto}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        <Chip
          texto={`Todos (${base.length})`}
          activo={filtro === FILTRO_TODOS}
          onPress={() => setFiltro(FILTRO_TODOS)}
        />
        <Chip
          texto={`Sin seguro (${resumen.sinSeguro})`}
          activo={filtro === FILTRO_SIN_SEGURO}
          onPress={() => setFiltro(FILTRO_SIN_SEGURO)}
        />
        <Chip
          texto={`Por renovar (${resumen.porRenovar})`}
          activo={filtro === FILTRO_POR_RENOVAR}
          onPress={() => setFiltro(FILTRO_POR_RENOVAR)}
        />
        {aseguradoras.map((item) => (
          <Chip
            key={item.nombre}
            texto={`${item.nombre} (${item.cantidad})`}
            activo={filtro === `${PREFIJO_ASEGURADORA}${item.nombre}`}
            onPress={() => setFiltro(`${PREFIJO_ASEGURADORA}${item.nombre}`)}
          />
        ))}
      </ScrollView>

      <Text style={styles.contador}>
        {lista.length} {lista.length === 1 ? 'resultado' : 'resultados'}
      </Text>

      {cargando && (
        <ActivityIndicator
          size="large"
          color={Paleta.primario}
          style={styles.cargando}
        />
      )}

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );

  return (
    <FlatList
      style={styles.pantalla}
      data={lista}
      keyExtractor={(item) => `${item.propietarioUid}-${item.id}`}
      renderItem={({ item }) => <FilaVehiculo vehiculo={item} />}
      ListHeaderComponent={encabezado}
      ListEmptyComponent={
        !cargando && !error ? (
          <Text style={styles.vacio}>No hay vehículos con este filtro.</Text>
        ) : null
      }
      contentContainerStyle={styles.contenido}
      keyboardShouldPersistTaps="handled"
      initialNumToRender={12}
      windowSize={8}
    />
  );
}

export default function PanelRoute() {
  const { esAdmin } = useAuth();

  if (!esAdmin) {
    return <Redirect href="/" />;
  }

  return <PanelAdmin />;
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Paleta.fondo },
  contenido: { paddingBottom: 30 },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 56,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroFila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroTextos: { flex: 1 },
  heroEtiqueta: {
    color: Paleta.acento,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  heroTitulo: { color: '#FFFFFF', fontSize: 26, fontWeight: '900', marginTop: 4 },
  heroSubtitulo: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },
  heroIcono: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: Paleta.acento,
    borderWidth: 2,
    borderColor: Paleta.tinta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  estadisticas: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: -34,
  },
  estadistica: {
    flex: 1,
    backgroundColor: Paleta.tarjeta,
    borderRadius: Radios.suave,
    borderWidth: 2,
    borderColor: Paleta.tinta,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  estadisticaValor: { fontSize: 20, fontWeight: '900', color: Paleta.texto },
  estadisticaEtiqueta: {
    fontSize: 10,
    fontWeight: '700',
    color: Paleta.textoSecundario,
  },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Paleta.tarjeta,
    borderWidth: 1,
    borderColor: Paleta.borde,
    borderRadius: Radios.suave,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 14,
    height: 48,
  },
  buscadorInput: { flex: 1, fontSize: 14, color: Paleta.texto, padding: 0 },
  segmentos: {
    flexDirection: 'row',
    backgroundColor: Paleta.fondoAlterno,
    borderRadius: Radios.suave,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 4,
  },
  segmento: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  segmentoActivo: { backgroundColor: Paleta.tinta },
  segmentoTexto: { fontSize: 13, fontWeight: '800', color: Paleta.textoSecundario },
  segmentoTextoActivo: { color: Paleta.acento },
  chips: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radios.pastilla,
    backgroundColor: Paleta.tarjeta,
    borderWidth: 1.5,
    borderColor: Paleta.borde,
  },
  chipActivo: { backgroundColor: Paleta.primario, borderColor: Paleta.tinta },
  chipTexto: { fontSize: 12, fontWeight: '800', color: Paleta.textoSecundario },
  chipTextoActivo: { color: '#FFFFFF' },
  contador: {
    marginHorizontal: 20,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '700',
    color: Paleta.textoSuave,
  },
  cargando: { marginVertical: 24 },
  error: {
    marginHorizontal: 16,
    padding: 12,
    borderRadius: Radios.suave,
    backgroundColor: Paleta.peligroFondo,
    color: '#B3123E',
    fontSize: 13,
  },
  vacio: {
    textAlign: 'center',
    color: Paleta.textoSecundario,
    marginTop: 30,
    fontSize: 14,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Paleta.tarjeta,
    borderRadius: Radios.tarjeta,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    ...Sombras.suave,
  },
  filaImagen: { width: 68, height: 68, borderRadius: 14 },
  filaCuerpo: { flex: 1, gap: 4 },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filaNombre: { flexShrink: 1, fontSize: 15, fontWeight: '800', color: Paleta.texto },
  badge: {
    borderWidth: 1,
    borderRadius: Radios.pastilla,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeTexto: { fontSize: 10, fontWeight: '800' },
  filaDetalle: { fontSize: 12, color: Paleta.textoSecundario },
  filaSeguro: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  aseguradoraPill: {
    borderRadius: Radios.pastilla,
    paddingHorizontal: 10,
    paddingVertical: 3,
    maxWidth: 150,
  },
  sinSeguroPill: { backgroundColor: Paleta.peligroFondo },
  aseguradoraTexto: { fontSize: 11, fontWeight: '800' },
  vencimiento: { fontSize: 11, fontWeight: '700' },
});
