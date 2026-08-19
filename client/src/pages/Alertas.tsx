import { trpc } from "@/lib/trpc";
import {
  Badge,
  Box,
  Button,
  Card,
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
  Skeleton,
  Table,
  Tabs,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { AlertCircle, Plus, CheckCircle, Clock, Bell, Eye, Edit, Trash, User, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type AlertaForm = {
  adultoMayorId: number | undefined;
  tipoAlerta: "falta_medicacion" | "salud_critica" | "abandono" | "abuso_economico" | "abuso_psicologico" | "abuso_fisico" | "otro";
  prioridad: "baja" | "media" | "alta" | "critica";
  titulo: string;
  descripcion: string;
};

const initialForm: AlertaForm = {
  adultoMayorId: undefined,
  tipoAlerta: "otro",
  prioridad: "media",
  titulo: "",
  descripcion: "",
};

const prioridadPalette: Record<string, { bg: string; color: string }> = {
  critica: { bg: "red.500", color: "white" },
  alta: { bg: "orange.500", color: "white" },
  media: { bg: "yellow.500", color: "gray.900" },
  baja: { bg: "blue.500", color: "white" },
};

const prioridadBorder: Record<string, string> = {
  critica: "red.500",
  alta: "orange.500",
  media: "yellow.500",
  baja: "blue.500",
};

function PrioridadBadge({ prioridad }: { prioridad: string }) {
  return (
    <Badge {...(prioridadPalette[prioridad] ?? prioridadPalette.baja)} textTransform="capitalize" w="24" justifyContent="center">
      {prioridad}
    </Badge>
  );
}

export default function Alertas() {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [alertaView, setAlertaView] = useState<any>(null);

  const [form, setForm] = useState<AlertaForm>(initialForm);
  const [busqueda, setBusqueda] = useState("");
  const [resolverOpen, setResolverOpen] = useState(false);
  const [alertaSeleccionada, setAlertaSeleccionada] = useState<number | null>(null);
  const [resolucionForm, setResolucionForm] = useState({
    responsableAtencion: "",
    observacionesResolucion: "",
  });

  const { data: alertas, isLoading } = trpc.alertas.list.useQuery();
  const { data: adultosMayores } = trpc.adultosMayores.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.alertas.create.useMutation({
    onSuccess: () => {
      toast.success("Alerta creada exitosamente");
      utils.alertas.list.invalidate();
      utils.alertas.listPendientes.invalidate();
      utils.dashboard.stats.invalidate();
      setOpen(false);
      setForm(initialForm);
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear alerta");
    },
  });

  const updateMutation = trpc.alertas.update.useMutation({
    onSuccess: () => {
      toast.success("Alerta actualizada exitosamente");
      utils.alertas.list.invalidate();
      utils.alertas.listPendientes.invalidate();
      utils.dashboard.stats.invalidate();
      setResolverOpen(false);
      setAlertaSeleccionada(null);
      setResolucionForm({ responsableAtencion: "", observacionesResolucion: "" });

      if (editingId) {
        setOpen(false);
        setEditingId(null);
        setForm(initialForm);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar alerta");
    },
  });

  const deleteMutation = trpc.alertas.delete.useMutation({
    onSuccess: () => {
      toast.success("Alerta eliminada correctamente");
      utils.alertas.list.invalidate();
      utils.alertas.listPendientes.invalidate();
      utils.dashboard.stats.invalidate();
      setOpen(false);
      setViewMode(false);
      setAlertaView(null);
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar alerta");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.adultoMayorId) {
      toast.error("Debe seleccionar un adulto mayor");
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form } as any);
    } else {
      createMutation.mutate(form as any);
    }
  };

  const handleResolver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertaSeleccionada) return;

    updateMutation.mutate({
      id: alertaSeleccionada,
      estado: "resuelta",
      fechaResolucion: new Date(),
      ...resolucionForm,
    });
  };

  const handleCambiarEstado = (alertaId: number, estado: "pendiente" | "en_atencion" | "resuelta") => {
    let responsableAtencion: string | undefined = undefined;

    if (estado === "en_atencion") {
      const nombreResponsable = prompt("Por favor, ingrese el nombre del responsable de la atención:");

      if (nombreResponsable === null) return; // Si cancela el prompt, detenemos la ejecución

      if (nombreResponsable.trim() === "") {
        toast.error("Debe ingresar un responsable para cambiar el estado a 'En Atención'");
        return;
      }

      responsableAtencion = nombreResponsable.trim();
    }

    updateMutation.mutate({
      id: alertaId,
      estado,
      responsableAtencion
    } as any);
  };

  const handleVerDetalles = (alerta: any) => {
    setAlertaView(alerta);
    setViewMode(true);
    setOpen(true);
  };

  const handleEditarOriginal = () => {
    if (!alertaView) return;
    setForm({
      adultoMayorId: alertaView.adultoMayorId,
      tipoAlerta: alertaView.tipoAlerta,
      prioridad: alertaView.prioridad,
      titulo: alertaView.titulo,
      descripcion: alertaView.descripcion,
    });
    setEditingId(alertaView.id);
    setViewMode(false);
  };

  const handleEliminarAlerta = () => {
    if (!alertaView) return;
    if (confirm("🚨 ¿Estás seguro de que deseas eliminar esta alerta por completo? Esta acción no se puede deshacer.")) {
      deleteMutation.mutate({ id: alertaView.id });
    }
  };

  const getTipoAlertaLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      falta_medicacion: "Falta de Medicación",
      salud_critica: "Salud Crítica",
      abandono: "Abandono",
      abuso_economico: "Abuso Económico",
      abuso_psicologico: "Abuso Psicológico",
      abuso_fisico: "Abuso Físico",
      otro: "Otro"
    };
    return labels[tipo] || tipo;
  };

  const matchesBusqueda = (alerta: any) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    const am = adultosMayores?.find((a: any) => a.id === alerta.adultoMayorId);
    const nombreCompleto = am ? `${am.nombre ?? ""} ${am.apellido ?? ""}`.toLowerCase() : "";
    const dni = (am?.dni ?? "").toLowerCase();
    return nombreCompleto.includes(q) || dni.includes(q);
  };

  const alertasPendientes = (alertas?.filter(a => a.estado === "pendiente" || a.estado === "en_atencion") || []).filter(matchesBusqueda);
  const alertasResueltas = (alertas?.filter(a => a.estado === "resuelta") || []).filter(matchesBusqueda);

  return (
    <VStack align="stretch" gap={6}>
      <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} gap={3}>
        <Box>
          <Heading size="2xl" color="heading" display="flex" alignItems="center" gap={2}>
            <Bell size={30} color="var(--chakra-colors-brand-600)" />
            Alertas
          </Heading>
          <Text color="gray.500" mt={2}>
            Gestión de casos críticos y situaciones de vulnerabilidad
          </Text>
        </Box>
        <Button bg="brand.600" color="white" _hover={{ bg: "brand.700" }} onClick={() => { setForm(initialForm); setEditingId(null); setViewMode(false); setOpen(true); }}>
          <Plus size={16} />
          Nueva Alerta
        </Button>
      </Flex>

      <Dialog.Root
        open={open}
        onOpenChange={d => {
          setOpen(d.open);
          if (!d.open) {
            setForm(initialForm);
            setEditingId(null);
            setViewMode(false);
            setAlertaView(null);
          }
        }}
        size="full"
        scrollBehavior="inside"
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="min(1100px, 95vw)" maxH="90vh" m="auto">
              <Dialog.Body p={6} overflowY="auto">
                {viewMode && alertaView ? (
                  <VStack align="stretch" gap={6}>
                    <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} gap={4} pb={4} borderBottomWidth="1px" borderColor="gray.200">
                      <Box>
                        <Dialog.Title fontSize="2xl" fontWeight="800" color="red.700" display="flex" alignItems="center" gap={2}>
                          <AlertCircle size={26} />
                          {alertaView.titulo}
                        </Dialog.Title>
                        <Text mt={1} color="gray.600" fontSize="lg">
                          Registro de situación de vulnerabilidad
                        </Text>
                      </Box>
                      <HStack gap={2}>
                        <PrioridadBadge prioridad={alertaView.prioridad} />
                        <Badge bg={alertaView.estado === "resuelta" ? "green.600" : "gray.500"} color="white">
                          {alertaView.estado.replace("_", " ").toUpperCase()}
                        </Badge>
                      </HStack>
                    </Flex>

                    <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={8}>
                      <Box>
                        <Heading size="md" borderBottomWidth="2px" borderColor="gray.100" pb={2} mb={3}>
                          Datos del Afectado
                        </Heading>
                        <Box bg="bg.muted" p={4} borderRadius="md" borderWidth="1px" borderColor="gray.200">
                          {(() => {
                            const am = adultosMayores?.find(a => a.id === alertaView.adultoMayorId);
                            return am ? (
                              <VStack align="stretch" gap={3} fontSize="sm">
                                <DetailField label="Nombre Completo" value={`${am.nombre} ${am.apellido}`} />
                                <DetailField label="DNI" value={am.dni} />
                                <DetailField label="N° Expediente" value={am.expediente} />
                                <DetailField label="Domicilio" value={`${am.domicilio} - ${am.barrio}`} />
                              </VStack>
                            ) : <Text color="gray.500">Datos del adulto mayor no encontrados.</Text>;
                          })()}
                        </Box>
                      </Box>

                      <Box>
                        <Heading size="md" borderBottomWidth="2px" borderColor="gray.100" pb={2} mb={3}>
                          Detalles de la Alerta
                        </Heading>
                        <SimpleGridDetails>
                          <Box>
                            <Text fontWeight="600" color="gray.500" fontSize="sm" mb={1}>Tipo de Situación:</Text>
                            <Badge variant="outline">{getTipoAlertaLabel(alertaView.tipoAlerta)}</Badge>
                          </Box>
                          <DetailField label="Fecha de Detección" value={new Date(alertaView.fechaDeteccion).toLocaleString('es-AR')} />
                        </SimpleGridDetails>
                        <Box mt={4}>
                          <Text fontWeight="600" color="gray.500" fontSize="sm" mb={2}>Descripción del hecho:</Text>
                          <Box
                            bg={{ base: "red.50", _dark: "red.950" }}
                            p={4}
                            borderRadius="md"
                            borderWidth="1px"
                            borderColor={{ base: "red.100", _dark: "red.800" }}
                            whiteSpace="pre-wrap"
                            color="fg"
                            fontSize="sm"
                          >
                            {alertaView.descripcion}
                          </Box>
                        </Box>
                      </Box>
                    </Grid>

                    {alertaView.estado === "resuelta" && (
                      <Box mt={2} pt={6} borderTopWidth="1px" borderColor="gray.200">
                        <Heading size="lg" color={{ base: "green.800", _dark: "green.200" }} display="flex" alignItems="center" gap={2} mb={4}>
                          <CheckCircle size={22} /> Detalles de Resolución
                        </Heading>
                        <Grid
                          templateColumns={{ base: "1fr", md: "1fr 2fr" }}
                          gap={6}
                          bg={{ base: "green.50", _dark: "green.950" }}
                          p={6}
                          borderRadius="md"
                          borderWidth="1px"
                          borderColor={{ base: "green.200", _dark: "green.800" }}
                        >
                          <VStack align="stretch" gap={4} fontSize="sm">
                            <DetailField label="Responsable de Atención" value={alertaView.responsableAtencion} />
                            <DetailField label="Fecha Resolución" value={alertaView.fechaResolucion ? new Date(alertaView.fechaResolucion).toLocaleString('es-AR') : "--"} />
                          </VStack>
                          <Box>
                            <Text fontWeight="600" color="gray.500" fontSize="sm" mb={2}>Observaciones y medidas tomadas:</Text>
                            <Text color="fg" whiteSpace="pre-wrap" fontSize="sm">{alertaView.observacionesResolucion}</Text>
                          </Box>
                        </Grid>
                      </Box>
                    )}

                    <Flex justify="space-between" align="center" mt={2} pt={4} borderTopWidth="1px" borderColor="gray.100">
                      <HStack gap={2}>
                        <Button variant="outline" borderColor="blue.400" color="blue.700" onClick={handleEditarOriginal}>
                          <Edit size={15} /> Editar Alerta
                        </Button>
                        <Button bg="red.600" color="white" _hover={{ bg: "red.700" }} onClick={handleEliminarAlerta}>
                          <Trash size={15} /> Eliminar Registro
                        </Button>
                      </HStack>
                      <Button variant="subtle" onClick={() => setOpen(false)}>Cerrar Registro</Button>
                    </Flex>
                  </VStack>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <VStack align="stretch" gap={6}>
                      <Box>
                        <Dialog.Title fontSize="xl" fontWeight="700">
                          {editingId ? "Editar Alerta de Vulnerabilidad" : "Nueva Alerta de Vulnerabilidad"}
                        </Dialog.Title>
                        <Dialog.Description color="gray.500">
                          Registre un caso crítico que requiere intervención y seguimiento inmediato.
                        </Dialog.Description>
                      </Box>

                      <VStack align="stretch" gap={6} pt={2} borderTopWidth="1px" borderColor="gray.100">
                        <Field.Root required>
                          <Field.Label fontWeight="700">Titular Afectado</Field.Label>
                          <NativeSelect.Root size="lg">
                            <NativeSelect.Field
                              value={form.adultoMayorId?.toString() || ""}
                              onChange={e => setForm({ ...form, adultoMayorId: e.target.value ? Number(e.target.value) : undefined })}
                            >
                              <option value="">Seleccione o busque un adulto mayor...</option>
                              {adultosMayores?.map((am: any) => (
                                <option key={am.id} value={am.id.toString()}>
                                  {am.nombre} {am.apellido} (DNI: {am.dni}) - Exp: {am.expediente}
                                </option>
                              ))}
                            </NativeSelect.Field>
                            <NativeSelect.Indicator />
                          </NativeSelect.Root>
                        </Field.Root>

                        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
                          <Field.Root required>
                            <Field.Label fontWeight="700">Categoría de la Situación</Field.Label>
                            <NativeSelect.Root size="lg">
                              <NativeSelect.Field value={form.tipoAlerta} onChange={e => setForm({ ...form, tipoAlerta: e.target.value as any })}>
                                <option value="falta_medicacion">Falta de Medicación</option>
                                <option value="salud_critica">Salud Crítica</option>
                                <option value="abandono">Abandono</option>
                                <option value="abuso_economico">Abuso Económico</option>
                                <option value="abuso_psicologico">Abuso Psicológico</option>
                                <option value="abuso_fisico">Abuso Físico</option>
                                <option value="otro">Otro</option>
                              </NativeSelect.Field>
                              <NativeSelect.Indicator />
                            </NativeSelect.Root>
                          </Field.Root>
                          <Field.Root required>
                            <Field.Label fontWeight="700">Nivel de Prioridad</Field.Label>
                            <NativeSelect.Root size="lg">
                              <NativeSelect.Field value={form.prioridad} onChange={e => setForm({ ...form, prioridad: e.target.value as any })}>
                                <option value="baja">Baja (Seguimiento regular)</option>
                                <option value="media">Media (Requiere visita pronto)</option>
                                <option value="alta">Alta (Intervención urgente)</option>
                                <option value="critica">Crítica (Riesgo de vida / Delito)</option>
                              </NativeSelect.Field>
                              <NativeSelect.Indicator />
                            </NativeSelect.Root>
                          </Field.Root>
                        </Grid>

                        <Field.Root required>
                          <Field.Label fontWeight="700">Título o Resumen Breve</Field.Label>
                          <Input
                            placeholder="Ej: Vecinos denuncian abandono de persona..."
                            size="lg"
                            value={form.titulo}
                            onChange={e => setForm({ ...form, titulo: e.target.value })}
                            required
                          />
                        </Field.Root>

                        <Field.Root required>
                          <Field.Label fontWeight="700">Descripción detallada de los hechos</Field.Label>
                          <Textarea
                            placeholder="Detalle de forma objetiva todo lo observado, denunciado o manifestado por el titular..."
                            minH="200px"
                            resize="none"
                            p={4}
                            value={form.descripcion}
                            onChange={e => setForm({ ...form, descripcion: e.target.value })}
                            required
                          />
                        </Field.Root>
                      </VStack>

                      <HStack justify="flex-end" gap={2} pt={4} borderTopWidth="1px" borderColor="gray.100">
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => {
                            if (editingId && alertaView) {
                              setViewMode(true);
                              setEditingId(null);
                            } else {
                              setOpen(false);
                            }
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button type="submit" bg="red.600" color="white" _hover={{ bg: "red.700" }} loading={createMutation.isPending || updateMutation.isPending}>
                          {editingId ? "Actualizar Alerta" : "Registrar Alerta"}
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

      <Box maxW="sm">
        <Box position="relative">
          <Input
            placeholder="Buscar por nombre o DNI del afectado..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            pl={9}
          />
          <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="gray.400" pointerEvents="none">
            <Search size={16} />
          </Box>
        </Box>
      </Box>

      <Tabs.Root defaultValue="pendientes" variant="enclosed">
        <Tabs.List>
          <Tabs.Trigger value="pendientes">
            <Clock size={16} /> Pendientes ({alertasPendientes.length})
          </Tabs.Trigger>
          <Tabs.Trigger value="resueltas">
            <CheckCircle size={16} /> Resueltas ({alertasResueltas.length})
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="pendientes">
          {isLoading ? (
            <VStack align="stretch" gap={3} mt={4}>
              {[1, 2, 3].map(i => <Skeleton key={i} h="12" />)}
            </VStack>
          ) : alertasPendientes.length > 0 ? (
            <Card.Root mt={4} boxShadow="sm">
              <Card.Body p={0}>
                <Table.Root>
                  <Table.Header>
                    <Table.Row bg="bg.muted">
                      <Table.ColumnHeader w="110px">Prioridad</Table.ColumnHeader>
                      <Table.ColumnHeader w="120px">Estado</Table.ColumnHeader>
                      <Table.ColumnHeader>Título / Residente</Table.ColumnHeader>
                      <Table.ColumnHeader w="160px">Categoría</Table.ColumnHeader>
                      <Table.ColumnHeader w="150px">Responsable</Table.ColumnHeader>
                      <Table.ColumnHeader w="220px" textAlign="right">Acciones</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {alertasPendientes.map((alerta: any) => {
                      const adultoMayor = adultosMayores?.find((am: any) => am.id === alerta.adultoMayorId);
                      return (
                        <Table.Row key={alerta.id} borderLeftWidth="4px" borderLeftColor={prioridadBorder[alerta.prioridad] ?? "blue.500"}>
                          <Table.Cell>
                            <PrioridadBadge prioridad={alerta.prioridad} />
                          </Table.Cell>
                          <Table.Cell>
                            <Badge bg={alerta.estado === "en_atencion" ? "blue.500" : "gray.400"} color="white" w="24" justifyContent="center">
                              {alerta.estado === "en_atencion" ? "En Atención" : "Pendiente"}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <VStack align="flex-start" gap={0}>
                              <Text fontWeight="600" fontSize="sm" color="fg" lineClamp={1}>{alerta.titulo}</Text>
                              <Text fontSize="xs" color="gray.500">
                                {adultoMayor ? `${adultoMayor.nombre} ${adultoMayor.apellido} (Exp: ${adultoMayor.expediente})` : "Titular no encontrado"}
                              </Text>
                            </VStack>
                          </Table.Cell>
                          <Table.Cell>
                            <Text fontSize="xs" fontWeight="500" color="fg.muted" bg="bg.muted" px={2} py={1} borderRadius="md" display="inline-block">
                              {getTipoAlertaLabel(alerta.tipoAlerta)}
                            </Text>
                          </Table.Cell>
                          <Table.Cell>
                            <HStack gap={1} fontSize="sm" color="fg" fontWeight="500">
                              <User size={14} color="var(--chakra-colors-gray-400)" />
                              <Text>{alerta.responsableAtencion || <Text as="span" fontSize="xs" color="gray.500" fontStyle="italic" fontWeight="400">Sin asignar</Text>}</Text>
                            </HStack>
                          </Table.Cell>
                          <Table.Cell textAlign="right">
                            <HStack justify="flex-end" gap={1.5}>
                              <IconButton aria-label="Ver Detalles" variant="ghost" size="sm" onClick={() => handleVerDetalles(alerta)}>
                                <Eye size={16} />
                              </IconButton>
                              {alerta.estado === "pendiente" && (
                                <Button variant="outline" size="sm" color="blue.600" borderColor="blue.200" onClick={() => handleCambiarEstado(alerta.id, "en_atencion")}>
                                  Atender
                                </Button>
                              )}
                              <Button size="sm" bg="green.600" color="white" _hover={{ bg: "green.700" }} onClick={() => { setAlertaSeleccionada(alerta.id); setResolverOpen(true); }}>
                                Resolver
                              </Button>
                            </HStack>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.Root>
              </Card.Body>
            </Card.Root>
          ) : (
            <Card.Root mt={4}>
              <Card.Body>
                <VStack py={12} gap={3}>
                  <AlertCircle size={48} color="var(--chakra-colors-gray-300)" />
                  <Text color="gray.500" fontWeight="500">No hay alertas pendientes en este momento.</Text>
                </VStack>
              </Card.Body>
            </Card.Root>
          )}
        </Tabs.Content>

        <Tabs.Content value="resueltas">
          {isLoading ? (
            <VStack align="stretch" gap={3} mt={4}>
              {[1, 2].map(i => <Skeleton key={i} h="12" />)}
            </VStack>
          ) : alertasResueltas.length > 0 ? (
            <Card.Root mt={4} boxShadow="sm">
              <Card.Body p={0}>
                <Table.Root>
                  <Table.Header>
                    <Table.Row bg="bg.muted">
                      <Table.ColumnHeader w="110px">Prioridad</Table.ColumnHeader>
                      <Table.ColumnHeader w="120px">Estado</Table.ColumnHeader>
                      <Table.ColumnHeader>Título / Residente</Table.ColumnHeader>
                      <Table.ColumnHeader w="160px">Categoría</Table.ColumnHeader>
                      <Table.ColumnHeader w="180px">Resuelto Por</Table.ColumnHeader>
                      <Table.ColumnHeader w="100px" textAlign="right">Acciones</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {alertasResueltas.map((alerta: any) => {
                      const adultoMayor = adultosMayores?.find((am: any) => am.id === alerta.adultoMayorId);
                      return (
                        <Table.Row key={alerta.id} opacity={0.85}>
                          <Table.Cell>
                            <PrioridadBadge prioridad={alerta.prioridad} />
                          </Table.Cell>
                          <Table.Cell>
                            <Badge bg="green.600" color="white" w="24" justifyContent="center">Resuelta</Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <VStack align="flex-start" gap={0}>
                              <Text fontWeight="600" fontSize="sm" color="fg" lineClamp={1}>{alerta.titulo}</Text>
                              <Text fontSize="xs" color="gray.500">
                                {adultoMayor ? `${adultoMayor.nombre} ${adultoMayor.apellido}` : "Titular no encontrado"}
                              </Text>
                            </VStack>
                          </Table.Cell>
                          <Table.Cell>
                            <Text fontSize="xs" fontWeight="500" color="fg.muted" bg="bg.muted" px={2} py={1} borderRadius="md" display="inline-block">
                              {getTipoAlertaLabel(alerta.tipoAlerta)}
                            </Text>
                          </Table.Cell>
                          <Table.Cell>
                            <VStack align="flex-start" gap={0}>
                              <Text fontSize="sm" fontWeight="500" color="green.800">{alerta.responsableAtencion || "Anónimo"}</Text>
                              <Text fontSize="11px" color="gray.500">
                                {alerta.fechaResolucion ? new Date(alerta.fechaResolucion).toLocaleDateString('es-AR') : ""}
                              </Text>
                            </VStack>
                          </Table.Cell>
                          <Table.Cell textAlign="right">
                            <IconButton aria-label="Ver Detalles" variant="ghost" size="sm" onClick={() => handleVerDetalles(alerta)}>
                              <Eye size={16} />
                            </IconButton>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.Root>
              </Card.Body>
            </Card.Root>
          ) : (
            <Card.Root mt={4}>
              <Card.Body>
                <VStack py={12} gap={3}>
                  <CheckCircle size={48} color="var(--chakra-colors-gray-300)" />
                  <Text color="gray.500" fontWeight="500">No hay alertas resueltas en el historial.</Text>
                </VStack>
              </Card.Body>
            </Card.Root>
          )}
        </Tabs.Content>
      </Tabs.Root>

      {/* MODAL PARA RESOLVER ALERTA */}
      <Dialog.Root open={resolverOpen} onOpenChange={d => setResolverOpen(d.open)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="md">
              <form onSubmit={handleResolver}>
                <Dialog.Header>
                  <Box>
                    <Dialog.Title color="green.700" display="flex" alignItems="center" gap={2}>
                      <CheckCircle size={18} /> Resolver Alerta
                    </Dialog.Title>
                    <Dialog.Description>
                      Deje constancia de la intervención realizada para cerrar el caso.
                    </Dialog.Description>
                  </Box>
                </Dialog.Header>
                <Dialog.Body>
                  <VStack align="stretch" gap={4}>
                    <Field.Root required>
                      <Field.Label fontWeight="700">Profesional a cargo</Field.Label>
                      <Input
                        placeholder="Nombre del trabajador social o interviniente..."
                        value={resolucionForm.responsableAtencion}
                        onChange={e => setResolucionForm({ ...resolucionForm, responsableAtencion: e.target.value })}
                        required
                      />
                    </Field.Root>
                    <Field.Root required>
                      <Field.Label fontWeight="700">Informe de Resolución</Field.Label>
                      <Textarea
                        placeholder="Detalle las medidas tomadas, derivaciones realizadas y la situación actual..."
                        value={resolucionForm.observacionesResolucion}
                        onChange={e => setResolucionForm({ ...resolucionForm, observacionesResolucion: e.target.value })}
                        rows={6}
                        resize="none"
                        required
                      />
                    </Field.Root>
                  </VStack>
                </Dialog.Body>
                <Dialog.Footer>
                  <Button variant="outline" type="button" onClick={() => setResolverOpen(false)}>Cancelar</Button>
                  <Button type="submit" bg="green.600" color="white" _hover={{ bg: "green.700" }} loading={updateMutation.isPending}>
                    Guardar Resolución
                  </Button>
                </Dialog.Footer>
              </form>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
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

function SimpleGridDetails({ children }: { children: React.ReactNode }) {
  return (
    <Grid templateColumns="1fr 1fr" gap={4} fontSize="sm">
      {children}
    </Grid>
  );
}
