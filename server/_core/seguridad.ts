import type { NextFunction, Request, Response } from "express";

/* ------------------------------------------------------------------ */
/* 1) Límite de intentos de login (protección contra fuerza bruta)     */
/* ------------------------------------------------------------------ */

const MAX_INTENTOS = 5; // intentos fallidos permitidos
const VENTANA_MS = 15 * 60 * 1000; // dentro de 15 minutos
const BLOQUEO_MS = 15 * 60 * 1000; // bloqueo de 15 minutos

type Registro = { fallos: number[]; bloqueadoHasta: number };
const registros = new Map<string, Registro>();

const clave = (ip: string, email: string) => `${ip}|${email.trim().toLowerCase()}`;

function limpiar(r: Registro, ahora: number) {
  r.fallos = r.fallos.filter(t => ahora - t < VENTANA_MS);
}

// Devuelve los minutos restantes de bloqueo (0 si puede intentar).
export function minutosDeBloqueo(ip: string, email: string): number {
  const r = registros.get(clave(ip, email));
  if (!r) return 0;
  const ahora = Date.now();
  if (r.bloqueadoHasta > ahora) return Math.ceil((r.bloqueadoHasta - ahora) / 60000);
  return 0;
}

export function registrarFalloLogin(ip: string, email: string) {
  const k = clave(ip, email);
  const ahora = Date.now();
  const r = registros.get(k) ?? { fallos: [], bloqueadoHasta: 0 };
  limpiar(r, ahora);
  r.fallos.push(ahora);
  if (r.fallos.length >= MAX_INTENTOS) {
    r.bloqueadoHasta = ahora + BLOQUEO_MS;
    r.fallos = [];
  }
  registros.set(k, r);
}

export function registrarLoginExitoso(ip: string, email: string) {
  registros.delete(clave(ip, email));
}

// Limpieza periódica para que el mapa no crezca indefinidamente.
setInterval(() => {
  const ahora = Date.now();
  for (const [k, r] of registros) {
    limpiar(r, ahora);
    if (r.fallos.length === 0 && r.bloqueadoHasta < ahora) registros.delete(k);
  }
}, 10 * 60 * 1000).unref();

/* ------------------------------------------------------------------ */
/* 2) Límite general de peticiones por IP a la API                     */
/* ------------------------------------------------------------------ */

const PETICIONES_MAX = 600; // por minuto y por IP
const contadores = new Map<string, { cuenta: number; reinicio: number }>();

export function limitarPeticiones(req: Request, res: Response, next: NextFunction) {
  const ip = (req.ip || req.socket?.remoteAddress || "desconocida").toString();
  const ahora = Date.now();
  const c = contadores.get(ip);
  if (!c || c.reinicio < ahora) {
    contadores.set(ip, { cuenta: 1, reinicio: ahora + 60_000 });
    return next();
  }
  c.cuenta++;
  if (c.cuenta > PETICIONES_MAX) {
    res.setHeader("Retry-After", Math.ceil((c.reinicio - ahora) / 1000).toString());
    return res.status(429).json({ error: "Demasiadas solicitudes. Intentá de nuevo en un minuto." });
  }
  next();
}

setInterval(() => {
  const ahora = Date.now();
  for (const [ip, c] of contadores) if (c.reinicio < ahora) contadores.delete(ip);
}, 5 * 60 * 1000).unref();

/* ------------------------------------------------------------------ */
/* 3) Encabezados de seguridad HTTP                                    */
/* ------------------------------------------------------------------ */

export function encabezadosSeguridad(req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff"); // el navegador no "adivina" tipos de archivo
  res.setHeader("X-Frame-Options", "DENY"); // evita que otro sitio incruste el sistema (clickjacking)
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Content-Security-Policy", "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'");
  res.removeHeader("X-Powered-By");
  const https = req.protocol === "https" || String(req.headers["x-forwarded-proto"] ?? "").includes("https");
  if (https) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
}

/* ------------------------------------------------------------------ */
/* 4) Contraseñas: política mínima                                     */
/* ------------------------------------------------------------------ */

export const MENSAJE_PASSWORD = "La contraseña debe tener al menos 8 caracteres, con letras y números.";

export function passwordValida(p: string): boolean {
  return p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);
}
