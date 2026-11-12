import { trpc } from "@/lib/trpc";
import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Dialog,
  Field,
  Flex,
  Grid,
  Heading,
  HStack,
  IconButton,
  Input,
  NativeSelect,
  Portal,
  SimpleGrid,
  Skeleton,
  Table,
  Tabs,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { Building2, Check, Download, Edit, Eye, FileText, Paperclip, Plus, Search, Trash, Trash2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { TIPOS_PERMITIDOS, abrirArchivo, prepararArchivo } from "@/lib/archivos";
import VisorArchivo, { type ArchivoVisor } from "@/components/VisorArchivo";
import { generarLegajoResidenciaPdf } from "@/lib/legajoPdf";

type ResidenciaForm = {
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;

  nombreSolicitante: string;
  dniSolicitante: string;
  nombreApoderado: string;
  dniApoderado: string;

  capacidad: number | "";
  estadoHabilitacion: string;
  fechaHabilitacion: string;
  fechaVencimientoHabilitacion: string;
  observaciones: string;

  reqNota: boolean;
  reqProyecto: boolean;
  reqDniSolicitante: boolean;
  reqDniApoderado: boolean;
  reqPlanos: boolean;
  reqEvacuacion: boolean;
  reqSeguro: boolean;
  reqComidaAfip: boolean;
  reqFotos: boolean;
};

const initialForm: ResidenciaForm = {
  nombre: "",
  direccion: "",
  telefono: "",
  email: "",
  nombreSolicitante: "",
  dniSolicitante: "",
  nombreApoderado: "",
  dniApoderado: "",
  capacidad: "",
  estadoHabilitacion: "en_tramite",
  fechaHabilitacion: "",
  fechaVencimientoHabilitacion: "",
  observaciones: "",
  reqNota: false,
  reqProyecto: false,
  reqDniSolicitante: false,
  reqDniApoderado: false,
  reqPlanos: false,
  reqEvacuacion: false,
  reqSeguro: false,
  reqComidaAfip: false,
  reqFotos: false,
};

const requisitosList: { key: keyof ResidenciaForm; label: string }[] = [
  { key: "reqNota", label: "1. Nota solicitud al Sr. Ministro de Desarrollo Social" },
  { key: "reqProyecto", label: "2. Proyecto Institucional (asesoramiento modalidad gerontológica)" },
  { key: "reqDniSolicitante", label: "3. Fotocopia de DNI de solicitante" },
  { key: "reqDniApoderado", label: "4. Fotocopia del DNI Apoderado Legal" },
  { key: "reqPlanos", label: "5. Planos del inmueble actualizados" },
  { key: "reqEvacuacion", label: "6. Plan de evacuación por Bomberos y/o calidad de vida del Municipio" },
  { key: "reqSeguro", label: "7. Constancia de Cobertura de Seguro" },
  { key: "reqComidaAfip", label: "8. En caso de Terciarizar la comida, inscripción en AFIP" },
  { key: "reqFotos", label: "9. Fotos del Lugar" },
];

const estadoPalette: Record<string, { bg: any; color: any }> = {
  vigente: { bg: { base: "green.500", _dark: "green.600" }, color: "white" },
  vencida: { bg: { base: "red.500", _dark: "red.600" }, color: "white" },
  en_tramite: { bg: { base: "amber.500", _dark: "blue.600" }, color: { base: "black", _dark: "white" } },
  suspendida: { bg: { base: "gray.500", _dark: "gray.600" }, color: "white" },
};

const estadoLabels: Record<string, string> = {
  vigente: "Vigente",
  vencida: "Vencida",
  en_tramite: "En Trámite",
  suspendida: "Suspendida",
};

function EstadoBadge({ estado }: { estado: string }) {
  return (
    <Badge {...(estadoPalette[estado] ?? { bg: "blue.500", color: "white" })}>
      {estadoLabels[estado] || estado}
    </Badge>
  );
}

export default function Residencias() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState(false);
  const [form, setForm] = useState<ResidenciaForm>(initialForm);
  const [busqueda, setBusqueda] = useState("");

  const { data: residencias, isLoading } = trpc.residencias.list.useQuery();
  const utils = trpc.useUtils();

  // ======= DOCUMENTACIÓN DIGITALIZADA (un archivo por requisito) =======
  const docInputRef = useRef<HTMLInputElement>(null);
  const requisitoPendiente = useRef<string | null>(null);
  const [subiendoReq, setSubiendoReq] = useState<string | null>(null);
  const [archivoVisor, setArchivoVisor] = useState<ArchivoVisor | null>(null);
  const { data: documentosMeta } = trpc.residenciaDocumentos.listMeta.useQuery();

  const documentosDe = (residenciaId: number | null | undefined) =>
    (documentosMeta ?? []).filter((d: any) => d.residenciaId === residenciaId);
  const docDe = (residenciaId: number | null | undefined, requisito: string) =>
    (documentosMeta ?? []).find((d: any) => d.residenciaId === residenciaId && d.requisito === requisito);
  const cantidadCargada = (residenciaId: number) =>
    requisitosList.filter(r => docDe(residenciaId, r.key as string)).length;

  const subirDocMutation = trpc.residenciaDocumentos.upload.useMutation({
    onSuccess: () => {
      toast.success("Documento cargado");
      utils.residenciaDocumentos.listMeta.invalidate();
      setSubiendoReq(null);
    },
    onError: error => {
      toast.error(error.message || "No se pudo cargar el documento");
      setSubiendoReq(null);
    },
  });

  const eliminarDocMutation = trpc.residenciaDocumentos.delete.useMutation({
    onSuccess: () => {
      toast.success("Documento eliminado");
      utils.residenciaDocumentos.listMeta.invalidate();
    },
    onError: error => toast.error(error.message || "No se pudo eliminar el documento"),
  });

  const elegirArchivo = (requisito: string) => {
    requisitoPendiente.current = requisito;
    docInputRef.current?.click();
  };

  const handleArchivoElegido = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const requisito = requisitoPendiente.current;
    if (!file || !requisito || !editingId) return;
    if (!TIPOS_PERMITIDOS.includes(file.type)) {
      toast.error("Solo se permiten archivos PDF, JPG o PNG");
      return;
    }
    if (file.type === "application/pdf" && file.size > 9 * 1024 * 1024) {
      toast.error("El PDF pesa más de 9 MB. Probá escanearlo con menor resolución.");
      return;
    }
    try {
      setSubiendoReq(requisito);
      const archivo = await prepararArchivo(file);
      subirDocMutation.mutate({ residenciaId: editingId, requisito: requisito as any, nombreArchivo: file.name, archivo });
    } catch (err: any) {
      setSubiendoReq(null);
      toast.error(err.message || "No se pudo procesar el archivo");
    }
  };

  const verDocumento = async (requisito: string, descargar: boolean) => {
    if (!editingId) return;
    try {
      const doc = await utils.residenciaDocumentos.get.fetch({ residenciaId: editingId, requisito });
      if (!doc) { toast.error("No hay archivo cargado"); return; }
      if (descargar) await abrirArchivo(doc.archivo, doc.nombreArchivo, true);
      else setArchivoVisor({ nombre: doc.nombreArchivo, dataUri: doc.archivo });
    } catch {
      toast.error("No se pudo abrir el archivo");
    }
  };

  const eliminarDocumento = (requisito: string) => {
    if (!editingId) return;
    if (confirm("¿Eliminar este documento? El requisito volverá a figurar como pendiente.")) {
      eliminarDocMutation.mutate({ residenciaId: editingId, requisito });
    }
  };

  // Arma un único PDF con portada + toda la documentación cargada, en el orden del checklist
  const [exportandoLegajo, setExportandoLegajo] = useState(false);
  const handleExportarLegajo = async () => {
    if (!editingId) return;
    setExportandoLegajo(true);
    try {
      const blob = await generarLegajoResidenciaPdf({
        titulo: form.nombre,
        datos: [
          { label: "Dirección", value: form.direccion },
          { label: "Teléfono", value: form.telefono },
          { label: "Email", value: form.email },
          { label: "Capacidad", value: form.capacidad ? `${form.capacidad} plazas` : "" },
          { label: "Estado de habilitación", value: estadoLabels[form.estadoHabilitacion] ?? form.estadoHabilitacion },
          {
            label: "Vencimiento",
            value: form.fechaVencimientoHabilitacion ? new Date(form.fechaVencimientoHabilitacion).toLocaleDateString("es-AR") : "",
          },
          { label: "Solicitante", value: [form.nombreSolicitante, form.dniSolicitante && `DNI ${form.dniSolicitante}`].filter(Boolean).join(" - ") },
          { label: "Apoderado legal", value: [form.nombreApoderado, form.dniApoderado && `DNI ${form.dniApoderado}`].filter(Boolean).join(" - ") },
        ],
        requisitos: requisitosList.map(r => ({ key: r.key as string, label: r.label })),
        obtenerDocumento: async key => {
          if (!docDe(editingId, key)) return null;
          const d = await utils.residenciaDocumentos.get.fetch({ residenciaId: editingId, requisito: key });
          return d ? { archivo: d.archivo, nombreArchivo: d.nombreArchivo } : null;
        },
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `legajo_${form.nombre.replace(/[^\w\-]+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success("Legajo exportado");
    } catch (err) {
      console.error(err);
      toast.error("No se pudo generar el legajo");
    } finally {
      setExportandoLegajo(false);
    }
  };

  const resetAndClose = () => {
    setOpen(false);
    setForm(initialForm);
    setEditingId(null);
    setViewMode(false);
  };

  const createMutation = trpc.residencias.create.useMutation({
    onSuccess: () => {
      toast.success("Residencia creada exitosamente");
      utils.residencias.list.invalidate();
      resetAndClose();
    },
    onError: error => toast.error(error.message || "Error al crear Residencia"),
  });

  const updateMutation = trpc.residencias.update.useMutation({
    onSuccess: () => {
      toast.success("Residencia actualizada exitosamente");
      utils.residencias.list.invalidate();
      resetAndClose();
    },
    onError: error => toast.error(error.message || "Error al actualizar residencia"),
  });

  const deleteMutation = trpc.residencias.delete.useMutation({
    onSuccess: () => {
      toast.success("Residencia eliminada exitosamente");
      utils.residencias.list.invalidate();
      resetAndClose();
    },
    onError: error => toast.error(error.message || "Error al eliminar residencia"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nombre || !form.direccion) {
      toast.error("El nombre y la dirección son obligatorios");
      return;
    }

    const payload = {
      ...form,
      capacidad: form.capacidad === "" ? undefined : Number(form.capacidad),
      fechaHabilitacion: form.fechaHabilitacion ? new Date(form.fechaHabilitacion) : undefined,
      fechaVencimientoHabilitacion: form.fechaVencimientoHabilitacion ? new Date(form.fechaVencimientoHabilitacion) : undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload } as any);
    } else {
      createMutation.mutate(payload as any);
    }
  };

  const handleEdit = (residencia: any) => {
    setEditingId(residencia.id);
    setForm({
      ...initialForm,
      ...residencia,
      capacidad: residencia.capacidad || "",
      fechaHabilitacion: residencia.fechaHabilitacion ? new Date(residencia.fechaHabilitacion).toISOString().split("T")[0] : "",
      fechaVencimientoHabilitacion: residencia.fechaVencimientoHabilitacion
        ? new Date(residencia.fechaVencimientoHabilitacion).toISOString().split("T")[0]
        : "",
    });
    setViewMode(true);
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("🚨 ¿Está seguro de eliminar por completo esta Residencia de Larga Estadia?")) {
      deleteMutation.mutate({ id });
    }
  };

  const openNew = () => {
    setForm(initialForm);
    setEditingId(null);
    setViewMode(false);
    setOpen(true);
  };

  const residenciasFiltradas = (residencias ?? []).filter((residencia: any) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return (residencia.nombre ?? "").toLowerCase().includes(q);
  });

  return (
    <VStack align="stretch" gap={6}>
      <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} gap={3}>
        <Box>
          <Heading size="2xl" color="heading" display="flex" alignItems="center" gap={2}>
            <Building2 size={30} color="var(--chakra-colors-brand-600)" />
            Residencias de Larga Estadía
          </Heading>
          <Text color="gray.500" mt={2}>
            Gestión de establecimientos, responsables y habilitaciones
          </Text>
        </Box>
        <Button bg="brand.600" color="white" _hover={{ bg: "brand.700" }} onClick={openNew}>
          <Plus size={16} />
          Nueva Residencia
        </Button>
      </Flex>

      <Dialog.Root
        open={open}
        onOpenChange={d => {
          setOpen(d.open);
          if (!d.open) resetAndClose();
        }}
        size="full"
        scrollBehavior="inside"
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="min(1100px, 95vw)" maxH="90vh" m="auto">
              <Dialog.Body p={6} overflowY="auto">
                {viewMode ? (
                  <VStack align="stretch" gap={6}>
                    <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} gap={4} pb={4} borderBottomWidth="1px" borderColor="gray.200">
                      <Box>
                        <Dialog.Title fontSize="2xl" fontWeight="800" color="heading">
                          {form.nombre}
                        </Dialog.Title>
                        <HStack mt={2} color="gray.600" gap={3}>
                          <EstadoBadge estado={form.estadoHabilitacion} />
                          <Text>Capacidad: {form.capacidad || "0"} plazas</Text>
                        </HStack>
                      </Box>
                      <HStack gap={2} flexWrap="wrap">
                        <Button variant="outline" borderColor="gray.300" color="fg" onClick={handleExportarLegajo} loading={exportandoLegajo}>
                          <Download size={15} /> Exportar Legajo (PDF)
                        </Button>
                        <Button variant="outline" borderColor="brand.400" color="brand.700" onClick={() => setViewMode(false)}>
                          <Edit size={15} /> Editar Residencia
                        </Button>
                        <Button bg="red.600" color="white" _hover={{ bg: "red.700" }} onClick={() => handleDelete(editingId!)}>
                          <Trash size={15} /> Eliminar
                        </Button>
                      </HStack>
                    </Flex>

                    <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={8}>
                      <VStack align="stretch" gap={6}>
                        <Box>
                          <Heading size="md" borderBottomWidth="2px" borderColor="gray.100" pb={2} mb={3}>
                            Datos de la Institución
                          </Heading>
                          <SimpleGrid columns={2} gap={4} fontSize="sm">
                            <DetailField label="Dirección" value={form.direccion} />
                            <DetailField label="Teléfono" value={form.telefono} />
                            <DetailField label="Email" value={form.email} />
                            <DetailField label="Capacidad Registrada" value={`${form.capacidad || "0"} plazas`} />
                            <DetailField label="Fecha de Habilitación" value={form.fechaHabilitacion ? new Date(form.fechaHabilitacion).toLocaleDateString("es-AR") : "-"} />
                            <DetailField label="Vencimiento" value={form.fechaVencimientoHabilitacion ? new Date(form.fechaVencimientoHabilitacion).toLocaleDateString("es-AR") : "-"} />
                          </SimpleGrid>
                          <Box mt={4} pt={4} borderTopWidth="1px" borderColor="gray.100">
                            <Text fontWeight="600" color="gray.500" fontSize="sm" mb={2}>
                              Observaciones Generales:
                            </Text>
                            <Box bg="bg.muted" p={4} borderRadius="md" borderWidth="1px" borderColor="gray.200" color="fg" whiteSpace="pre-wrap" minH="80px" fontSize="sm">
                              {form.observaciones || <Text as="span" fontStyle="italic" opacity={0.6}>Sin observaciones registradas.</Text>}
                            </Box>
                          </Box>
                        </Box>

                        <Box>
                          <Heading size="md" borderBottomWidth="2px" borderColor="gray.100" pb={2} mb={3}>
                            Responsables Legales
                          </Heading>
                          <Box
                            bg={{ base: "brand.50", _dark: "brand.900" }}
                            p={4}
                            borderRadius="md"
                            borderWidth="1px"
                            borderColor={{ base: "brand.100", _dark: "brand.700" }}
                            mb={4}
                            fontSize="sm"
                          >
                            <Text fontWeight="700" color={{ base: "brand.800", _dark: "brand.100" }} mb={2} fontSize="md">
                              Solicitante
                            </Text>
                            <SimpleGrid columns={2} gap={2}>
                              <Text><Text as="span" fontWeight="600" color="gray.500">Nombre:</Text> {form.nombreSolicitante || "-"}</Text>
                              <Text><Text as="span" fontWeight="600" color="gray.500">DNI:</Text> {form.dniSolicitante || "-"}</Text>
                            </SimpleGrid>
                          </Box>
                          <Box bg="bg.muted" p={4} borderRadius="md" borderWidth="1px" borderColor="gray.200" fontSize="sm">
                            <Text fontWeight="700" color="fg" mb={2} fontSize="md">
                              Apoderado Legal
                            </Text>
                            <SimpleGrid columns={2} gap={2}>
                              <Text><Text as="span" fontWeight="600" color="gray.500">Nombre:</Text> {form.nombreApoderado || "-"}</Text>
                              <Text><Text as="span" fontWeight="600" color="gray.500">DNI:</Text> {form.dniApoderado || "-"}</Text>
                            </SimpleGrid>
                          </Box>
                        </Box>
                      </VStack>

                      <Box>
                        <Flex justify="space-between" align="center" borderBottomWidth="2px" borderColor="gray.100" pb={2} mb={3}>
                          <Heading size="md">Documentación Digitalizada</Heading>
                          <Badge
                            bg={cantidadCargada(editingId!) === requisitosList.length ? "green.600" : "orange.500"}
                            color="white"
                          >
                            {cantidadCargada(editingId!)} de {requisitosList.length} cargados
                          </Badge>
                        </Flex>

                        <input
                          ref={docInputRef}
                          type="file"
                          accept="application/pdf,image/jpeg,image/png"
                          style={{ display: "none" }}
                          onChange={handleArchivoElegido}
                        />

                        <Text fontSize="xs" color="gray.500" mb={3}>
                          Cada requisito se marca como cumplido solo cuando tiene su archivo cargado (PDF preferentemente; también se aceptan fotos). Así se ve de un vistazo qué falta.
                        </Text>

                        <Box bg="bg.panel" borderWidth="1px" borderColor="gray.200" borderRadius="lg" p={4} boxShadow="sm">
                          <VStack align="stretch" gap={3}>
                            {requisitosList.map(req => {
                              const doc: any = docDe(editingId, req.key as string);
                              const cargando = subiendoReq === req.key;
                              return (
                                <Flex key={req.key} gap={3} align="flex-start" justify="space-between" wrap="wrap">
                                  <HStack gap={3} align="flex-start" flex={1} minW="220px">
                                    {doc ? (
                                      <Check size={18} color="var(--chakra-colors-green-600)" style={{ flexShrink: 0, marginTop: 2 }} />
                                    ) : (
                                      <X size={18} color="var(--chakra-colors-gray-300)" style={{ flexShrink: 0, marginTop: 2 }} />
                                    )}
                                    <Box>
                                      <Text fontSize="sm" fontWeight={doc ? "600" : "400"} color={doc ? "fg" : "fg.muted"}>
                                        {req.label}
                                      </Text>
                                      {doc && (
                                        <Text fontSize="11px" color="gray.500">
                                          {doc.nombreArchivo} · {new Date(doc.createdAt).toLocaleDateString("es-AR")}
                                        </Text>
                                      )}
                                    </Box>
                                  </HStack>
                                  <HStack gap={1}>
                                    {doc && (
                                      <>
                                        <IconButton aria-label="Ver" title="Ver" size="xs" variant="ghost" onClick={() => verDocumento(req.key as string, false)}>
                                          <Eye size={14} />
                                        </IconButton>
                                        <IconButton aria-label="Descargar" title="Descargar" size="xs" variant="ghost" onClick={() => verDocumento(req.key as string, true)}>
                                          <Download size={14} />
                                        </IconButton>
                                      </>
                                    )}
                                    <Button
                                      size="xs"
                                      variant={doc ? "outline" : "solid"}
                                      bg={doc ? undefined : "brand.600"}
                                      color={doc ? undefined : "white"}
                                      _hover={doc ? undefined : { bg: "brand.700" }}
                                      loading={cargando}
                                      onClick={() => elegirArchivo(req.key as string)}
                                    >
                                      <Upload size={12} /> {doc ? "Reemplazar" : "Subir"}
                                    </Button>
                                    {doc && (
                                      <IconButton aria-label="Eliminar" title="Eliminar" size="xs" variant="ghost" color="red.600" onClick={() => eliminarDocumento(req.key as string)}>
                                        <Trash2 size={14} />
                                      </IconButton>
                                    )}
                                  </HStack>
                                </Flex>
                              );
                            })}
                          </VStack>
                        </Box>

                      </Box>
                    </Grid>
                  </VStack>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <VStack align="stretch" gap={6}>
                      <Box>
                        <Dialog.Title fontSize="xl" fontWeight="700">
                          {editingId ? "Modificar Residencia" : "Nueva Residencia"}
                        </Dialog.Title>
                        <Dialog.Description color="gray.500">
                          Complete los datos requeridos como en el documento original.
                        </Dialog.Description>
                      </Box>

                      <Tabs.Root defaultValue="institucion" variant="enclosed">
                        <Tabs.List>
                          <Tabs.Trigger value="institucion">Institución</Tabs.Trigger>
                          <Tabs.Trigger value="responsables">Responsables</Tabs.Trigger>
                          <Tabs.Trigger value="requisitos">Checklist Requisitos</Tabs.Trigger>
                        </Tabs.List>

                        <Tabs.Content value="institucion">
                          <VStack align="stretch" gap={4} pt={2}>
                            <SectionLabel>Datos de la Institución</SectionLabel>
                            <Grid templateColumns={{ base: "1fr", md: "2fr 1fr" }} gap={4}>
                              <Field.Root required>
                                <Field.Label>Nombre de la Institución</Field.Label>
                                <Input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
                              </Field.Root>
                              <Field.Root>
                                <Field.Label>Capacidad (Plazas)</Field.Label>
                                <Input
                                  type="number"
                                  value={form.capacidad}
                                  onChange={e => setForm({ ...form, capacidad: e.target.value === "" ? "" : Number(e.target.value) })}
                                />
                              </Field.Root>
                            </Grid>

                            <Field.Root required>
                              <Field.Label>Dirección</Field.Label>
                              <Input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} required />
                            </Field.Root>

                            <Grid templateColumns={{ base: "1fr", md: "1fr 2fr" }} gap={4}>
                              <Field.Root>
                                <Field.Label>Teléfono</Field.Label>
                                <Input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
                              </Field.Root>
                              <Field.Root>
                                <Field.Label>Email</Field.Label>
                                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                              </Field.Root>
                            </Grid>

                            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }} gap={4}>
                              <Field.Root>
                                <Field.Label>Estado Habilitación</Field.Label>
                                <NativeSelect.Root>
                                  <NativeSelect.Field
                                    value={form.estadoHabilitacion}
                                    onChange={e => setForm({ ...form, estadoHabilitacion: e.target.value })}
                                  >
                                    <option value="vigente">Vigente</option>
                                    <option value="en_tramite">En Trámite</option>
                                    <option value="vencida">Vencida</option>
                                    <option value="suspendida">Suspendida</option>
                                  </NativeSelect.Field>
                                  <NativeSelect.Indicator />
                                </NativeSelect.Root>
                              </Field.Root>
                              <Field.Root>
                                <Field.Label>Fecha Habilitación</Field.Label>
                                <Input type="date" value={form.fechaHabilitacion} onChange={e => setForm({ ...form, fechaHabilitacion: e.target.value })} />
                              </Field.Root>
                              <Field.Root>
                                <Field.Label>Fecha Vencimiento</Field.Label>
                                <Input
                                  type="date"
                                  value={form.fechaVencimientoHabilitacion}
                                  onChange={e => setForm({ ...form, fechaVencimientoHabilitacion: e.target.value })}
                                />
                              </Field.Root>
                            </Grid>

                            <Field.Root>
                              <Field.Label>Observaciones Generales</Field.Label>
                              <Textarea value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} rows={4} resize="none" />
                            </Field.Root>
                          </VStack>
                        </Tabs.Content>

                        <Tabs.Content value="responsables">
                          <VStack align="stretch" gap={8} pt={2}>
                            <Box>
                              <SectionLabel>Datos del Solicitante</SectionLabel>
                              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4} mt={4}>
                                <Field.Root>
                                  <Field.Label>Nombre Completo</Field.Label>
                                  <Input value={form.nombreSolicitante} onChange={e => setForm({ ...form, nombreSolicitante: e.target.value })} />
                                </Field.Root>
                                <Field.Root>
                                  <Field.Label>D.N.I.</Field.Label>
                                  <Input value={form.dniSolicitante} onChange={e => setForm({ ...form, dniSolicitante: e.target.value })} />
                                </Field.Root>
                              </Grid>
                            </Box>

                            <Box>
                              <SectionLabel>Datos del Apoderado Legal</SectionLabel>
                              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4} mt={4}>
                                <Field.Root>
                                  <Field.Label>Nombre Completo</Field.Label>
                                  <Input value={form.nombreApoderado} onChange={e => setForm({ ...form, nombreApoderado: e.target.value })} />
                                </Field.Root>
                                <Field.Root>
                                  <Field.Label>D.N.I.</Field.Label>
                                  <Input value={form.dniApoderado} onChange={e => setForm({ ...form, dniApoderado: e.target.value })} />
                                </Field.Root>
                              </Grid>
                            </Box>
                          </VStack>
                        </Tabs.Content>

                        <Tabs.Content value="requisitos">
                          <Box pt={2}>
                            <SectionLabel>Documentación de Habilitación</SectionLabel>
                            <Text fontSize="sm" color="gray.500" mt={3} mb={4}>
                              Los documentos ya no se tildan a mano: cada requisito se marca como cumplido cuando se carga su archivo (PDF).
                              {editingId
                                ? " Guardá los cambios y cargalos desde la vista de la residencia (botón Ver / Detalles)."
                                : " Guardá la residencia y luego abrila (botón Ver / Detalles) para cargar la documentación."}
                            </Text>
                            <VStack align="stretch" gap={2}>
                              {requisitosList.map(req => {
                                const cargado = editingId ? Boolean(docDe(editingId, req.key as string)) : false;
                                return (
                                  <HStack key={req.key} gap={3} p={3} borderWidth="1px" borderColor="gray.200" borderRadius="lg" bg="bg.panel">
                                    {cargado ? <Check size={16} color="var(--chakra-colors-green-600)" /> : <X size={16} color="var(--chakra-colors-gray-300)" />}
                                    <Text fontSize="sm" color={cargado ? "fg" : "fg.muted"}>{req.label}</Text>
                                  </HStack>
                                );
                              })}
                            </VStack>
                          </Box>
                        </Tabs.Content>
                      </Tabs.Root>

                      <HStack justify="flex-end" gap={2} pt={4} borderTopWidth="1px" borderColor="gray.100">
                        <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          bg="brand.600"
                          color="white"
                          _hover={{ bg: "brand.700" }}
                          loading={createMutation.isPending || updateMutation.isPending}
                        >
                          {editingId ? "Actualizar Residencia" : "Guardar Residencia"}
                        </Button>
                      </HStack>
                    </VStack>
                  </form>
                )}
              </Dialog.Body>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      <VisorArchivo archivo={archivoVisor} onClose={() => setArchivoVisor(null)} />

      <Box maxW="sm">
        <Box position="relative">
          <Input
            placeholder="Buscar por nombre de la institución..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            pl={9}
          />
          <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="gray.400" pointerEvents="none">
            <Search size={16} />
          </Box>
        </Box>
      </Box>

      <Tabs.Root defaultValue="tabla" variant="enclosed">
        <Tabs.List>
          <Tabs.Trigger value="tabla">Vista Tabla</Tabs.Trigger>
          <Tabs.Trigger value="tarjetas">Vista Tarjetas</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="tabla">
          {isLoading ? (
            <Skeleton h="96" mt={4} />
          ) : residenciasFiltradas.length > 0 ? (
            <Card.Root mt={4}>
              <Card.Body p={0}>
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                      <Table.ColumnHeader>Solicitante</Table.ColumnHeader>
                      <Table.ColumnHeader>Teléfono</Table.ColumnHeader>
                      <Table.ColumnHeader>Capacidad</Table.ColumnHeader>
                      <Table.ColumnHeader>Habilitación</Table.ColumnHeader>
                      <Table.ColumnHeader>Vencimiento</Table.ColumnHeader>
                      <Table.ColumnHeader>Documentación</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right">Acciones</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {residenciasFiltradas.map((residencia: any) => (
                      <Table.Row key={residencia.id}>
                        <Table.Cell fontWeight="600">{residencia.nombre}</Table.Cell>
                        <Table.Cell>{residencia.nombreSolicitante || "N/A"}</Table.Cell>
                        <Table.Cell>{residencia.telefono || "N/A"}</Table.Cell>
                        <Table.Cell>{residencia.capacidad || "0"}</Table.Cell>
                        <Table.Cell>
                          <EstadoBadge estado={residencia.estadoHabilitacion} />
                        </Table.Cell>
                        <Table.Cell>
                          {residencia.fechaVencimientoHabilitacion
                            ? new Date(residencia.fechaVencimientoHabilitacion).toLocaleDateString("es-AR")
                            : "--"}
                        </Table.Cell>
                        <Table.Cell>
                          <Badge
                            bg={cantidadCargada(residencia.id) === requisitosList.length ? "green.600" : "orange.500"}
                            color="white"
                          >
                            {cantidadCargada(residencia.id)}/{requisitosList.length}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell textAlign="right">
                          <IconButton aria-label="Ver / Editar" variant="ghost" size="sm" onClick={() => handleEdit(residencia)}>
                            <FileText size={16} color="var(--chakra-colors-brand-600)" />
                          </IconButton>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Card.Body>
            </Card.Root>
          ) : (
            <EmptyState onCreate={openNew} busqueda={busqueda} onClear={() => setBusqueda("")} />
          )}
        </Tabs.Content>

        <Tabs.Content value="tarjetas">
          {isLoading ? (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4} mt={4}>
              {[1, 2, 3].map(i => (
                <Skeleton key={i} h="48" />
              ))}
            </SimpleGrid>
          ) : residenciasFiltradas.length > 0 ? (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4} mt={4}>
              {residenciasFiltradas.map((residencia: any) => (
                <Card.Root key={residencia.id} _hover={{ boxShadow: "lg" }} transition="box-shadow 0.15s ease">
                  <Card.Header>
                    <Flex justify="space-between" align="flex-start">
                      <Box flex={1} pr={2}>
                        <Card.Title display="flex" alignItems="center" gap={2}>
                          <Building2 size={18} />
                          {residencia.nombre}
                        </Card.Title>
                        <Card.Description mt={1}>
                          Solicitante: {residencia.nombreSolicitante || "Sin especificar"}
                        </Card.Description>
                      </Box>
                      <EstadoBadge estado={residencia.estadoHabilitacion} />
                    </Flex>
                  </Card.Header>
                  <Card.Body pt={0}>
                    <VStack align="stretch" gap={1} fontSize="sm">
                      <Text><Text as="span" fontWeight="700">Dirección:</Text> {residencia.direccion}</Text>
                      <Text><Text as="span" fontWeight="700">Teléfono:</Text> {residencia.telefono || "N/A"}</Text>
                      <Text><Text as="span" fontWeight="700">Capacidad:</Text> {residencia.capacidad || "0"} plazas</Text>
                      {residencia.fechaVencimientoHabilitacion && (
                        <Text>
                          <Text as="span" fontWeight="700">Vencimiento:</Text>{" "}
                          {new Date(residencia.fechaVencimientoHabilitacion).toLocaleDateString("es-AR")}
                        </Text>
                      )}
                    </VStack>
                    <HStack mt={4} gap={2}>
                      <Button variant="outline" size="sm" flex={1} onClick={() => handleEdit(residencia)}>
                        <FileText size={14} color="var(--chakra-colors-brand-600)" /> Ver Detalles
                      </Button>
                      <IconButton aria-label="Eliminar" variant="outline" size="sm" color="red.600" _hover={{ bg: "red.50" }} onClick={() => handleDelete(residencia.id)}>
                        <Trash2 size={14} />
                      </IconButton>
                    </HStack>
                  </Card.Body>
                </Card.Root>
              ))}
            </SimpleGrid>
          ) : (
            <EmptyState onCreate={openNew} busqueda={busqueda} onClear={() => setBusqueda("")} />
          )}
        </Tabs.Content>
      </Tabs.Root>
    </VStack>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <Text>
      <Text as="span" fontWeight="600" color="gray.500" display="block">
        {label}
      </Text>
      {value || "-"}
    </Text>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text color="brand.700" fontWeight="700" textTransform="uppercase" letterSpacing="wide" fontSize="xs">
      {children}
    </Text>
  );
}

function EmptyState({ onCreate, busqueda, onClear }: { onCreate: () => void; busqueda?: string; onClear?: () => void }) {
  if (busqueda) {
    return (
      <Card.Root mt={4}>
        <Card.Body>
          <VStack py={16} gap={3}>
            <Search size={56} color="var(--chakra-colors-gray-300)" />
            <Text color="fg" fontWeight="600" fontSize="lg">
              Sin resultados para "{busqueda}"
            </Text>
            <Button variant="outline" onClick={onClear}>
              Limpiar búsqueda
            </Button>
          </VStack>
        </Card.Body>
      </Card.Root>
    );
  }

  return (
    <Card.Root mt={4}>
      <Card.Body>
        <VStack py={16} gap={3}>
          <Building2 size={56} color="var(--chakra-colors-gray-300)" />
          <Text color="fg" fontWeight="600" fontSize="lg">
            No hay Residencias registradas
          </Text>
          <Button bg="brand.600" color="white" _hover={{ bg: "brand.700" }} onClick={onCreate}>
            <Plus size={16} />
            Crear primera residencia
          </Button>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
