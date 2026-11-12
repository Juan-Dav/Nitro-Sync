import { useMemo } from 'react';

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Paleta, Radios, sombraDura } from '@/constants/theme';
import { useVehiculos } from '@/context/VehiculosContext';
import { resumirVehiculos } from '@/utils/admin';

export default function MisSegurosResumen() {
  const { vehiculos } = useVehiculos();

  const resumen = useMemo(() => resumirVehiculos(vehiculos), [vehiculos]);

  if (vehiculos.length === 0) {
    return null;
  }

  const necesitaAtencion = resumen.sinSeguro + resumen.porRenovar > 0;

  return (
    <TouchableOpacity
      style={styles.tarjeta}
      activeOpacity={0.9}
      onPress={() => router.push('/mis-seguros')}
      accessibilityRole="button"
      accessibilityLabel="Abrir mis seguros"
    >
      <View style={styles.icono}>
        <Ionicons name="shield-checkmark" size={24} color={Paleta.tinta} />
      </View>

      <View style={styles.textos}>
        <Text style={styles.titulo}>Mis seguros</Text>
        <Text style={styles.detalle}>
          {resumen.conSeguro} de {resumen.total} asegurados
          {resumen.porRenovar > 0 ? ` • ${resumen.porRenovar} por renovar` : ''}
        </Text>
        <Text style={styles.accion}>
          {necesitaAtencion
            ? 'Pide tu cotización o renovación'
            : 'Todo al día'}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color={Paleta.tinta} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Paleta.acento,
    borderRadius: Radios.tarjeta,
    borderWidth: 2,
    borderColor: Paleta.tinta,
    padding: 14,
    marginBottom: 16,
    ...sombraDura(4, 4),
  },
  icono: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Paleta.tarjeta,
    borderWidth: 2,
    borderColor: Paleta.tinta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1 },
  titulo: { fontSize: 16, fontWeight: '900', color: Paleta.tinta },
  detalle: { fontSize: 12, fontWeight: '700', color: Paleta.tinta, opacity: 0.8 },
  accion: { fontSize: 12, fontWeight: '800', color: Paleta.tinta, marginTop: 2 },
});
