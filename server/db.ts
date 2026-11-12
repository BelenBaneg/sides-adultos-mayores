import { eq, desc, and, lt, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  InsertUser,
  users,
  residencias,
  InsertResidencia,
  Residencia,
  adultosMayores,
  InsertAdultoMayor,
  AdultoMayor,
  seguimientos,
  InsertSeguimiento,
  Seguimiento,
  alertas,
  InsertAlerta,
  Alerta,
  derivaciones,
  InsertDerivacion,
  Derivacion,
  ampliaciones,
  InsertAmpliacion,
  auditoria,
  InsertAuditoria,
  fichasFirmadas,
  residenciaDocumentos,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER FUNCTIONS ============
// El identificador de un usuario es su DNI (columna "id", tipo texto).

export async function createUser(
  data: Omit<InsertUser, "loginMethod" | "createdAt" | "updatedAt" | "lastSignedIn"> & { passwordHash: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [inserted] = await db
    .insert(users)
    .values({
      id: data.id,
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      passwordHash: data.passwordHash,
      loginMethod: "local",
      role: data.role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    })
    .returning();
  return inserted;
}

// ============ AUDITORÍA ============

// Nunca debe romper la operación principal: si falla el registro, solo se informa por consola.
export async function registrarAuditoria(data: InsertAuditoria): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(auditoria).values(data);
  } catch (error) {
    console.error("[Auditoría] No se pudo registrar el movimiento:", error);
  }
}

export async function listarAuditoria(limit = 500) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(auditoria).orderBy(desc(auditoria.createdAt)).limit(limit);
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(users);
}

export async function updateUser(id: string, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(users).set(data).where(eq(users.id, id));
}

export async function deleteUser(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(users).where(eq(users.id, id));
}

export async function getUserById(id: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function touchLastSignedIn(id: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, id));
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user by email: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ RESIDENCIAS FUNCTIONS ============

export async function createResidencia(data: InsertResidencia): Promise<Residencia> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [inserted] = await db.insert(residencias).values(data).returning();
  return inserted;
}

export async function getAllResidencias(): Promise<Residencia[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(residencias).where(eq(residencias.activo, true)).orderBy(desc(residencias.createdAt));
}

export async function getResidenciaById(id: number): Promise<Residencia | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(residencias).where(eq(residencias.id, id)).limit(1);
  return result[0];
}

export async function updateResidencia(id: number, data: Partial<InsertResidencia>): Promise<Residencia | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(residencias).set(data).where(eq(residencias.id, id));
  return await getResidenciaById(id);
}

export async function deleteResidencia(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(residencias).set({ activo: false }).where(eq(residencias.id, id));
}

// ============ ADULTOS MAYORES FUNCTIONS ============

export async function createAdultoMayor(data: InsertAdultoMayor): Promise<AdultoMayor> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [inserted] = await db.insert(adultosMayores).values(data).returning();
  return inserted;
}

export async function getAllAdultosMayores(): Promise<AdultoMayor[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(adultosMayores).where(eq(adultosMayores.activo, true)).orderBy(desc(adultosMayores.createdAt));
}

// Incluye también las fichas dadas de baja (activo = false). Se usa para Estadísticas.
export async function getTodosAdultosMayores(): Promise<AdultoMayor[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(adultosMayores).orderBy(desc(adultosMayores.createdAt));
}

export async function getAdultoMayorById(id: number): Promise<AdultoMayor | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(adultosMayores).where(eq(adultosMayores.id, id)).limit(1);
  return result[0];
}

export async function updateAdultoMayor(id: number, data: Partial<InsertAdultoMayor>): Promise<AdultoMayor | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(adultosMayores).set(data).where(eq(adultosMayores.id, id));
  return await getAdultoMayorById(id);
}

// Elimina la ficha y TODO lo relacionado (seguimientos, alertas, derivaciones, ampliaciones). Es irreversible.
export async function deleteAdultoMayor(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(ampliaciones).where(eq(ampliaciones.adultoMayorId, id));
  await db.delete(seguimientos).where(eq(seguimientos.adultoMayorId, id));
  await db.delete(alertas).where(eq(alertas.adultoMayorId, id));
  await db.delete(derivaciones).where(eq(derivaciones.adultoMayorId, id));
  await db.delete(fichasFirmadas).where(eq(fichasFirmadas.adultoMayorId, id));
  await db.delete(adultosMayores).where(eq(adultosMayores.id, id));
}

// ============ DOCUMENTACIÓN DE RESIDENCIAS ============

export type ResidenciaDocumentoInput = {
  residenciaId: number;
  requisito: string;
  nombreArchivo: string;
  tipoMime: string;
  tamano: number;
  archivo: string;
  subidoPorId?: string | null;
  subidoPorNombre?: string | null;
};

// Un archivo por requisito: si ya había uno, se reemplaza.
export async function guardarResidenciaDocumento(data: ResidenciaDocumentoInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(residenciaDocumentos)
    .where(and(eq(residenciaDocumentos.residenciaId, data.residenciaId), eq(residenciaDocumentos.requisito, data.requisito)));
  await db.insert(residenciaDocumentos).values(data);
}

// Datos livianos (sin el archivo) de todos los documentos cargados.
export async function listarResidenciaDocumentosMeta() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select({
      residenciaId: residenciaDocumentos.residenciaId,
      requisito: residenciaDocumentos.requisito,
      nombreArchivo: residenciaDocumentos.nombreArchivo,
      tipoMime: residenciaDocumentos.tipoMime,
      tamano: residenciaDocumentos.tamano,
      subidoPorNombre: residenciaDocumentos.subidoPorNombre,
      createdAt: residenciaDocumentos.createdAt,
    })
    .from(residenciaDocumentos);
}

export async function obtenerResidenciaDocumento(residenciaId: number, requisito: string) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db
    .select()
    .from(residenciaDocumentos)
    .where(and(eq(residenciaDocumentos.residenciaId, residenciaId), eq(residenciaDocumentos.requisito, requisito)))
    .limit(1);
  return r[0];
}

export async function eliminarResidenciaDocumento(residenciaId: number, requisito: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(residenciaDocumentos)
    .where(and(eq(residenciaDocumentos.residenciaId, residenciaId), eq(residenciaDocumentos.requisito, requisito)));
}

// ============ FICHAS FIRMADAS ============

export type FichaFirmadaInput = {
  adultoMayorId: number;
  nombreArchivo: string;
  tipoMime: string;
  tamano: number;
  archivo: string;
  subidoPorId?: string | null;
  subidoPorNombre?: string | null;
};

// Una sola ficha firmada por adulto mayor: si ya había una, se reemplaza.
export async function guardarFichaFirmada(data: FichaFirmadaInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(fichasFirmadas).where(eq(fichasFirmadas.adultoMayorId, data.adultoMayorId));
  await db.insert(fichasFirmadas).values(data);
}

// Datos livianos (sin el archivo) de todas las fichas firmadas.
export async function listarFichasFirmadasMeta() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select({
      adultoMayorId: fichasFirmadas.adultoMayorId,
      nombreArchivo: fichasFirmadas.nombreArchivo,
      tipoMime: fichasFirmadas.tipoMime,
      tamano: fichasFirmadas.tamano,
      subidoPorNombre: fichasFirmadas.subidoPorNombre,
      createdAt: fichasFirmadas.createdAt,
    })
    .from(fichasFirmadas);
}

export async function obtenerFichaFirmada(adultoMayorId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(fichasFirmadas).where(eq(fichasFirmadas.adultoMayorId, adultoMayorId)).limit(1);
  return r[0];
}

export async function eliminarFichaFirmada(adultoMayorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(fichasFirmadas).where(eq(fichasFirmadas.adultoMayorId, adultoMayorId));
}

export type DarDeBajaInput = {
  motivoBaja: "fallecimiento" | "fraude" | "otro";
  motivoBajaDetalle?: string | null;
  fechaFallecimiento?: Date | null;
  actaDefuncion?: string | null;
};

// Da de baja la ficha (queda inactiva pero se conserva el historial completo).
export async function darDeBajaAdultoMayor(id: number, datos: DarDeBajaInput): Promise<AdultoMayor | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(adultosMayores)
    .set({
      activo: false,
      fechaBaja: new Date(),
      motivoBaja: datos.motivoBaja,
      motivoBajaDetalle: datos.motivoBajaDetalle ?? null,
      fechaFallecimiento: datos.fechaFallecimiento ?? null,
      actaDefuncion: datos.actaDefuncion ?? null,
    })
    .where(eq(adultosMayores.id, id));

  return await getAdultoMayorById(id);
}

// ============ HISTORIAL DE AMPLIACIONES ============

export async function getAmpliacionesByAdultoMayor(adultoMayorId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(ampliaciones).where(eq(ampliaciones.adultoMayorId, adultoMayorId)).orderBy(desc(ampliaciones.fecha));
}

export async function createAmpliacion(data: InsertAmpliacion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [inserted] = await db.insert(ampliaciones).values(data).returning();
  return inserted;
}

export async function updateAmpliacion(id: number, data: Partial<InsertAmpliacion>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(ampliaciones).set(data).where(eq(ampliaciones.id, id));
}

export async function deleteAmpliacion(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(ampliaciones).where(eq(ampliaciones.id, id));
}

// ============ SEGUIMIENTOS FUNCTIONS ============

export async function createSeguimiento(data: InsertSeguimiento): Promise<Seguimiento> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [inserted] = await db.insert(seguimientos).values(data).returning();
  return inserted;
}

export async function getSeguimientosByAdultoMayor(adultoMayorId: number): Promise<Seguimiento[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(seguimientos).where(eq(seguimientos.adultoMayorId, adultoMayorId)).orderBy(desc(seguimientos.fecha));
}

export async function getAllSeguimientos(): Promise<Seguimiento[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(seguimientos).orderBy(desc(seguimientos.fecha));
}

// ============ ALERTAS FUNCTIONS ============

export async function createAlerta(data: InsertAlerta): Promise<Alerta> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [inserted] = await db.insert(alertas).values(data).returning();
  return inserted;
}

export async function getAllAlertas(): Promise<Alerta[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(alertas).orderBy(desc(alertas.fechaDeteccion));
}

export async function getAlertasPendientes(): Promise<Alerta[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(alertas)
    .where(or(eq(alertas.estado, "pendiente"), eq(alertas.estado, "en_atencion")))
    .orderBy(desc(alertas.prioridad), desc(alertas.fechaDeteccion));
}

export async function getAlertasByAdultoMayor(adultoMayorId: number): Promise<Alerta[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(alertas).where(eq(alertas.adultoMayorId, adultoMayorId)).orderBy(desc(alertas.fechaDeteccion));
}

export async function updateAlerta(id: number, data: Partial<InsertAlerta>): Promise<Alerta | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(alertas).set(data).where(eq(alertas.id, id));
  const result = await db.select().from(alertas).where(eq(alertas.id, id)).limit(1);
  return result[0];
}

export async function deleteAlerta(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(alertas).where(eq(alertas.id, id));
}

// ============ DERIVACIONES FUNCTIONS ============

export async function createDerivacion(data: InsertDerivacion): Promise<Derivacion> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [inserted] = await db.insert(derivaciones).values(data).returning();
  return inserted;
}

export async function getAllDerivaciones(): Promise<Derivacion[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(derivaciones).orderBy(desc(derivaciones.fechaDerivacion));
}

export async function getDerivacionesByAdultoMayor(adultoMayorId: number): Promise<Derivacion[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(derivaciones).where(eq(derivaciones.adultoMayorId, adultoMayorId)).orderBy(desc(derivaciones.fechaDerivacion));
}

export async function updateDerivacion(id: number, data: Partial<InsertDerivacion>): Promise<Derivacion | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(derivaciones).set(data).where(eq(derivaciones.id, id));
  const result = await db.select().from(derivaciones).where(eq(derivaciones.id, id)).limit(1);
  return result[0];
}

// ============ DASHBOARD STATS ============

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return null;

  const totalAdultos = await db.select().from(adultosMayores).where(eq(adultosMayores.activo, true));
  const totalResidencias = await db.select().from(residencias).where(eq(residencias.activo, true));
  const alertasPendientes = await getAlertasPendientes();
  const alertasCriticas = alertasPendientes.filter(a => a.prioridad === "critica" || a.prioridad === "alta");

  const ahora = Date.now();
  const alertasVencidas = alertasPendientes.filter(a => a.fechaLimite && new Date(a.fechaLimite).getTime() < ahora);

  return {
    totalAdultosMayores: totalAdultos.length,
    totalResidencias: totalResidencias.length,
    alertasPendientes: alertasPendientes.length,
    alertasCriticas: alertasCriticas.length,
    alertasVencidas: alertasVencidas.length,
  };
}
