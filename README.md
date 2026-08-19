# SIDES - Sistema de Gestión de Adultos Mayores

Sistema para el Ministerio de Desarrollo Social de Santiago del Estero: legajos de adultos mayores, residencias de larga estadía, seguimientos, alertas y derivaciones judiciales.

Esta es la reconstrucción limpia del proyecto original: misma funcionalidad, base de datos en **PostgreSQL** (antes MySQL), interfaz en **Chakra UI** (antes Tailwind/shadcn) y sin el código de la plantilla de Manus con la que empezó el proyecto.

## Stack

- **Frontend:** React 19 + Vite + Chakra UI + wouter (routing) + tRPC + React Query
- **Backend:** Express + tRPC
- **Base de datos:** PostgreSQL + Drizzle ORM
- **Auth:** login propio (email + contraseña) con cookie JWT firmada localmente. No depende de ningún servicio externo.

## Qué cambió respecto al proyecto original

- Base de datos migrada de MySQL a PostgreSQL. Los nombres de tablas y campos son los mismos; solo cambió el motor.
- Se eliminaron las migraciones duplicadas/huérfanas que tenías (una carpeta vieja `drizzle/` con 2 migraciones y otra `drizzle/migrations/` con 8, ambas desincronizadas). Ahora hay **una sola migración limpia** en `drizzle/migrations/`.
- Se sacó todo el código de la plantilla de Manus que ya no se usaba: `ComponentShowcase`, `AIChatBox`, `ManusDialog`, el flujo de OAuth externo, generación de imágenes, transcripción de voz, el proxy de storage, y el plugin de Vite de Manus. Nada de esto estaba conectado a tu app real.
- Interfaz nueva con **Chakra UI**, con un tema con el violeta institucional (`#5B2D8E`) de tus logos.
- Ya están migradas a Chakra: el login, el layout general (sidebar + header), el Panel de Control y el módulo completo de **Residencias de Larga Estadía** (como plantilla del patrón a seguir).
- El resto de los módulos (Adultos Mayores, Alertas, Derivaciones, Seguimientos, Visitas y Reportes, Usuarios) **ya funcionan** contra la base nueva —no hay nada roto—, pero todavía tienen la interfaz vieja (Tailwind/shadcn). Puedo seguir migrándolos al mismo estilo de Residencias cuando quieras: avisame y seguimos módulo por módulo.
- Ajustamos el modelo de datos con vos: `users` ahora se identifica por DNI (una sola columna `id`, sin el `openId` duplicado), `geriátricos` pasó a llamarse `residencias`, y `adultosMayores` quedó recortado a los campos que realmente existen en el formulario (ver `ESQUEMA_BASE_DE_DATOS.md` para el detalle completo).
- De paso corregimos dos bugs reales que tenía el proyecto original: el formulario de "Nueva Ficha Social" cargaba muchos campos que **nunca se guardaban** en la base, y `seguimientos`/`alertas`/`derivaciones` no registraban quién las cargó aunque era un campo obligatorio. Los dos ya están arreglados.
- Sacamos un agujero de seguridad del login original: aceptaba la contraseña literal `"SIDES"` para cualquier usuario, sin pasar por el hash. Ahora el login solo valida contra el hash real de cada contraseña.

## Requisitos

- Node.js 20+
- Una base PostgreSQL (ver opciones abajo)
- pnpm (o npm/yarn si preferís)

## Base de datos: Neon (recomendado, sin instalar nada)

No hace falta instalar Postgres en tu compu. Usamos [Neon](https://neon.tech), que tiene un plan gratuito y te da una base Postgres en la nube en un minuto:

1. Entrá a **https://neon.tech** y creá una cuenta gratis (podés usar Google o GitHub).
2. Creá un proyecto nuevo. Te va a pedir un nombre (poné `sides` o el que quieras) y una región (elegí la más cercana disponible).
3. Neon crea automáticamente una base llamada `neondb` y te muestra un **Connection string**, algo así:

   ```
   postgresql://usuario:password@ep-xxxx-xxxx.sa-east-1.aws.neon.tech/neondb?sslmode=require
   ```

4. Copiá ese string completo (con el `?sslmode=require` incluido).
5. Pegalo como valor de `DATABASE_URL` en tu archivo `.env` (ver paso 2 de "Configuración inicial" abajo).

Con eso ya tenés base de datos funcionando, sin XAMPP, sin servicios locales que se puedan desconfigurar, y accesible aunque cambies de compu.

*Alternativas: si preferís tener la base en tu propia máquina, podés instalar PostgreSQL desde [postgresql.org](https://www.postgresql.org/download/windows/) o correrla con Docker (`docker run --name sides-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=sides_adultos_mayores -p 5432:5432 -d postgres`). En ese caso usá `postgresql://postgres:postgres@localhost:5432/sides_adultos_mayores` como `DATABASE_URL`.*

## Configuración inicial

1. Instalá las dependencias:

   ```bash
   pnpm install
   ```

2. Copiá `.env.example` a `.env`:

   ```bash
   cp .env.example .env
   ```

   Y pegá tu `DATABASE_URL` de Neon (o la de tu Postgres local) ahí adentro.

3. Aplicá las migraciones (esto crea todas las tablas):

   ```bash
   pnpm db:migrate
   ```

4. Levantá el proyecto:

   ```bash
   pnpm dev
   ```

   Por defecto corre en `http://localhost:3000`.

## Primer usuario

El sistema no trae usuarios de fábrica. El identificador de cada usuario es su DNI (columna `id`). Para crear la primera administradora, primero generá el hash de tu contraseña con este comando (cambiá `TU_CONTRASEÑA`):

```bash
node -e "const c=require('crypto');const s=c.randomBytes(16).toString('hex');const h=c.scryptSync('TU_CONTRASEÑA',s,64).toString('hex');console.log(h+'.'+s)"
```

Te va a imprimir un string tipo `hash.salt`. Copialo completo y usalo en el INSERT:

```sql
INSERT INTO users (id, nombre, apellido, email, "passwordHash", role)
VALUES ('40123456', 'Belén', 'Banegas', 'tu@email.com', 'EL_HASH_QUE_TE_IMPRIMIÓ_ARRIBA', 'superadmin');
```

Reemplazá `'40123456'` por tu DNI real.

## Scripts útiles

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Levanta frontend + backend en modo desarrollo |
| `pnpm build` | Compila todo para producción |
| `pnpm start` | Corre la build de producción |
| `pnpm check` | Chequeo de tipos de TypeScript |
| `pnpm test` | Corre los tests |
| `pnpm db:generate` | Genera una nueva migración a partir de cambios en `drizzle/schema.ts` |
| `pnpm db:migrate` | Aplica las migraciones pendientes |
| `pnpm db:studio` | Abre Drizzle Studio para ver/editar los datos con una interfaz visual |

## Estructura

```
client/          Frontend (React + Chakra UI)
  src/pages/      Una página por módulo
  src/components/ Layout, sidebar, etc.
  src/theme.ts    Tema de Chakra (colores institucionales)
server/          Backend (Express + tRPC)
  db.ts           Todas las funciones de acceso a datos
  routers.ts      Endpoints de la API (tRPC)
drizzle/
  schema.ts       Definición de las tablas
  migrations/     Migraciones de base de datos (generadas, no tocar a mano)
```

## Verificado antes de entregarte esto

- `pnpm install` completo sin errores
- `tsc --noEmit` sin errores en todo el proyecto
- `vite build` sin errores
- Migración aplicada contra un Postgres real
- Los 8 tests del proyecto original pasando contra esa base

## Notas

- Guardé tu proyecto original intacto en su carpeta de siempre — esta es una copia nueva e independiente, no se tocó nada de lo viejo.
- El archivo `.env` no se sube a git (ya está en `.gitignore`).
