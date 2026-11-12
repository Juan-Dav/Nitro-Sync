/*
========================================================
NITRO SYNC - NAVEGACIÓN POR PESTAÑAS (TABS)
========================================================

El Tabs Navigator mantiene varias secciones disponibles
en la parte inferior. Al tocar una pestaña cambiamos de
pantalla SIN perder el estado de la anterior.

Pestañas de la aplicación:
  - Inicio   (index)   -> Buscador, vehículos, resumen
                          y acciones rápidas.
  - Explorar (explore) -> Listado completo de vehículos.

Los íconos se toman de @expo/vector-icons (Ionicons) y
cambian de color cuando la pestaña está activa.
========================================================
*/

import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { Paleta } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useSolicitudesPendientes } from '@/hooks/use-solicitudes-pendientes';

export default function TabsLayout() {
  const { esAdmin } = useAuth();
  const pendientes = useSolicitudesPendientes(esAdmin);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Paleta.primario,
        tabBarInactiveTintColor: Paleta.textoSuave,
        tabBarStyle: {
          backgroundColor: Paleta.tarjeta,
          borderTopWidth: 2,
          borderTopColor: Paleta.tinta,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
          letterSpacing: 0.3,
        },
      }}
    >
      {/* PESTAÑA: INICIO */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          headerShown: false,
          href: esAdmin ? null : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={size}
              color={color == null || typeof color === 'number' ? undefined : color}
            />
          ),
        }}
      />

      {/* PESTAÑA: EXPLORAR */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explorar',
          headerShown: false,
          href: esAdmin ? null : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'car-sport' : 'car-sport-outline'}
              size={size}
              color={color == null || typeof color === 'number' ? undefined : color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="panel"
        options={{
          title: 'Panel',
          headerShown: false,
          href: esAdmin ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'}
              size={size}
              color={color == null || typeof color === 'number' ? undefined : color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="solicitudes"
        options={{
          title: 'Solicitudes',
          headerShown: false,
          href: esAdmin ? undefined : null,
          tabBarBadge: pendientes > 0 ? pendientes : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'mail-unread' : 'mail-unread-outline'}
              size={size}
              color={color == null || typeof color === 'number' ? undefined : color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="opiniones"
        options={{
          title: 'Opiniones',
          headerShown: false,
          href: esAdmin ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'stats-chart' : 'stats-chart-outline'}
              size={size}
              color={color == null || typeof color === 'number' ? undefined : color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="opinion"
        options={{
          title: 'Opinión',
          headerShown: false,
          href: esAdmin ? null : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'star' : 'star-outline'}
              size={size}
              color={color == null || typeof color === 'number' ? undefined : color}
            />
          ),
        }}
      />

      {/* PESTAÑA: AJUSTES */}
      <Tabs.Screen
        name="ajustes"
        options={{
          title: 'Ajustes',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              size={size}
              color={color == null || typeof color === 'number' ? undefined : color}
            />
          ),
        }}
      />
    </Tabs>
  );
}