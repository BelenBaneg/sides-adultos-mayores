import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type RequisitoLegajo = { key: string; label: string };
export type DocumentoLegajo = { archivo: string; nombreArchivo: string } | null;

type Item = {
  label: string;
  estado: "cargado" | "pendiente" | "error";
  nombreArchivo: string;
  doc?: PDFDocument; // PDF ya cargado
  imagen?: { bytes: Uint8Array; esPng: boolean };
  paginas: number;
};

const A4 = { w: 595.28, h: 841.89 };

async function dataUriABytes(dataUri: string): Promise<Uint8Array> {
  const buf = await (await fetch(dataUri)).arrayBuffer();
  return new Uint8Array(buf);
}

function crearPortada(
  datosResidencia: { label: string; value: string }[],
  titulo: string,
  items: Item[],
  paginaInicial: number
): Uint8Array {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margen = 40;

  doc.setFontSize(18);
  doc.setTextColor(91, 45, 142);
  doc.text("Legajo de Habilitación", margen, 50);
  doc.setFontSize(13);
  doc.setTextColor(30);
  doc.text(titulo, margen, 72);

  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(`Ministerio de Desarrollo Social - Santiago del Estero`, margen, 88);
  doc.text(`Fecha de exportación: ${new Date().toLocaleString("es-AR")}`, A4.w - margen, 88, { align: "right" });

  autoTable(doc, {
    startY: 102,
    body: datosResidencia.map(d => [d.label, d.value || "-"]),
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 120, textColor: [90, 90, 90] } },
  });

  const cargados = items.filter(i => i.estado === "cargado").length;
  const yTabla = ((doc as any).lastAutoTable?.finalY ?? 160) + 18;
  doc.setFontSize(11);
  doc.setTextColor(91, 45, 142);
  doc.text(`Documentación presentada: ${cargados} de ${items.length}`, margen, yTabla);

  let pagina = paginaInicial;
  const filas = items.map((i, idx) => {
    let desde = "-";
    if (i.estado === "cargado") {
      desde = i.paginas > 1 ? `${pagina}-${pagina + i.paginas - 1}` : `${pagina}`;
      pagina += i.paginas;
    }
    const estado = i.estado === "cargado" ? "Cargado" : i.estado === "error" ? "No se pudo incluir" : "PENDIENTE";
    return [String(idx + 1), i.label, estado, i.nombreArchivo || "-", desde];
  });

  autoTable(doc, {
    startY: yTabla + 8,
    head: [["N°", "Requisito", "Estado", "Archivo", "Páginas"]],
    body: filas,
    styles: { fontSize: 8.5, cellPadding: 4, valign: "middle" },
    headStyles: { fillColor: [91, 45, 142], textColor: 255 },
    alternateRowStyles: { fillColor: [246, 243, 250] },
    columnStyles: { 0: { cellWidth: 26 }, 2: { cellWidth: 80 }, 4: { cellWidth: 50 } },
    didParseCell: data => {
      if (data.section === "body" && data.column.index === 2) {
        const t = String(data.cell.raw);
        if (t === "Cargado") data.cell.styles.textColor = [22, 130, 70];
        else data.cell.styles.textColor = [200, 80, 20];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  return new Uint8Array(doc.output("arraybuffer"));
}

export async function generarLegajoResidenciaPdf(opts: {
  titulo: string;
  datos: { label: string; value: string }[];
  requisitos: RequisitoLegajo[];
  obtenerDocumento: (key: string) => Promise<DocumentoLegajo>;
}): Promise<Blob> {
  // 1) Traer y analizar cada documento
  const items: Item[] = [];
  for (const req of opts.requisitos) {
    const item: Item = { label: req.label, estado: "pendiente", nombreArchivo: "", paginas: 0 };
    try {
      const d = await opts.obtenerDocumento(req.key);
      if (d) {
        item.nombreArchivo = d.nombreArchivo;
        const bytes = await dataUriABytes(d.archivo);
        if (d.archivo.startsWith("data:application/pdf")) {
          const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
          item.doc = pdf;
          item.paginas = pdf.getPageCount();
        } else {
          item.imagen = { bytes, esPng: d.archivo.startsWith("data:image/png") };
          item.paginas = 1;
        }
        item.estado = "cargado";
      }
    } catch {
      item.estado = "error";
      item.paginas = 0;
    }
    items.push(item);
  }

  // 2) Portada (si ocupa más de una página, se vuelve a generar con la numeración correcta)
  let portada = crearPortada(opts.datos, opts.titulo, items, 2);
  let portadaDoc = await PDFDocument.load(portada);
  if (portadaDoc.getPageCount() > 1) {
    portada = crearPortada(opts.datos, opts.titulo, items, portadaDoc.getPageCount() + 1);
    portadaDoc = await PDFDocument.load(portada);
  }

  // 3) Armar el PDF final
  const final = await PDFDocument.create();
  const paginasPortada = await final.copyPages(portadaDoc, portadaDoc.getPageIndices());
  paginasPortada.forEach(p => final.addPage(p));
  const fuente = await final.embedFont(StandardFonts.Helvetica);

  for (const item of items) {
    if (item.estado !== "cargado") continue;

    if (item.doc) {
      const paginas = await final.copyPages(item.doc, item.doc.getPageIndices());
      paginas.forEach(p => final.addPage(p));
    } else if (item.imagen) {
      const img = item.imagen.esPng ? await final.embedPng(item.imagen.bytes) : await final.embedJpg(item.imagen.bytes);
      const page = final.addPage([A4.w, A4.h]);
      page.drawText(item.label.slice(0, 95), { x: 36, y: A4.h - 34, size: 10, font: fuente, color: rgb(0.35, 0.18, 0.56) });
      const maxW = A4.w - 72;
      const maxH = A4.h - 100;
      const escala = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = img.width * escala;
      const h = img.height * escala;
      page.drawImage(img, { x: (A4.w - w) / 2, y: A4.h - 56 - h, width: w, height: h });
    }
  }

  const bytes = await final.save();
  return new Blob([bytes], { type: "application/pdf" });
}
