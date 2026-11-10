# ---------- Imagen base con Node 20 y pnpm ----------
FROM node:20-slim AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# ---------- Instala dependencias ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---------- Compila el cliente (Vite) y el servidor (esbuild) ----------
FROM deps AS build
COPY . .
ARG VITE_APP_ID=sides_production
ARG VITE_APP_TITLE="Sistema de Gestión de Adultos Mayores"
ENV VITE_APP_ID=$VITE_APP_ID
ENV VITE_APP_TITLE=$VITE_APP_TITLE
RUN pnpm run build

# ---------- Imagen final ----------
FROM build AS runner
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Al arrancar: aplica las migraciones pendientes y levanta el servidor.
CMD ["sh", "-c", "pnpm db:migrate && node dist/index.js"]
