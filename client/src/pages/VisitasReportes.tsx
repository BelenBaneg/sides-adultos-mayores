import { trpc } from "@/lib/trpc";
import {
  Badge,
  Box,
  Button,
  Card,
  Field,
  Flex,
  Heading,
  Input,
  Menu,
  NativeSelect,
  Portal,
  SimpleGrid,
  Skeleton,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FileText, Download, Filter, FileSpreadsheet, FileType, Search, X } from "lucide-react";
import { useState, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const TIPOS_SEGUIMIENTO = [
  { value: "visita", label: "Visita" },
  { value: "reporte_vulnerabilidad", label: "Reporte de Vulnerabilidad" },
  { value: "control_medico", label: "Control Médico" },
  { value: "entrevista_social", label: "Entrevista Social" },
  { value: "otro", label: "Otro" },
];

const TIPOS_ALERTA = [
  { value: "falta_medicacion", label: "Falta de medicación" },
  { value: "salud_critica", label: "Salud crítica" },
  { value: "abandono", label: "Abandono" },
  { value: "abuso_economico", label: "Abuso económico" },
  { value: "abuso_psicologico", label: "Abuso psicológico" },
  { value: "abuso_fisico", label: "Abuso físico" },
  { value: "otro", label: "Otro" },
];

const ESTADOS_ALERTA: Record<string, string> = {
  pendiente: "Pendiente",
  en_atencion: "En atención",
  resuelta: "Resuelta",
};

const tipoPalette: Record<string, string> = {
  visita: "blue.500",
  reporte_vulnerabilidad: "red.500",
  control_medico: "green.500",
  entrevista_social: "purple.500",
  otro: "gray.500",
};

const labelSeguimiento = (tipo: string) => TIPOS_SEGUIMIENTO.find(t => t.value === tipo)?.label ?? tipo;
const labelAlerta = (tipo: string) => TIPOS_ALERTA.find(t => t.value === tipo)?.label ?? tipo;

type Registro = {
  key: string;
  origen: "seguimiento" | "alerta";
  tipoValue: string;
  tipoLabel: string;
  color: string;
  fecha: any;
  adultoMayorId: number;
  descripcion: string;
  responsable: string;
  observaciones: string;
  estado: string;
};

export default function VisitasReportes() {
  const [filtroOrigen, setFiltroOrigen] = useState<string>("todos");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroEstadoAlerta, setFiltroEstadoAlerta] = useState<string>("todos");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState<string>("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState<string>("");

  // Búsqueda dinámica de Adulto Mayor (nombre o DNI)
  const [busquedaAM, setBusquedaAM] = useState("");
  const [adultoSeleccionado, setAdultoSeleccionado] = useState<number | null>(null);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

  const { data: seguimientos, isLoading: cargandoSeg } = trpc.seguimientos.list.useQuery();
  const { data: alertas, isLoading: cargandoAlertas } = trpc.alertas.list.useQuery();
  const { data: adultosMayores } = trpc.adultosMayores.list.useQuery();
  const isLoading = cargandoSeg || cargandoAlertas;

  const sugerencias = useMemo(() => {
    const q = busquedaAM.trim().toLowerCase();
    if (!q) return [];
    return (adultosMayores ?? [])
      .filter((am: any) => {
        const nombreCompleto = `${am.nombre ?? ""} ${am.apellido ?? ""}`.toLowerCase();
        const dni = (am.dni ?? "").toString().toLowerCase();
        return nombreCompleto.includes(q) || dni.includes(q);
      })
      .slice(0, 8);
  }, [adultosMayores, busquedaAM]);

  // Unifica seguimientos y alertas en un mismo listado
  const registros = useMemo<Registro[]>(() => {
    const segs: Registro[] = (seguimientos ?? []).map((s: any) => ({
      key: `s-${s.id}`,
      origen: "seguimiento",
      tipoValue: s.tipoSeguimiento,
      tipoLabel: labelSeguimiento(s.tipoSeguimiento),
      color: tipoPalette[s.tipoSeguimiento] ?? "gray.500",
      fecha: s.fecha,
      adultoMayorId: s.adultoMayorId,
      descripcion: s.descripcion ?? "",
      responsable: s.responsable ?? "",
      observaciones: s.observaciones ?? "",
      estado: "",
    }));
    const als: Registro[] = (alertas ?? []).map((a: any) => ({
      key: `a-${a.id}`,
      origen: "alerta",
      tipoValue: a.tipoAlerta,
      tipoLabel: `Alerta: ${labelAlerta(a.tipoAlerta)}`,
      color: "orange.500",
      fecha: a.fechaDeteccion ?? a.createdAt,
      adultoMayorId: a.adultoMayorId,
      descripcion: a.titulo ? `${a.titulo}${a.descripcion ? " - " + a.descripcion : ""}` : a.descripcion ?? "",
      responsable: a.responsableAtencion ?? "",
      observaciones: a.observacionesResolucion ?? "",
      estado: ESTADOS_ALERTA[a.estado] ?? a.estado ?? "",
    }));
    return [...segs, ...als].sort((x, y) => new Date(y.fecha).getTime() - new Date(x.fecha).getTime());
  }, [seguimientos, alertas]);

  const opcionesTipo = useMemo(() => {
    if (filtroOrigen === "seguimiento") return TIPOS_SEGUIMIENTO;
    if (filtroOrigen === "alerta") return TIPOS_ALERTA;
    return [];
  }, [filtroOrigen]);

  const cambiarOrigen = (valor: string) => {
    setFiltroOrigen(valor);
    setFiltroTipo("todos");
    setFiltroEstadoAlerta("todos");
  };

  const registrosFiltrados = useMemo(() => {
    return registros.filter(r => {
      if (filtroOrigen !== "todos" && r.origen !== filtroOrigen) return false;
      if (filtroTipo !== "todos" && r.tipoValue !== filtroTipo) return false;
      if (filtroEstadoAlerta !== "todos") {
        if (r.origen !== "alerta") return false;
        if (r.estado !== ESTADOS_ALERTA[filtroEstadoAlerta]) return false;
      }
      if (adultoSeleccionado !== null && r.adultoMayorId !== adultoSeleccionado) return false;
      if (filtroFechaDesde && new Date(r.fecha) < new Date(filtroFechaDesde + "T00:00:00")) return false;
      if (filtroFechaHasta && new Date(r.fecha) > new Date(filtroFechaHasta + "T23:59:59")) return false;
      return true;
    });
  }, [registros, filtroOrigen, filtroTipo, filtroEstadoAlerta, adultoSeleccionado, filtroFechaDesde, filtroFechaHasta]);

  const construirFilas = () =>
    registrosFiltrados.map(r => {
      const am = adultosMayores?.find((x: any) => x.id === r.adultoMayorId);
      return {
        tipo: r.tipoLabel,
        fecha: new Date(r.fecha).toLocaleDateString("es-AR"),
        adultoMayor: `${am?.nombre ?? ""} ${am?.apellido ?? ""}`.trim() || "S/D",
        expediente: am?.expediente ?? "S/D",
        estado: r.estado || "-",
        responsable: r.responsable,
        descripcion: r.descripcion,
        observaciones: r.observaciones,
      };
    });

  const descargarArchivo = (contenido: BlobPart, tipoMime: string, nombreArchivo: string) => {
    const blob = new Blob([contenido], { type: tipoMime });
    const url = URL.createObjectURL(blob);
    const elemento = document.createElement("a");
    elemento.href = url;
    elemento.download = nombreArchivo;
    document.body.appendChild(elemento);
    elemento.click();
    document.body.removeChild(elemento);
    URL.revokeObjectURL(url);
  };

  const handleDescargarCSV = () => {
    const filas = construirFilas();
    const headers = ["Tipo", "Fecha", "Adulto Mayor", "Expediente", "Estado", "Responsable", "Descripción", "Observaciones"];
    const escapeCsv = (valor: string) => `"${String(valor).replace(/"/g, '""')}"`;

    const contenido = [headers, ...filas.map(f => [f.tipo, f.fecha, f.adultoMayor, f.expediente, f.estado, f.responsable, f.descripcion, f.observaciones])]
      .map(fila => fila.map(escapeCsv).join(","))
      .join("\r\n");

    // Se antepone BOM para que Excel reconozca los acentos correctamente.
    descargarArchivo("﻿" + contenido, "text/csv;charset=utf-8;", `reporte_visitas_${new Date().toISOString().split("T")[0]}.csv`);
  };

  const handleDescargarPDF = () => {
    const filas = construirFilas();
    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFontSize(15);
    doc.setTextColor(91, 45, 142); // brand.600
    doc.text("Reporte de Visitas, Seguimientos y Alertas", 14, 16);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Fecha de generación: ${new Date().toLocaleString("es-AR")}`, 14, 23);
    doc.text(`Total de registros: ${registrosFiltrados.length}`, 14, 28);

    autoTable(doc, {
      startY: 33,
      head: [["Tipo", "Fecha", "Adulto Mayor", "Expediente", "Estado", "Responsable", "Descripción"]],
      body: filas.map(f => [f.tipo, f.fecha, f.adultoMayor, f.expediente, f.estado, f.responsable, f.descripcion]),
      styles: { fontSize: 8, cellPadding: 2.5, valign: "top" },
      headStyles: { fillColor: [91, 45, 142], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [246, 243, 250] },
      columnStyles: { 6: { cellWidth: 80 } },
    });

    doc.save(`reporte_visitas_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <VStack align="stretch" gap={6}>
      <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} gap={3}>
        <Box>
          <Heading size="2xl" color="heading" display="flex" alignItems="center" gap={2}>
            <FileText size={30} color="var(--chakra-colors-brand-600)" />
            Visitas y Reportes
          </Heading>
          <Text color="gray.500" mt={2}>
            Listado consolidado de seguimientos, reportes y alertas
          </Text>
        </Box>
        <Menu.Root>
          <Menu.Trigger asChild>
            <Button bg="brand.600" color="white" _hover={{ bg: "brand.700" }} disabled={registrosFiltrados.length === 0}>
              <Download size={16} />
              Descargar Reporte
            </Button>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content>
                <Menu.Item value="csv" onClick={handleDescargarCSV} cursor="pointer">
                  <FileSpreadsheet size={16} />
                  Descargar CSV
                </Menu.Item>
                <Menu.Item value="pdf" onClick={handleDescargarPDF} cursor="pointer">
                  <FileType size={16} />
                  Descargar PDF
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </Flex>

      {/* Filtros */}
      <Card.Root>
        <Card.Header>
          <Card.Title display="flex" alignItems="center" gap={2}>
            <Filter size={18} />
            Filtros
          </Card.Title>
        </Card.Header>
        <Card.Body>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
            <Field.Root>
              <Field.Label>Origen</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field value={filtroOrigen} onChange={e => cambiarOrigen(e.target.value)}>
                  <option value="todos">Seguimientos y Alertas</option>
                  <option value="seguimiento">Solo Seguimientos</option>
                  <option value="alerta">Solo Alertas</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>

            <Field.Root>
              <Field.Label>{filtroOrigen === "alerta" ? "Tipo de Alerta" : "Tipo"}</Field.Label>
              <NativeSelect.Root disabled={filtroOrigen === "todos"}>
                <NativeSelect.Field value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                  <option value="todos">{filtroOrigen === "todos" ? "Elegí un origen para filtrar" : "Todos"}</option>
                  {opcionesTipo.map(tipo => (
                    <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>

            <Field.Root>
              <Field.Label>Estado de la Alerta</Field.Label>
              <NativeSelect.Root disabled={filtroOrigen === "seguimiento"}>
                <NativeSelect.Field value={filtroEstadoAlerta} onChange={e => setFiltroEstadoAlerta(e.target.value)}>
                  <option value="todos">Todos</option>
                  {Object.entries(ESTADOS_ALERTA).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>

            <Field.Root>
              <Field.Label>Adulto Mayor</Field.Label>
              <Box position="relative" w="full">
                <Input
                  pl={9}
                  pr={9}
                  placeholder="Buscar por nombre o DNI..."
                  value={busquedaAM}
                  onChange={e => {
                    setBusquedaAM(e.target.value);
                    setAdultoSeleccionado(null);
                    setMostrarSugerencias(true);
                  }}
                  onFocus={() => setMostrarSugerencias(true)}
                  onBlur={() => setTimeout(() => setMostrarSugerencias(false), 150)}
                  autoComplete="off"
                />
                <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="gray.400" pointerEvents="none">
                  <Search size={16} />
                </Box>
                {busquedaAM && (
                  <Box
                    as="button"
                    position="absolute"
                    right={3}
                    top="50%"
                    transform="translateY(-50%)"
                    color="gray.400"
                    cursor="pointer"
                    aria-label="Limpiar búsqueda"
                    onMouseDown={(e: any) => {
                      e.preventDefault();
                      setBusquedaAM("");
                      setAdultoSeleccionado(null);
                    }}
                  >
                    <X size={16} />
                  </Box>
                )}

                {mostrarSugerencias && busquedaAM.trim() && adultoSeleccionado === null && (
                  <Card.Root position="absolute" top="calc(100% + 4px)" left={0} right={0} zIndex={20} maxH="240px" overflowY="auto" boxShadow="lg">
                    <Card.Body p={1}>
                      {sugerencias.length > 0 ? (
                        <VStack align="stretch" gap={0}>
                          {sugerencias.map((am: any) => (
                            <Box
                              key={am.id}
                              px={3}
                              py={2}
                              borderRadius="md"
                              cursor="pointer"
                              _hover={{ bg: "bg.muted" }}
                              onMouseDown={e => {
                                e.preventDefault();
                                setAdultoSeleccionado(am.id);
                                setBusquedaAM(`${am.nombre} ${am.apellido}`);
                                setMostrarSugerencias(false);
                              }}
                            >
                              <Text fontWeight="600" fontSize="sm">{am.nombre} {am.apellido}</Text>
                              <Text fontSize="xs" color="gray.500">DNI: {am.dni}</Text>
                            </Box>
                          ))}
                        </VStack>
                      ) : (
                        <Text px={3} py={2} fontSize="sm" color="gray.500">
                          Sin resultados para "{busquedaAM}"
                        </Text>
                      )}
                    </Card.Body>
                  </Card.Root>
                )}
              </Box>
            </Field.Root>

            <Field.Root>
              <Field.Label>Desde</Field.Label>
              <Input type="date" value={filtroFechaDesde} onChange={e => setFiltroFechaDesde(e.target.value)} />
            </Field.Root>
            <Field.Root>
              <Field.Label>Hasta</Field.Label>
              <Input type="date" value={filtroFechaHasta} onChange={e => setFiltroFechaHasta(e.target.value)} />
            </Field.Root>
          </SimpleGrid>
        </Card.Body>
      </Card.Root>

      {/* Listado */}
      <VStack align="stretch" gap={4}>
        <Heading size="lg">
          Resultados ({registrosFiltrados.length})
        </Heading>

        {isLoading ? (
          <VStack align="stretch" gap={2}>
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} h="10" />)}
          </VStack>
        ) : registrosFiltrados.length > 0 ? (
          <Card.Root>
            <Card.Body p={0} overflowX="auto">
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Tipo</Table.ColumnHeader>
                    <Table.ColumnHeader>Fecha</Table.ColumnHeader>
                    <Table.ColumnHeader>Adulto Mayor</Table.ColumnHeader>
                    <Table.ColumnHeader>Expediente</Table.ColumnHeader>
                    <Table.ColumnHeader>Estado</Table.ColumnHeader>
                    <Table.ColumnHeader>Descripción</Table.ColumnHeader>
                    <Table.ColumnHeader>Responsable</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {registrosFiltrados.map(r => {
                    const am = adultosMayores?.find((x: any) => x.id === r.adultoMayorId);
                    return (
                      <Table.Row key={r.key}>
                        <Table.Cell>
                          <Badge bg={r.color} color="white" whiteSpace="nowrap">
                            {r.tipoLabel}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell whiteSpace="nowrap" fontSize="sm" color="gray.500">
                          {new Date(r.fecha).toLocaleDateString("es-AR")}
                        </Table.Cell>
                        <Table.Cell fontWeight="600" whiteSpace="nowrap">
                          {am ? `${am.nombre} ${am.apellido}` : "N/A"}
                        </Table.Cell>
                        <Table.Cell fontSize="sm" color="gray.500" whiteSpace="nowrap">
                          {am?.expediente || "-"}
                        </Table.Cell>
                        <Table.Cell fontSize="sm" color="gray.500" whiteSpace="nowrap">
                          {r.estado || "-"}
                        </Table.Cell>
                        <Table.Cell fontSize="sm" color="gray.500" maxW="xs" truncate title={r.descripcion}>
                          {r.descripcion}
                        </Table.Cell>
                        <Table.Cell fontSize="sm" color="gray.500" whiteSpace="nowrap">
                          {r.responsable || "-"}
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table.Root>
            </Card.Body>
          </Card.Root>
        ) : (
          <Card.Root>
            <Card.Body>
              <VStack py={12} gap={3}>
                <FileText size={48} color="var(--chakra-colors-gray-300)" />
                <Text color="gray.500">No hay registros que coincidan con los filtros</Text>
              </VStack>
            </Card.Body>
          </Card.Root>
        )}
      </VStack>
    </VStack>
  );
}
