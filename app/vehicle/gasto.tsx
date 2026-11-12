/*
=======================================================
NITRO SYNC - FORMULARIO DE GASTO
=======================================================

  /vehicle/gasto?vehiculoId=X              -> crear
  /vehicle/gasto?vehiculoId=X&gastoId=Y    -> editar

Se guarda en:

  usuarios/{uid}/vehiculos/{vehiculoId}/gastos

Categorías (types/models.ts): Mantenimiento,
Combustible, Repuestos, SOAT, Seguro, Tecnomecanica,
Lavado, Otros.

=======================================================
*/

import { useEffect, useRef, useState } from 'react';

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

import { router, Stack, useLocalSearchParams } from 'expo-router';

import { Paleta, Radios, Sombras } from '@/constants/theme';

import BotonNitro from '@/components/ui/boton-nitro';
import { useAlerta } from '@/components/ui/confirm-dialog';
import SelectorFecha from '@/components/ui/selector-fecha';

import { useAuth } from '@/context/AuthContext';

import { useRegistrosVehiculo } from '@/hooks/use-registros-vehiculo';

import { actualizarGasto, crearGasto } from '@/services/gastos';

import type { CategoriaGasto, Gasto } from '@/types/models';

import {
  ICONO_GASTO,
  NOMBRES_GASTO,
  formatoDinero,
  formatoFecha,
} from '@/utils/formato';

import { esFechaISOValida, hoyISO } from '@/utils/fechas';

/* -------------------------------------------------------
   OPCIONES DE CATEGORÍA
   ------------------------------------------------------- */

const CATEGORIAS: CategoriaGasto[] = [
  'Mantenimiento',
  'Combustible',
  'Repuestos',
  'SOAT',
  'Seguro',
  'Tecnomecanica',
  'Lavado',
  'Otros',
];

const ANIO_ACTUAL = new Date().getFullYear();

export default function FormularioGastoScreen() {
  const { vehiculoId, gastoId } = useLocalSearchParams<{
    vehiculoId?: string;
    gastoId?: string;
  }>();

  const { user } = useAuth();
  const alerta = useAlerta();

  const { registros, cargando } = useRegistrosVehiculo<Gasto>(
    'gastos',
    vehiculoId,
    'fecha',
    'desc'
  );

  const modo: 'crear' | 'editar' = gastoId ? 'editar' : 'crear';

  /* -------------------------------------------------
     ESTADOS DEL FORMULARIO
     ------------------------------------------------- */

  const [fecha, setFecha] = useState(hoyISO());
  const [categoria, setCategoria] = useState<CategoriaGasto>('Combustible');
  const [descripcion, setDescripcion] = useState('');
  const [valor, setValor] = useState('');

  const [guardando, setGuardando] = useState(false);

  /* -------------------------------------------------
     PRELLENADO EN MODO EDICIÓN (una sola vez)
     ------------------------------------------------- */

  const prellenado = useRef(false);

  const registroOriginal = gastoId
    ? registros.find((registro) => registro.id === gastoId)
    : undefined;

  useEffect(() => {
    if (registroOriginal && !prellenado.current) {
      prellenado.current = true;

      setFecha(registroOriginal.fecha);
      setCategoria(registroOriginal.categoria);
      setDescripcion(registroOriginal.descripcion);
      setValor(String(registroOriginal.valor));
    }
  }, [registroOriginal]);

  /* -------------------------------------------------
     DATOS FALTANTES
     ------------------------------------------------- */

  if (!vehiculoId) {
    return (
      <View style={styles.avisoContenedor}>
        <Text style={styles.avisoTitulo}>Vehículo no indicado</Text>

        <Text style={styles.avisoTexto}>
          Falta el identificador del vehículo. Vuelve e inténtalo de nuevo.
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

  if (modo === 'editar' && cargando && !registroOriginal) {
    return (
      <View style={styles.avisoContenedor}>
        <ActivityIndicator size="large" color={Paleta.primario} />

        <Text style={styles.avisoTexto}>Cargando gasto...</Text>
      </View>
    );
  }

  if (modo === 'editar' && !cargando && !registroOriginal) {
    return (
      <View style={styles.avisoContenedor}>
        <Text style={styles.avisoTitulo}>Gasto no encontrado</Text>

        <Text style={styles.avisoTexto}>
          Puede haber sido eliminado. Vuelve a la lista e inténtalo de nuevo.
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

  /* -------------------------------------------------
     VISTA PREVIA
     ------------------------------------------------- */

  const valorNumerico = Number(valor.replace(/[^0-9]/g, '') || '0');

  /* -------------------------------------------------
     VALIDACIÓN
     ------------------------------------------------- */

  const validar = async (): Promise<boolean> => {
    if (!fecha.trim() || !esFechaISOValida(fecha)) {
      await alerta({
        titulo: 'Fecha inválida',
        mensaje: 'Elige la fecha del gasto con el calendario.',
        tipo: 'advertencia',
      });
      return false;
    }

    const anio = Number(fecha.slice(0, 4));

    if (anio < 1950 || anio > ANIO_ACTUAL + 1) {
      await alerta({
        titulo: 'Fecha fuera de rango',
        mensaje: `La fecha debe estar entre 1950 y ${ANIO_ACTUAL + 1}.`,
        tipo: 'advertencia',
      });
      return false;
    }

    if (!descripcion.trim()) {
      await alerta({
        titulo: 'Falta la descripción',
        mensaje: 'Cuenta en qué se gastó (ej: "Full tank de gasolina").',
        tipo: 'advertencia',
      });
      return false;
    }

    if (valor.trim() === '' || valorNumerico <= 0) {
      await alerta({
        titulo: 'Valor inválido',
        mensaje: 'Escribe el valor del gasto en pesos.',
        tipo: 'advertencia',
      });
      return false;
    }

    return true;
  };

  /* -------------------------------------------------
     GUARDAR
     ------------------------------------------------- */

  const guardar = async () => {
    if (!(await validar())) {
      return;
    }

    if (!user) {
      await alerta({
        titulo: 'Sesión requerida',
        mensaje: 'Inicia sesión para guardar.',
        tipo: 'advertencia',
      });
      return;
    }

    const datos = {
      fecha,
      categoria,
      descripcion: descripcion.trim(),
      valor: valorNumerico,
    };

    try {
      setGuardando(true);

      if (modo === 'editar' && gastoId) {
        await actualizarGasto(user.uid, vehiculoId, gastoId, datos);
      } else {
        await crearGasto(user.uid, vehiculoId, datos);
      }

      await alerta({
        titulo: modo === 'editar' ? 'Gasto actualizado' : 'Gasto registrado',
        mensaje: 'La información quedó guardada en Firestore.',
        tipo: 'exito',
        icono: 'checkmark-circle-outline',
      });

      router.back();
    } catch (error: any) {
      await alerta({
        titulo: 'No se pudo guardar',
        mensaje: error?.message ?? 'Ocurrió un error inesperado.',
        tipo: 'error',
        icono: 'alert-circle-outline',
      });
    } finally {
      setGuardando(false);
    }
  };

  /* -------------------------------------------------
     INTERFAZ
     ------------------------------------------------- */

  return (
    <KeyboardAvoidingView
      style={styles.contenedor}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          title: modo === 'editar' ? 'Editar gasto' : 'Nuevo gasto',
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={true} persistentScrollbar
        keyboardShouldPersistTaps="handled"
      >
        {/* =================================================
            SECCIÓN 1: CATEGORÍA
            ================================================= */}

        <View style={styles.tarjeta}>
          <Text style={styles.seccionTitulo}>Categoría</Text>

          <View style={styles.chips}>
            {CATEGORIAS.map((opcion) => {
              const activo = categoria === opcion;

              return (
                <Pressable
                  key={opcion}
                  style={[styles.chip, activo && styles.chipActivo]}
                  onPress={() => setCategoria(opcion)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: activo }}
                >
                  <Text
                    style={[
                      styles.chipTexto,
                      activo && styles.chipTextoActivo,
                    ]}
                  >
                    {ICONO_GASTO[opcion]} {NOMBRES_GASTO[opcion]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* =================================================
            SECCIÓN 2: DETALLES DEL GASTO
            ================================================= */}

        <View style={styles.tarjeta}>
          <Text style={styles.seccionTitulo}>Detalles</Text>

          <SelectorFecha
            etiqueta="Fecha *"
            valor={fecha}
            onChange={setFecha}
            placeholder="Elegir la fecha del gasto"
          />

          <Text style={styles.etiqueta}>Descripción *</Text>

          <TextInput
            style={styles.input}
            placeholder="Ej: Full tank de gasolina"
            placeholderTextColor={Paleta.textoSuave}
            value={descripcion}
            onChangeText={setDescripcion}
            maxLength={80}
          />

          <Text style={styles.etiqueta}>Valor *</Text>

          <TextInput
            style={styles.input}
            placeholder="Ej: 60000"
            placeholderTextColor={Paleta.textoSuave}
            keyboardType="number-pad"
            value={valor}
            onChangeText={(texto) => setValor(texto.replace(/[^0-9]/g, ''))}
            maxLength={10}
          />

          {/* VISTA PREVIA DEL VALOR */}

          {valor.trim() !== '' && (
            <Text style={styles.vistaPrevia}>
              {formatoDinero(valorNumerico)}
              {fecha && esFechaISOValida(fecha)
                ? ` · ${formatoFecha(fecha)}`
                : ''}
            </Text>
          )}
        </View>

        {/* =================================================
            BOTÓN GUARDAR
            ================================================= */}

        <BotonNitro
          titulo={modo === 'editar' ? 'Guardar cambios' : 'Registrar gasto'}
          icono="checkmark-circle"
          cargando={guardando}
          anchoCompleto
          onPress={guardar}
          accessibilityLabel={
            modo === 'editar' ? 'Guardar cambios' : 'Registrar gasto'
          }
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

  tarjeta: {
    backgroundColor: Paleta.tarjeta,
    borderRadius: Radios.tarjeta,
    padding: 16,
    marginBottom: 14,
    ...Sombras.tarjeta,
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

  vistaPrevia: {
    fontSize: 13,
    fontWeight: '700',
    color: Paleta.primario,
    marginTop: 4,
  },

  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: Radios.pastilla,
    borderWidth: 1,
    borderColor: Paleta.borde,
    backgroundColor: Paleta.fondo,
  },

  chipActivo: {
    backgroundColor: Paleta.primario,
    borderColor: Paleta.primario,
  },

  chipTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: Paleta.textoSecundario,
  },

  chipTextoActivo: {
    color: '#FFFFFF',
  },

  botonGuardar: {
    marginTop: 8,
    marginBottom: 18,
  },

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
    marginTop: 12,
  },

  avisoTexto: {
    fontSize: 14,
    color: Paleta.textoSecundario,
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 8,
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
