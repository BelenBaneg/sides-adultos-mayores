import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Badge,
  Box,
  Button,
  Card,
  Dialog,
  Field,
  Flex,
  Heading,
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
import { History, Plus, Edit, FileText, Trash, ClipboardList, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type SeguimientoForm = {
  adultoMayorId: number | undefined;
  tipoSeguimiento: "visita" | "reporte_vulnerabilidad" | "control_medico" | "entrevista_social" | "otro";
  fecha: string;
  descripcion: string;
  observaciones: string;
  responsable: string;
};

const initialForm: SeguimientoForm = {
  adultoMayorId: undefined,
  tipoSeguimiento: "visita",
  fecha: new Date().toISOString().split('T')[0],
  descripcion: "",
  observaciones: "",
  responsable: "",
};

const tipoPalette: Record<string, string> = {
  visita: "blue.500",
  reporte_vulnerabilidad: "red.500",
  control_medico: "green.500",
  entrevista_social: "purple.500",
  otro: "gray.500",
};

function TipoBadge({ tipo, label }: { tipo: string; label: string }) {
  return (
    <Badge bg={tipoPalette[tipo] ?? "gray.500"} color="white">
      {label}
    </Badge>
  );
}

export default function Seguimientos() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [form, setForm] = useState<SeguimientoForm>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [filterAdulto, setFilterAdulto] = useState<string>("");

  const { data: seguimientos, isLoading } = trpc.seguimientos.list.useQuery();
  const { data: adultosMayores } = trpc.adultosMayores.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.seguimientos.create.useMutation({
    onSuccess: () => {
      toast.success("Seguimiento registrado exitosamente");
      utils.seguimientos.list.invalidate();
      setOpen(false);
      setForm(initialForm);
    },
    onError: (error) => {
      toast.error(error.message || "Error al registrar seguimiento");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.adultoMayorId) {
      toast.error("Debe seleccionar un adulto mayor");
      return;
    }

    const payload = {
      ...form,
      adultoMayorId: form.adultoMayorId,
      fecha: new Date(form.fecha),
      responsable: form.responsable || (user ? `${user.nombre} ${user.apellido}`.trim() : "Usuario Administrador"),
    };

    if (editingId) {
      toast.info("La actualización de seguimientos requiere habilitar el endpoint en el servidor.");
      setOpen(false);
    } else {
      createMutation.mutate(payload as any);
    }
  };

  const handleEdit = (seguimiento: any) => {
    setEditingId(seguimiento.id);
    setForm({
      adultoMayorId: seguimiento.adultoMayorId,
      tipoSeguimiento: seguimiento.tipoSeguimiento,
      fecha: new Date(seguimiento.fecha).toISOString().split('T')[0],
      descripcion: seguimiento.descripcion || "",
      observaciones: seguimiento.observaciones || "",
      responsable: seguimiento.responsable || "",
    });
    setViewMode(true);
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    toast.error("El borrado de seguimientos aún no está configurado en el servidor.");
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

  const filteredSeguimientos = seguimientos?.filter((seg: any) => {
    const tipoMatch = filterTipo === "todos" || seg.tipoSeguimiento === filterTipo;

    const q = filterAdulto.trim().toLowerCase();
    let adultoMatch = true;
    if (q) {
      const am = adultosMayores?.find((a: any) => a.id === seg.adultoMayorId);
      const nombreCompleto = am ? `${am.nombre ?? ""} ${am.apellido ?? ""}`.toLowerCase() : "";
      const dni = (am?.dni ?? "").toLowerCase();
      adultoMatch = nombreCompleto.includes(q) || dni.includes(q);
    }

    return tipoMatch && adultoMatch;
  });

  const adultoMayorSeleccionado = adultosMayores?.find((am: any) => am.id === form.adultoMayorId);

  const EmptyState = () => (
    <Card.Root>
      <Card.Body>
        <VStack py={12} gap={3}>
          <History size={48} color="var(--chakra-colors-gray-300)" />
          <Text color="gray.500" fontWeight="500">No hay seguimientos registrados</Text>
          <Button bg="blue.600" color="white" _hover={{ bg: "blue.700" }} onClick={() => setOpen(true)}>
            <Plus size={16} /> Crear primer seguimiento
          </Button>
        </VStack>
      </Card.Body>
    </Card.Root>
  );

  return (
    <VStack align="stretch" gap={6}>
      <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} gap={3}>
        <Box>
          <Heading size="2xl" color="heading" display="flex" alignItems="center" gap={2}>
            <ClipboardList size={30} color="var(--chakra-colors-brand-600)" />
            Seguimientos
          </Heading>
          <Text color="gray.500" mt={2}>
            Historial de visitas, reportes y controles
          </Text>
        </Box>
        <Button bg="brand.600" color="white" _hover={{ bg: "brand.700" }} onClick={() => { setForm(initialForm); setEditingId(null); setViewMode(false); setOpen(true); }}>
          <Plus size={16} />
          Nuevo Seguimiento
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
          }
        }}
        size="full"
        scrollBehavior="inside"
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="min(900px, 95vw)" maxH="90vh" m="auto">
              <Dialog.Body p={6} overflowY="auto">
                {viewMode ? (
                  <VStack align="stretch" gap={6}>
                    <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} gap={4} pb={4} borderBottomWidth="1px" borderColor="gray.200">
                      <Box>
                        <Dialog.Title fontSize="2xl" fontWeight="800" color="blue.900">
                          Registro de Seguimiento
                        </Dialog.Title>
                        <Flex align="center" gap={3} mt={2} color="gray.600" fontSize="lg">
                          <TipoBadge tipo={form.tipoSeguimiento} label={getTipoLabel(form.tipoSeguimiento)} />
                          <Text>| Fecha: {new Date(form.fecha).toLocaleDateString('es-AR')}</Text>
                        </Flex>
                      </Box>
                      <Flex gap={2} flexWrap="wrap">
                        <Button variant="outline" borderColor="blue.400" color="blue.700" onClick={() => setViewMode(false)}>
                          <Edit size={15} /> Editar Registro
                        </Button>
                        <Button bg="red.600" color="white" _hover={{ bg: "red.700" }} onClick={() => handleDelete(editingId!)}>
                          <Trash size={15} /> Eliminar
                        </Button>
                      </Flex>
                    </Flex>

                    <SimpleGrid columns={{ base: 1, md: 2 }} gap={8}>
                      <VStack align="stretch" gap={6}>
                        <Heading size="md" borderBottomWidth="2px" borderColor="gray.100" pb={2}>Datos Generales</Heading>
                        <Box>
                          <Text fontWeight="600" color="gray.500" fontSize="sm" mb={1}>Adulto Mayor:</Text>
                          <Box bg={{ base: "blue.50", _dark: "blue.950" }} p={3} borderRadius="md" borderWidth="1px" borderColor={{ base: "blue.100", _dark: "blue.800" }}>
                            {adultoMayorSeleccionado
                              ? <Text color={{ base: "blue.900", _dark: "blue.100" }} fontWeight="500">{adultoMayorSeleccionado.nombre} {adultoMayorSeleccionado.apellido} <Text as="span" color={{ base: "blue.600", _dark: "blue.300" }} fontSize="sm" fontWeight="400">(DNI: {adultoMayorSeleccionado.dni})</Text></Text>
                              : "S/D"
                            }
                          </Box>
                        </Box>
                        <Box>
                          <Text fontWeight="600" color="gray.500" fontSize="sm" mb={1}>Responsable del seguimiento:</Text>
                          <Text color="fg">{form.responsable || "S/D"}</Text>
                        </Box>
                      </VStack>

                      <VStack align="stretch" gap={6}>
                        <Heading size="md" borderBottomWidth="2px" borderColor="gray.100" pb={2}>Detalles</Heading>
                        <Box>
                          <Text fontWeight="600" color="gray.500" fontSize="sm" mb={2}>Descripción de lo actuado:</Text>
                          <Box bg="bg.panel" p={4} borderRadius="md" borderWidth="1px" borderColor="gray.200" color="fg" whiteSpace="pre-wrap" minH="100px" boxShadow="sm">
                            {form.descripcion || <Text as="span" fontStyle="italic" opacity={0.6}>Sin descripción.</Text>}
                          </Box>
                        </Box>
                        <Box>
                          <Text fontWeight="600" color="gray.500" fontSize="sm" mb={2}>Observaciones Adicionales:</Text>
                          <Box bg="bg.muted" p={4} borderRadius="md" borderWidth="1px" borderColor="gray.200" color="fg" whiteSpace="pre-wrap" minH="80px">
                            {form.observaciones || <Text as="span" fontStyle="italic" opacity={0.6}>Sin observaciones registradas.</Text>}
                          </Box>
                        </Box>
                      </VStack>
                    </SimpleGrid>
                  </VStack>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <VStack align="stretch" gap={6}>
                      <Box pb={4} borderBottomWidth="1px" borderColor="gray.200">
                        <Dialog.Title fontSize="xl" fontWeight="700">
                          {editingId ? "Modificar Seguimiento" : "Nuevo Seguimiento"}
                        </Dialog.Title>
                        <Dialog.Description color="gray.500">
                          Registre una nueva visita, reporte o control.
                        </Dialog.Description>
                      </Box>

                      <VStack align="stretch" gap={6}>
                        <Text color="blue.700" fontWeight="700" textTransform="uppercase" letterSpacing="wide" fontSize="xs">
                          Datos del Seguimiento
                        </Text>

                        <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
                          <Field.Root required>
                            <Field.Label fontWeight="600">Adulto Mayor</Field.Label>
                            <NativeSelect.Root size="lg">
                              <NativeSelect.Field
                                value={form.adultoMayorId?.toString() || ""}
                                onChange={e => setForm({ ...form, adultoMayorId: e.target.value ? Number(e.target.value) : undefined })}
                              >
                                <option value="">Seleccione un adulto mayor</option>
                                {adultosMayores?.map((am: any) => (
                                  <option key={am.id} value={am.id.toString()}>
                                    {am.nombre} {am.apellido} (DNI: {am.dni})
                                  </option>
                                ))}
                              </NativeSelect.Field>
                              <NativeSelect.Indicator />
                            </NativeSelect.Root>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label fontWeight="600">Responsable</Field.Label>
                            <Input
                              size="lg"
                              value={form.responsable || (user ? `${user.nombre} ${user.apellido}`.trim() : "Usuario Administrador")}
                              onChange={e => setForm({ ...form, responsable: e.target.value })}
                            />
                          </Field.Root>
                        </SimpleGrid>

                        <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
                          <Field.Root required>
                            <Field.Label fontWeight="600">Tipo de Seguimiento</Field.Label>
                            <NativeSelect.Root size="lg">
                              <NativeSelect.Field value={form.tipoSeguimiento} onChange={e => setForm({ ...form, tipoSeguimiento: e.target.value as any })}>
                                <option value="visita">Visita</option>
                                <option value="reporte_vulnerabilidad">Reporte de Vulnerabilidad</option>
                                <option value="control_medico">Control Médico</option>
                                <option value="entrevista_social">Entrevista Social</option>
                                <option value="otro">Otro</option>
                              </NativeSelect.Field>
                              <NativeSelect.Indicator />
                            </NativeSelect.Root>
                          </Field.Root>
                          <Field.Root required>
                            <Field.Label fontWeight="600">Fecha</Field.Label>
                            <Input size="lg" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} required />
                          </Field.Root>
                        </SimpleGrid>

                        <Field.Root required pt={2} borderTopWidth="1px" borderColor="gray.100">
                          <Field.Label fontWeight="600" mt={4}>Descripción del Seguimiento</Field.Label>
                          <Textarea
                            value={form.descripcion}
                            onChange={e => setForm({ ...form, descripcion: e.target.value })}
                            rows={5}
                            resize="none"
                            p={3}
                            placeholder="Detalle aquí las acciones realizadas..."
                            required
                          />
                        </Field.Root>

                        <Field.Root>
                          <Field.Label fontWeight="600">Observaciones (Opcional)</Field.Label>
                          <Textarea
                            value={form.observaciones}
                            onChange={e => setForm({ ...form, observaciones: e.target.value })}
                            rows={3}
                            resize="none"
                            bg="bg.muted"
                            p={3}
                          />
                        </Field.Root>
                      </VStack>

                      <Flex justify="flex-end" gap={2} mt={4} pt={4} borderTopWidth="1px" borderColor="gray.100">
                        <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" bg="blue.600" color="white" _hover={{ bg: "blue.700" }} px={8} loading={createMutation.isPending}>
                          {editingId ? "Actualizar Seguimiento" : "Registrar Seguimiento"}
                        </Button>
                      </Flex>
                    </VStack>
                  </form>
                )}
              </Dialog.Body>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      {/* Filtros */}
      <Card.Root>
        <Card.Body pt={6}>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            <Field.Root>
              <Field.Label>Filtrar por Tipo</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
                  <option value="todos">Todos los tipos</option>
                  <option value="visita">Visita</option>
                  <option value="reporte_vulnerabilidad">Reporte de Vulnerabilidad</option>
                  <option value="control_medico">Control Médico</option>
                  <option value="entrevista_social">Entrevista Social</option>
                  <option value="otro">Otro</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>
            <Field.Root>
              <Field.Label>Filtrar por Adulto Mayor</Field.Label>
              <Box position="relative" w="full">
                <Input
                  placeholder="Buscar por nombre o DNI..."
                  value={filterAdulto}
                  onChange={e => setFilterAdulto(e.target.value)}
                  pl={9}
                />
                <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="gray.400" pointerEvents="none">
                  <Search size={16} />
                </Box>
              </Box>
            </Field.Root>
          </SimpleGrid>
        </Card.Body>
      </Card.Root>

      <Tabs.Root defaultValue="tabla" variant="enclosed">
        <Tabs.List>
          <Tabs.Trigger value="tabla">Vista Tabla</Tabs.Trigger>
          <Tabs.Trigger value="tarjetas">Vista Tarjetas</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="tabla">
          {isLoading ? (
            <Skeleton h="96" mt={4} />
          ) : filteredSeguimientos && filteredSeguimientos.length > 0 ? (
            <Card.Root mt={4}>
              <Card.Body p={0}>
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Adulto Mayor</Table.ColumnHeader>
                      <Table.ColumnHeader>Tipo</Table.ColumnHeader>
                      <Table.ColumnHeader>Fecha</Table.ColumnHeader>
                      <Table.ColumnHeader>Responsable</Table.ColumnHeader>
                      <Table.ColumnHeader>Descripción</Table.ColumnHeader>
                      <Table.ColumnHeader>Acciones</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {filteredSeguimientos.map((seguimiento: any) => {
                      const adultoMayor = adultosMayores?.find((am: any) => am.id === seguimiento.adultoMayorId);
                      return (
                        <Table.Row key={seguimiento.id}>
                          <Table.Cell fontWeight="600">
                            {adultoMayor ? `${adultoMayor.nombre} ${adultoMayor.apellido}` : "N/A"}
                          </Table.Cell>
                          <Table.Cell>
                            <TipoBadge tipo={seguimiento.tipoSeguimiento} label={getTipoLabel(seguimiento.tipoSeguimiento)} />
                          </Table.Cell>
                          <Table.Cell>{new Date(seguimiento.fecha).toLocaleDateString('es-AR')}</Table.Cell>
                          <Table.Cell>{seguimiento.responsable || "N/A"}</Table.Cell>
                          <Table.Cell maxW="xs" truncate>{seguimiento.descripcion}</Table.Cell>
                          <Table.Cell>
                            <IconButton aria-label="Ver detalles" variant="ghost" size="sm" onClick={() => handleEdit(seguimiento)}>
                              <FileText size={16} color="var(--chakra-colors-blue-600)" />
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
            <Box mt={4}><EmptyState /></Box>
          )}
        </Tabs.Content>

        <Tabs.Content value="tarjetas">
          {isLoading ? (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4} mt={4}>
              {[1, 2, 3].map(i => <Skeleton key={i} h="48" />)}
            </SimpleGrid>
          ) : filteredSeguimientos && filteredSeguimientos.length > 0 ? (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4} mt={4}>
              {filteredSeguimientos.map((seguimiento: any) => {
                const adultoMayor = adultosMayores?.find((am: any) => am.id === seguimiento.adultoMayorId);
                return (
                  <Card.Root key={seguimiento.id} _hover={{ boxShadow: "lg" }} transition="box-shadow 0.15s ease">
                    <Card.Header>
                      <Flex justify="space-between" align="flex-start">
                        <Box flex={1}>
                          <Card.Title display="flex" alignItems="center" gap={2} fontSize="md">
                            <History size={18} color="var(--chakra-colors-blue-600)" />
                            {getTipoLabel(seguimiento.tipoSeguimiento)}
                          </Card.Title>
                          <Card.Description mt={2} color="fg" fontWeight="500">
                            {adultoMayor ? `${adultoMayor.nombre} ${adultoMayor.apellido}` : "N/A"}
                          </Card.Description>
                        </Box>
                        <TipoBadge tipo={seguimiento.tipoSeguimiento} label={getTipoLabel(seguimiento.tipoSeguimiento)} />
                      </Flex>
                    </Card.Header>
                    <Card.Body pt={0}>
                      <VStack align="stretch" gap={2} fontSize="sm">
                        <Text><Text as="span" fontWeight="700">Fecha:</Text> {new Date(seguimiento.fecha).toLocaleDateString('es-AR')}</Text>
                        <Text><Text as="span" fontWeight="700">Responsable:</Text> {seguimiento.responsable || "N/A"}</Text>
                        <Box pt={2} borderTopWidth="1px" borderColor="gray.100">
                          <Text fontWeight="700">Descripción:</Text>
                          <Text fontSize="xs" color="fg.muted" lineClamp={3} mt={1} bg="bg.muted" p={2} borderRadius="md">{seguimiento.descripcion}</Text>
                        </Box>
                      </VStack>
                      <Button variant="outline" size="sm" w="full" mt={4} color="blue.600" borderColor="blue.200" onClick={() => handleEdit(seguimiento)}>
                        <FileText size={14} /> Ver Detalles
                      </Button>
                    </Card.Body>
                  </Card.Root>
                );
              })}
            </SimpleGrid>
          ) : (
            <Box mt={4}><EmptyState /></Box>
          )}
        </Tabs.Content>
      </Tabs.Root>
    </VStack>
  );
}
