/*
=======================================================
NITRO SYNC - SELECTOR DE FECHA (CALENDARIO)
=======================================================

Calendario integrado en la app para elegir fechas sin
instalar módulos nativos, así funciona igual en Android,
iOS y web (y dentro de Expo Go).

Cómo usarlo:

  <SelectorFecha
    etiqueta="Fecha de vencimiento"
    valor={fecha}
    onChange={setFecha}
    placeholder="AAAA-MM-DD"
  />

- El valor SIEMPRE se maneja como texto ISO "AAAA-MM-DD"
  (misma convención que Firestore en todo el proyecto).
- `minimo` / `maximo` limitan los días seleccionables
  comparando el texto ISO (el orden alfabético coincide
  con el orden cronológico en fechas "AAAA-MM-DD").
- Al tocar un día se guarda la fecha y se cierra.

=======================================================
*/

import { useState } from 'react';

import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { Paleta, Radios, Sombras } from '@/constants/theme';

import { esFechaISOValida, hoyISO } from '@/utils/fechas';

/* -------------------------------------------------------
   CALENDARIO EN ESPAÑOL
   ------------------------------------------------------- */

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

/* La semana empieza en lunes (convención local). */

const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;

/* -------------------------------------------------------
   AYUDAS DE FECHA
   ------------------------------------------------------- */

function aISO(anio: number, mes: number, dia: number): string {
  const m = String(mes + 1).padStart(2, '0');
  const d = String(dia).padStart(2, '0');

  return `${anio}-${m}-${d}`;
}

function diasDelMes(anio: number, mes: number): number {
  return new Date(anio, mes + 1, 0).getDate();
}

/* Día de la semana del día 1 con 0 = lunes. */
function primerDiaDelMes(anio: number, mes: number): number {
  return (new Date(anio, mes, 1).getDay() + 6) % 7;
}

function textoFechaLargo(fechaISO: string): string {
  if (!esFechaISOValida(fechaISO)) {
    return '';
  }

  const [anio, mes, dia] = fechaISO.split('-').map(Number);

  return `${dia} de ${MESES[mes - 1]} de ${anio}`;
}

/* -------------------------------------------------------
   PROPIEDADES
   ------------------------------------------------------- */

export interface SelectorFechaProps {
  /** Fecha en formato "AAAA-MM-DD" ('' = sin elegir). */
  valor: string;

  /** Se ejecuta con la nueva fecha en formato ISO. */
  onChange: (fechaISO: string) => void;

  /** Texto mostrado cuando no hay fecha. */
  placeholder?: string;

  /** Etiqueta superior (opcional). */
  etiqueta?: string;

  /** Mensaje de ayuda inferior (opcional). */
  ayuda?: string;

  /** Fecha mínima permitida "AAAA-MM-DD". */
  minimo?: string;

  /** Fecha máxima permitida "AAAA-MM-DD". */
  maximo?: string;

  /** Si es true no se puede abrir el calendario. */
  deshabilitado?: boolean;
}

export default function SelectorFecha({
  valor,
  onChange,
  placeholder = 'Seleccionar fecha',
  etiqueta,
  ayuda,
  minimo,
  maximo,
  deshabilitado = false,
}: SelectorFechaProps) {
  const [abierto, setAbierto] = useState(false);

  /* Mes visible en el calendario. */

  const [vista, setVista] = useState(() => {
    const base = esFechaISOValida(valor) ? valor : hoyISO();
    const [anio, mes] = base.split('-').map(Number);

    return { anio, mes: mes - 1 };
  });

  const { anio, mes } = vista;

  /* Celdas del calendario: días del mes con huecos al inicio. */

  const celdas: (number | null)[] = (() => {
    const huecos = primerDiaDelMes(anio, mes);
    const total = diasDelMes(anio, mes);
    const filas = Math.ceil((huecos + total) / 7);
    const salida: (number | null)[] = new Array(huecos).fill(null);

    for (let d = 1; d <= total; d += 1) {
      salida.push(d);
    }

    while (salida.length < filas * 7) {
      salida.push(null);
    }

    return salida;
  })();

  const dentroDeLimites = (iso: string): boolean => {
    if (minimo && iso < minimo) {
      return false;
    }

    if (maximo && iso > maximo) {
      return false;
    }

    return true;
  };

  /* Evita navegar a meses sin fechas permitidas. */

  const puedeRetroceder = (): boolean => {
    if (!minimo) {
      return true;
    }

    const [anioMin, mesMin] = minimo.split('-').map(Number);

    return anio > anioMin || (anio === anioMin && mes > mesMin - 1);
  };

  const puedeAvanzar = (): boolean => {
    if (!maximo) {
      return true;
    }

    const [anioMax, mesMax] = maximo.split('-').map(Number);

    return anio < anioMax || (anio === anioMax && mes < mesMax - 1);
  };

  const cambiarMes = (delta: number) => {
    setVista((actual) => {
      let nuevoMes = actual.mes + delta;
      let nuevoAnio = actual.anio;

      if (nuevoMes < 0) {
        nuevoMes = 11;
        nuevoAnio -= 1;
      }

      if (nuevoMes > 11) {
        nuevoMes = 0;
        nuevoAnio += 1;
      }

      return { anio: nuevoAnio, mes: nuevoMes };
    });
  };

  const abrir = () => {
    if (deshabilitado) {
      return;
    }

    const base = esFechaISOValida(valor) ? valor : hoyISO();
    const [a, m] = base.split('-').map(Number);

    setVista({ anio: a, mes: m - 1 });
    setAbierto(true);
  };

  const seleccionar = (dia: number) => {
    const iso = aISO(anio, mes, dia);

    if (!dentroDeLimites(iso)) {
      return;
    }

    onChange(iso);
    setAbierto(false);
  };

  const hoy = hoyISO();
  const [hoyAnio, hoyMes] = hoy.split('-').map(Number);

  return (
    <View style={styles.contenedor}>
      {etiqueta ? <Text style={styles.etiqueta}>{etiqueta}</Text> : null}

      <Pressable
        onPress={abrir}
        disabled={deshabilitado}
        accessibilityRole="button"
        accessibilityLabel={
          esFechaISOValida(valor) ? textoFechaLargo(valor) : placeholder
        }
        style={({ pressed }) => [
          styles.campo,
          deshabilitado && styles.campoDeshabilitado,
          pressed && !deshabilitado && styles.campoPresionado,
        ]}
      >
        <Text
          numberOfLines={1}
          style={[styles.texto, !valor && styles.textoPlaceholder]}
        >
          {valor || placeholder}
        </Text>

        <Ionicons
          name="calendar-outline"
          size={20}
          color={deshabilitado ? Paleta.textoSuave : Paleta.primario}
        />
      </Pressable>

      {ayuda ? <Text style={styles.ayuda}>{ayuda}</Text> : null}

      {/* =================================================
          CALENDARIO
          ================================================= */}

      <Modal
        visible={abierto}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setAbierto(false)}
      >
        <Pressable
          style={styles.fondo}
          onPress={() => setAbierto(false)}
          accessibilityLabel="Cerrar calendario"
        >
          <Pressable style={styles.tarjeta} onPress={() => undefined}>
            {/* ENCABEZADO: mes y año */}

            <View style={styles.encabezado}>
              <TouchableOpacity
                onPress={() => cambiarMes(-1)}
                disabled={!puedeRetroceder()}
                style={styles.flecha}
                accessibilityRole="button"
                accessibilityLabel="Mes anterior"
              >
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={puedeRetroceder() ? Paleta.primario : Paleta.textoSuave}
                />
              </TouchableOpacity>

              <Text style={styles.tituloMes}>
                {MESES[mes]} {anio}
              </Text>

              <TouchableOpacity
                onPress={() => cambiarMes(1)}
                disabled={!puedeAvanzar()}
                style={styles.flecha}
                accessibilityRole="button"
                accessibilityLabel="Mes siguiente"
              >
                <Ionicons
                  name="chevron-forward"
                  size={22}
                  color={puedeAvanzar() ? Paleta.primario : Paleta.textoSuave}
                />
              </TouchableOpacity>
            </View>

            {/* DÍAS DE LA SEMANA */}

            <View style={styles.filaDias}>
              {DIAS_SEMANA.map((dia, indice) => (
                <Text key={`d${indice}`} style={styles.textoDia}>
                  {dia}
                </Text>
              ))}
            </View>

            {/* CUADRÍCULA */}

            <View style={styles.rejilla}>
              {celdas.map((dia, indice) => {
                if (dia === null) {
                  return <View key={`v${indice}`} style={styles.celda} />;
                }

                const iso = aISO(anio, mes, dia);
                const seleccionada = iso === valor;
                const esHoy = iso === hoy;
                const permitido = dentroDeLimites(iso);

                return (
                  <TouchableOpacity
                    key={iso}
                    onPress={() => seleccionar(dia)}
                    disabled={!permitido}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={textoFechaLargo(iso)}
                    style={[
                      styles.celda,
                      styles.dia,
                      esHoy && !seleccionada && styles.diaHoy,
                      seleccionada && styles.diaSeleccionado,
                      !permitido && styles.diaBloqueado,
                    ]}
                  >
                    <Text
                      style={[
                        styles.textoDiaNum,
                        esHoy && !seleccionada && styles.textoDiaHoy,
                        seleccionada && styles.textoDiaSeleccionado,
                        !permitido && styles.textoDiaBloqueado,
                      ]}
                    >
                      {dia}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* PIE: hoy / cerrar */}

            <View style={styles.pie}>
              <TouchableOpacity
                onPress={() => {
                  if (dentroDeLimites(hoy)) {
                    onChange(hoy);
                    setVista({ anio: hoyAnio, mes: hoyMes - 1 });
                    setAbierto(false);
                  }
                }}
                disabled={!dentroDeLimites(hoy)}
                style={styles.botonPie}
                accessibilityRole="button"
                accessibilityLabel="Elegir la fecha de hoy"
              >
                <Ionicons
                  name="today-outline"
                  size={18}
                  color={dentroDeLimites(hoy) ? Paleta.primario : Paleta.textoSuave}
                />

                <Text
                  style={[
                    styles.botonPieTexto,
                    !dentroDeLimites(hoy) && styles.botonPieTextoOff,
                  ]}
                >
                  Hoy
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setAbierto(false)}
                style={[styles.botonPie, styles.botonCerrar]}
                accessibilityRole="button"
                accessibilityLabel="Cerrar calendario"
              >
                <Text style={styles.botonCerrarTexto}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* -------------------------------------------------------
   ESTILOS
   ------------------------------------------------------- */

const styles = StyleSheet.create({
  contenedor: {
    width: '100%',
  },

  etiqueta: {
    fontSize: 13,
    fontWeight: '700',
    color: Paleta.textoSecundario,
    marginBottom: 6,
  },

  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 50,
    borderWidth: 1,
    borderColor: Paleta.borde,
    borderRadius: Radios.suave,
    backgroundColor: Paleta.tarjeta,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  campoPresionado: {
    borderColor: Paleta.primario,
    backgroundColor: Paleta.primarioClaro,
  },

  campoDeshabilitado: {
    backgroundColor: '#F1F5F9',
    opacity: 0.8,
  },

  texto: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Paleta.texto,
  },

  textoPlaceholder: {
    color: Paleta.textoSuave,
    fontWeight: '500',
  },

  ayuda: {
    fontSize: 12,
    color: Paleta.textoSuave,
    marginTop: 6,
  },

  /* -----------------------------
     CALENDARIO
     ----------------------------- */

  fondo: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  tarjeta: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Paleta.tarjeta,
    borderRadius: Radios.grande,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    ...Sombras.flotante,
  },

  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  flecha: {
    width: 40,
    height: 40,
    borderRadius: Radios.pastilla,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Paleta.primarioClaro,
  },

  tituloMes: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    color: Paleta.texto,
  },

  filaDias: {
    flexDirection: 'row',
    marginBottom: 4,
  },

  textoDia: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    color: Paleta.textoSuave,
    paddingVertical: 6,
  },

  rejilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  celda: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dia: {
    borderRadius: Radios.pastilla,
    marginVertical: 2,
  },

  diaHoy: {
    borderWidth: 1.5,
    borderColor: Paleta.acento,
  },

  diaSeleccionado: {
    backgroundColor: Paleta.primario,
  },

  diaBloqueado: {
    opacity: 0.35,
  },

  textoDiaNum: {
    fontSize: 15,
    fontWeight: '600',
    color: Paleta.texto,
  },

  textoDiaHoy: {
    color: Paleta.primarioOscuro,
    fontWeight: '800',
  },

  textoDiaSeleccionado: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  textoDiaBloqueado: {
    color: Paleta.textoSuave,
  },

  /* -----------------------------
     PIE
     ----------------------------- */

  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 10,
  },

  botonPie: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radios.pastilla,
    backgroundColor: Paleta.primarioClaro,
  },

  botonPieTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: Paleta.primario,
  },

  botonPieTextoOff: {
    color: Paleta.textoSuave,
  },

  botonCerrar: {
    backgroundColor: Paleta.primario,
  },

  botonCerrarTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
