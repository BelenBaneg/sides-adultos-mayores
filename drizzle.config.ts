import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Cargar variables de entorno desde el archivo .env
dotenv.config();

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
  verbose: true,
  strict: true,
});
