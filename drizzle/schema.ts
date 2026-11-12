import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
  serial,
  date,
} from "drizzle-orm/pg-core";

/**
 * Enums
 */
export const roleEnum = pgEnum("role", ["user", "admin", "superadmin"]);
export const estadoHabilitacionEnum = pgEnum("estado_habilitacion", [
  "vigente",
  "vencida",
  "en_tramite",
  "suspendida",
]);
export const tipoSeguimientoEnum = pgEnum("tipo_seguimiento", [
  "visita",
  "reporte_vulnerabilidad",
  "control_medico",
  "entrevista_social",
  "otro",
]);
export const tipoAlertaEnum = pgEnum("tipo_alerta", [
  "falta_medicacion",
  "salud_critica",
  "abandono",
  "abuso_economico",
  "abuso_psicologico",
  "abuso_fisico",
  "otro",
]);
export const prioridadEnum = pgEnum("prioridad", ["baja", "media", "alta", "critica"]);
export const estadoAlertaEnum = pgEnum("estado_alerta", ["pendiente", "en_atencion", "resuelta"]);
export const estadoDerivacionEnum = pgEnum("estado_derivacion", [
  "iniciada",
  "en_tramite",
  "finalizada",
  "archivada",
]);

/**
 * Usuarios del sistema.
 * El identificador único es el DNI de la persona (columna "id"), no un número autogenerado.
 */
export const users = pgTable("users", {
  id: varchar("id", { length: 20 }).primaryKey(), // DNI del operador/a
  nombre: varchar("nombre", { length: 150 }).notNull(),
  apellido: varchar("apellido", { length: 150 }).notNull(),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  // false = usuario congelado (baja, licencia, etc.): no puede iniciar sesión
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Residencias de larga estadía
 */
export const residencias = pgTable("residencias", {
  id: serial("id").primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  direccion: text("direccion").notNull(),
  telefono: varchar("telefono", { length: 50 }),
  email: varchar("email", { length: 320 }),
  responsable: varchar("responsable", { length: 255 }),
  nombreSolicitante: varchar("nombreSolicitante", { length: 255 }),
  dniSolicitante: varchar("dniSolicitante", { length: 50 }),
  nombreApoderado: varchar("nombreApoderado", { length: 255 }),
  dniApoderado: varchar("dniApoderado", { length: 50 }),
  capacidad: integer("capacidad").notNull(),
  ocupacionActual: integer("ocupacionActual").default(0).notNull(),
  estadoHabilitacion: estadoHabilitacionEnum("estadoHabilitacion").default("vigente").notNull(),

  fechaHabilitacion: date("fechaHabilitacion", { mode: "date" }),
  fechaVencimientoHabilitacion: date("fechaVencimientoHabilitacion", { mode: "date" }),

  observaciones: text("observaciones"),
  reqNota: boolean("reqNota").default(false),
  reqProyecto: boolean("reqProyecto").default(false),
  reqDniSolicitante: boolean("reqDniSolicitante").default(false),
  reqDniApoderado: boolean("reqDniApoderado").default(false),
  reqPlanos: boolean("reqPlanos").default(false),
  reqEvacuacion: boolean("reqEvacuacion").default(false),
  reqSeguro: boolean("reqSeguro").default(false),
  reqComidaAfip: boolean("reqComidaAfip").default(false),
  reqFotos: boolean("reqFotos").default(false),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Residencia = typeof residencias.$inferSelect;
export type InsertResidencia = typeof residencias.$inferInsert;

/**
 * Adultos Mayores.
 * Solo incluye los campos que existen hoy en el formulario de "Nueva Ficha Social".
 */
export const adultosMayores = pgTable("adultosMayores", {
  id: serial("id").primaryKey(),

  // --- Datos del expediente ---
  expediente: varchar("expediente", { length: 50 }).notNull().unique(),
  trabajadorSocial: varchar("trabajadorSocial", { length: 150 }),
  fechaFicha: date("fechaFicha", { mode: "date" }),

  // --- Datos del solicitante ---
  nombre: varchar("nombre", { length: 255 }).notNull(),
  apellido: varchar("apellido", { length: 255 }).notNull(),
  dni: varchar("dni", { length: 20 }).notNull().unique(),
  fechaNacimiento: date("fechaNacimiento", { mode: "date" }).notNull(),
  telefono: varchar("telefono", { length: 50 }),
  estadoCivil: varchar("estadoCivil", { length: 50 }),
  genero: varchar("genero", { length: 20 }),
  domicilio: text("domicilio"),
  barrio: varchar("barrio", { length: 100 }),
  localidad: varchar("localidad", { length: 100 }),

  // --- Datos socioeconómicos ---
  ocupacion: varchar("ocupacion", { length: 100 }),
  oficio: varchar("oficio", { length: 100 }),
  monto: varchar("monto", { length: 50 }),
  beneficioSocial: varchar("beneficioSocial", { length: 10 }),
  cualBeneficio: varchar("cualBeneficio", { length: 150 }),
  asistenciaPrevisional: varchar("asistenciaPrevisional", { length: 50 }),
  diaCobro: varchar("diaCobro", { length: 50 }),
  medioCobro: varchar("medioCobro", { length: 100 }),
  tarjetas: text("tarjetas"),
  prestamos: text("prestamos"),

  // --- Red familiar (lista de familiares, guardada como JSON) ---
  redFamiliar: text("redFamiliar"),

  // --- Vivienda ---
  tenenciaVivienda: varchar("tenenciaVivienda", { length: 100 }),
  tipoVivienda: varchar("tipoVivienda", { length: 100 }),
  situacionHabitacionalPersonas: integer("situacionHabitacionalPersonas"),
  situacionHabitacionalHabitaciones: integer("situacionHabitacionalHabitaciones"),
  materialParedes: varchar("materialParedes", { length: 255 }),
  materialPisos: varchar("materialPisos", { length: 255 }),
  materialTechos: varchar("materialTechos", { length: 255 }),
  bano: varchar("bano", { length: 255 }),
  cocina: varchar("cocina", { length: 255 }),
  servicioLuz: boolean("servicioLuz").default(false),
  servicioAgua: boolean("servicioAgua").default(false),
  servicioGas: boolean("servicioGas").default(false),

  // --- Salud y cierre ---
  obraSocial: varchar("obraSocial", { length: 255 }),
  numeroAfiliado: varchar("numeroAfiliado", { length: 100 }),
  enfermedad: varchar("enfermedad", { length: 255 }),
  sugerencia: text("sugerencia"),

  activo: boolean("activo").default(true).notNull(),
  fechaBaja: timestamp("fechaBaja"),
  motivoBaja: varchar("motivoBaja", { length: 30 }), // "fallecimiento" | "fraude" | "otro"
  motivoBajaDetalle: text("motivoBajaDetalle"), // se completa cuando motivoBaja = "otro"
  fechaFallecimiento: date("fechaFallecimiento", { mode: "date" }),
  actaDefuncion: text("actaDefuncion"), // archivo adjunto codificado en base64 (data URI)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type AdultoMayor = typeof adultosMayores.$inferSelect;
export type InsertAdultoMayor = typeof adultosMayores.$inferInsert;

/**
 * Seguimientos, Alertas y Derivaciones
 */
export const seguimientos = pgTable("seguimientos", {
  id: serial("id").primaryKey(),
  adultoMayorId: integer("adultoMayorId")
    .notNull()
    .references(() => adultosMayores.id),
  tipoSeguimiento: tipoSeguimientoEnum("tipoSeguimiento").notNull(),
  fecha: timestamp("fecha").defaultNow().notNull(),
  descripcion: text("descripcion").notNull(),
  observaciones: text("observaciones"),
  responsable: varchar("responsable", { length: 255 }).notNull(),
  userId: varchar("userId", { length: 20 })
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Seguimiento = typeof seguimientos.$inferSelect;
export type InsertSeguimiento = typeof seguimientos.$inferInsert;

export const alertas = pgTable("alertas", {
  id: serial("id").primaryKey(),
  adultoMayorId: integer("adultoMayorId")
    .notNull()
    .references(() => adultosMayores.id),
  userId: varchar("userId", { length: 20 })
    .notNull()
    .references(() => users.id),
  tipoAlerta: tipoAlertaEnum("tipoAlerta").notNull(),
  prioridad: prioridadEnum("prioridad").default("media").notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descripcion: text("descripcion").notNull(),
  estado: estadoAlertaEnum("estado").default("pendiente").notNull(),
  fechaDeteccion: timestamp("fechaDeteccion").defaultNow().notNull(),
  // Plazo máximo para resolverla (según prioridad). Null en alertas anteriores a este campo.
  fechaLimite: timestamp("fechaLimite"),
  fechaResolucion: timestamp("fechaResolucion"),
  responsableAtencion: varchar("responsableAtencion", { length: 255 }),
  observacionesResolucion: text("observacionesResolucion"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Alerta = typeof alertas.$inferSelect;
export type InsertAlerta = typeof alertas.$inferInsert;

export const derivaciones = pgTable("derivaciones", {
  id: serial("id").primaryKey(),
  adultoMayorId: integer("adultoMayorId")
    .notNull()
    .references(() => adultosMayores.id),
  fechaDerivacion: timestamp("fechaDerivacion").defaultNow().notNull(),
  motivo: text("motivo").notNull(),
  // "judicial" | "interna" | "externa"
  tipoDerivacion: varchar("tipoDerivacion", { length: 20 }).default("judicial").notNull(),
  // Solo para derivaciones internas/externas: a qué dependencia se deriva
  dependencia: varchar("dependencia", { length: 255 }),
  // Solo para derivaciones judiciales
  juzgado: varchar("juzgado", { length: 255 }),
  numeroExpediente: varchar("numeroExpediente", { length: 100 }),
  fiscalia: varchar("fiscalia", { length: 255 }),
  estadoDerivacion: estadoDerivacionEnum("estadoDerivacion").default("iniciada").notNull(),
  documentacionAdjunta: text("documentacionAdjunta"),
  observaciones: text("observaciones"),
  responsable: varchar("responsable", { length: 255 }).notNull(),
  userId: varchar("userId", { length: 20 })
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Derivacion = typeof derivaciones.$inferSelect;
export type InsertDerivacion = typeof derivaciones.$inferInsert;

/**
 * Auditoría: registro de movimientos de los usuarios (accesos y cambios).
 * No usa claves foráneas a propósito: el historial se conserva aunque se borre el usuario o el registro afectado.
 */
/**
 * Ficha firmada (PDF o imagen escaneada) de cada adulto mayor.
 * Se guarda en una tabla aparte para no cargar el archivo en los listados.
 */
export const fichasFirmadas = pgTable("fichas_firmadas", {
  id: serial("id").primaryKey(),
  adultoMayorId: integer("adultoMayorId")
    .notNull()
    .references(() => adultosMayores.id),
  nombreArchivo: varchar("nombreArchivo", { length: 255 }).notNull(),
  tipoMime: varchar("tipoMime", { length: 100 }).notNull(),
  tamano: integer("tamano").notNull(), // bytes del archivo ya codificado
  archivo: text("archivo").notNull(), // data URI en base64
  subidoPorId: varchar("subidoPorId", { length: 20 }),
  subidoPorNombre: varchar("subidoPorNombre", { length: 320 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Documentación digitalizada de cada residencia (un archivo por requisito del checklist,
 * más un "legajo" completo opcional). El requisito se considera cumplido cuando hay archivo cargado.
 */
export const residenciaDocumentos = pgTable("residencia_documentos", {
  id: serial("id").primaryKey(),
  residenciaId: integer("residenciaId")
    .notNull()
    .references(() => residencias.id),
  requisito: varchar("requisito", { length: 40 }).notNull(), // reqNota, reqProyecto, ... o "legajo"
  nombreArchivo: varchar("nombreArchivo", { length: 255 }).notNull(),
  tipoMime: varchar("tipoMime", { length: 100 }).notNull(),
  tamano: integer("tamano").notNull(),
  archivo: text("archivo").notNull(), // data URI en base64
  subidoPorId: varchar("subidoPorId", { length: 20 }),
  subidoPorNombre: varchar("subidoPorNombre", { length: 320 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const auditoria = pgTable("auditoria", {
  id: serial("id").primaryKey(),
  userId: varchar("userId", { length: 20 }),
  userNombre: varchar("userNombre", { length: 320 }),
  userRole: varchar("userRole", { length: 20 }),
  accion: varchar("accion", { length: 30 }).notNull(), // login, login_fallido, logout, crear, editar, eliminar, baja, otro
  modulo: varchar("modulo", { length: 50 }),
  entidadId: varchar("entidadId", { length: 50 }),
  detalle: text("detalle"),
  ip: varchar("ip", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Auditoria = typeof auditoria.$inferSelect;
export type InsertAuditoria = typeof auditoria.$inferInsert;

/**
 * Historial de ampliaciones de legajo
 */
export const ampliaciones = pgTable("ampliaciones", {
  id: serial("id").primaryKey(),
  adultoMayorId: integer("adulto_mayor_id").references(() => adultosMayores.id),
  expediente: varchar("expediente", { length: 50 }),
  trabajadorSocial: varchar("trabajador_social", { length: 100 }),
  fecha: date("fecha", { mode: "date" }),
  ocupacion: varchar("ocupacion", { length: 100 }),
  oficio: varchar("oficio", { length: 100 }),
  benefProgramaSocial: boolean("benef_programa_social").default(false),
  cualPrograma: varchar("cual_programa", { length: 100 }),
  asistPrevisional: varchar("asist_previsional", { length: 50 }),
  diaCobro: varchar("dia_cobro", { length: 50 }),
  medioCobro: varchar("medio_cobro", { length: 100 }),
  poseeTarjetas: boolean("posee_tarjetas").default(false),
  extensionANombreDe: varchar("extension_a_nombre_de", { length: 100 }),
  prestamos: varchar("prestamos", { length: 200 }),
  sugerencia: text("sugerencia"),
});

export type Ampliacion = typeof ampliaciones.$inferSelect;
export type InsertAmpliacion = typeof ampliaciones.$inferInsert;
