/*
=======================================================
NITRO SYNC - GASTOS MENSUALES DEL VEHÍCULO
=======================================================

Sección del detalle del vehículo que:

  1. Genera automáticamente, al empezar cada mes, los seis
     costos típicos (SOAT, Tecnomecánica, Seguro, Lavado,
     Mantenimiento y Combustible) como gastos PENDIENTES.
  2. Deja que el usuario edite el valor de cada costo
     (valores sugeridos ajustables por vehículo).
  3. Muestra un visto a la DERECHA para confirmar si el
     costo ya se implementó/pagó.
  4. Suma el total gastado del mes con los confirmados.
  5. Guarda todo en Firestore (aparece en el historial) y
     al cambiar de mes reinicia el ciclo automáticamente.

Valores sugeridos: data/costosVehiculo.ts
Config por vehículo: services/costosVehiculo.ts
Gastos: servicios/{uid}/vehiculos/{id}/gastos

=======================================================
*/

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { Paleta, Radios, Sombras } from '@/constants/theme';

import {
  CONCEPTOS_COSTO,
  mesLegible,
  valorSugerido,
} from '@/data/costosVehiculo';

import { useAuth } from '@/context/AuthContext';
import { useVehiculos } from '@/context/VehiculosContext';

import { useRegistrosVehiculo } from '@/hooks/use-registros-vehiculo';

import {
  leerConfigCostos,
  guardarConfigCostos,
  type ConfigCostos,
} from '@/services/costosVehiculo';

import { actualizarGasto, crearGasto } from '@/services/gastos';

import type { Gasto, TipoVehiculo } from '@/types/models';

import { hoyISO } from '@/utils/fechas';

import { formatoDinero } from '@/utils/formato';

export interface GastosMensualesProps {
  vehiculoId: string;
  tipo: TipoVehiculo;
}

export default function GastosMensuales({
  vehiculoId,
  tipo,
}: GastosMensualesProps) {
  const { user } = useAuth();
  const { vehiculos } = useVehiculos();

  const { registros: gastos, cargando } = useRegistrosVehiculo<Gasto>(
    'gastos',
    vehiculoId,
    'fecha',
    'desc'
  );

  const [config, setConfig] = useState<ConfigCostos | null>(null);
  const [borradores, setBorradores] = useState<Record<string, string>>({});
  const [generando, setGenerando] = useState(false);
  const [aplicando, setAplicando] = useState(false);

  const mesActual = hoyISO().slice(0, 7);

  /* -------------------------------------------------
     CARGAR CONFIGURACIÓN DEL VEHÍCULO
     ------------------------------------------------- */

  useEffect(() => {
    if (!user || !vehiculoId) {
      return;
    }

    let activo = true;

    leerConfigCostos(user.uid, vehiculoId)
      .then((leida) => {
        if (activo) setConfig(leida);
      })
      .catch(() => {
        if (activo) setConfig({ valores: {}, mesGenerado: null });
      });

    return () => {
      activo = false;
    };
  }, [user, vehiculoId]);

  /* -------------------------------------------------
     GENERAR LOS COSTOS DEL MES (una sola vez por mes)
     ------------------------------------------------- */

  const generacionRef = useRef(false);

  useEffect(() => {
    if (!user || !vehiculoId || cargando || !config) {
      return;
    }

    /* Ya se generó este mes: no se repite. */
    if (config.mesGenerado === mesActual) {
      return;
    }

    if (generacionRef.current) {
      return;
    }

    generacionRef.current = true;

    const generar = async () => {
      setGenerando(true);

      try {
        const yaExisten = gastos.some(
          (gasto) => gasto.mes === mesActual && !!gasto.concepto
        );

        if (!yaExisten) {
          const hoy = hoyISO();

          for (const concepto of CONCEPTOS_COSTO) {
            const valor =
              config.valores[concepto.clave] ??
              valorSugerido(concepto, tipo);

            await crearGasto(user.uid, vehiculoId, {
              fecha: hoy,
              categoria: concepto.categoria,
              descripcion: `${concepto.nombre} · ${mesLegible(mesActual)}`,
              valor,
              concepto: concepto.clave,
              mes: mesActual,
              estado: 'pendiente',
            });
          }
        }

        await guardarConfigCostos(user.uid, vehiculoId, {
          mesGenerado: mesActual,
        });

        setConfig((actual) =>
          actual ? { ...actual, mesGenerado: mesActual } : actual
        );
      } catch {
        /* Se permite reintentar en el próximo render. */
        generacionRef.current = false;
      } finally {
        setGenerando(false);
      }
    };

    generar();
  }, [user, vehiculoId, cargando, config, gastos, mesActual, tipo]);

  /* -------------------------------------------------
     DATOS DEL MES ACTUAL
     ------------------------------------------------- */

  const itemsMes = useMemo(
    () =>
      gastos.filter(
        (gasto) => gasto.mes === mesActual && !!gasto.concepto
      ),
    [gastos, mesActual]
  );

  const porClave = useMemo(() => {
    const mapa: Record<string, Gasto> = {};

    itemsMes.forEach((gasto) => {
      if (gasto.concepto) {
        mapa[gasto.concepto] = gasto;
      }
    });

    return mapa;
  }, [itemsMes]);

  const totalPagado = itemsMes
    .filter((gasto) => gasto.estado === 'pagado')
    .reduce((total, gasto) => total + gasto.valor, 0);

  const totalPendiente = itemsMes
    .filter((gasto) => gasto.estado !== 'pagado')
    .reduce((total, gasto) => total + gasto.valor, 0);

  /* Historial: totales de meses anteriores. */

  const historial = useMemo(() => {
    const mapa = new Map<string, number>();

    gastos.forEach((gasto) => {
      const mes = gasto.mes ?? gasto.fecha.slice(0, 7);

      if (mes === mesActual) {
        return;
      }

      if (gasto.estado === 'pendiente') {
        return;
      }

      mapa.set(mes, (mapa.get(mes) ?? 0) + gasto.valor);
    });

    return Array.from(mapa.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 4);
  }, [gastos, mesActual]);

  /* -------------------------------------------------
     ACCIONES
     ------------------------------------------------- */

  const valorActual = (clave: string, valorSugeridoNumero: number): number => {
    return porClave[clave]?.valor ?? config?.valores[clave] ?? valorSugeridoNumero;
  };

  const marcar = async (gasto: Gasto, pagado: boolean) => {
    if (!user) return;

    try {
      await actualizarGasto(user.uid, vehiculoId, gasto.id, {
        estado: pagado ? 'pagado' : 'pendiente',
      });
    } catch {
      /* El listener de Firestore reflejará el estado real. */
    }
  };

  const cambiarBorrador = (clave: string, texto: string) => {
    setBorradores((actuales) => ({
      ...actuales,
      [clave]: texto.replace(/[^0-9]/g, ''),
    }));
  };

  const guardarValor = async (clave: string) => {
    const bruto = borradores[clave];

    if (bruto === undefined || !user) {
      return;
    }

    const valor = Number(bruto || '0');

    setBorradores((actuales) => {
      const copia = { ...actuales };
      delete copia[clave];
      return copia;
    });

    try {
      const valores = { ...(config?.valores ?? {}), [clave]: valor };

      await guardarConfigCostos(user.uid, vehiculoId, { valores });

      setConfig((actual) => (actual ? { ...actual, valores } : actual));

      const gasto = porClave[clave];

      if (gasto) {
        await actualizarGasto(user.uid, vehiculoId, gasto.id, { valor });
      }
    } catch {
      /* Se mantiene el valor anterior si falla. */
    }
  };

  /* Copia los valores de este vehículo a todos los demás. */
  const aplicarATodos = async () => {
    if (!user || vehiculos.length <= 1) {
      return;
    }

    setAplicando(true);

    try {
      const valores = config?.valores ?? {};

      await Promise.all(
        vehiculos
          .filter((vehiculo) => vehiculo.id !== vehiculoId)
          .map((vehiculo) =>
            guardarConfigCostos(user.uid, vehiculo.id, { valores })
          )
      );
    } catch {
      /* Si falla algún vehículo, se conserva el resto. */
    } finally {
      setAplicando(false);
    }
  };

  /* -------------------------------------------------
     INTERFAZ
     ------------------------------------------------- */

  const cargandoTotal = cargando || generando;

  return (
    <View style={styles.tarjeta}>
      <View style={styles.encabezado}>
        <View style={styles.encabezadoTexto}>
          <Text style={styles.titulo}>
            Gastos del mes · {mesLegible(mesActual)}
          </Text>

          <Text style={styles.subtitulo}>
            Confirma con el visto los costos que ya pagaste.
          </Text>
        </View>

        <View style={styles.totalCaja}>
          <Text style={styles.totalEtiqueta}>Gastado</Text>

          <Text style={styles.totalValor}>{formatoDinero(totalPagado)}</Text>
        </View>
      </View>

      {cargandoTotal && itemsMes.length === 0 ? (
        <View style={styles.cargando}>
          <ActivityIndicator color={Paleta.primario} />

          <Text style={styles.cargandoTexto}>
            Preparando los costos del mes...
          </Text>
        </View>
      ) : (
        <>
          {CONCEPTOS_COSTO.map((concepto) => {
            const gasto = porClave[concepto.clave];
            const pagado = gasto?.estado === 'pagado';
            const sugerido = valorSugerido(concepto, tipo);

            const valor = valorActual(concepto.clave, sugerido);

            const textoBorrador =
              borradores[concepto.clave] ?? String(valor);

            return (
              <View key={concepto.clave} style={styles.fila}>
                <Text style={styles.filaIcono}>{concepto.icono}</Text>

                <View style={styles.filaInfo}>
                  <Text style={styles.filaNombre}>{concepto.nombre}</Text>

                  <View style={styles.valorFila}>
                    <Text style={styles.valorSigno}>$</Text>

                    <TextInput
                      style={styles.valorInput}
                      value={textoBorrador}
                      onChangeText={(texto) =>
                        cambiarBorrador(concepto.clave, texto)
                      }
                      onEndEditing={() => guardarValor(concepto.clave)}
                      keyboardType="number-pad"
                      maxLength={9}
                      accessibilityLabel={`Valor de ${concepto.nombre}`}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => gasto && marcar(gasto, !pagado)}
                  disabled={!gasto}
                  activeOpacity={0.8}
                  style={[
                    styles.visto,
                    pagado && styles.vistoActivo,
                    !gasto && styles.vistoBloqueado,
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: pagado }}
                  accessibilityLabel={
                    pagado
                      ? `Marcar ${concepto.nombre} como pendiente`
                      : `Confirmar ${concepto.nombre} como pagado`
                  }
                >
                  <Ionicons
                    name={pagado ? 'checkmark' : 'checkmark-outline'}
                    size={18}
                    color={pagado ? '#FFFFFF' : Paleta.textoSuave}
                  />
                </TouchableOpacity>
              </View>
            );
          })}

          {/* RESUMEN DEL MES */}

          <View style={styles.resumen}>
            <Text style={styles.resumenTexto}>
              Confirmado: {formatoDinero(totalPagado)}
            </Text>

            <Text style={styles.resumenTexto}>
              Pendiente: {formatoDinero(totalPendiente)}
            </Text>
          </View>

          <Text style={styles.nota}>
            Los valores sugeridos aplican a todos tus vehículos; si cambias uno
            aquí, solo cambia para este vehículo.
          </Text>

          {vehiculos.length > 1 && (
            <TouchableOpacity
              style={styles.botonSecundario}
              onPress={aplicarATodos}
              disabled={aplicando}
              accessibilityRole="button"
              accessibilityLabel="Aplicar estos valores a todos mis vehículos"
            >
              <Ionicons
                name="copy-outline"
                size={16}
                color={Paleta.primario}
              />

              <Text style={styles.botonSecundarioTexto}>
                {aplicando
                  ? 'Aplicando...'
                  : 'Aplicar estos valores a todos mis vehículos'}
              </Text>
            </TouchableOpacity>
          )}

          {/* HISTORIAL POR MES */}

          {historial.length > 0 && (
            <View style={styles.historial}>
              <Text style={styles.historialTitulo}>Historial por mes</Text>

              {historial.map(([mes, total]) => (
                <View key={mes} style={styles.historialFila}>
                  <Text style={styles.historialMes}>{mesLegible(mes)}</Text>

                  <Text style={styles.historialValor}>
                    {formatoDinero(total)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

/* -------------------------------------------------------
   ESTILOS
   ------------------------------------------------------- */

const styles = StyleSheet.create({
  tarjeta: {
    backgroundColor: Paleta.tarjeta,
    borderRadius: Radios.tarjeta,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    ...Sombras.tarjeta,
  },

  encabezado: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },

  encabezadoTexto: {
    flex: 1,
  },

  titulo: {
    fontSize: 15,
    fontWeight: '800',
    color: Paleta.texto,
  },

  subtitulo: {
    fontSize: 12,
    color: Paleta.textoSecundario,
    marginTop: 3,
  },

  totalCaja: {
    alignItems: 'flex-end',
    backgroundColor: Paleta.primarioClaro,
    borderRadius: Radios.suave,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  totalEtiqueta: {
    fontSize: 10,
    fontWeight: '800',
    color: Paleta.primario,
    textTransform: 'uppercase',
  },

  totalValor: {
    fontSize: 15,
    fontWeight: '800',
    color: Paleta.primarioOscuro,
  },

  cargando: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
  },

  cargandoTexto: {
    fontSize: 13,
    color: Paleta.textoSecundario,
  },

  /* -----------------------------
     FILAS
     ----------------------------- */

  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  filaIcono: {
    fontSize: 18,
  },

  filaInfo: {
    flex: 1,
  },

  filaNombre: {
    fontSize: 14,
    fontWeight: '700',
    color: Paleta.texto,
  },

  valorFila: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  valorSigno: {
    fontSize: 14,
    fontWeight: '700',
    color: Paleta.textoSecundario,
    marginRight: 2,
  },

  valorInput: {
    minWidth: 90,
    paddingVertical: 2,
    fontSize: 14,
    fontWeight: '700',
    color: Paleta.texto,
  },

  visto: {
    width: 38,
    height: 38,
    borderRadius: Radios.pastilla,
    borderWidth: 1.5,
    borderColor: Paleta.borde,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Paleta.fondo,
  },

  vistoActivo: {
    backgroundColor: Paleta.exito,
    borderColor: Paleta.exito,
  },

  vistoBloqueado: {
    opacity: 0.4,
  },

  /* -----------------------------
     RESUMEN Y HISTORIAL
     ----------------------------- */

  resumen: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  resumenTexto: {
    fontSize: 12,
    fontWeight: '700',
    color: Paleta.textoSecundario,
  },

  nota: {
    fontSize: 11,
    color: Paleta.textoSuave,
    marginTop: 8,
    lineHeight: 16,
  },

  botonSecundario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: Paleta.primarioClaro,
    borderRadius: Radios.pastilla,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },

  botonSecundarioTexto: {
    fontSize: 12,
    fontWeight: '700',
    color: Paleta.primario,
  },

  historial: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  historialTitulo: {
    fontSize: 13,
    fontWeight: '800',
    color: Paleta.texto,
    marginBottom: 6,
  },

  historialFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },

  historialMes: {
    fontSize: 13,
    color: Paleta.textoSecundario,
    fontWeight: '600',
  },

  historialValor: {
    fontSize: 13,
    color: Paleta.texto,
    fontWeight: '800',
  },
});
