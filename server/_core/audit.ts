import * as db from "../db";
import type { TrpcContext } from "./context";

const CAMPOS_SENSIBLES = ["password", "passwordHash"];
const CAMPOS_ARCHIVO = ["actaDefuncion", "documentacionAdjunta"];

const ACCIONES: Record<string, string> = {
  create: "crear",
  update: "editar",
  delete: "eliminar",
  darDeBaja: "baja",
};

export function obtenerIp(req: TrpcContext["req"]): string {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
  return (raw || req.ip || req.socket?.remoteAddress || "").toString().trim().slice(0, 64);
}

// Quita contraseñas, reemplaza archivos pesados por un aviso y recorta textos largos.
function limpiarInput(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const limpio: Record<string, unknown> = {};
  for (const [clave, valor] of Object.entries(input as Record<string, unknown>)) {
    if (CAMPOS_SENSIBLES.includes(clave)) continue;
    if (CAMPOS_ARCHIVO.includes(clave)) {
      if (valor) limpio[clave] = "[archivo adjunto]";
      continue;
    }
    if (typeof valor === "string" && valor.length > 120) {
      limpio[clave] = valor.slice(0, 120) + "…";
    } else {
      limpio[clave] = valor;
    }
  }
  return limpio;
}

export async function auditarMutacion(opts: {
  ctx: TrpcContext;
  path: string; // ej: "adultosMayores.create"
  input: unknown;
}) {
  const { ctx, path, input } = opts;
  const [modulo, operacion = ""] = path.split(".");
  const limpio = limpiarInput(input) as Record<string, unknown> | undefined;

  let detalle = "";
  try {
    detalle = JSON.stringify(limpio ?? {}).slice(0, 1500);
  } catch {
    detalle = "";
  }

  await db.registrarAuditoria({
    userId: ctx.user?.id ?? null,
    userNombre: ctx.user ? `${ctx.user.nombre} ${ctx.user.apellido}`.trim() : null,
    userRole: ctx.user?.role ?? null,
    accion: ACCIONES[operacion] ?? operacion ?? "otro",
    modulo,
    entidadId: limpio?.id !== undefined ? String(limpio.id) : null,
    detalle,
    ip: obtenerIp(ctx.req),
  });
}
