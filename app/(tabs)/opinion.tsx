import { useEffect, useState } from 'react';

import {
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BotonNitro from '@/components/ui/boton-nitro';
import { useAlerta } from '@/components/ui/confirm-dialog';
import Estrellas from '@/components/ui/estrellas';
import { Gradientes, Paleta, Radios, sombraDura } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { guardarOpinion, leerMiOpinion } from '@/services/opiniones';
import { CARACTERISTICAS } from '@/utils/opiniones';

import type { CaracteristicaFavorita } from '@/types/models';

function Pregunta({
  titulo,
  valor,
  onChange,
}: {
  titulo: string;
  valor: number;
  onChange: (valor: number) => void;
}) {
  return (
    <View style={styles.pregunta}>
      <Text style={styles.preguntaTitulo}>{titulo}</Text>
      <Estrellas valor={valor} onChange={onChange} />
    </View>
  );
}

export default function OpinionScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const alerta = useAlerta();

  const [calificacion, setCalificacion] = useState(0);
  const [facilidad, setFacilidad] = useState(0);
  const [diseno, setDiseno] = useState(0);
  const [utilidad, setUtilidad] = useState(0);
  const [recomienda, setRecomienda] = useState<boolean | null>(null);
  const [favorita, setFavorita] = useState<CaracteristicaFavorita | ''>('');
  const [comentario, setComentario] = useState('');
  const [yaRespondio, setYaRespondio] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    leerMiOpinion(user.uid)
      .then((opinion) => {
        if (!opinion) {
          return;
        }

        setCalificacion(opinion.calificacion);
        setFacilidad(opinion.facilidad);
        setDiseno(opinion.diseno);
        setUtilidad(opinion.utilidad);
        setRecomienda(opinion.recomienda);
        setFavorita(opinion.favorita);
        setComentario(opinion.comentario);
        setYaRespondio(true);
      })
      .catch(() => {});
  }, [user]);

  const enviar = async () => {
    if (!user) {
      return;
    }

    if (
      !calificacion ||
      !facilidad ||
      !diseno ||
      !utilidad ||
      recomienda === null
    ) {
      await alerta({
        titulo: 'Encuesta incompleta',
        mensaje:
          'Califica todas las preguntas con estrellas y responde si recomendarías la app.',
        tipo: 'advertencia',
      });
      return;
    }

    try {
      setGuardando(true);

      await guardarOpinion(user.uid, user.email ?? '', {
        calificacion,
        facilidad,
        diseno,
        utilidad,
        recomienda,
        favorita,
        comentario: comentario.trim(),
      });

      setYaRespondio(true);

      await alerta({
        titulo: '¡Gracias por tu opinión!',
        mensaje: 'Tus respuestas nos ayudan a mejorar Nitro Sync.',
        tipo: 'exito',
      });
    } catch {
      await alerta({
        titulo: 'No se pudo enviar',
        mensaje: 'Revisa tu conexión e inténtalo de nuevo.',
        tipo: 'error',
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.pantalla}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={Gradientes.marca}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 20 }]}
        >
          <Text style={styles.heroTitulo}>Danos tu opinión</Text>
          <Text style={styles.heroSubtitulo}>
            Responde esta breve encuesta y califica Nitro Sync.
          </Text>
        </LinearGradient>

        <View style={styles.tarjeta}>
          <Pregunta
            titulo="Calificación general de la app"
            valor={calificacion}
            onChange={setCalificacion}
          />
          <Pregunta
            titulo="Facilidad de uso"
            valor={facilidad}
            onChange={setFacilidad}
          />
          <Pregunta
            titulo="Diseño y apariencia"
            valor={diseno}
            onChange={setDiseno}
          />
          <Pregunta
            titulo="Utilidad de documentos, recordatorios y seguros"
            valor={utilidad}
            onChange={setUtilidad}
          />

          <Text style={styles.preguntaTitulo}>¿Recomendarías Nitro Sync?</Text>
          <View style={styles.opciones}>
            {[
              { texto: 'Sí', valor: true, icono: 'thumbs-up' as const },
              { texto: 'No', valor: false, icono: 'thumbs-down' as const },
            ].map((opcion) => {
              const activa = recomienda === opcion.valor;

              return (
                <Pressable
                  key={opcion.texto}
                  onPress={() => setRecomienda(opcion.valor)}
                  style={[styles.opcion, activa && styles.opcionActiva]}
                >
                  <Ionicons
                    name={opcion.icono}
                    size={18}
                    color={activa ? Paleta.acento : Paleta.textoSecundario}
                  />
                  <Text
                    style={[styles.opcionTexto, activa && styles.opcionTextoActiva]}
                  >
                    {opcion.texto}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.preguntaTitulo}>¿Qué función te gustó más?</Text>
          <View style={styles.chips}>
            {CARACTERISTICAS.map((nombre) => {
              const activa = favorita === nombre;

              return (
                <Pressable
                  key={nombre}
                  onPress={() => setFavorita(activa ? '' : nombre)}
                  style={[styles.chip, activa && styles.chipActivo]}
                >
                  <Text style={[styles.chipTexto, activa && styles.chipTextoActivo]}>
                    {nombre}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.preguntaTitulo}>Comentarios (opcional)</Text>
          <TextInput
            style={styles.comentario}
            value={comentario}
            onChangeText={setComentario}
            placeholder="¿Qué mejorarías o qué te gustaría ver en la app?"
            placeholderTextColor="#94A3B8"
            multiline
            maxLength={500}
            textAlignVertical="top"
          />

          <BotonNitro
            titulo={yaRespondio ? 'Actualizar opinión' : 'Enviar opinión'}
            icono="send"
            onPress={enviar}
            cargando={guardando}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
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
  heroTitulo: { color: '#FFFFFF', fontSize: 26, fontWeight: '900' },
  heroSubtitulo: { color: 'rgba(255,255,255,0.78)', fontSize: 14, marginTop: 6 },
  tarjeta: {
    backgroundColor: Paleta.tarjeta,
    borderRadius: Radios.tarjeta,
    borderWidth: 2,
    borderColor: Paleta.tinta,
    padding: 18,
    marginHorizontal: 16,
    marginTop: -36,
    gap: 14,
    ...sombraDura(5, 5),
  },
  pregunta: { gap: 8 },
  preguntaTitulo: { fontSize: 14, fontWeight: '800', color: Paleta.texto },
  opciones: { flexDirection: 'row', gap: 10 },
  opcion: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: Radios.suave,
    borderWidth: 1.5,
    borderColor: Paleta.borde,
    backgroundColor: Paleta.fondo,
  },
  opcionActiva: { backgroundColor: Paleta.tinta, borderColor: Paleta.tinta },
  opcionTexto: { fontSize: 14, fontWeight: '800', color: Paleta.textoSecundario },
  opcionTextoActiva: { color: Paleta.acento },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radios.pastilla,
    backgroundColor: Paleta.fondo,
    borderWidth: 1.5,
    borderColor: Paleta.borde,
  },
  chipActivo: { backgroundColor: Paleta.primario, borderColor: Paleta.tinta },
  chipTexto: { fontSize: 12, fontWeight: '800', color: Paleta.textoSecundario },
  chipTextoActivo: { color: '#FFFFFF' },
  comentario: {
    minHeight: 100,
    backgroundColor: Paleta.fondo,
    borderWidth: 1,
    borderColor: Paleta.borde,
    borderRadius: Radios.suave,
    padding: 14,
    fontSize: 14,
    color: Paleta.texto,
  },
});
