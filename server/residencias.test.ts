import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: "30111222",
    nombre: "Test",
    apellido: "User",
    email: "test@example.com",
    loginMethod: "local",
    role: "admin",
    passwordHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("residencias procedures", () => {
  it("should list residencias", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.residencias.list();

    expect(Array.isArray(result)).toBe(true);
  });

  it("should create residencia with valid data", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const newResidencia = {
      nombre: "Residencia Test",
      direccion: "Calle Falsa 123",
      telefono: "385-1234567",
      email: "test@residencia.com",
      responsable: "Juan Pérez",
      capacidad: 50,
      estadoHabilitacion: "vigente" as const,
      fechaHabilitacion: new Date(),
      fechaVencimientoHabilitacion: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      observaciones: "Test",
    };

    const result = await caller.residencias.create(newResidencia);

    expect(result).toBeDefined();
    expect(result.nombre).toBe(newResidencia.nombre);
    expect(result.capacidad).toBe(newResidencia.capacidad);
    expect(result.estadoHabilitacion).toBe("vigente");
  });
});
