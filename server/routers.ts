import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import { verifyPassword, hashPassword } from "./_core/crypto";
import { TRPCError } from "@trpc/server";
import { obtenerIp } from "./_core/audit";
import { calcularFechaLimite } from "@shared/alertas";
import {
  MENSAJE_PASSWORD,
  minutosDeBloqueo,
  passwordValida,
  registrarFalloLogin,
  registrarLoginExitoso,
} from "./_core/seguridad";
import { validarArchivo } from "./_core/archivos";

// La sesión dura una jornada laboral (8 horas); después hay que volver a iniciar sesión.
const SESION_MS = 8 * 60 * 60 * 1000;

const passwordSchema = z.string().refine(passwordValida, { message: MENSAJE_PASSWORD });
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,

  // Solo la superadmin puede consultar la auditoría.
  auditoria: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(2000).default(500) }).optional())
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== "superadmin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Operación denegada: Solo la Superadmin puede ver la auditoría.",
          });
        }
        return await db.listarAuditoria(input?.limit ?? 500);
      }),
  }),

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
        const ip = obtenerIp(ctx.req);

        // Protección contra fuerza bruta: tras 5 intentos fallidos se bloquea 15 minutos
        const bloqueo = minutosDeBloqueo(ip, input.email);
        if (bloqueo > 0) {
          await db.registrarAuditoria({
            accion: "login_fallido",
            modulo: "auth",
            detalle: JSON.stringify({ email: input.email, motivo: "bloqueado por demasiados intentos" }),
            ip,
          });
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `Demasiados intentos fallidos. Esperá ${bloqueo} minuto${bloqueo === 1 ? "" : "s"} e intentá de nuevo.`,
          });
        }

        const user = await db.getUserByEmail(input.email);
        if (!user) {
          registrarFalloLogin(ip, input.email);
          await db.registrarAuditoria({
            accion: "login_fallido",
            modulo: "auth",
            detalle: JSON.stringify({ email: input.email, motivo: "usuario inexistente" }),
            ip,
          });
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
          registrarFalloLogin(ip, input.email);
          await db.registrarAuditoria({
            userId: user.id,
            userNombre: `${user.nombre} ${user.apellido}`.trim(),
            userRole: user.role,
            accion: "login_fallido",
            modulo: "auth",
            detalle: JSON.stringify({ email: input.email, motivo: "contraseña incorrecta" }),
            ip,
          });
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "El correo electrónico o la contraseña son incorrectos.",
          });
        }

        // El estado "congelado" se informa solo si la contraseña es correcta (no revela qué cuentas existen)
        if (user.activo === false) {
          await db.registrarAuditoria({
            userId: user.id,
            userNombre: `${user.nombre} ${user.apellido}`.trim(),
            userRole: user.role,
            accion: "login_fallido",
            modulo: "auth",
            detalle: JSON.stringify({ email: input.email, motivo: "usuario congelado" }),
            ip,
          });
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Tu usuario se encuentra congelado. Contactá a la Superadmin.",
          });
        }

        registrarLoginExitoso(ip, input.email);

        const sessionToken = await sdk.createSessionToken(user.id, {
          expiresInMs: SESION_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: SESION_MS,
          sameSite: "lax",
        });

        await db.registrarAuditoria({
          userId: user.id,
          userNombre: `${user.nombre} ${user.apellido}`.trim(),
          userRole: user.role,
          accion: "login",
          modulo: "auth",
          detalle: JSON.stringify({ email: user.email }),
          ip,
        });

        return user;
      }),

    logout: publicProcedure.mutation(async ({ ctx }) => {
      if (ctx.user) {
        await db.registrarAuditoria({
          userId: ctx.user.id,
          userNombre: `${ctx.user.nombre} ${ctx.user.apellido}`.trim(),
          userRole: ctx.user.role,
          accion: "logout",
          modulo: "auth",
          ip: obtenerIp(ctx.req),
        });
      }
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
          password: passwordSchema,
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

    // La superadmin define una contraseña nueva (por ejemplo, si la persona la olvidó).
    cambiarPassword: protectedProcedure
      .input(z.object({ id: z.string(), password: passwordSchema }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "superadmin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Operación denegada: Solo la Superadmin puede cambiar contraseñas.",
          });
        }
        await db.updateUser(input.id, { passwordHash: hashPassword(input.password) });
        return { success: true };
      }),

    // Congela (activo = false) o reactiva (activo = true) a un usuario.
    setActivo: protectedProcedure
      .input(z.object({ id: z.string(), activo: z.boolean() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "superadmin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Operación denegada: Solo la Superadmin puede congelar usuarios.",
          });
        }
        if (ctx.user.id === input.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No podés congelar tu propia cuenta activa.",
          });
        }
        await db.updateUser(input.id, { activo: input.activo });
        return { success: true };
      }),
  }),

  residenciaDocumentos: router({
    listMeta: protectedProcedure.query(async () => {
      return await db.listarResidenciaDocumentosMeta();
    }),

    get: protectedProcedure
      .input(z.object({ residenciaId: z.number(), requisito: z.string() }))
      .query(async ({ input, ctx }) => {
        const doc = (await db.obtenerResidenciaDocumento(input.residenciaId, input.requisito)) ?? null;
        if (doc) {
          // Queda registrado quién abrió o descargó cada documento
          await db.registrarAuditoria({
            userId: ctx.user.id,
            userNombre: `${ctx.user.nombre} ${ctx.user.apellido}`.trim(),
            userRole: ctx.user.role,
            accion: "ver_archivo",
            modulo: "residenciaDocumentos",
            entidadId: String(input.residenciaId),
            detalle: JSON.stringify({ requisito: input.requisito, nombreArchivo: doc.nombreArchivo }),
            ip: obtenerIp(ctx.req),
          });
        }
        return doc;
      }),

    upload: protectedProcedure
      .input(
        z.object({
          residenciaId: z.number(),
          requisito: z.enum([
            "reqNota",
            "reqProyecto",
            "reqDniSolicitante",
            "reqDniApoderado",
            "reqPlanos",
            "reqEvacuacion",
            "reqSeguro",
            "reqComidaAfip",
            "reqFotos",
          ]),
          nombreArchivo: z.string().min(1).max(255),
          archivo: z.string().min(1), // data URI base64
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { mime, tamano } = validarArchivo(input.archivo);
        await db.guardarResidenciaDocumento({
          residenciaId: input.residenciaId,
          requisito: input.requisito,
          nombreArchivo: input.nombreArchivo,
          tipoMime: mime,
          tamano,
          archivo: input.archivo,
          subidoPorId: ctx.user.id,
          subidoPorNombre: `${ctx.user.nombre} ${ctx.user.apellido}`.trim(),
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ residenciaId: z.number(), requisito: z.string() }))
      .mutation(async ({ input }) => {
        await db.eliminarResidenciaDocumento(input.residenciaId, input.requisito);
        return { success: true };
      }),
  }),

  fichasFirmadas: router({
    // Qué adultos mayores ya tienen ficha firmada (sin traer los archivos)
    listMeta: protectedProcedure.query(async () => {
      return await db.listarFichasFirmadasMeta();
    }),

    get: protectedProcedure
      .input(z.object({ adultoMayorId: z.number() }))
      .query(async ({ input, ctx }) => {
        const ficha = (await db.obtenerFichaFirmada(input.adultoMayorId)) ?? null;
        if (ficha) {
          // Queda registrado quién abrió o descargó cada ficha firmada
          await db.registrarAuditoria({
            userId: ctx.user.id,
            userNombre: `${ctx.user.nombre} ${ctx.user.apellido}`.trim(),
            userRole: ctx.user.role,
            accion: "ver_archivo",
            modulo: "fichasFirmadas",
            entidadId: String(input.adultoMayorId),
            detalle: JSON.stringify({ nombreArchivo: ficha.nombreArchivo }),
            ip: obtenerIp(ctx.req),
          });
        }
        return ficha;
      }),

    upload: protectedProcedure
      .input(
        z.object({
          adultoMayorId: z.number(),
          nombreArchivo: z.string().min(1).max(255),
          archivo: z.string().min(1), // data URI base64
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { mime, tamano } = validarArchivo(input.archivo);
        await db.guardarFichaFirmada({
          adultoMayorId: input.adultoMayorId,
          nombreArchivo: input.nombreArchivo,
          tipoMime: mime,
          tamano,
          archivo: input.archivo,
          subidoPorId: ctx.user.id,
          subidoPorNombre: `${ctx.user.nombre} ${ctx.user.apellido}`.trim(),
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ adultoMayorId: z.number() }))
      .mutation(async ({ input }) => {
        await db.eliminarFichaFirmada(input.adultoMayorId);
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
          genero: z.string().nullish(),
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
          genero: z.string().nullish(),
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
        // Borrado permanente: elimina la ficha y todo lo relacionado (seguimientos, alertas, derivaciones, ampliaciones).
        await db.deleteAdultoMayor(input.id);
        return { success: true };
      }),
    darDeBaja: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          motivoBaja: z.enum(["fallecimiento", "fraude", "otro"]),
          motivoBajaDetalle: z.string().nullish(),
          fechaFallecimiento: z.date().nullish(),
          actaDefuncion: z.string().nullish(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...datos } = input;
        if (datos.actaDefuncion) validarArchivo(datos.actaDefuncion);
        return await db.darDeBajaAdultoMayor(id, datos);
      }),
  }),

  estadisticas: router({
    // Devuelve todas las fichas (activas y dadas de baja) para calcular los indicadores en el cliente.
    data: protectedProcedure.query(async () => {
      return await db.getTodosAdultosMayores();
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
          tipoDerivacion: z.enum(["judicial", "interna", "externa"]).default("judicial"),
          dependencia: z.string().optional(),
          juzgado: z.string().optional(),
          numeroExpediente: z.string().optional(),
          fiscalia: z.string().optional(),
          documentacionAdjunta: z.string().optional(),
          observaciones: z.string().optional(),
          responsable: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (input.tipoDerivacion === "judicial" && !input.juzgado?.trim()) {
          throw new Error("Debe indicar el juzgado para una derivación judicial");
        }
        if (input.tipoDerivacion !== "judicial" && !input.dependencia?.trim()) {
          throw new Error("Debe indicar la dependencia de destino");
        }
        return await db.createDerivacion({ ...input, userId: ctx.user.id } as any);
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          estadoDerivacion: z.enum(["iniciada", "en_tramite", "finalizada", "archivada"]),
          dependencia: z.string().optional(),
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

        const ahora = new Date();
        return await db.createAlerta({
          adultoMayorId: input.adultoMayorId,
          userId: ctx.user.id,
          tipoAlerta: tipoFinal as any,
          titulo: tituloFinal,
          descripcion: input.descripcion,
          prioridad: input.prioridad,
          estado: "pendiente",
          fechaDeteccion: ahora,
          fechaLimite: calcularFechaLimite(input.prioridad, ahora),
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
