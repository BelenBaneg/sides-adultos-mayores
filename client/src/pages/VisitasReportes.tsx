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
import { FileText, Download, Filter, FileSpreadsheet, FileType } from "lucide-react";
import { useState, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function VisitasReportes() {
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroAdultoMayor, setFiltroAdultoMayor] = useState<string>("todos");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState<string>("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState<string>("");

  const { data: seguimientos, isLoading } = trpc.seguimientos.list.useQuery();
  const { data: adultosMayores } = trpc.adultosMayores.list.useQuery();

  const tiposSegumiento = [
    { value: "visita", label: "Visita" },
    { value: "reporte_vulnerabilidad", label: "Reporte de Vulnerabilidad" },
    { value: "control_medico", label: "Control Médico" },
    { value: "entrevista_social", label: "Entrevista Social" },
    { value: "otro", label: "Otro" },
  ];

  const tipoPalette: Record<string, string> = {
    visita: "blue.500",
    reporte_vulnerabilidad: "red.500",
    control_medico: "green.500",
    entrevista_social: "purple.500",
    otro: "gray.500",
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      visita: "Visita",
      reporte_vulnerabilidad: "Reporte de Vulnerabilidad",
      control_medico: "Control Médico",
      entrevista_social: "Entrevista Social",
      otro: "Otro"
    };
    return labels[tipo] || tipo;
  };

  // Filtrar seguimientos
  const seguimientosFiltrados = useMemo(() => {
    if (!seguimientos) return [];

    return seguimientos.filter((seg: any) => {
      // Filtro por tipo
      if (filtroTipo !== "todos" && seg.tipoSeguimiento !== filtroTipo) {
        return false;
      }

      // Filtro por adulto mayor
      if (filtroAdultoMayor !== "todos" && seg.adultoMayorId !== Number(filtroAdultoMayor)) {
        return false;
      }

      // Filtro por fecha desde
      if (filtroFechaDesde) {
        const fechaSeg = new Date(seg.fecha);
        const fechaDesde = new Date(filtroFechaDesde);
        if (fechaSeg < fechaDesde) {
          return false;
        }
      }

      // Filtro por fecha hasta
      if (filtroFechaHasta) {
        const fechaSeg = new Date(seg.fecha);
        const fechaHasta = new Date(filtroFechaHasta);
        if (fechaSeg > fechaHasta) {
          return false;
        }
      }

      return true;
    });
  }, [seguimientos, filtroTipo, filtroAdultoMayor, filtroFechaDesde, filtroFechaHasta]);

  const construirFilas = () =>
    seguimientosFiltrados.map((seg: any) => {
      const adultoMayor = adultosMayores?.find((am: any) => am.id === seg.adultoMayorId);
      return {
        tipo: getTipoLabel(seg.tipoSeguimiento),
        fecha: new Date(seg.fecha).toLocaleDateString("es-AR"),
        adultoMayor: `${adultoMayor?.nombre ?? ""} ${adultoMayor?.apellido ?? ""}`.trim() || "S/D",
        expediente: adultoMayor?.expediente ?? "S/D",
        responsable: seg.responsable ?? "",
        descripcion: seg.descripcion ?? "",
        observaciones: seg.observaciones ?? "",
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
    const headers = ["Tipo", "Fecha", "Adulto Mayor", "Expediente", "Responsable", "Descripción", "Observaciones"];
    const escapeCsv = (valor: string) => `"${String(valor).replace(/"/g, '""')}"`;

    const contenido = [headers, ...filas.map(f => [f.tipo, f.fecha, f.adultoMayor, f.expediente, f.responsable, f.descripcion, f.observaciones])]
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
    doc.text("Reporte de Visitas y Seguimientos", 14, 16);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Fecha de generación: ${new Date().toLocaleString("es-AR")}`, 14, 23);
    doc.text(`Total de registros: ${seguimientosFiltrados.length}`, 14, 28);

    autoTable(doc, {
      startY: 33,
      head: [["Tipo", "Fecha", "Adulto Mayor", "Expediente", "Responsable", "Descripción"]],
      body: filas.map(f => [f.tipo, f.fecha, f.adultoMayor, f.expediente, f.responsable, f.descripcion]),
      styles: { fontSize: 8, cellPadding: 2.5, valign: "top" },
      headStyles: { fillColor: [91, 45, 142], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [246, 243, 250] },
      columnStyles: { 5: { cellWidth: 90 } },
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
            Listado consolidado de seguimientos y reportes
          </Text>
        </Box>
        <Menu.Root>
          <Menu.Trigger asChild>
            <Button bg="brand.600" color="white" _hover={{ bg: "brand.700" }} disabled={seguimientosFiltrados.length === 0}>
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
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={4}>
            <Field.Root>
              <Field.Label>Tipo de Seguimiento</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                  <option value="todos">Todos</option>
                  {tiposSegumiento.map(tipo => (
                    <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>
            <Field.Root>
              <Field.Label>Adulto Mayor</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field value={filtroAdultoMayor} onChange={e => setFiltroAdultoMayor(e.target.value)}>
                  <option value="todos">Todos</option>
                  {adultosMayores?.map((am: any) => (
                    <option key={am.id} value={am.id.toString()}>{am.nombre} {am.apellido}</option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
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

      {/* Listado de seguimientos */}
      <VStack align="stretch" gap={4}>
        <Heading size="lg">
          Resultados ({seguimientosFiltrados.length})
        </Heading>

        {isLoading ? (
          <VStack align="stretch" gap={2}>
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} h="10" />)}
          </VStack>
        ) : seguimientosFiltrados.length > 0 ? (
          <Card.Root>
            <Card.Body p={0} overflowX="auto">
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Tipo</Table.ColumnHeader>
                    <Table.ColumnHeader>Fecha</Table.ColumnHeader>
                    <Table.ColumnHeader>Adulto Mayor</Table.ColumnHeader>
                    <Table.ColumnHeader>Expediente</Table.ColumnHeader>
                    <Table.ColumnHeader>Descripción</Table.ColumnHeader>
                    <Table.ColumnHeader>Responsable</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {seguimientosFiltrados.map((seguimiento: any) => {
                    const adultoMayor = adultosMayores?.find((am: any) => am.id === seguimiento.adultoMayorId);
                    return (
                      <Table.Row key={seguimiento.id}>
                        <Table.Cell>
                          <Badge bg={tipoPalette[seguimiento.tipoSeguimiento] ?? "gray.500"} color="white">
                            {getTipoLabel(seguimiento.tipoSeguimiento)}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell whiteSpace="nowrap" fontSize="sm" color="gray.500">
                          {new Date(seguimiento.fecha).toLocaleDateString('es-AR')}
                        </Table.Cell>
                        <Table.Cell fontWeight="600" whiteSpace="nowrap">
                          {adultoMayor ? `${adultoMayor.nombre} ${adultoMayor.apellido}` : "N/A"}
                        </Table.Cell>
                        <Table.Cell fontSize="sm" color="gray.500" whiteSpace="nowrap">
                          {adultoMayor?.expediente || "-"}
                        </Table.Cell>
                        <Table.Cell fontSize="sm" color="gray.500" maxW="xs" truncate title={seguimiento.descripcion}>
                          {seguimiento.descripcion}
                        </Table.Cell>
                        <Table.Cell fontSize="sm" color="gray.500" whiteSpace="nowrap">
                          {seguimiento.responsable}
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
