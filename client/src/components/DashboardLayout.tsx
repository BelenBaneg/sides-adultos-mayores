import { useAuth } from "@/_core/hooks/useAuth";
import { APP_TITLE, LOGO_ADULTOS } from "@/const";
import { ColorModeButton, useColorMode } from "@/components/ui/color-mode";
import {
  Avatar,
  Box,
  Flex,
  IconButton,
  Image,
  Menu,
  Portal,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  AlertCircle,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Moon,
  Scale,
  Sun,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

const menuItems = [
  { icon: LayoutDashboard, label: "Panel de Control", path: "/" },
  { icon: Users, label: "Adultos Mayores", path: "/adultos-mayores" },
  { icon: Building2, label: "Residencias de Larga Estadia", path: "/residencias" },
  { icon: AlertCircle, label: "Alertas", path: "/alertas" },
  { icon: History, label: "Seguimientos", path: "/seguimientos" },
  { icon: FileText, label: "Visitas y Reportes", path: "/visitas-reportes" },
  { icon: Scale, label: "Derivaciones", path: "/derivaciones" },
];

const COLLAPSED_KEY = "sides-sidebar-collapsed";
const EXPANDED_WIDTH = "264px";
const COLLAPSED_WIDTH = "76px";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading } = useAuth({ redirectOnUnauthenticated: false });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [loading, isAuthenticated, setLocation]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!isAuthenticated) return null;

  return <LayoutShell>{children}</LayoutShell>;
}

function LayoutShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === "1");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const activeItem = menuItems.find(item => item.path === location);

  const handleLogout = async () => {
    try {
      await logout();
      // useAuth ya redirige a "/login" apenas el logout es exitoso (setLocation dentro de logoutMutation.onSuccess).
    } catch (e) {
      console.error("Error al cerrar sesión", e);
      setLocation("/login");
    } finally {
      sessionStorage.clear();
    }
  };

  const sidebarWidth = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  return (
    <Flex minH="100dvh" bg="bg.subtle">
      {/* Sidebar - escritorio */}
      <Box
        as="nav"
        display={{ base: "none", md: "flex" }}
        flexDir="column"
        w={sidebarWidth}
        flexShrink={0}
        bg="brand.600"
        color="white"
        transition="width 0.18s ease"
        position="sticky"
        top={0}
        h="100dvh"
        overflow="hidden"
      >
        <SidebarInner
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          location={location}
          setLocation={setLocation}
          user={user}
          onLogout={handleLogout}
        />
      </Box>

      {/* Sidebar - mobile drawer */}
      {mobileOpen && (
        <Box
          position="fixed"
          inset={0}
          zIndex={40}
          display={{ base: "block", md: "none" }}
          onClick={() => setMobileOpen(false)}
        >
          <Box position="absolute" inset={0} bg="blackAlpha.500" />
          <Box
            position="absolute"
            insetY={0}
            left={0}
            w="264px"
            bg="brand.600"
            color="white"
            onClick={e => e.stopPropagation()}
          >
            <SidebarInner
              collapsed={false}
              setCollapsed={() => {}}
              location={location}
              setLocation={p => {
                setLocation(p);
                setMobileOpen(false);
              }}
              user={user}
              onLogout={handleLogout}
              hideCollapseToggle
            />
          </Box>
        </Box>
      )}

      <Box flex={1} minW={0}>
        {/* Header mobile */}
        <Flex
          display={{ base: "flex", md: "none" }}
          h="14"
          align="center"
          gap={2}
          px={3}
          bg="bg.panel"
          borderBottomWidth="1px"
          borderColor="border"
          position="sticky"
          top={0}
          zIndex={30}
        >
          <IconButton aria-label="Abrir menú" variant="ghost" size="sm" onClick={() => setMobileOpen(true)}>
            <MenuIcon size={18} />
          </IconButton>
          <Text fontWeight="800" color="brand.700" fontSize="sm" textTransform="uppercase" letterSpacing="wide" flex={1}>
            {activeItem?.label ?? APP_TITLE}
          </Text>
          <ColorModeButton />
        </Flex>

        <Box as="main" p={{ base: 3, md: 6 }}>
          {children}
        </Box>
      </Box>
    </Flex>
  );
}

type SidebarInnerProps = {
  collapsed: boolean;
  setCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void;
  location: string;
  setLocation: (path: string) => void;
  user: { nombre?: string | null; apellido?: string | null; email?: string | null; role?: string } | null | undefined;
  onLogout: () => void;
  hideCollapseToggle?: boolean;
};

function SidebarInner({ collapsed, setCollapsed, location, setLocation, user, onLogout, hideCollapseToggle }: SidebarInnerProps) {
  const items = [
    ...menuItems,
    ...(user?.role === "superadmin" ? [{ icon: UserPlus, label: "Gestión de Personal", path: "/usuarios" }] : []),
  ];

  return (
    <Flex direction="column" h="full">
      <Flex align="center" gap={3} h="16" px={collapsed ? 0 : 4} justify={collapsed ? "center" : "flex-start"} borderBottomWidth="1px" borderColor="whiteAlpha.200">
        <Box h="9" w="9" borderRadius="lg" bg="white" overflow="hidden" flexShrink={0} display="flex" alignItems="center" justifyContent="center" boxShadow="sm">
          <Image src={LOGO_ADULTOS} alt="Logo" h="full" w="full" objectFit="contain" transform="scale(1.2)" />
        </Box>
        {!collapsed && (
          <Text fontWeight="900" fontSize="sm" letterSpacing="wide" textTransform="uppercase" truncate>
            SIDES
          </Text>
        )}
        {!hideCollapseToggle && !collapsed && (
          <IconButton
            aria-label="Colapsar menú"
            variant="ghost"
            size="sm"
            ml="auto"
            color="whiteAlpha.700"
            _hover={{ bg: "whiteAlpha.200", color: "white" }}
            onClick={() => setCollapsed(v => !v)}
          >
            <ChevronLeft size={16} />
          </IconButton>
        )}
      </Flex>

      {collapsed && !hideCollapseToggle && (
        <Flex justify="center" py={2}>
          <IconButton
            aria-label="Expandir menú"
            variant="ghost"
            size="sm"
            color="whiteAlpha.700"
            _hover={{ bg: "whiteAlpha.200", color: "white" }}
            onClick={() => setCollapsed(v => !v)}
          >
            <ChevronRight size={16} />
          </IconButton>
        </Flex>
      )}

      <VStack align="stretch" gap="1" px={2} py={3} flex={1} overflowY="auto">
        {items.map(item => {
          const isActive = location === item.path;
          const Icon = item.icon;
          return (
            <Flex
              key={item.path}
              as="button"
              onClick={() => setLocation(item.path)}
              align="center"
              gap={3}
              h="11"
              px={collapsed ? 0 : 3}
              justify={collapsed ? "center" : "flex-start"}
              borderRadius="xl"
              fontSize="sm"
              fontWeight={isActive ? "700" : "500"}
              bg={isActive ? "whiteAlpha.200" : "transparent"}
              color={isActive ? "white" : "purple.100"}
              _hover={{ bg: "whiteAlpha.200", color: "white" }}
              transition="all 0.15s ease"
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              {!collapsed && <Text truncate>{item.label}</Text>}
            </Flex>
          );
        })}
      </VStack>

      <Box px={2} pb={2}>
        <SidebarColorModeToggle collapsed={collapsed} />
      </Box>

      <Separator borderColor="whiteAlpha.200" />

      <Box p={3}>
        <Menu.Root positioning={{ placement: "top-start" }}>
          <Menu.Trigger asChild>
            <Flex
              as="button"
              align="center"
              gap={3}
              px={collapsed ? 0 : 2}
              py={2}
              borderRadius="xl"
              w="full"
              justify={collapsed ? "center" : "flex-start"}
              _hover={{ bg: "whiteAlpha.200" }}
              transition="background 0.15s ease"
            >
              <Avatar.Root size="sm" bg="white" color="brand.600">
                <Avatar.Fallback fontWeight="900" fontSize="xs">
                  {user?.nombre?.charAt(0)?.toUpperCase() || "U"}
                </Avatar.Fallback>
              </Avatar.Root>
              {!collapsed && (
                <Box flex={1} minW={0} textAlign="left">
                  <Text fontSize="sm" fontWeight="700" color="white" truncate>
                    {user?.nombre ? `${user.nombre} ${user.apellido ?? ""}`.trim() : "Usuario del sistema"}
                  </Text>
                  <Text fontSize="xs" color="purple.200" truncate>
                    {user?.email || "..."}
                  </Text>
                </Box>
              )}
            </Flex>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content minW="180px">
                <Menu.Item value="logout" color="red.600" onClick={onLogout} cursor="pointer">
                  <LogOut size={15} style={{ marginRight: 8 }} />
                  Cerrar sesión
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </Box>
    </Flex>
  );
}

function SidebarColorModeToggle({ collapsed }: { collapsed: boolean }) {
  const { colorMode, toggleColorMode } = useColorMode();
  const isDark = colorMode === "dark";
  const label = isDark ? "Modo claro" : "Modo oscuro";

  return (
    <Flex
      as="button"
      onClick={toggleColorMode}
      align="center"
      gap={3}
      h="11"
      px={collapsed ? 0 : 3}
      justify={collapsed ? "center" : "flex-start"}
      borderRadius="xl"
      fontSize="sm"
      fontWeight="500"
      color="purple.100"
      _hover={{ bg: "whiteAlpha.200", color: "white" }}
      transition="all 0.15s ease"
      title={collapsed ? label : undefined}
      w="full"
    >
      {isDark ? <Sun size={18} style={{ flexShrink: 0 }} /> : <Moon size={18} style={{ flexShrink: 0 }} />}
      {!collapsed && <Text truncate>{label}</Text>}
    </Flex>
  );
}
