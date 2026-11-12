import { trpc } from "@/lib/trpc";
import {
  Badge,
  Box,
  Card,
  Field,
  Flex,
  Heading,
  Input,
  NativeSelect,
  SimpleGrid,
  Skeleton,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ClipboardCheck, Search } from "lucide-react";
import { useMemo, useState } from "react";

const ACCION_LABEL: Record<string, string> = {
  login: "Inicio de sesión",
  login_fallido: "Intento fallido",
  logout: "Cierre de sesión",
  crear: "Alta",
  editar: "Edición",
  eliminar: "Eliminación",
  baja: "Baja",
  cambio_password: "Cambio de contraseña",
  congelar: "Congelar / Reactivar usuario",
  adjuntar: "Adjuntar archivo",
  ver_archivo: "Abrió un archivo",
};

const ACCION_COLOR: Record<string, string> = {
  login: "green.500",
  login_fallido: "red.500",
  logout: "gray.500",
  crear: "blue.500",
  editar: "orange.500",
  eliminar: "red.600",
  baja: "purple.500",
  cambio_password: "teal.500",
  congelar: "cyan.600",
  adjuntar: "blue.600",
  ver_archivo: "gray.600",
};

const MODULO_LABEL: Record<string, string> = {
  auth: "Acceso",
  usuarios: "Personal",
  residencias: "Residencias",
  adultosMayores: "Adultos Mayores",
  ampliaciones: "Ampliaciones",
  seguimientos: "Seguimientos",
  alertas: "Alertas",
  derivaciones: "Derivaciones",
  fichasFirmadas: "Fichas firmadas",
  residenciaDocumentos: "Documentación de residencias",
};

const CAMPO_LABEL: Record<string, string> = {
  id: "ID",
  expediente: "Expediente",
  trabajadorSocial: "Trabajador/a Social",
  fechaFicha: "Fecha de ficha",
  nombre: "Nombre",
  apellido: "Apellido",
  dni: "DNI",
  fechaNacimiento: "Fecha de nacimiento",
  telefono: "Teléfono",
  estadoCivil: "Estado civil",
  genero: "Género",
  domicilio: "Domicilio",
  barrio: "Barrio",
  localidad: "Localidad",
  email: "Correo",
  role: "Rol",
  activo: "Usuario activo",
  motivo: "Motivo",
  motivoBaja: "Motivo de baja",
  motivoBajaDetalle: "Detalle del motivo",
  fechaFallecimiento: "Fecha de fallecimiento",
  titulo: "Título",
  tipoAlerta: "Tipo de alerta",
  prioridad: "Prioridad",
  estado: "Estado",
  tipoSeguimiento: "Tipo de seguimiento",
  descripcion: "Descripción",
  juzgado: "Juzgado",
  direccion: "Dirección",
  capacidad: "Capacidad",
  estadoHabilitacion: "Habilitación",
  sugerencia: "Sugerencia",
  adultoMayorId: "Adulto mayor (ID)",
  residenciaId: "Residencia (ID)",
  requisito: "Requisito",
  nombreArchivo: "Archivo",
};

// Campos que mejor identifican el registro, en orden de importancia.
const CAMPOS_RESUMEN = ["expediente", "nombre", "apellido", "dni", "email", "titulo", "tipoAlerta", "tipoSeguimiento", "motivoBaja", "motivoBajaDetalle", "motivo", "juzgado", "estadoHabilitacion"];

function formatearValor(valor: any): string {
  if (valor === null || valor === undefined || valor === "") return "-";
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}T/.test(valor)) {
    const d = new Date(valor);
    if (!isNaN(d.getTime())) return d.toLocaleDateString("es-AR");
  }
  if (typeof valor === "object") return JSON.stringify(valor);
  return String(valor);
}

function parsearDetalle(detalle: string | null) {
  if (!detalle) return null;
  try {
    const obj = JSON.parse(detalle);
    return obj && typeof obj === "object" ? (obj as Record<string, any>) : null;
  } catch {
    return null;
  }
}

function resumenDetalle(detalle: string | null): string {
  const obj = parsearDetalle(detalle);
  if (!obj) return detalle || "-";
  const claves = Object.keys(obj).filter(k => k !== "id");
  const elegidas = CAMPOS_RESUMEN.filter(k => k in obj && obj[k] !== "" && obj[k] !== null);
  const usar = (elegidas.length ? elegidas : claves).slice(0, 4);
  const texto = usar.map(k => `${CAMPO_LABEL[k] ?? k}: ${formatearValor(obj[k])}`).join(" · ");
  const resto = claves.length - usar.length;
  return resto > 0 ? `${texto} (+${resto} campos más)` : texto || "-";
}

function detalleCompleto(detalle: string | null): string {
  const obj = parsearDetalle(detalle);
  if (!obj) return detalle ?? "";
  return Object.entries(obj)
    .map(([k, v]) => `${CAMPO_LABEL[k] ?? k}: ${formatearValor(v)}`)
    .join("\n");
}

export default function Auditoria() {
  const { data: registros, isLoading } = trpc.auditoria.list.useQuery({ limit: 1000 });

  const [busqueda, setBusqueda] = useState("");
  const [filtroAccion, setFiltroAccion] = useState("todas");
  const [filtroModulo, setFiltroModulo] = useState("todos");

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (registros ?? []).filter((r: any) => {
      if (filtroAccion !== "todas" && r.accion !== filtroAccion) return false;
      if (filtroModulo !== "todos" && r.modulo !== filtroModulo) return false;
      if (!q) return true;
      return [r.userNombre, r.userId, r.detalle, r.ip].some(v => (v ?? "").toString().toLowerCase().includes(q));
    });
  }, [registros, busqueda, filtroAccion, filtroModulo]);

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="2xl" color="heading" display="flex" alignItems="center" gap={2}>
          <ClipboardCheck size={30} color="var(--chakra-colors-brand-600)" />
          Auditoría
        </Heading>
        <Text color="gray.500" mt={2}>
          Registro de accesos y movimientos de los usuarios del sistema (solo visible para la Superadmin)
        </Text>
      </Box>

      <Card.Root>
        <Card.Body py={4}>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
            <Field.Root>
              <Field.Label fontSize="xs">Buscar</Field.Label>
              <Box position="relative" w="full">
                <Input size="sm" pl={8} placeholder="Usuario, DNI, detalle, IP..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                <Box position="absolute" left={2.5} top="50%" transform="translateY(-50%)" color="gray.400" pointerEvents="none">
                  <Search size={14} />
                </Box>
              </Box>
            </Field.Root>
            <Field.Root>
              <Field.Label fontSize="xs">Acción</Field.Label>
              <NativeSelect.Root size="sm">
                <NativeSelect.Field value={filtroAccion} onChange={e => setFiltroAccion(e.target.value)}>
                  <option value="todas">Todas</option>
                  {Object.entries(ACCION_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>
            <Field.Root>
              <Field.Label fontSize="xs">Módulo</Field.Label>
              <NativeSelect.Root size="sm">
                <NativeSelect.Field value={filtroModulo} onChange={e => setFiltroModulo(e.target.value)}>
                  <option value="todos">Todos</option>
                  {Object.entries(MODULO_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>
          </SimpleGrid>
        </Card.Body>
      </Card.Root>

      {isLoading ? (
        <Skeleton h="80" />
      ) : filtrados.length === 0 ? (
        <Card.Root>
          <Card.Body>
            <Flex py={10} justify="center" color="gray.400">Sin movimientos registrados</Flex>
          </Card.Body>
        </Card.Root>
      ) : (
        <Card.Root>
          <Card.Body p={0} overflowX="auto">
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Fecha y hora</Table.ColumnHeader>
                  <Table.ColumnHeader>Usuario</Table.ColumnHeader>
                  <Table.ColumnHeader>Acción</Table.ColumnHeader>
                  <Table.ColumnHeader>Módulo</Table.ColumnHeader>
                  <Table.ColumnHeader>Registro</Table.ColumnHeader>
                  <Table.ColumnHeader>Detalle</Table.ColumnHeader>
                  <Table.ColumnHeader>IP</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filtrados.map((r: any) => (
                  <Table.Row key={r.id}>
                    <Table.Cell whiteSpace="nowrap" fontSize="sm">
                      {new Date(r.createdAt).toLocaleString("es-AR")}
                    </Table.Cell>
                    <Table.Cell whiteSpace="nowrap">
                      <Text fontWeight="600" fontSize="sm">{r.userNombre || "Sin identificar"}</Text>
                      {r.userId && <Text fontSize="xs" color="gray.500">DNI {r.userId}</Text>}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge bg={ACCION_COLOR[r.accion] ?? "gray.500"} color="white">
                        {ACCION_LABEL[r.accion] ?? r.accion}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell fontSize="sm">{MODULO_LABEL[r.modulo] ?? r.modulo ?? "-"}</Table.Cell>
                    <Table.Cell fontSize="sm" color="gray.500">{r.entidadId ?? "-"}</Table.Cell>
                    <Table.Cell fontSize="xs" color="gray.500" maxW="320px">
                      <Text lineClamp={2} title={detalleCompleto(r.detalle)}>{resumenDetalle(r.detalle)}</Text>
                    </Table.Cell>
                    <Table.Cell fontSize="xs" color="gray.500" whiteSpace="nowrap">{r.ip || "-"}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Card.Body>
        </Card.Root>
      )}
    </VStack>
  );
}
