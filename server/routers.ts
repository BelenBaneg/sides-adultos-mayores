import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import { verifyPassword, hashPassword } from "./_core/crypto";
import { TRPCError } from "@trpc/server";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),

    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const user = await db.getUserByEmail(input.email);
        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "El correo electrónico o la contraseña son incorrectos.",
          });
        }

        let isPasswordValid = false;

        if (user.passwordHash && user.passwordHash.includes(".")) {
          try {
            isPasswordValid = verifyPassword(input.password, user.passwordHash);
          } catch (e) {
            isPasswordValid = false;
          }
        }

        if (!isPasswordValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "El correo electrónico o la contraseña son incorrectos.",
          });
        }

        const sessionToken = await sdk.createSessionToken(user.id, {
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
          sameSite: "lax",
        });

        return user;
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, cookieOptions);
      return { success: true } as const;
    }),
  }),

  usuarios: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "superadmin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Operación denegada: No tenés permisos para ver este listado.",
        });
      }
      return await db.getAllUsers();
    }),

    create: protectedProcedure
      .input(
        z.object({
          id: z.string().min(1), // DNI
          nombre: z.string().min(1),
          apellido: z.string().min(1),
          email: z.string().email(),
          password: z.string().min(4),
          role: z.enum(["superadmin", "admin", "user"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "superadmin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Operación denegada: Solo la Superadmin puede crear usuarios.",
          });
        }

        const secureHash = hashPassword(input.password);

        await db.createUser({
          id: input.id,
          nombre: input.nombre,
          apellido: input.apellido,
          email: input.email,
          role: input.role,
          passwordHash: secureHash,
        });

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "superadmin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Operación denegada: No tenés permisos para eliminar personal.",
          });
        }

        if (ctx.user.id === input.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Error crítico: No podés eliminar tu propia cuenta activa.",
          });
        }

        await db.deleteUser(input.id);
        return { success: true };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          nombre: z.string().min(1),
          apellido: z.string().min(1),
          email: z.string().email(),
          role: z.enum(["superadmin", "admin", "user"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "superadmin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Operación denegada: No tenés permisos para modificar personal.",
          });
        }

        const { id, ...data } = input;
        await db.updateUser(id, data);

        return { success: true };
      }),
  }),

  residencias: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllResidencias();
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getResidenciaById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          nombre: z.string().min(1),
          direccion: z.string().min(1),
          telefono: z.string().nullish(),
          email: z.string().email().or(z.literal("")).nullish(),
          responsable: z.string().nullish(),
          nombreSolicitante: z.string().nullish(),
          dniSolicitante: z.string().nullish(),
          nombreApoderado: z.string().nullish(),
          dniApoderado: z.string().nullish(),
          capacidad: z.number().optional().default(0),
          estadoHabilitacion: z.enum(["vigente", "vencida", "en_tramite", "suspendida"]).default("en_tramite"),
          fechaHabilitacion: z.date().nullish(),
          fechaVencimientoHabilitacion: z.date().nullish(),
          observaciones: z.string().nullish(),
          reqNota: z.boolean().optional(),
          reqProyecto: z.boolean().optional(),
          reqDniSolicitante: z.boolean().optional(),
          reqDniApoderado: z.boolean().optional(),
          reqPlanos: z.boolean().optional(),
          reqEvacuacion: z.boolean().optional(),
          reqSeguro: z.boolean().optional(),
          reqComidaAfip: z.boolean().optional(),
          reqFotos: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createResidencia({ ...input, ocupacionActual: 0, activo: true });
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          nombre: z.string().min(1).optional(),
          direccion: z.string().min(1).optional(),
          telefono: z.string().nullish(),
          email: z.string().email().or(z.literal("")).nullish(),
          responsable: z.string().nullish(),
          nombreSolicitante: z.string().nullish(),
          dniSolicitante: z.string().nullish(),
          nombreApoderado: z.string().nullish(),
          dniApoderado: z.string().nullish(),
          capacidad: z.number().optional(),
          estadoHabilitacion: z.enum(["vigente", "vencida", "en_tramite", "suspendida"]).optional(),
          fechaHabilitacion: z.date().nullish(),
          fechaVencimientoHabilitacion: z.date().nullish(),
          observaciones: z.string().nullish(),
          reqNota: z.boolean().optional(),
          reqProyecto: z.boolean().optional(),
          reqDniSolicitante: z.boolean().optional(),
          reqDniApoderado: z.boolean().optional(),
          reqPlanos: z.boolean().optional(),
          reqEvacuacion: z.boolean().optional(),
          reqSeguro: z.boolean().optional(),
          reqComidaAfip: z.boolean().optional(),
          reqFotos: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateResidencia(id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteResidencia(input.id);
        return { success: true };
      }),
  }),

  adultosMayores: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllAdultosMayores();
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getAdultoMayorById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          expediente: z.string().min(1),
          trabajadorSocial: z.string().nullish(),
          fechaFicha: z.date().nullish(),
          nombre: z.string().min(1),
          apellido: z.string().min(1),
          dni: z.string().min(1),
          fechaNacimiento: z.date(),
          telefono: z.string().nullish(),
          estadoCivil: z.string().nullish(),
          domicilio: z.string().nullish(),
          barrio: z.string().nullish(),
          localidad: z.string().nullish(),
          ocupacion: z.string().nullish(),
          oficio: z.string().nullish(),
          monto: z.string().nullish(),
          beneficioSocial: z.string().nullish(),
          cualBeneficio: z.string().nullish(),
          asistenciaPrevisional: z.string().nullish(),
          diaCobro: z.string().nullish(),
          medioCobro: z.string().nullish(),
          tarjetas: z.string().nullish(),
          prestamos: z.string().nullish(),
          redFamiliar: z.string().nullish(),
          tenenciaVivienda: z.string().nullish(),
          tipoVivienda: z.string().nullish(),
          situacionHabitacionalPersonas: z.number().nullish(),
          situacionHabitacionalHabitaciones: z.number().nullish(),
          materialParedes: z.string().nullish(),
          materialPisos: z.string().nullish(),
          materialTechos: z.string().nullish(),
          bano: z.string().nullish(),
          cocina: z.string().nullish(),
          servicioLuz: z.boolean().optional(),
          servicioAgua: z.boolean().optional(),
          servicioGas: z.boolean().optional(),
          obraSocial: z.string().nullish(),
          numeroAfiliado: z.string().nullish(),
          enfermedad: z.string().nullish(),
          sugerencia: z.string().nullish(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createAdultoMayor({ ...input, activo: true });
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          expediente: z.string().min(1).optional(),
          trabajadorSocial: z.string().nullish(),
          fechaFicha: z.date().nullish(),
          nombre: z.string().min(1).optional(),
          apellido: z.string().min(1).optional(),
          dni: z.string().min(1).optional(),
          fechaNacimiento: z.date().optional(),
          telefono: z.string().nullish(),
          estadoCivil: z.string().nullish(),
          domicilio: z.string().nullish(),
          barrio: z.string().nullish(),
          localidad: z.string().nullish(),
          ocupacion: z.string().nullish(),
          oficio: z.string().nullish(),
          monto: z.string().nullish(),
          beneficioSocial: z.string().nullish(),
          cualBeneficio: z.string().nullish(),
          asistenciaPrevisional: z.string().nullish(),
          diaCobro: z.string().nullish(),
          medioCobro: z.string().nullish(),
          tarjetas: z.string().nullish(),
          prestamos: z.string().nullish(),
          redFamiliar: z.string().nullish(),
          tenenciaVivienda: z.string().nullish(),
          tipoVivienda: z.string().nullish(),
          situacionHabitacionalPersonas: z.number().nullish(),
          situacionHabitacionalHabitaciones: z.number().nullish(),
          materialParedes: z.string().nullish(),
          materialPisos: z.string().nullish(),
          materialTechos: z.string().nullish(),
          bano: z.string().nullish(),
          cocina: z.string().nullish(),
          servicioLuz: z.boolean().optional(),
          servicioAgua: z.boolean().optional(),
          servicioGas: z.boolean().optional(),
          obraSocial: z.string().nullish(),
          numeroAfiliado: z.string().nullish(),
          enfermedad: z.string().nullish(),
          sugerencia: z.string().nullish(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateAdultoMayor(id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteAdultoMayor(input.id);
        return { success: true };
      }),
  }),

  dashboard: router({
    stats: protectedProcedure.query(async () => {
      return await db.getDashboardStats();
    }),
  }),

  derivaciones: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllDerivaciones();
    }),
    create: protectedProcedure
      .input(
        z.object({
          adultoMayorId: z.number(),
          fechaDerivacion: z.string(),
          motivo: z.string(),
          juzgado: z.string(),
          numeroExpediente: z.string().optional(),
          fiscalia: z.string().optional(),
          documentacionAdjunta: z.string().optional(),
          observaciones: z.string().optional(),
          responsable: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await db.createDerivacion({ ...input, userId: ctx.user.id } as any);
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          estadoDerivacion: z.enum(["iniciada", "en_tramite", "finalizada", "archivada"]),
          numeroExpediente: z.string().optional(),
          fiscalia: z.string().optional(),
          documentacionAdjunta: z.string().optional(),
          observaciones: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateDerivacion(id, data);
      }),
  }),

  seguimientos: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllSeguimientos();
    }),
    create: protectedProcedure
      .input(
        z.object({
          adultoMayorId: z.number(),
          tipoSeguimiento: z.enum(["visita", "reporte_vulnerabilidad", "control_medico", "entrevista_social", "otro"]),
          fecha: z.date().or(z.string()),
          descripcion: z.string(),
          observaciones: z.string().optional(),
          responsable: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await db.createSeguimiento({ ...input, userId: ctx.user.id } as any);
      }),
  }),

  alertas: router({
    listPendientes: protectedProcedure.query(async () => {
      return await db.getAlertasPendientes();
    }),

    list: protectedProcedure.query(async () => {
      return await db.getAllAlertas();
    }),

    create: protectedProcedure
      .input(
        z.object({
          adultoMayorId: z.number(),
          tipo: z.string().optional(),
          tipoAlerta: z
            .enum(["falta_medicacion", "salud_critica", "abandono", "abuso_economico", "abuso_psicologico", "abuso_fisico", "otro"])
            .optional(),
          titulo: z.string().optional(),
          descripcion: z.string(),
          prioridad: z.enum(["baja", "media", "alta", "critica"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const tipoFinal = input.tipoAlerta || input.tipo || "otro";
        const tituloFinal = input.titulo || `Alerta de ${String(tipoFinal).replace("_", " ")}`;

        return await db.createAlerta({
          adultoMayorId: input.adultoMayorId,
          userId: ctx.user.id,
          tipoAlerta: tipoFinal as any,
          titulo: tituloFinal,
          descripcion: input.descripcion,
          prioridad: input.prioridad,
          estado: "pendiente",
          fechaDeteccion: new Date(),
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          estado: z.enum(["pendiente", "en_atencion", "resuelta"]),
          responsableAtencion: z.string().nullish(),
          observacionesResolucion: z.string().nullish(),
          fechaResolucion: z.date().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;

        const updateData: any = {
          estado: data.estado,
          responsableAtencion: data.responsableAtencion ?? null,
          observacionesResolucion: data.observacionesResolucion ?? null,
        };

        if (data.estado === "resuelta") {
          updateData.fechaResolucion = data.fechaResolucion ?? new Date();
        }

        return await db.updateAlerta(id, updateData);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteAlerta(input.id);
        return { success: true };
      }),
  }),

  ampliaciones: router({
    getByAdultoMayor: protectedProcedure
      .input(z.object({ adultoMayorId: z.number() }))
      .query(async ({ input }) => {
        return await db.getAmpliacionesByAdultoMayor(input.adultoMayorId);
      }),
    create: protectedProcedure
      .input(
        z.object({
          adultoMayorId: z.number(),
          expediente: z.string().nullish(),
          trabajadorSocial: z.string().nullish(),
          fecha: z.date().nullish(),
          ocupacion: z.string().nullish(),
          oficio: z.string().nullish(),
          benefProgramaSocial: z.boolean().optional(),
          cualPrograma: z.string().nullish(),
          asistPrevisional: z.string().nullish(),
          diaCobro: z.string().nullish(),
          medioCobro: z.string().nullish(),
          poseeTarjetas: z.boolean().optional(),
          extensionANombreDe: z.string().nullish(),
          prestamos: z.string().nullish(),
          sugerencia: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createAmpliacion({ ...input, fecha: input.fecha ?? new Date() } as any);
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          benefProgramaSocial: z.boolean().optional(),
          cualPrograma: z.string().nullish(),
          asistPrevisional: z.string().nullish(),
          diaCobro: z.string().nullish(),
          medioCobro: z.string().nullish(),
          poseeTarjetas: z.boolean().optional(),
          extensionANombreDe: z.string().nullish(),
          prestamos: z.string().nullish(),
          sugerencia: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateAmpliacion(id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteAmpliacion(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
