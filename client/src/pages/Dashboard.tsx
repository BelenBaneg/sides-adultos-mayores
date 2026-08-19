import { trpc } from "@/lib/trpc";
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  HStack,
  Icon,
  SimpleGrid,
  Skeleton,
  Text,
  VStack,
} from "@chakra-ui/react";
import { AlertCircle, AlertTriangle, Building2, History, LayoutDashboard, Users } from "lucide-react";
import { useLocation } from "wouter";

const prioridadPalette: Record<string, { bg: string; color: string }> = {
  critica: { bg: "red.500", color: "white" },
  alta: { bg: "orange.500", color: "white" },
  media: { bg: "yellow.500", color: "black" },
};

const tipoAlertaLabels: Record<string, string> = {
  falta_medicacion: "Falta de Medicación",
  salud_critica: "Salud Crítica",
  abandono: "Abandono",
  abuso_economico: "Abuso Económico",
  abuso_psicologico: "Abuso Psicológico",
  abuso_fisico: "Abuso Físico",
  otro: "Otro",
};

const tipoSeguimientoLabels: Record<string, string> = {
  visita: "Visita",
  reporte_vulnerabilidad: "Reporte",
  control_medico: "Control",
  entrevista_social: "Entrevista",
  otro: "Otro",
};

function StatCard({
  label,
  value,
  icon: IconCmp,
  loading,
  accent,
}: {
  label: string;
  value: number;
  icon: any;
  loading: boolean;
  accent?: string;
}) {
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

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: alertasPendientes, isLoading: alertasLoading } = trpc.alertas.listPendientes.useQuery();
  const { data: seguimientos, isLoading: seguimientosLoading } = trpc.seguimientos.list.useQuery();
  const { data: adultosMayores } = trpc.adultosMayores.list.useQuery();

  const alertasCriticas = alertasPendientes?.filter(a => a.prioridad === "critica" || a.prioridad === "alta") || [];

  return (
    <VStack align="stretch" gap={4}>
      <Box>
        <Heading size="xl" color="heading" display="flex" alignItems="center" gap={2}>
          <Icon color="brand.600">
            <LayoutDashboard size={26} />
          </Icon>
          Panel de Control
        </Heading>
        <Text color="gray.500" mt={1} fontSize="sm">
          Sistema de Gestión de Adultos Mayores - Santiago del Estero
        </Text>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={3}>
        <StatCard
          label="Adultos Mayores"
          value={stats?.totalAdultosMayores || 0}
          icon={Users}
          loading={statsLoading}
        />
        <StatCard
          label="Residencias de Larga Estadia"
          value={stats?.totalResidencias || 0}
          icon={Building2}
          loading={statsLoading}
        />
        <StatCard
          label="Alertas Pendientes"
          value={stats?.alertasPendientes || 0}
          icon={AlertCircle}
          loading={statsLoading}
        />
        <StatCard
          label="Casos Críticos"
          value={stats?.alertasCriticas || 0}
          icon={AlertTriangle}
          loading={statsLoading}
          accent="red.600"
        />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4} alignItems="start">
        <Card.Root>
          <Card.Header py={3}>
            <Card.Title display="flex" alignItems="center" gap={2} fontSize="md">
              <Icon color="red.500">
                <AlertTriangle size={16} />
              </Icon>
              Alertas Críticas y de Alta Prioridad
            </Card.Title>
            <Card.Description fontSize="xs">Casos que requieren atención inmediata</Card.Description>
          </Card.Header>
          <Card.Body pt={0} maxH="360px" overflowY="auto">
            {alertasLoading ? (
              <VStack align="stretch" gap={2}>
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} h="16" borderRadius="lg" />
                ))}
              </VStack>
            ) : alertasCriticas.length === 0 ? (
              <VStack py={4} color="gray.400" gap={1}>
                <AlertCircle size={32} opacity={0.5} />
                <Text fontSize="sm">No hay alertas críticas en este momento</Text>
              </VStack>
            ) : (
              <VStack align="stretch" gap={2}>
                {alertasCriticas.slice(0, 5).map(alerta => (
                  <Flex
                    key={alerta.id}
                    justify="space-between"
                    align="flex-start"
                    p={3}
                    borderWidth="1px"
                    borderColor="gray.200"
                    borderRadius="lg"
                    _hover={{ bg: "bg.muted" }}
                    transition="background 0.15s ease"
                    gap={2}
                  >
                    <VStack align="stretch" gap={1} flex={1}>
                      <HStack gap={2}>
                        <Badge {...(prioridadPalette[alerta.prioridad] ?? { bg: "blue.500", color: "white" })}>
                          {alerta.prioridad.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">{tipoAlertaLabels[alerta.tipoAlerta] || alerta.tipoAlerta}</Badge>
                      </HStack>
                      <Text fontWeight="700" fontSize="sm">{alerta.titulo}</Text>
                      <Text fontSize="xs" color="gray.500" lineClamp={1}>
                        {alerta.descripcion}
                      </Text>
                    </VStack>
                    <Button variant="outline" size="xs" onClick={() => setLocation("/alertas")}>
                      Ver
                    </Button>
                  </Flex>
                ))}
                {alertasCriticas.length > 5 && (
                  <Button variant="ghost" size="sm" color="brand.600" onClick={() => setLocation("/alertas")}>
                    Ver todas las alertas ({alertasCriticas.length})
                  </Button>
                )}
              </VStack>
            )}
          </Card.Body>
        </Card.Root>

        <Card.Root>
          <Card.Header py={3}>
            <Card.Title display="flex" alignItems="center" gap={2} fontSize="md">
              <History size={16} />
              Últimos Seguimientos
            </Card.Title>
            <Card.Description fontSize="xs">Visitas y reportes recientes</Card.Description>
          </Card.Header>
          <Card.Body pt={0} maxH="360px" overflowY="auto">
            {seguimientosLoading ? (
              <VStack align="stretch" gap={2}>
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} h="14" borderRadius="lg" />
                ))}
              </VStack>
            ) : seguimientos && seguimientos.length > 0 ? (
              <VStack align="stretch" gap={2}>
                {seguimientos.slice(0, 5).map(seg => {
                  const adultoMayor = adultosMayores?.find(am => am.id === seg.adultoMayorId);
                  return (
                    <Box key={seg.id} p={2.5} borderWidth="1px" borderColor="gray.200" borderRadius="lg" _hover={{ bg: "bg.muted" }}>
                      <Badge variant="outline" mb={1}>
                        {tipoSeguimientoLabels[seg.tipoSeguimiento] || "Otro"}
                      </Badge>
                      <Text fontWeight="700" fontSize="sm">
                        {adultoMayor ? `${adultoMayor.nombre} ${adultoMayor.apellido}` : "N/A"}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {new Date(seg.fecha).toLocaleDateString("es-AR")} - {seg.responsable}
                      </Text>
                    </Box>
                  );
                })}
                {seguimientos.length > 5 && (
                  <Button variant="ghost" size="sm" color="brand.600" onClick={() => setLocation("/visitas-reportes")}>
                    Ver todos los seguimientos ({seguimientos.length})
                  </Button>
                )}
              </VStack>
            ) : (
              <VStack py={4} color="gray.400" gap={1}>
                <History size={32} opacity={0.5} />
                <Text fontSize="sm">No hay seguimientos registrados</Text>
              </VStack>
            )}
          </Card.Body>
        </Card.Root>
      </SimpleGrid>
    </VStack>
  );
}
