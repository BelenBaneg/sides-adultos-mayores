// Utilidades para cargar y abrir archivos adjuntos (PDF / imágenes) guardados como data URI.

export const TIPOS_PERMITIDOS = ["application/pdf", "image/jpeg", "image/png"];

// Los PDF se suben tal cual. Las fotos se reducen (máx. 1800 px) y se pasan a JPG para que pesen menos.
export function prepararArchivo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (file.type === "application/pdf") return resolve(dataUrl);
      const img = new window.Image();
      img.onerror = () => reject(new Error("No se pudo leer la imagen"));
      img.onload = () => {
        const escala = Math.min(1, 1800 / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(dataUrl);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

// Los data URI no se pueden abrir directo en una pestaña: se convierten en un blob temporal.
export async function abrirArchivo(dataUri: string, nombre: string, descargar: boolean) {
  const blob = await (await fetch(dataUri)).blob();
  const url = URL.createObjectURL(blob);
  if (descargar) {
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } else {
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}
