import { TRPCError } from "@trpc/server";

export type TipoArchivo = "application/pdf" | "image/jpeg" | "image/png";

const rechazar = (msg: string) => new TRPCError({ code: "BAD_REQUEST", message: msg });

// Firmas ("magic bytes") reales de cada formato.
function detectarTipo(b: Buffer): TipoArchivo | null {
  if (b.length >= 5 && b.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  return null;
}

// Contenido activo que un PDF de documentación no necesita (JavaScript, lanzar programas, etc.)
const PDF_PELIGROSO = [/\/JavaScript/i, /\/JS\s*[(<\/]/, /\/Launch/i, /\/EmbeddedFile/i, /\/RichMedia/i, /\/XFA/i];

/**
 * Valida un archivo recibido como data URI base64:
 *  - el tipo declarado debe coincidir con el contenido REAL (no se confía en la extensión ni en el MIME que manda el navegador)
 *  - solo PDF / JPG / PNG
 *  - los PDF no pueden traer JavaScript, acciones automáticas ni archivos incrustados
 *  - tamaño máximo
 */
export function validarArchivo(dataUri: string, maxCaracteres = 14 * 1024 * 1024): { mime: TipoArchivo; tamano: number } {
  const m = /^data:([\w\/+.-]+);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(dataUri);
  if (!m) throw rechazar("Archivo inválido.");
  if (dataUri.length > maxCaracteres) throw rechazar("El archivo es demasiado pesado (máximo 10 MB).");

  const declarado = m[1].toLowerCase();
  const bytes = Buffer.from(m[2], "base64");
  const real = detectarTipo(bytes);

  if (!real) throw rechazar("Solo se permiten archivos PDF, JPG o PNG.");
  if (real !== declarado) throw rechazar("El contenido del archivo no coincide con su tipo. Archivo rechazado.");

  if (real === "application/pdf") {
    const texto = bytes.toString("latin1");
    if (PDF_PELIGROSO.some(re => re.test(texto))) {
      throw rechazar("El PDF contiene elementos activos (scripts o acciones automáticas) y fue rechazado por seguridad.");
    }
  }

  return { mime: real, tamano: dataUri.length };
}
