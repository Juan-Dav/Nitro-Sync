/*
=======================================================
NITRO SYNC - ERRORES DE FIRESTORE AMIGABLES
=======================================================

Firestore devuelve códigos técnicos. Esta función los
traduce a mensajes claros para que la persona sepa qué
hacer (publicar reglas, crear la base de datos, etc.).

Se comparte entre vehículos, documentos y las demás
colecciones.

=======================================================
*/

export function describirErrorFirestore(
  error: Error & { code?: string }
): string {
  switch (error.code) {
    case 'permission-denied':
      return (
        'Firestore rechazó la consulta. Publica las reglas de ' +
        'seguridad (firestore.rules) en la consola de Firebase.'
      );

    case 'failed-precondition':
      return (
        'Firestore no está creado. Crea la base de datos en la ' +
        'consola de Firebase (Firestore Database → Crear base).'
      );

    case 'unavailable':
      return 'Sin conexión con Firestore. Revisa tu conexión a internet.';

    default:
      return 'No fue posible cargar los datos de Firestore.';
  }
}
