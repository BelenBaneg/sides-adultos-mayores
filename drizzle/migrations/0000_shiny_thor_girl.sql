CREATE TYPE "public"."estado_alerta" AS ENUM('pendiente', 'en_atencion', 'resuelta');--> statement-breakpoint
CREATE TYPE "public"."estado_derivacion" AS ENUM('iniciada', 'en_tramite', 'finalizada', 'archivada');--> statement-breakpoint
CREATE TYPE "public"."estado_habilitacion" AS ENUM('vigente', 'vencida', 'en_tramite', 'suspendida');--> statement-breakpoint
CREATE TYPE "public"."prioridad" AS ENUM('baja', 'media', 'alta', 'critica');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin', 'superadmin');--> statement-breakpoint
CREATE TYPE "public"."tipo_alerta" AS ENUM('falta_medicacion', 'salud_critica', 'abandono', 'abuso_economico', 'abuso_psicologico', 'abuso_fisico', 'otro');--> statement-breakpoint
CREATE TYPE "public"."tipo_seguimiento" AS ENUM('visita', 'reporte_vulnerabilidad', 'control_medico', 'entrevista_social', 'otro');--> statement-breakpoint
CREATE TABLE "adultosMayores" (
	"id" serial PRIMARY KEY NOT NULL,
	"expediente" varchar(50) NOT NULL,
	"trabajadorSocial" varchar(150),
	"fechaFicha" date,
	"nombre" varchar(255) NOT NULL,
	"apellido" varchar(255) NOT NULL,
	"dni" varchar(20) NOT NULL,
	"fechaNacimiento" date NOT NULL,
	"telefono" varchar(50),
	"estadoCivil" varchar(50),
	"domicilio" text,
	"barrio" varchar(100),
	"localidad" varchar(100),
	"ocupacion" varchar(100),
	"oficio" varchar(100),
	"monto" varchar(50),
	"beneficioSocial" varchar(10),
	"cualBeneficio" varchar(150),
	"asistenciaPrevisional" varchar(50),
	"diaCobro" varchar(50),
	"medioCobro" varchar(100),
	"tarjetas" text,
	"prestamos" text,
	"redFamiliar" text,
	"tenenciaVivienda" varchar(100),
	"tipoVivienda" varchar(100),
	"situacionHabitacionalPersonas" integer,
	"situacionHabitacionalHabitaciones" integer,
	"materialParedes" varchar(255),
	"materialPisos" varchar(255),
	"materialTechos" varchar(255),
	"bano" varchar(255),
	"cocina" varchar(255),
	"servicioLuz" boolean DEFAULT false,
	"servicioAgua" boolean DEFAULT false,
	"servicioGas" boolean DEFAULT false,
	"obraSocial" varchar(255),
	"numeroAfiliado" varchar(100),
	"enfermedad" varchar(255),
	"sugerencia" text,
	"activo" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "adultosMayores_expediente_unique" UNIQUE("expediente"),
	CONSTRAINT "adultosMayores_dni_unique" UNIQUE("dni")
);
--> statement-breakpoint
CREATE TABLE "alertas" (
	"id" serial PRIMARY KEY NOT NULL,
	"adultoMayorId" integer NOT NULL,
	"userId" varchar(20) NOT NULL,
	"tipoAlerta" "tipo_alerta" NOT NULL,
	"prioridad" "prioridad" DEFAULT 'media' NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"descripcion" text NOT NULL,
	"estado" "estado_alerta" DEFAULT 'pendiente' NOT NULL,
	"fechaDeteccion" timestamp DEFAULT now() NOT NULL,
	"fechaResolucion" timestamp,
	"responsableAtencion" varchar(255),
	"observacionesResolucion" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ampliaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"adulto_mayor_id" integer,
	"expediente" varchar(50),
	"trabajador_social" varchar(100),
	"fecha" date,
	"ocupacion" varchar(100),
	"oficio" varchar(100),
	"benef_programa_social" boolean DEFAULT false,
	"cual_programa" varchar(100),
	"asist_previsional" varchar(50),
	"dia_cobro" varchar(50),
	"medio_cobro" varchar(100),
	"posee_tarjetas" boolean DEFAULT false,
	"extension_a_nombre_de" varchar(100),
	"prestamos" varchar(200),
	"sugerencia" text
);
--> statement-breakpoint
CREATE TABLE "derivaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"adultoMayorId" integer NOT NULL,
	"fechaDerivacion" timestamp DEFAULT now() NOT NULL,
	"motivo" text NOT NULL,
	"juzgado" varchar(255) NOT NULL,
	"numeroExpediente" varchar(100),
	"fiscalia" varchar(255),
	"estadoDerivacion" "estado_derivacion" DEFAULT 'iniciada' NOT NULL,
	"documentacionAdjunta" text,
	"observaciones" text,
	"responsable" varchar(255) NOT NULL,
	"userId" varchar(20) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "residencias" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"direccion" text NOT NULL,
	"telefono" varchar(50),
	"email" varchar(320),
	"responsable" varchar(255),
	"nombreSolicitante" varchar(255),
	"dniSolicitante" varchar(50),
	"nombreApoderado" varchar(255),
	"dniApoderado" varchar(50),
	"capacidad" integer NOT NULL,
	"ocupacionActual" integer DEFAULT 0 NOT NULL,
	"estadoHabilitacion" "estado_habilitacion" DEFAULT 'vigente' NOT NULL,
	"fechaHabilitacion" date,
	"fechaVencimientoHabilitacion" date,
	"observaciones" text,
	"reqNota" boolean DEFAULT false,
	"reqProyecto" boolean DEFAULT false,
	"reqDniSolicitante" boolean DEFAULT false,
	"reqDniApoderado" boolean DEFAULT false,
	"reqPlanos" boolean DEFAULT false,
	"reqEvacuacion" boolean DEFAULT false,
	"reqSeguro" boolean DEFAULT false,
	"reqComidaAfip" boolean DEFAULT false,
	"reqFotos" boolean DEFAULT false,
	"activo" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seguimientos" (
	"id" serial PRIMARY KEY NOT NULL,
	"adultoMayorId" integer NOT NULL,
	"tipoSeguimiento" "tipo_seguimiento" NOT NULL,
	"fecha" timestamp DEFAULT now() NOT NULL,
	"descripcion" text NOT NULL,
	"observaciones" text,
	"responsable" varchar(255) NOT NULL,
	"userId" varchar(20) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"apellido" varchar(150) NOT NULL,
	"email" varchar(320),
	"passwordHash" varchar(255),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_adultoMayorId_adultosMayores_id_fk" FOREIGN KEY ("adultoMayorId") REFERENCES "public"."adultosMayores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ampliaciones" ADD CONSTRAINT "ampliaciones_adulto_mayor_id_adultosMayores_id_fk" FOREIGN KEY ("adulto_mayor_id") REFERENCES "public"."adultosMayores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "derivaciones" ADD CONSTRAINT "derivaciones_adultoMayorId_adultosMayores_id_fk" FOREIGN KEY ("adultoMayorId") REFERENCES "public"."adultosMayores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "derivaciones" ADD CONSTRAINT "derivaciones_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seguimientos" ADD CONSTRAINT "seguimientos_adultoMayorId_adultosMayores_id_fk" FOREIGN KEY ("adultoMayorId") REFERENCES "public"."adultosMayores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seguimientos" ADD CONSTRAINT "seguimientos_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;