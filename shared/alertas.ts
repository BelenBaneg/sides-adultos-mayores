// Plazos máximos de resolución de una alerta según su prioridad.
//  - Crítica: 24 horas corridas
//  - Alta:    48 horas corridas
//  - Media:   5 días corridos
//  - Baja:    10 días hábiles (lunes a viernes; no contempla feriados)

export type Prioridad = "baja" | "media" | "alta" | "critica";

export const PLAZO_TEXTO: Record<Prioridad, string> = {
  critica: "24 horas",
  alta: "48 horas",
  media: "5 días",
  baja: "10 días hábiles",
};

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;

function sumarDiasHabiles(desde: Date, dias: number): Date {
  const fecha = new Date(desde);
  let restantes = dias;
  while (restantes > 0) {
    fecha.setDate(fecha.getDate() + 1);
    const d = fecha.getDay(); // 0 = domingo, 6 = sábado
    if (d !== 0 && d !== 6) restantes--;
  }
  return fecha;
}

export function calcularFechaLimite(prioridad: Prioridad, desde: Date = new Date()): Date {
  switch (prioridad) {
    case "critica":
      return new Date(desde.getTime() + 24 * HORA);
    case "alta":
      return new Date(desde.getTime() + 48 * HORA);
    case "media":
      return new Date(desde.getTime() + 5 * DIA);
    case "baja":
    default:
      return sumarDiasHabiles(desde, 10);
  }
}
