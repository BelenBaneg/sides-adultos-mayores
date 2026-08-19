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

describe("adultosMayores procedures", () => {
  it("should list adultos mayores", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.adultosMayores.list();

    expect(Array.isArray(result)).toBe(true);
  });

  it("should create adulto mayor with valid data", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const newAdultoMayor = {
      expediente: `AM-${Date.now()}-001`,
      nombre: "María",
      apellido: "González",
      dni: `${Math.floor(Math.random() * 100000000)}`,
      fechaNacimiento: new Date("1980-01-15"),
      telefono: "385-7654321",
      obraSocial: "PAMI",
      numeroAfiliado: "123456789",
      enfermedad: "Hipertensión arterial",
    };

    const result = await caller.adultosMayores.create(newAdultoMayor);

    expect(result).toBeDefined();
    expect(result.nombre).toBe(newAdultoMayor.nombre);
    expect(result.apellido).toBe(newAdultoMayor.apellido);
    expect(result.dni).toBe(newAdultoMayor.dni);
    expect(result.expediente).toBe(newAdultoMayor.expediente);
  });
});
