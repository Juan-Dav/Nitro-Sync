/*
=======================================================
NITRO SYNC - CONFIGURACIÓN DE FIREBASE
=======================================================

Este archivo centraliza la conexión con el proyecto
Firebase "servicio-vehicular-7bc23".

Exporta:

  app -> Instancia de la aplicación Firebase.
  auth -> Autenticación con persistencia de sesión.
  db  -> Firestore (base de datos principal).

IMPORTANTE - PERSISTENCIA DE SESIÓN:

En React Native, getAuth() NO conserva la sesión al
cerrar la aplicación. Por eso se utiliza
initializeAuth() con getReactNativePersistence()
y AsyncStorage, de modo que la sesión del usuario
permanezca después de cerrar y volver a abrir la app.

NOTA:

No se utiliza getAnalytics() porque Firebase Analytics
no está soportado en el entorno de React Native.

=======================================================
*/

import { initializeApp, FirebaseApp } from 'firebase/app';

import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  Auth,
} from 'firebase/auth';

import { getFirestore, Firestore } from 'firebase/firestore';

import AsyncStorage from '@react-native-async-storage/async-storage';

/*
=======================================================
CONFIGURACIÓN DEL PROYECTO
Obtenida de la consola de Firebase.
=======================================================
*/

const firebaseConfig = {
  apiKey: 'AIzaSyBytmFsq_f9cJ7w6cyUZJisG3KD5StG2gU',
  authDomain: 'servicio-vehicular-7bc23.firebaseapp.com',
  projectId: 'servicio-vehicular-7bc23',
  storageBucket: 'servicio-vehicular-7bc23.firebasestorage.app',
  messagingSenderId: '334135500058',
  appId: '1:334135500058:web:bae1ac25b735ef95b760a3',
  measurementId: 'G-V3S1BN71GM',
};

/*
=======================================================
INSTANCIA DE FIREBASE
=======================================================
*/

export const app: FirebaseApp = initializeApp(firebaseConfig);

/*
=======================================================
AUTENTICACIÓN CON PERSISTENCIA
=======================================================

initializeAuth() configura Firebase Authentication
utilizando AsyncStorage para conservar la sesión.

Si el módulo ya fue inicializado (por ejemplo durante
un recargado rápido de desarrollo), se reutiliza la
instancia existente con getAuth() para evitar errores.
=======================================================
*/

function inicializarAuth(): Auth {
  /*
  En el navegador (expo start --web) la build de
  Firebase no incluye getReactNativePersistence,
  por lo que se usa getAuth() con la persistencia
  propia del navegador (localStorage).
  */

  if (typeof getReactNativePersistence !== 'function') {
    return getAuth(app);
  }

  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error: any) {
    if (error?.code === 'auth/already-initialized') {
      return getAuth(app);
    }

    throw error;
  }
}

export const auth: Auth = inicializarAuth();

/*
=======================================================
FIRESTORE
=======================================================

Base de datos principal de Nitro Sync.
Se utiliza el SDK oficial de Firebase, nunca fetch.
=======================================================
*/

export const db: Firestore = getFirestore(app);
