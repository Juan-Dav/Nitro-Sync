# Nitro Sync

Aplicación móvil (Expo + React Native) para llevar el control total de tus
vehículos: documentos, mantenimientos, recordatorios, gastos y seguro.

## Qué incluye

- **Garaje**: carros y motos con foto automática según marca y modelo.
- **Documentos**: SOAT, tecnomecánica y seguro con estado (vigente, próximo a
  vencer o vencido) y notificaciones locales.
- **Mantenimientos**: historial con costos y control del cambio de aceite por
  kilometraje.
- **Recordatorios**: avisos 30, 15, 7 y 1 día antes de la fecha.
- **Gastos**: costos mensuales automáticos y gastos propios.
- **Seguro**: aseguradora, póliza, teléfono de asistencia y vencimiento.
- **Directorio de aseguradoras**: 11 aseguradoras de Colombia con teléfono,
  WhatsApp y portal web. Incluye el listado en Excel.
- **Carga masiva**: importa muchos vehículos de una vez desde un Excel, con su
  aseguradora, póliza y vencimiento del seguro (Ajustes > Importar desde Excel).

- **Roles**: administrador (ve todos los vehículos afiliados, filtra por aseguradora y asigna seguros) y usuario (ve su garaje y su aseguradora).
- **Encuesta de opinión**: el usuario califica la app y el administrador ve los resultados en tiempo real.

## Empezar

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Arranca la app:

   ```bash
   npx expo start
   ```

   Desde la terminal puedes abrir la app en Expo Go, un emulador de Android o
   el simulador de iOS.

## Scripts útiles

| Comando                     | Qué hace                                              |
| --------------------------- | ----------------------------------------------------- |
| `npm run web`               | Abre la versión web.                                  |
| `npm run probar:imagenes`   | Prueba la búsqueda automática de fotos de vehículos.  |
| `npm run excel:aseguradoras`| Regenera `assets/documentos/aseguradoras.xlsx`.       |
| `npm run excel:carga-masiva`| Regenera el Excel de ejemplo (50 vehículos) y la plantilla de carga masiva. |
| `npm run lint`              | Revisa el código con ESLint.                          |

## Imágenes automáticas

`lib/busquedaImagenVehiculo.ts` busca fotos en Wikimedia Commons y Wikipedia,
descarta logos/interiores y normaliza las URLs a través de un proxy de imágenes
para que se vean también en Android.

## Carga masiva desde Excel

1. En **Ajustes > Importar desde Excel** elige un `.xlsx` (o usa los 50 datos de
   ejemplo que trae la app).
2. Columnas: `Nombre, Tipo, Marca, Modelo, Año, Placa, Color, Kilometraje,
   Aseguradora, Teléfono aseguradora, N° póliza, Vencimiento seguro`.
3. Se muestra una vista previa con filas correctas, con error y repetidas
   (misma placa). Solo se importan las correctas, en lotes de 400, hasta 500 por
   archivo.

Archivos: `assets/documentos/carga-masiva-ejemplo.xlsx` y
`assets/documentos/plantilla-carga-masiva.xlsx`. La validación vive en
`utils/cargaMasiva.ts` y el guardado en `services/cargaMasiva.ts`.

## Estructura

- `app/` — pantallas (expo-router).
- `components/` — componentes reutilizables (`ui/boton-nitro.tsx`, tarjetas...).
- `constants/theme.ts` — colores, gradientes, sombras y radios de Nitro Sync.
- `data/` — aseguradoras y costos locales.
- `services/` — Firestore y notificaciones.
- `scripts/` — utilidades de desarrollo (Excel, pruebas de imágenes, red).

## Roles y encuesta

### Crear un administrador

1. Crea la cuenta con **Crear una cuenta** (o en Firebase Authentication) y copia su UID.
2. En Firestore crea la colección `administradores` y un documento con ese UID como ID (por ejemplo, con el campo `activo: true`).
3. Publica `firestore.rules` en la consola de Firebase.
4. En el login elige **Administrador** e ingresa con esa cuenta.

Solo existe un administrador si su UID está en `administradores`. Desde la app nadie puede darse ese rol.

### Qué ve cada rol

| Rol | Pestañas | Qué puede hacer |
| --- | --- | --- |
| Administrador | Panel, Opiniones, Ajustes | Ver todos los vehículos, filtrar por aseguradora, tipo, sin seguro o por renovar, abrir el detalle y asignar o renovar el seguro. |
| Usuario | Inicio, Explorar, Opinión, Ajustes | Ver sus vehículos y su aseguradora, y responder la encuesta. |

### Datos nuevos

- `opiniones/{uid}`: una respuesta por usuario (se puede actualizar).
- Vehículo: `seguroAsignadoPor` y `seguroAsignadoFecha` cuando el seguro lo asigna un administrador.

Archivos principales: `app/(tabs)/panel.tsx`, `app/admin/vehiculo.tsx`, `app/(tabs)/opinion.tsx`, `app/(tabs)/opiniones.tsx`, `services/admin.ts`, `services/opiniones.ts`, `services/roles.ts` y `utils/admin.ts`.
