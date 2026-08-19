import { useState, useEffect } from "react";
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
  Text,
  VStack,
} from "@chakra-ui/react";
import { UserPlus, Shield, Eye, EyeOff, ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Usuario {
  id: string; // DNI
  nombre: string;
  apellido: string;
  email: string;
  role: "superadmin" | "admin" | "user";
}

const roleBadge: Record<string, { bg: string; color: string; label: string }> = {
  superadmin: { bg: "brand.100", color: "brand.800", label: "Superadmin" },
  admin: { bg: "blue.100", color: "blue.800", label: "Administrador" },
  user: { bg: "gray.100", color: "gray.700", label: "Consulta" },
};

export default function Usuarios() {
  // 🔄 Estado para controlar qué vista mostrar: "lista" o "alta"
  const [vista, setVista] = useState<"lista" | "alta">("lista");

  // 📝 Estados del formulario de alta
  const [dni, setDni] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"superadmin" | "admin" | "user">("admin");

  const [showPassword, setShowPassword] = useState(false);

  // ✏️ Estados para controlar el modal flotante de edición
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editApellido, setEditApellido] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"superadmin" | "admin" | "user">("admin");

  useEffect(() => {
    setUsuarioEditando(null);
  }, [vista]);

  const { data: listaUsuarios, refetch: recargarUsuarios, isLoading, error: errorQuery } = trpc.usuarios.list.useQuery(undefined, {
    enabled: vista === "lista",
  });

  useEffect(() => {
    if (errorQuery) {
      toast.error(errorQuery.message || "No se pudieron cargar los usuarios.");
    }
  }, [errorQuery]);

  const createUserMutation = trpc.usuarios.create.useMutation({
    onSuccess: () => {
      toast.success("¡Usuario creado con éxito en el sistema!");
      setDni("");
      setNombre("");
      setApellido("");
      setEmail("");
      setPassword("");
      setRole("admin");

      recargarUsuarios();
      setVista("lista");
    },
    onError: (err) => {
      toast.error(err.message || "Error al crear el usuario.");
    },
  });

  const updateUserMutation = trpc.usuarios.update.useMutation({
    onSuccess: () => {
      toast.success("¡Usuario actualizado correctamente!");
      setUsuarioEditando(null);
      recargarUsuarios();
    },
    onError: (err) => {
      toast.error(err.message || "Error al actualizar el usuario.");
    },
  });

  const deleteUserMutation = trpc.usuarios.delete.useMutation({
    onSuccess: () => {
      toast.success("Usuario eliminado del sistema.");
      recargarUsuarios();
    },
    onError: (err) => {
      toast.error(err.message || "Error al eliminar el usuario.");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate({
      id: dni,
      nombre,
      apellido,
      email,
      password,
      role: role as any,
    });
  };

  const handleAbrirEdicion = (user: Usuario) => {
    setUsuarioEditando(user);
    setEditNombre(user.nombre);
    setEditApellido(user.apellido);
    setEditEmail(user.email);
    setEditRole(user.role);
  };

  const handleSubmitEdicion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioEditando) return;

    updateUserMutation.mutate({
      id: usuarioEditando.id,
      nombre: editNombre,
      apellido: editApellido,
      email: editEmail,
      role: editRole,
    });
  };

  const handleEliminar = (id: string, nombreCompleto: string) => {
    if (confirm(`¿Estás seguro de que querés eliminar a ${nombreCompleto}? Esta acción no se puede deshacer.`)) {
      deleteUserMutation.mutate({ id });
    }
  };

  const isPending = createUserMutation.isPending;

  return (
    <VStack align="stretch" gap={6} maxW="4xl" mx="auto">
      <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} gap={3} borderBottomWidth="1px" borderColor="brand.100" pb={5}>
        <Box>
          <Heading size="2xl" color="heading" display="flex" alignItems="center" gap={2}>
            {vista === "lista" ? (
              <>
                <Shield size={30} color="var(--chakra-colors-brand-600)" />
                Gestión de Personal Institucional
              </>
            ) : (
              <>
                <UserPlus size={30} color="var(--chakra-colors-brand-600)" />
                Alta de Personal Institucional
              </>
            )}
          </Heading>
          <Text color="gray.500" mt={2}>
            {vista === "lista"
              ? "Listado y control de los operadores del sistema con acceso autorizado."
              : "Como Superadmin, podés dar de alta operadores."}
          </Text>
        </Box>

        <Button bg="brand.600" color="white" _hover={{ bg: "brand.700" }} onClick={() => setVista(vista === "lista" ? "alta" : "lista")}>
          {vista === "lista" ? (
            <>
              <UserPlus size={16} /> Nuevo Operador
            </>
          ) : (
            <>
              <ArrowLeft size={16} /> Volver al Listado
            </>
          )}
        </Button>
      </Flex>

      {/* 📋 VISTA 1: TABLA */}
      {vista === "lista" && (
        <Card.Root>
          <Card.Body p={0}>
            {isLoading ? (
              <Skeleton h="48" />
            ) : !listaUsuarios || listaUsuarios.length === 0 ? (
              <Text textAlign="center" color="gray.500" py={8}>
                No hay operadores registrados en el sistema.
              </Text>
            ) : (
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Nombre Completo</Table.ColumnHeader>
                    <Table.ColumnHeader>DNI</Table.ColumnHeader>
                    <Table.ColumnHeader>Correo Electrónico</Table.ColumnHeader>
                    <Table.ColumnHeader>Rol Asignado</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="center">Acciones</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {listaUsuarios.map((user: any) => (
                    <Table.Row key={user.id}>
                      <Table.Cell fontWeight="600">{user.nombre} {user.apellido}</Table.Cell>
                      <Table.Cell fontFamily="mono" fontSize="xs">{user.id}</Table.Cell>
                      <Table.Cell>{user.email}</Table.Cell>
                      <Table.Cell>
                        <Badge bg={(roleBadge[user.role] ?? roleBadge.user).bg} color={(roleBadge[user.role] ?? roleBadge.user).color}>
                          {(roleBadge[user.role] ?? roleBadge.user).label}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell textAlign="center">
                        <HStack justify="center" gap={1}>
                          <IconButton aria-label="Editar" variant="ghost" size="sm" onClick={() => handleAbrirEdicion(user)}>
                            <Pencil size={16} />
                          </IconButton>
                          <IconButton aria-label="Eliminar" variant="ghost" size="sm" color="red.600" onClick={() => handleEliminar(user.id, `${user.nombre} ${user.apellido}`)}>
                            <Trash2 size={16} />
                          </IconButton>
                        </HStack>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            )}
          </Card.Body>
        </Card.Root>
      )}

      {/* ➕ VISTA 2: ALTA */}
      {vista === "alta" && (
        <Card.Root maxW="2xl" mx="auto" w="full">
          <Card.Body p={6}>
            <form onSubmit={handleSubmit}>
              <VStack align="stretch" gap={4}>
                <Grid templateColumns="1fr 1fr" gap={4}>
                  <Field.Root required>
                    <Field.Label>Nombre</Field.Label>
                    <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Juan" required />
                  </Field.Root>
                  <Field.Root required>
                    <Field.Label>Apellido</Field.Label>
                    <Input value={apellido} onChange={e => setApellido(e.target.value)} placeholder="Pérez" required />
                  </Field.Root>
                </Grid>
                <Field.Root required>
                  <Field.Label>DNI</Field.Label>
                  <Input value={dni} onChange={e => setDni(e.target.value)} placeholder="40123456" required />
                </Field.Root>
                <Field.Root required>
                  <Field.Label>Correo Electrónico</Field.Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="operador@ministerio.gob.ar" required />
                </Field.Root>
                <Field.Root required>
                  <Field.Label>Contraseña Inicial</Field.Label>
                  <Box position="relative" w="full">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Definir contraseña"
                      pr={12}
                      required
                    />
                    <IconButton
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      variant="ghost"
                      size="sm"
                      position="absolute"
                      right={1}
                      top="50%"
                      transform="translateY(-50%)"
                      onClick={() => setShowPassword(!showPassword)}
                      type="button"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </IconButton>
                  </Box>
                </Field.Root>
                <Field.Root>
                  <Field.Label>Rol</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field value={role} onChange={e => setRole(e.target.value as any)}>
                      <option value="superadmin">Superadmin</option>
                      <option value="admin">Administrador</option>
                      <option value="user">Usuario de Consulta</option>
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Field.Root>
                <Button type="submit" bg="brand.600" color="white" _hover={{ bg: "brand.700" }} loading={isPending} w="full" mt={2}>
                  {isPending ? "Guardando..." : "Dar de Alta"}
                </Button>
              </VStack>
            </form>
          </Card.Body>
        </Card.Root>
      )}

      {/* 🪟 MODAL FLOTANTE: EDICIÓN DE OPERADOR */}
      <Dialog.Root open={!!usuarioEditando} onOpenChange={d => !d.open && setUsuarioEditando(null)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="md">
              <Dialog.Header bg={{ base: "brand.50", _dark: "brand.900" }} borderBottomWidth="1px" borderColor={{ base: "brand.100", _dark: "brand.700" }}>
                <Dialog.Title color="heading">Modificar Datos de Operador</Dialog.Title>
                <Dialog.CloseTrigger asChild>
                  <IconButton aria-label="Cerrar" variant="ghost" size="sm" />
                </Dialog.CloseTrigger>
              </Dialog.Header>
              <Dialog.Body p={6}>
                {usuarioEditando && (
                  <form onSubmit={handleSubmitEdicion}>
                    <VStack align="stretch" gap={4}>
                      <Field.Root>
                        <Field.Label fontSize="xs" fontWeight="700" textTransform="uppercase" color="gray.500">DNI (No modificable)</Field.Label>
                        <Input disabled value={usuarioEditando.id} bg="bg.muted" color="fg.muted" cursor="not-allowed" />
                      </Field.Root>
                      <Grid templateColumns="1fr 1fr" gap={4}>
                        <Field.Root required>
                          <Field.Label>Nombre</Field.Label>
                          <Input value={editNombre} onChange={e => setEditNombre(e.target.value)} required />
                        </Field.Root>
                        <Field.Root required>
                          <Field.Label>Apellido</Field.Label>
                          <Input value={editApellido} onChange={e => setEditApellido(e.target.value)} required />
                        </Field.Root>
                      </Grid>
                      <Field.Root required>
                        <Field.Label>Correo Electrónico</Field.Label>
                        <Input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} required />
                      </Field.Root>
                      <Field.Root>
                        <Field.Label>Rol Asignado</Field.Label>
                        <NativeSelect.Root>
                          <NativeSelect.Field value={editRole} onChange={e => setEditRole(e.target.value as any)}>
                            <option value="superadmin">Superadmin</option>
                            <option value="admin">Administrador</option>
                            <option value="user">Consulta</option>
                          </NativeSelect.Field>
                          <NativeSelect.Indicator />
                        </NativeSelect.Root>
                      </Field.Root>
                      <HStack gap={3} pt={2}>
                        <Button type="button" variant="outline" flex={1} onClick={() => setUsuarioEditando(null)}>
                          Cancelar
                        </Button>
                        <Button type="submit" flex={1} bg="brand.600" color="white" _hover={{ bg: "brand.700" }} loading={updateUserMutation.isPending}>
                          Guardar Cambios
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
    </VStack>
  );
}
