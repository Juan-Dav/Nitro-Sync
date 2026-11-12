/*
=======================================================
NITRO SYNC - COMPATIBILIDAD DE Alert EN WEB
=======================================================

Problema:

  En React Native (Android/iOS), Alert.alert() muestra
  un cuadro de diálogo nativo y ejecuta el onPress del
  botón que el usuario toca.

  En React Native Web (expo start --web), Alert.alert()
  es una función VACÍA (no hace absolutamente nada).
  Por eso, en la versión web, botones como "Cerrar
  sesión" o "Eliminar vehículo" parecían no responder:
  el diálogo de confirmación nunca aparecía y su
  callback onPress nunca se ejecutaba.

Solución:

  Esta utilidad reemplaza Alert.alert() SOLO en web por
  una implementación basada en window.confirm / window.alert
  que respeta los botones y sus callbacks, imitando el
  comportamiento nativo.

  Se ejecuta una sola vez al arrancar la aplicación, por
  lo que TODAS las llamadas existentes a Alert.alert()
  siguen funcionando sin cambios.

=======================================================
*/

import { Alert, Platform } from 'react-native';

interface BotonAlerta {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface OpcionesAlerta {
  cancelable?: boolean;
  onDismiss?: () => void;
}

let instalado = false;

/*
Instala el polyfill. Es idempotente: si ya se instaló,
no hace nada.
*/
export function instalarAlertWeb(): void {
  if (instalado || Platform.OS !== 'web') {
    return;
  }

  const navegadorDisponible =
    typeof window !== 'undefined' && typeof window.confirm === 'function';

  if (!navegadorDisponible) {
    return;
  }

  /*
  JSDoc: firma compatible con Alert.alert(title, message, buttons, options)
  */
  Alert.alert = (
    title?: string,
    message?: string,
    buttons?: BotonAlerta[],
    options?: OpcionesAlerta
  ): void => {
    const texto = [title, message]
      .filter((parte) => parte !== undefined && parte !== null && parte !== '')
      .join('\n\n');

    /* Sin botones: alerta informativa simple. */
    if (!buttons || buttons.length === 0) {
      window.alert(texto);
      options?.onDismiss?.();
      return;
    }

    const botonCancelar = buttons.find(
      (boton) => boton.style === 'cancel'
    );

    /* Con un único botón (o sin cancelar): confirmación simple. */
    if (!botonCancelar) {
      window.alert(texto);
      const botonAceptar = buttons[buttons.length - 1];
      botonAceptar?.onPress?.();
      return;
    }

    /*
    Con botón de cancelar + acción: se usa confirm().
    Aceptar => onPress del botón NO cancelar.
    Cancelar => onPress del botón cancelar + onDismiss.
    */
    const botonAceptar =
      buttons.find((boton) => boton.style !== 'cancel') ?? botonCancelar;

    const aceptado = window.confirm(texto);

    if (aceptado) {
      botonAceptar.onPress?.();
    } else {
      botonCancelar.onPress?.();
      options?.onDismiss?.();
    }
  };

  instalado = true;
}
