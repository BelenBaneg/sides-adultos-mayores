import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { auditarMutacion } from "./audit";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: UNAUTHED_ERR_MSG || "No tienes permiso para acceder.",
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// Registra en la auditoría toda modificación (crear/editar/eliminar/baja) hecha por un usuario logueado.
const auditarCambios = t.middleware(async ({ ctx, next, type, path, getRawInput }) => {
  const result = await next();
  if (type === "mutation" && result.ok) {
    try {
      const input = await getRawInput();
      await auditarMutacion({ ctx, path, input });
    } catch (error) {
      console.error("[Auditoría] Error al registrar:", error);
    }
  }
  return result;
});

export const protectedProcedure = t.procedure.use(requireUser).use(auditarCambios);

export const adminProcedure = t.procedure.use(
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: NOT_ADMIN_ERR_MSG || "Acceso denegado.",
      });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);