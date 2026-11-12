CREATE TABLE "fichas_firmadas" (
	"id" serial PRIMARY KEY NOT NULL,
	"adultoMayorId" integer NOT NULL,
	"nombreArchivo" varchar(255) NOT NULL,
	"tipoMime" varchar(100) NOT NULL,
	"tamano" integer NOT NULL,
	"archivo" text NOT NULL,
	"subidoPorId" varchar(20),
	"subidoPorNombre" varchar(320),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fichas_firmadas" ADD CONSTRAINT "fichas_firmadas_adultoMayorId_adultosMayores_id_fk" FOREIGN KEY ("adultoMayorId") REFERENCES "public"."adultosMayores"("id") ON DELETE no action ON UPDATE no action;