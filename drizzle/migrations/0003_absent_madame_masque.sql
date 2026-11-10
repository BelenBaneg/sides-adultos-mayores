CREATE TABLE "auditoria" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" varchar(20),
	"userNombre" varchar(320),
	"userRole" varchar(20),
	"accion" varchar(30) NOT NULL,
	"modulo" varchar(50),
	"entidadId" varchar(50),
	"detalle" text,
	"ip" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
