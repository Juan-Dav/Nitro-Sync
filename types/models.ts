/*
=======================================================
NITRO SYNC - MODELO DE DATOS (FIRESTORE)
=======================================================

ESTRUCTURA EN FIRESTORE

  usuarios/{uid}
  │
  ├── perfil del usuario (documento raíz)
  │
  └── vehiculos/{vehiculoId}
        │
        ├── documentos/{documentoId}     (SOAT, tecnomecánica, seguro...)
        ├── mantenimientos/{mantenimientoId}
        ├── recordatorios/{recordatorioId}
        └── gastos/{gastoId}

Cada usuario solo tiene datos bajo su propio uid, lo que
permite reglas de seguridad simples basadas en
request.auth.uid.

CONVENCIONES DE FECHAS

- Las fechas visibles (expedición, vencimiento, fecha de
  mantenimiento, etc.) se guardan como texto ISO:
  "AAAA-MM-DD". Así se comparan con orden alfabético y no
  necesitan conversiones de Timestamp.

- El estado de un documento NO se guarda: se calcula a
  partir de la fecha de vencimiento con la función
  calcularEstado() de utils/fechas.ts, para que nunca
  quede desactualizado.

=======================================================
*/

/* -------------------------------------------------------
   PERFIL DEL USUARIO
   ------------------------------------------------------- */

export interface Perfil {
  uid: string;
  email: string;
  fechaRegistro: string; // "AAAA-MM-DD"
}

/* -------------------------------------------------------
   VEHÍCULOS
   ------------------------------------------------------- */

export type TipoVehiculo = 'Carro' | 'Moto';

export interface Vehiculo {
  id: string; // id del documento en Firestore
  uid: string; // propietario (dueño del documento)

  nombre: string;
  marca: string;
  modelo: string;
  year: number;
  tipo: TipoVehiculo;
  placa: string;
  color: string;
  kilometraje: number;
  imagen: string;
  fechaRegistro: string; // "AAAA-MM-DD"

  /*
  SEGURO DEL VEHÍCULO (opcional).

  Se guardan juntos para no obligar al usuario a crear un
  documento aparte: la aseguradora, su teléfono de atención,
  el número de póliza y la fecha de vencimiento. El detalle
  del vehículo muestra una tarjeta con botón de llamada.
  */
  aseguradora?: string;
  telefonoAseguradora?: string;
  numeroPoliza?: string;
  vencimientoSeguro?: string; // "AAAA-MM-DD"
  seguroAsignadoPor?: string;
  seguroAsignadoFecha?: string; // "AAAA-MM-DD"
}

export type VehiculoAdmin = Vehiculo & { propietarioUid: string };

/*
Datos necesarios para crear un vehículo:
todo menos el id, que lo genera Firestore.
*/
export type NuevoVehiculo = Omit<Vehiculo, 'id'>;

/* -------------------------------------------------------
   DOCUMENTOS DEL VEHÍCULO
   (SOAT, tecnomecánica, seguro, licencia, otros)
   ------------------------------------------------------- */

export type TipoDocumento =
  | 'SOAT'
  | 'Tecnomecanica'
  | 'Seguro'
  | 'Licencia'
  | 'Otro';

export interface Documento {
  id: string;
  tipo: TipoDocumento;
  numero: string; // número de póliza, soat, etc. (si aplica)
  descripcion: string; // ej: "Seguros SURA", "SOAT 2026"
  expedicion: string; // "AAAA-MM-DD"
  vencimiento: string; // "AAAA-MM-DD"

  /*
  El estado NO se guarda en Firestore: se calcula en
  cada consulta con calcularEstado(vencimiento),
  para que nunca quede desactualizado.
  */
}

/*
Datos necesarios para crear un documento:
todo menos el id, que lo genera Firestore.
*/
export type NuevoDocumento = Omit<Documento, 'id'>;

/* -------------------------------------------------------
   ESTADOS DE DOCUMENTO (conceptuales)
   ------------------------------------------------------- */

export type EstadoDocumento =
  | 'Vigente' // aún tiene tiempo
  | 'Proximo a vencer' // dentro del umbral (30 días)
  | 'Vencido'; // ya venció

/* -------------------------------------------------------
   MANTENIMIENTOS
   ------------------------------------------------------- */

export type TipoMantenimiento =
  | 'Cambio de aceite'
  | 'Filtro de aceite'
  | 'Filtro de aire'
  | 'Frenos'
  | 'Llantas'
  | 'Batería'
  | 'Kit de arrastre'
  | 'Cadena'
  | 'Refrigerante'
  | 'Bujías'
  | 'Mantenimiento general'
  | 'Otro';

export interface Mantenimiento {
  id: string;
  tipo: TipoMantenimiento;
  fecha: string; // "AAAA-MM-DD"
  kilometraje: number;
  costo: number;
  descripcion: string;
  taller: string;
  observaciones: string;
}

export type NuevoMantenimiento = Omit<Mantenimiento, 'id'>;

/* -------------------------------------------------------
   RECORDATORIOS
   ------------------------------------------------------- */

export type EstadoRecordatorio =
  | 'Pendiente'
  | 'Proximo'
  | 'Vencido'
  | 'Completado';

export interface Recordatorio {
  id: string;
  titulo: string;
  descripcion: string;
  fecha: string; // "AAAA-MM-DD"
  estado: EstadoRecordatorio;
}

export type NuevoRecordatorio = Omit<Recordatorio, 'id'>;

/* -------------------------------------------------------
   GASTOS
   ------------------------------------------------------- */

export type CategoriaGasto =
  | 'Mantenimiento'
  | 'Combustible'
  | 'Repuestos'
  | 'SOAT'
  | 'Seguro'
  | 'Tecnomecanica'
  | 'Lavado'
  | 'Otros';

export interface Gasto {
  id: string;
  fecha: string; // "AAAA-MM-DD"
  categoria: CategoriaGasto;
  descripcion: string;
  valor: number;

  /*
  Campos de los GASTOS MENSUALES automáticos (opcionales:
  los gastos escritos a mano no los llevan).

  - concepto: clave del costo (soat, combustible, ...).
  - mes: mes al que pertenece en formato "AAAA-MM".
  - estado: 'pendiente' (aún no confirmado por el usuario)
            o 'pagado' (confirmado con el visto a la
            derecha en la pantalla del vehículo).
  */
  concepto?: string;
  mes?: string;
  estado?: 'pendiente' | 'pagado';
}

export type NuevoGasto = Omit<Gasto, 'id'>;


export type CaracteristicaFavorita =
  | 'Garaje'
  | 'Documentos'
  | 'Recordatorios'
  | 'Gastos'
  | 'Seguros'
  | 'Carga masiva';

export interface Opinion {
  uid: string;
  email: string;
  calificacion: number;
  facilidad: number;
  diseno: number;
  utilidad: number;
  recomienda: boolean;
  favorita: CaracteristicaFavorita | '';
  comentario: string;
  fecha: string; // "AAAA-MM-DD"
}

export type NuevaOpinion = Omit<Opinion, 'uid' | 'email' | 'fecha'>;
