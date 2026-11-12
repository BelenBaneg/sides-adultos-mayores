CREATE TABLE "residencia_documentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"residenciaId" integer NOT NULL,
	"requisito" varchar(40) NOT NULL,
	"nombreArchivo" varchar(255) NOT NULL,
	"tipoMime" varchar(100) NOT NULL,
	"tamano" integer NOT NULL,
	"archivo" text NOT NULL,
	"subidoPorId" varchar(20),
	"subidoPorNombre" varchar(320),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "residencia_documentos" ADD CONSTRAINT "residencia_documentos_residenciaId_residencias_id_fk" FOREIGN KEY ("residenciaId") REFERENCES "public"."residencias"("id") ON DELETE no action ON UPDATE no action;