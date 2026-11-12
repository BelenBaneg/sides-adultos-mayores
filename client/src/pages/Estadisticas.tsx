import { trpc } from "@/lib/trpc";
import {
  Box,
  Button,
  Card,
  Field,
  Flex,
  Heading,
  HStack,
  Icon,
  IconButton,
  NativeSelect,
  SimpleGrid,
  Skeleton,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  Archive,
  BarChart3,
  Download,
  CalendarRange,
  Filter,
  Landmark,
  LineChart as LineChartIcon,
  MapPin,
  PieChart as PieChartIcon,
  TrendingUp,
  Users,
  UserMinus,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CHART_COLORS = ["#5B2D8E", "#3182CE", "#38A169", "#D69E2E", "#E53E3E", "#319795", "#D53F8C", "#718096", "#DD6B20", "#00B5D8"];

const RANGOS_ETARIOS = [
  { label: "60-69", min: 60, max: 69 },
  { label: "70-79", min: 70, max: 79 },
  { label: "80-89", min: 80, max: 89 },
  { label: "90-99", min: 90, max: 99 },
  { label: "100+", min: 100, max: 999 },
];

type TipoDistribucion = "bar" | "pie";
type TipoTendencia = "bar" | "line";

function calcularEdad(fechaNacimiento: any): number | null {
  if (!fechaNacimiento) return null;
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  if (isNaN(nacimiento.getTime())) return null;
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
}

function agruparPorCampo(lista: any[], campo: string, maxCategorias = 10) {
  const counts: Record<string, number> = {};
  lista.forEach(item => {
    const raw = (item[campo] ?? "").toString().trim();
    const key = raw || "Sin especificar";
    counts[key] = (counts[key] || 0) + 1;
  });
  const ordenado = Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (ordenado.length <= maxCategorias) return ordenado;

  const top = ordenado.slice(0, maxCategorias - 1);
  const restoValue = ordenado.slice(maxCategorias - 1).reduce((acc, cur) => acc + cur.value, 0);
  return [...top, { name: "Otros", value: restoValue }];
}

function valoresUnicos(lista: any[], campo: string) {
  return Array.from(new Set(lista.map(a => (a[campo] ?? "").toString().trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "es")
  );
}

function StatCard({ label, value, icon: IconCmp, loading, accent }: { label: string; value: number; icon: any; loading: boolean; accent?: string }) {
  const color = accent || "brand.600";
  return (
    <Card.Root h="full">
      <Card.Body>
        <Flex justify="space-between" align="flex-start" gap={3}>
          {loading ? (
            <Skeleton h="9" w="14" borderRadius="md" />
          ) : (
            <Text fontSize="4xl" fontWeight="800" color={color} lineHeight="1" letterSpacing="tight" mt="1">
              {value}
            </Text>
          )}
          <VStack gap={1.5} align="flex-end">
            <Flex boxSize="9" borderRadius="lg" bg={`${color.split(".")[0]}.50`} align="center" justify="center" flexShrink={0}>
              <Icon color={color}>
                <IconCmp size={17} />
              </Icon>
            </Flex>
            <Text fontSize="xs" color="gray.500" fontWeight="600" textAlign="right" lineHeight="1.2" maxW="32">
              {label}
            </Text>
          </VStack>
        </Flex>
      </Card.Body>
    </Card.Root>
  );
}

function ToggleTipoGrafico({
  tipo,
  onChange,
  opciones,
}: {
  tipo: string;
  onChange: (t: any) => void;
  opciones: { value: string; icon: any; label: string }[];
}) {
  return (
    <HStack gap={1}>
      {opciones.map(op => (
        <IconButton
          key={op.value}
          aria-label={op.label}
          title={op.label}
          size="xs"
          variant={tipo === op.value ? "solid" : "ghost"}
          bg={tipo === op.value ? "brand.600" : undefined}
          color={tipo === op.value ? "white" : "gray.500"}
          _hover={tipo === op.value ? { bg: "brand.700" } : { bg: "bg.muted" }}
          onClick={() => onChange(op.value)}
        >
          <op.icon size={14} />
        </IconButton>
      ))}
    </HStack>
  );
}

function ChartCard({
  title,
  icon: IconCmp,
  children,
  empty,
  toggle,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
  empty?: boolean;
  toggle?: React.ReactNode;
}) {
  return (
    <Card.Root h="full">
      <Card.Header py={3}>
        <Flex justify="space-between" align="center" gap={2}>
          <Card.Title display="flex" alignItems="center" gap={2} fontSize="md">
            <Icon color="brand.600">
              <IconCmp size={16} />
            </Icon>
            {title}
          </Card.Title>
          {toggle}
        </Flex>
      </Card.Header>
      <Card.Body pt={0}>
        {empty ? (
          <Flex h="260px" align="center" justify="center" color="gray.400" fontSize="sm">
            Sin datos suficientes todavía
          </Flex>
        ) : (
          children
        )}
      </Card.Body>
    </Card.Root>
  );
}

function DistribucionChart({ data, tipo, color }: { data: { name: string; value: number }[]; tipo: TipoDistribucion; color: string }) {
  if (tipo === "pie") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(d: any) => `${d.name}: ${d.value}`}>
            {data.map((_, idx) => (
              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} fontSize={11} />
        <YAxis type="category" dataKey="name" width={110} fontSize={11} />
        <Tooltip />
        <Bar dataKey="value" name="Adultos Mayores" fill={color} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const TIPOS_DISTRIBUCION = [
  { value: "bar", icon: BarChart3, label: "Barras" },
  { value: "pie", icon: PieChartIcon, label: "Torta" },
];

const TIPOS_TENDENCIA = [
  { value: "bar", icon: BarChart3, label: "Barras" },
  { value: "line", icon: LineChartIcon, label: "Líneas" },
];

export default function Estadisticas() {
  const { data: todos, isLoading } = trpc.estadisticas.data.useQuery();

  const [tipoBarrio, setTipoBarrio] = useState<TipoDistribucion>("bar");
  const [tipoLocalidad, setTipoLocalidad] = useState<TipoDistribucion>("bar");
  const [tipoGenero, setTipoGenero] = useState<TipoDistribucion>("pie");
  const [tipoEtario, setTipoEtario] = useState<TipoDistribucion>("bar");
  const [tipoMovimientos, setTipoMovimientos] = useState<TipoTendencia>("bar");

  const [filtroLocalidad, setFiltroLocalidad] = useState("todas");
  const [filtroBarrio, setFiltroBarrio] = useState("todos");
  const [filtroGenero, setFiltroGenero] = useState("todos");
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");

  const opcionesLocalidad = useMemo(() => valoresUnicos(todos ?? [], "localidad"), [todos]);
  const opcionesBarrio = useMemo(() => valoresUnicos(todos ?? [], "barrio"), [todos]);
  const opcionesGenero = useMemo(() => valoresUnicos(todos ?? [], "genero"), [todos]);

  const hayFiltrosActivos = filtroLocalidad !== "todas" || filtroBarrio !== "todos" || filtroGenero !== "todos" || !!filtroDesde || !!filtroHasta;

  const limpiarFiltros = () => {
    setFiltroLocalidad("todas");
    setFiltroBarrio("todos");
    setFiltroGenero("todos");
    setFiltroDesde("");
    setFiltroHasta("");
  };

  const datosFiltrados = useMemo(() => {
    return (todos ?? []).filter((a: any) => {
      if (filtroLocalidad !== "todas" && (a.localidad?.trim() || "Sin especificar") !== filtroLocalidad) return false;
      if (filtroBarrio !== "todos" && (a.barrio?.trim() || "Sin especificar") !== filtroBarrio) return false;
      if (filtroGenero !== "todos" && (a.genero?.trim() || "Sin especificar") !== filtroGenero) return false;
      if (filtroDesde) {
        if (!a.createdAt || new Date(a.createdAt) < new Date(filtroDesde)) return false;
      }
      if (filtroHasta) {
        if (!a.createdAt || new Date(a.createdAt) > new Date(filtroHasta + "T23:59:59")) return false;
      }
      return true;
    });
  }, [todos, filtroLocalidad, filtroBarrio, filtroGenero, filtroDesde, filtroHasta]);

  const activos = useMemo(() => datosFiltrados.filter((a: any) => a.activo), [datosFiltrados]);
  const bajas = useMemo(() => datosFiltrados.filter((a: any) => !a.activo), [datosFiltrados]);

  const porBarrio = useMemo(() => agruparPorCampo(activos, "barrio"), [activos]);
  const porLocalidad = useMemo(() => agruparPorCampo(activos, "localidad"), [activos]);
  const porGenero = useMemo(() => agruparPorCampo(activos, "genero", 6), [activos]);

  const porRangoEtario = useMemo(() => {
    const counts = RANGOS_ETARIOS.map(r => ({ name: r.label, value: 0 }));
    activos.forEach((a: any) => {
      const edad = calcularEdad(a.fechaNacimiento);
      if (edad === null) return;
      const idx = RANGOS_ETARIOS.findIndex(r => edad >= r.min && edad <= r.max);
      if (idx >= 0) counts[idx].value++;
    });
    return counts;
  }, [activos]);

  const movimientosPorMes = useMemo(() => {
    const map: Record<string, { mes: string; altas: number; bajas: number; sortKey: string }> = {};

    const registrar = (fecha: any, tipo: "altas" | "bajas") => {
      if (!fecha) return;
      const d = new Date(fecha);
      if (isNaN(d.getTime())) return;
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("es-AR", { month: "short", year: "2-digit" });
      if (!map[sortKey]) map[sortKey] = { mes: label, altas: 0, bajas: 0, sortKey };
      map[sortKey][tipo]++;
    };

    datosFiltrados.forEach((a: any) => registrar(a.createdAt, "altas"));
    datosFiltrados.forEach((a: any) => registrar(a.fechaBaja, "bajas"));

    return Object.values(map)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .slice(-12);
  }, [datosFiltrados]);

  const handleExportarPDF = () => {
    const ahora = new Date();
    const fechaExport = ahora.toLocaleString("es-AR");
    const doc = new jsPDF({ orientation: "portrait" });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.setTextColor(91, 45, 142);
    doc.text("SIDES - Estadísticas de Adultos Mayores", 14, 16);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Ministerio de Desarrollo Social - Santiago del Estero", 14, 22);
    doc.text(`Fecha de exportación: ${fechaExport}`, pageWidth - 14, 16, { align: "right" });

    const filtrosTxt = [
      `Localidad: ${filtroLocalidad === "todas" ? "Todas" : filtroLocalidad}`,
      `Barrio: ${filtroBarrio === "todos" ? "Todos" : filtroBarrio}`,
      `Género: ${filtroGenero === "todos" ? "Todos" : filtroGenero}`,
      `Ingresó desde: ${filtroDesde ? new Date(filtroDesde + "T00:00:00").toLocaleDateString("es-AR") : "-"}`,
      `Ingresó hasta: ${filtroHasta ? new Date(filtroHasta + "T00:00:00").toLocaleDateString("es-AR") : "-"}`,
    ].join("   |   ");
    doc.text(`Filtros aplicados: ${filtrosTxt}`, 14, 28, { maxWidth: pageWidth - 28 });

    const estiloTabla = {
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [91, 45, 142] as [number, number, number], textColor: 255, fontStyle: "bold" as const },
      alternateRowStyles: { fillColor: [246, 243, 250] as [number, number, number] },
    };

    const ingresosMes = datosFiltrados.filter((a: any) => {
      if (!a.createdAt) return false;
      const d = new Date(a.createdAt);
      return d.getFullYear() === ahora.getFullYear() && d.getMonth() === ahora.getMonth();
    }).length;

    autoTable(doc, {
      startY: 36,
      head: [["Indicador", "Cantidad"]],
      body: [
        ["Adultos mayores activos", String(activos.length)],
        ["Dados de baja", String(bajas.length)],
        ["Total (con estos filtros)", String(datosFiltrados.length)],
        ["Ingresos este mes", String(ingresosMes)],
      ],
      ...estiloTabla,
    });

    const agregarDistribucion = (titulo: string, datos: { name: string; value: number }[], columna: string) => {
      const total = datos.reduce((acc, d) => acc + d.value, 0);
      let y = (doc as any).lastAutoTable.finalY + 10;
      if (y > 255) {
        doc.addPage();
        y = 18;
      }
      doc.setFontSize(12);
      doc.setTextColor(91, 45, 142);
      doc.text(titulo, 14, y);
      autoTable(doc, {
        startY: y + 3,
        head: [[columna, "Cantidad", "Porcentaje"]],
        body: datos.length
          ? datos.map(d => [d.name, String(d.value), total ? `${((d.value / total) * 100).toFixed(1)}%` : "0%"])
          : [["Sin datos", "-", "-"]],
        ...estiloTabla,
      });
    };

    agregarDistribucion("Distribución por Barrio", porBarrio, "Barrio");
    agregarDistribucion("Distribución por Localidad", porLocalidad, "Localidad");
    agregarDistribucion("Distribución por Género", porGenero, "Género");
    agregarDistribucion("Distribución por Rango Etario", porRangoEtario, "Rango");

    // Ingresos y bajas por mes
    {
      let y = (doc as any).lastAutoTable.finalY + 10;
      if (y > 255) {
        doc.addPage();
        y = 18;
      }
      doc.setFontSize(12);
      doc.setTextColor(91, 45, 142);
      doc.text("Ingresos y Bajas por Mes", 14, y);
      autoTable(doc, {
        startY: y + 3,
        head: [["Mes", "Ingresos", "Bajas"]],
        body: movimientosPorMes.length
          ? movimientosPorMes.map(m => [m.mes, String(m.altas), String(m.bajas)])
          : [["Sin datos", "-", "-"]],
        ...estiloTabla,
      });
    }

    // Pie de página con fecha de exportación y número de página
    const totalPaginas = doc.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i++) {
      doc.setPage(i);
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(130);
      doc.text(`Exportado el ${fechaExport}`, 14, h - 8);
      doc.text(`Página ${i} de ${totalPaginas}`, pageWidth - 14, h - 8, { align: "right" });
    }

    doc.save(`estadisticas_${ahora.toISOString().split("T")[0]}.pdf`);
  };

  return (
    <VStack align="stretch" gap={6}>
      <Flex justify="space-between" align="flex-start" gap={3} wrap="wrap">
        <Box>
          <Heading size="2xl" color="heading" display="flex" alignItems="center" gap={2}>
            <BarChart3 size={30} color="var(--chakra-colors-brand-600)" />
            Estadísticas
          </Heading>
          <Text color="gray.500" mt={2}>
            Indicadores generales sobre los adultos mayores registrados
          </Text>
        </Box>
        <Button
          bg="brand.600"
          color="white"
          _hover={{ bg: "brand.700" }}
          onClick={handleExportarPDF}
          disabled={isLoading}
        >
          <Download size={16} /> Exportar PDF
        </Button>
      </Flex>

      <Card.Root>
        <Card.Body py={4}>
          <Flex justify="space-between" align="center" mb={3}>
            <HStack gap={2} color="gray.600" fontWeight="600" fontSize="sm">
              <Filter size={15} />
              <Text>Filtros</Text>
            </HStack>
            {hayFiltrosActivos && (
              <Button size="xs" variant="ghost" color="gray.500" onClick={limpiarFiltros}>
                <X size={13} /> Limpiar filtros
              </Button>
            )}
          </Flex>
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 5 }} gap={3}>
            <Field.Root>
              <Field.Label fontSize="xs">Localidad</Field.Label>
              <NativeSelect.Root size="sm">
                <NativeSelect.Field value={filtroLocalidad} onChange={e => setFiltroLocalidad(e.target.value)}>
                  <option value="todas">Todas</option>
                  {opcionesLocalidad.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>

            <Field.Root>
              <Field.Label fontSize="xs">Barrio</Field.Label>
              <NativeSelect.Root size="sm">
                <NativeSelect.Field value={filtroBarrio} onChange={e => setFiltroBarrio(e.target.value)}>
                  <option value="todos">Todos</option>
                  {opcionesBarrio.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>

            <Field.Root>
              <Field.Label fontSize="xs">Género</Field.Label>
              <NativeSelect.Root size="sm">
                <NativeSelect.Field value={filtroGenero} onChange={e => setFiltroGenero(e.target.value)}>
                  <option value="todos">Todos</option>
                  {opcionesGenero.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>

            <Field.Root>
              <Field.Label fontSize="xs">Ingresó desde</Field.Label>
              <input
                type="date"
                value={filtroDesde}
                onChange={e => setFiltroDesde(e.target.value)}
                style={{
                  width: "100%",
                  fontSize: "14px",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--chakra-colors-border)",
                  background: "transparent",
                  color: "inherit",
                }}
              />
            </Field.Root>

            <Field.Root>
              <Field.Label fontSize="xs">Ingresó hasta</Field.Label>
              <input
                type="date"
                value={filtroHasta}
                onChange={e => setFiltroHasta(e.target.value)}
                style={{
                  width: "100%",
                  fontSize: "14px",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--chakra-colors-border)",
                  background: "transparent",
                  color: "inherit",
                }}
              />
            </Field.Root>
          </SimpleGrid>
        </Card.Body>
      </Card.Root>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={3}>
        <StatCard label="Adultos Mayores Activos" value={activos.length} icon={Users} loading={isLoading} />
        <StatCard label="Dados de Baja" value={bajas.length} icon={UserMinus} loading={isLoading} accent="red.600" />
        <StatCard label="Total (con estos filtros)" value={datosFiltrados.length} icon={Archive} loading={isLoading} accent="gray.600" />
        <StatCard
          label="Ingresos Este Mes"
          value={
            datosFiltrados.filter((a: any) => {
              if (!a.createdAt) return false;
              const d = new Date(a.createdAt);
              const hoy = new Date();
              return d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth();
            }).length
          }
          icon={TrendingUp}
          loading={isLoading}
          accent="green.600"
        />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4} alignItems="start">
        <ChartCard
          title="Distribución por Barrio"
          icon={MapPin}
          empty={!isLoading && porBarrio.length === 0}
          toggle={<ToggleTipoGrafico tipo={tipoBarrio} onChange={setTipoBarrio} opciones={TIPOS_DISTRIBUCION} />}
        >
          <Box h="300px">
            <DistribucionChart data={porBarrio} tipo={tipoBarrio} color="#5B2D8E" />
          </Box>
        </ChartCard>

        <ChartCard
          title="Distribución por Localidad"
          icon={Landmark}
          empty={!isLoading && porLocalidad.length === 0}
          toggle={<ToggleTipoGrafico tipo={tipoLocalidad} onChange={setTipoLocalidad} opciones={TIPOS_DISTRIBUCION} />}
        >
          <Box h="300px">
            <DistribucionChart data={porLocalidad} tipo={tipoLocalidad} color="#3182CE" />
          </Box>
        </ChartCard>

        <ChartCard
          title="Distribución por Género"
          icon={PieChartIcon}
          empty={!isLoading && porGenero.length === 0}
          toggle={<ToggleTipoGrafico tipo={tipoGenero} onChange={setTipoGenero} opciones={TIPOS_DISTRIBUCION} />}
        >
          <Box h="300px">
            <DistribucionChart data={porGenero} tipo={tipoGenero} color="#D53F8C" />
          </Box>
        </ChartCard>

        <ChartCard
          title="Distribución por Rango Etario"
          icon={CalendarRange}
          empty={!isLoading && activos.length === 0}
          toggle={<ToggleTipoGrafico tipo={tipoEtario} onChange={setTipoEtario} opciones={TIPOS_DISTRIBUCION} />}
        >
          <Box h="300px">
            <DistribucionChart data={porRangoEtario} tipo={tipoEtario} color="#38A169" />
          </Box>
        </ChartCard>

        <Box gridColumn={{ lg: "span 2" }}>
          <ChartCard
            title="Ingresos y Bajas por Mes"
            icon={TrendingUp}
            empty={!isLoading && movimientosPorMes.length === 0}
            toggle={<ToggleTipoGrafico tipo={tipoMovimientos} onChange={setTipoMovimientos} opciones={TIPOS_TENDENCIA} />}
          >
            <Box h="300px">
              <ResponsiveContainer width="100%" height="100%">
                {tipoMovimientos === "line" ? (
                  <LineChart data={movimientosPorMes} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="mes" fontSize={11} />
                    <YAxis allowDecimals={false} fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="altas" name="Ingresos" stroke="#38A169" strokeWidth={2} />
                    <Line type="monotone" dataKey="bajas" name="Bajas" stroke="#E53E3E" strokeWidth={2} />
                  </LineChart>
                ) : (
                  <BarChart data={movimientosPorMes} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="mes" fontSize={11} />
                    <YAxis allowDecimals={false} fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="altas" name="Ingresos" fill="#38A169" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="bajas" name="Bajas" fill="#E53E3E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </Box>
          </ChartCard>
        </Box>
      </SimpleGrid>
    </VStack>
  );
}
