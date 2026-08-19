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
import { Scale, Plus, Edit } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type DerivacionForm = {
  adultoMayorId: number | undefined;
  fechaDerivacion: string;
  motivo: string;
  juzgado: string;
  numeroExpediente: string;
  fiscalia: string;
  documentacionAdjunta: string;
  observaciones: string;
  responsable: string;
};

const initialForm: DerivacionForm = {
  adultoMayorId: undefined,
  fechaDerivacion: new Date().toISOString().split('T')[0],
  motivo: "",
  juzgado: "",
  numeroExpediente: "",
  fiscalia: "",
  documentacionAdjunta: "",
  observaciones: "",
  responsable: "",
};

const estadoPalette: Record<string, string> = {
  iniciada: "blue.600",
  en_tramite: "amber.500",
  finalizada: "emerald.600",
  archivada: "gray.500",
};

const estadoLabels: Record<string, string> = {
  iniciada: "Iniciada",
  en_tramite: "En Trámite",
  finalizada: "Finalizada",
  archivada: "Archivada"
};

function EstadoBadge({ estado }: { estado: string }) {
  return (
    <Badge bg={estadoPalette[estado] ?? "blue.600"} color="white">
      {estadoLabels[estado] || estado}
    </Badge>
  );
}

export default function Derivaciones() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<DerivacionForm>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    estadoDerivacion: "iniciada",
    numeroExpediente: "",
    fiscalia: "",
    documentacionAdjunta: "",
    observaciones: "",
  });

  const { data: derivaciones, isLoading } = trpc.derivaciones.list.useQuery();
  const { data: adultosMayores } = trpc.adultosMayores.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.derivaciones.create.useMutation({
    onSuccess: () => {
      toast.success("Derivación registrada exitosamente");
      utils.derivaciones.list.invalidate();
      setOpen(false);
      setForm(initialForm);
    },
    onError: (error) => {
      toast.error(error.message || "Error al registrar derivación");
    },
  });

  const updateMutation = trpc.derivaciones.update.useMutation({
    onSuccess: () => {
      toast.success("Derivación actualizada exitosamente");
      utils.derivaciones.list.invalidate();
      setEditOpen(false);
      setEditingId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar derivación");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.adultoMayorId) {
      toast.error("Debe seleccionar un adulto mayor");
      return;
    }

    // Pasamos de forma segura los parámetros esperados por el Router de tRPC
    createMutation.mutate({
      adultoMayorId: form.adultoMayorId,
      fechaDerivacion: form.fechaDerivacion, // Pasamos el string ISO o literal que infiera el router de backend
      motivo: form.motivo,
      juzgado: form.juzgado,
      numeroExpediente: form.numeroExpediente || undefined,
      fiscalia: form.fiscalia || undefined,
      documentacionAdjunta: form.documentacionAdjunta || undefined,
      observaciones: form.observaciones || undefined,
      responsable: form.responsable || (user ? `${user.nombre} ${user.apellido}`.trim() : "Usuario"),
    });
  };

  const handleEdit = (derivacion: any) => {
    setEditingId(derivacion.id);
    setEditForm({
      estadoDerivacion: derivacion.estadoDerivacion || "iniciada",
      numeroExpediente: derivacion.numeroExpediente || "",
      fiscalia: derivacion.fiscalia || "",
      documentacionAdjunta: derivacion.documentacionAdjunta || "",
      observaciones: derivacion.observaciones || "",
    });
    setEditOpen(true);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    updateMutation.mutate({
      id: editingId,
      estadoDerivacion: editForm.estadoDerivacion as any,
      numeroExpediente: editForm.numeroExpediente || undefined,
      fiscalia: editForm.fiscalia || undefined,
      documentacionAdjunta: editForm.documentacionAdjunta || undefined,
      observaciones: editForm.observaciones || undefined,
    });
  };

  const EmptyState = () => (
    <Card.Root borderWidth="2px" borderStyle="dashed" py={12}>
      <Card.Body>
        <VStack gap={3}>
          <Scale size={48} color="var(--chakra-colors-gray-300)" />
          <Text color="gray.500" fontWeight="500">No hay derivaciones registradas</Text>
          <Button bg="brand.600" color="white" _hover={{ bg: "brand.700" }} onClick={() => setOpen(true)}>
            <Plus size={16} /> Crear primera derivación
          </Button>
        </VStack>
      </Card.Body>
    </Card.Root>
  );

  return (
    <VStack align="stretch" gap={6}>
      <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} gap={3}>
        <Box>
          <Heading size="2xl" color="heading">Derivaciones Judiciales</Heading>
          <Text color="gray.500" mt={2}>
            Registro y seguimiento de casos derivados a la Justicia
          </Text>
        </Box>
        <Button bg="brand.600" color="white" _hover={{ bg: "brand.700" }} onClick={() => setOpen(true)}>
          <Plus size={16} />
          Nueva Derivación
        </Button>
      </Flex>

      <Dialog.Root open={open} onOpenChange={d => { setOpen(d.open); if (!d.open) setForm(initialForm); }}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="2xl" maxH="90vh">
              <form onSubmit={handleSubmit}>
                <Dialog.Header>
                  <Box>
                    <Dialog.Title color="heading">Nueva Derivación Judicial</Dialog.Title>
                    <Dialog.Description>
                      Registre una nueva derivación de caso a la Justicia
                    </Dialog.Description>
                  </Box>
                </Dialog.Header>
                <Dialog.Body overflowY="auto">
                  <VStack align="stretch" gap={4}>
                    <Field.Root required>
                      <Field.Label>Adulto Mayor</Field.Label>
                      <NativeSelect.Root>
                        <NativeSelect.Field
                          value={form.adultoMayorId?.toString() || ""}
                          onChange={e => setForm({ ...form, adultoMayorId: e.target.value ? Number(e.target.value) : undefined })}
                        >
                          <option value="">Seleccione un adulto mayor</option>
                          {adultosMayores?.map((am: any) => (
                            <option key={am.id} value={am.id.toString()}>
                              {am.nombre} {am.apellido}
                            </option>
                          ))}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    </Field.Root>

                    <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
                      <Field.Root required>
                        <Field.Label>Fecha Derivación</Field.Label>
                        <Input type="date" value={form.fechaDerivacion} onChange={e => setForm({ ...form, fechaDerivacion: e.target.value })} required />
                      </Field.Root>
                      <Field.Root>
                        <Field.Label>Responsable</Field.Label>
                        <Input
                          placeholder={user ? `${user.nombre} ${user.apellido}`.trim() : "Nombre del responsable"}
                          value={form.responsable}
                          onChange={e => setForm({ ...form, responsable: e.target.value })}
                        />
                      </Field.Root>
                    </SimpleGrid>

                    <Field.Root required>
                      <Field.Label>Motivo de Derivación</Field.Label>
                      <Textarea
                        placeholder="Detalle los motivos e informes de la derivación..."
                        value={form.motivo}
                        onChange={e => setForm({ ...form, motivo: e.target.value })}
                        rows={4}
                        required
                      />
                    </Field.Root>

                    <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
                      <Field.Root required>
                        <Field.Label>Juzgado</Field.Label>
                        <Input
                          placeholder="Ej: Juzgado de Familia N° 2"
                          value={form.juzgado}
                          onChange={e => setForm({ ...form, juzgado: e.target.value })}
                          required
                        />
                      </Field.Root>
                      <Field.Root>
                        <Field.Label>Número Expediente</Field.Label>
                        <Input
                          placeholder="Ej: EXP-12345/2026"
                          value={form.numeroExpediente}
                          onChange={e => setForm({ ...form, numeroExpediente: e.target.value })}
                        />
                      </Field.Root>
                    </SimpleGrid>

                    <Field.Root>
                      <Field.Label>Fiscalía</Field.Label>
                      <Input
                        placeholder="Ej: Fiscalía de Instrucción N° 1"
                        value={form.fiscalia}
                        onChange={e => setForm({ ...form, fiscalia: e.target.value })}
                      />
                    </Field.Root>

                    <Field.Root>
                      <Field.Label>Documentación Adjunta</Field.Label>
                      <Input
                        value={form.documentacionAdjunta}
                        onChange={e => setForm({ ...form, documentacionAdjunta: e.target.value })}
                        placeholder="Ej: Denuncias, reportes socioambientales, etc."
                      />
                    </Field.Root>

                    <Field.Root>
                      <Field.Label>Observaciones</Field.Label>
                      <Textarea
                        value={form.observaciones}
                        onChange={e => setForm({ ...form, observaciones: e.target.value })}
                        rows={3}
                      />
                    </Field.Root>
                  </VStack>
                </Dialog.Body>
                <Dialog.Footer>
                  <Button type="submit" bg="brand.600" color="white" _hover={{ bg: "brand.700" }} loading={createMutation.isPending}>
                    Registrar Derivación
                  </Button>
                </Dialog.Footer>
              </form>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      <Tabs.Root defaultValue="tabla" variant="enclosed">
        <Tabs.List>
          <Tabs.Trigger value="tabla">Vista Tabla</Tabs.Trigger>
          <Tabs.Trigger value="tarjetas">Vista Tarjetas</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="tabla">
          {isLoading ? (
            <Skeleton h="96" mt={4} />
          ) : derivaciones && derivaciones.length > 0 ? (
            <Card.Root mt={4} boxShadow="sm">
              <Card.Body p={0}>
                <Table.Root>
                  <Table.Header>
                    <Table.Row bg="bg.muted">
                      <Table.ColumnHeader>Adulto Mayor</Table.ColumnHeader>
                      <Table.ColumnHeader>Fecha Derivación</Table.ColumnHeader>
                      <Table.ColumnHeader>Juzgado</Table.ColumnHeader>
                      <Table.ColumnHeader>Expediente</Table.ColumnHeader>
                      <Table.ColumnHeader>Estado</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right">Acciones</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {derivaciones.map((derivacion: any) => {
                      const adultoMayor = adultosMayores?.find((am: any) => am.id === derivacion.adultoMayorId);
                      return (
                        <Table.Row key={derivacion.id}>
                          <Table.Cell fontWeight="600">
                            {adultoMayor ? `${adultoMayor.nombre} ${adultoMayor.apellido}` : "N/A"}
                          </Table.Cell>
                          <Table.Cell>{derivacion.fechaDerivacion ? new Date(derivacion.fechaDerivacion).toLocaleDateString('es-AR') : "N/A"}</Table.Cell>
                          <Table.Cell>{derivacion.juzgado || "N/A"}</Table.Cell>
                          <Table.Cell>{derivacion.numeroExpediente || "N/A"}</Table.Cell>
                          <Table.Cell>
                            <EstadoBadge estado={derivacion.estadoDerivacion} />
                          </Table.Cell>
                          <Table.Cell textAlign="right">
                            <IconButton aria-label="Editar" variant="ghost" size="sm" onClick={() => handleEdit(derivacion)}>
                              <Edit size={16} color="var(--chakra-colors-brand-600)" />
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
          ) : derivaciones && derivaciones.length > 0 ? (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4} mt={4}>
              {derivaciones.map((derivacion: any) => {
                const adultoMayor = adultosMayores?.find((am: any) => am.id === derivacion.adultoMayorId);
                return (
                  <Card.Root key={derivacion.id} _hover={{ boxShadow: "md" }} transition="box-shadow 0.15s ease">
                    <Card.Header pb={3}>
                      <Flex justify="space-between" align="flex-start" gap={2}>
                        <Box flex={1}>
                          <Card.Title display="flex" alignItems="center" gap={2} fontSize="md">
                            <Scale size={16} color="var(--chakra-colors-brand-600)" />
                            Derivación Judicial
                          </Card.Title>
                          <Card.Description mt={1} color="brand.700" fontWeight="500">
                            {adultoMayor ? `${adultoMayor.nombre} ${adultoMayor.apellido}` : "N/A"}
                          </Card.Description>
                        </Box>
                        <EstadoBadge estado={derivacion.estadoDerivacion} />
                      </Flex>
                    </Card.Header>
                    <Card.Body pt={0}>
                      <VStack align="stretch" gap={2} fontSize="sm" color="gray.600">
                        <Text><Text as="span" fontWeight="700" color="fg">Fecha:</Text> {derivacion.fechaDerivacion ? new Date(derivacion.fechaDerivacion).toLocaleDateString('es-AR') : "N/A"}</Text>
                        <Text><Text as="span" fontWeight="700" color="fg">Juzgado:</Text> {derivacion.juzgado || "N/A"}</Text>
                        <Text><Text as="span" fontWeight="700" color="fg">Expediente:</Text> {derivacion.numeroExpediente || "N/A"}</Text>
                        <Text><Text as="span" fontWeight="700" color="fg">Fiscalía:</Text> {derivacion.fiscalia || "N/A"}</Text>
                        {derivacion.motivo && (
                          <Box pt={1}>
                            <Text fontWeight="700" color="fg">Motivo:</Text>
                            <Text fontSize="xs" color="gray.500" lineClamp={2} mt={0.5}>{derivacion.motivo}</Text>
                          </Box>
                        )}
                      </VStack>
                      <Button variant="outline" size="sm" w="full" mt={4} onClick={() => handleEdit(derivacion)}>
                        <Edit size={14} /> Actualizar Caso
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

      {/* Dialog de edición */}
      <Dialog.Root open={editOpen} onOpenChange={d => { setEditOpen(d.open); if (!d.open) setEditingId(null); }}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="2xl" maxH="90vh">
              <form onSubmit={handleUpdateSubmit}>
                <Dialog.Header>
                  <Box>
                    <Dialog.Title color="heading">Actualizar Derivación</Dialog.Title>
                    <Dialog.Description>
                      Modifique el estado y detalles de la derivación judicial
                    </Dialog.Description>
                  </Box>
                </Dialog.Header>
                <Dialog.Body overflowY="auto">
                  <VStack align="stretch" gap={4}>
                    <Field.Root required>
                      <Field.Label>Estado Derivación</Field.Label>
                      <NativeSelect.Root>
                        <NativeSelect.Field value={editForm.estadoDerivacion} onChange={e => setEditForm({ ...editForm, estadoDerivacion: e.target.value })}>
                          <option value="iniciada">Iniciada</option>
                          <option value="en_tramite">En Trámite</option>
                          <option value="finalizada">Finalizada</option>
                          <option value="archivada">Archivada</option>
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    </Field.Root>
                    <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
                      <Field.Root>
                        <Field.Label>Número Expediente</Field.Label>
                        <Input value={editForm.numeroExpediente} onChange={e => setEditForm({ ...editForm, numeroExpediente: e.target.value })} />
                      </Field.Root>
                      <Field.Root>
                        <Field.Label>Fiscalía</Field.Label>
                        <Input value={editForm.fiscalia} onChange={e => setEditForm({ ...editForm, fiscalia: e.target.value })} />
                      </Field.Root>
                    </SimpleGrid>
                    <Field.Root>
                      <Field.Label>Documentación Adjunta</Field.Label>
                      <Input value={editForm.documentacionAdjunta} onChange={e => setEditForm({ ...editForm, documentacionAdjunta: e.target.value })} />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Observaciones</Field.Label>
                      <Textarea value={editForm.observaciones} onChange={e => setEditForm({ ...editForm, observaciones: e.target.value })} rows={3} />
                    </Field.Root>
                  </VStack>
                </Dialog.Body>
                <Dialog.Footer>
                  <Button type="submit" bg="brand.600" color="white" _hover={{ bg: "brand.700" }} loading={updateMutation.isPending}>
                    Actualizar Derivación
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
