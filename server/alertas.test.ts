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

describe("alertas procedures", () => {
  it("should list all alertas", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.alertas.list();

    expect(Array.isArray(result)).toBe(true);
  });

  it("should list alertas pendientes", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.alertas.listPendientes();

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("dashboard procedures", () => {
  it("should return dashboard stats", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.stats();

    expect(result).toBeDefined();
    expect(typeof result?.totalAdultosMayores).toBe("number");
    expect(typeof result?.totalResidencias).toBe("number");
    expect(typeof result?.alertasPendientes).toBe("number");
    expect(typeof result?.alertasCriticas).toBe("number");
  });
});
