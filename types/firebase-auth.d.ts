/*
=======================================================
NITRO SYNC - TIPO ADICIONAL DE FIREBASE AUTH
=======================================================

En Firebase JS SDK v12, la función
getReactNativePersistence() sí está exportada por la
build de React Native de firebase/auth (por eso funciona
en tiempo de ejecución), pero NO aparece en los tipos
públicos del paquete.

Esta declaración añade el tipo faltante para que
TypeScript reconozca la función utilizada en
firebaseConfig.ts:

  initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });

=======================================================
*/

export {};

declare module 'firebase/auth' {
  /*
  Objeto compatible con AsyncStorage de
  @react-native-async-storage/async-storage.
  */
  export function getReactNativePersistence(appStorage: {
    getItem(key: string): string | null | Promise<string | null>;
    setItem(key: string, value: string): void | Promise<void>;
    removeItem(key: string): void | Promise<void>;
  }): import('firebase/auth').Persistence;
}
