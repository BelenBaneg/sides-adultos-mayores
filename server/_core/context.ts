import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // 🔐 Volvemos a activar la verificación dinámica real usando el SDK local
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Si no está logueado, pasamos null (las rutas públicas como el login no se rompen)
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}