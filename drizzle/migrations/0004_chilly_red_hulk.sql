ALTER TABLE "derivaciones" ALTER COLUMN "juzgado" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "derivaciones" ADD COLUMN "tipoDerivacion" varchar(20) DEFAULT 'judicial' NOT NULL;--> statement-breakpoint
ALTER TABLE "derivaciones" ADD COLUMN "dependencia" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "activo" boolean DEFAULT true NOT NULL;