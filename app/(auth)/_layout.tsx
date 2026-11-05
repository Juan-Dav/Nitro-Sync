/*
=======================================================
NITRO SYNC - NAVEGACIÓN DE AUTENTICACIÓN
=======================================================

Este Stack agrupa las pantallas que se muestran
CUANDO NO EXISTE SESIÓN:

  /login    -> Inicio de sesión
  /register -> Crear cuenta

El grupo (auth) es protegido en app/_layout.tsx:

  Sin sesión  -> se muestra este grupo
  Con sesión  -> se muestran las pestañas (tabs)

Los encabezados nativos están ocultos porque cada
pantalla ya incluye su propio diseño de tarjeta.
=======================================================
*/

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ title: 'Iniciar sesión' }} />

      <Stack.Screen name="register" options={{ title: 'Crear cuenta' }} />
    </Stack>
  );
}
