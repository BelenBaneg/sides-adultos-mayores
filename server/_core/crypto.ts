import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

// convierte una contraseña en texto plano en un hash seguro e irreversible
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const buf = scryptSync(password, salt, 64) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// ccompara una contraseña ingresada contra el hash guardado en la base de datos
export function verifyPassword(password: string, storedHash: string): boolean {
  const [hash, salt] = storedHash.split(".");
  if (!hash || !salt) return false;
  
  const hashBuf = Buffer.from(hash, "hex");
  const verifyBuf = scryptSync(password, salt, 64) as Buffer;
  return timingSafeEqual(hashBuf, verifyBuf);
}