import { useAuth } from "@/_core/hooks/useAuth";
import { APP_TITLE, LOGO_ADULTOS } from "@/const";
import {
  Box,
  Button,
  Center,
  Field,
  Flex,
  Heading,
  Image,
  Input,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Lock, Mail, ShieldCheck, UserCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isAuthenticated, loading, login } = useAuth({ redirectOnUnauthenticated: false });

  useEffect(() => {
    const isExplicitLogin = window.location.pathname === "/login";
    if (!loading && isAuthenticated && !isExplicitLogin) {
      setLocation("/");
    }
  }, [isAuthenticated, loading, setLocation]);

  if (loading) {
    return (
      <Center minH="100dvh" bg="brand.600">
        <Spinner size="xl" color="white" />
      </Center>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);

    try {
      if (login) {
        await login(email, password);
        // useAuth ya redirige a "/" apenas el login es exitoso (setLocation dentro de loginMutation.onSuccess).
        // No forzamos un window.location.href acá: eso pisaba esa navegación con un reload completo del navegador.
      }
    } catch (err: any) {
      console.error("Error en login front:", err);
      setLoginError(err?.message || "Ocurrió un error al intentar iniciar sesión.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Center
      minH="100dvh"
      p={4}
      position="relative"
      overflow="hidden"
      bgGradient="to-br"
      gradientFrom="brand.700"
      gradientTo="brand.500"
    >
      {/* Formas animadas de fondo */}
      <Box
        position="absolute"
        top="-10%"
        left="-8%"
        boxSize="420px"
        borderRadius="full"
        bg="brand.300"
        opacity={0.35}
        filter="blur(90px)"
        animation="blobFloat1 16s ease-in-out infinite"
        pointerEvents="none"
      />
      <Box
        position="absolute"
        bottom="-15%"
        right="-10%"
        boxSize="480px"
        borderRadius="full"
        bg="brand.200"
        opacity={0.3}
        filter="blur(100px)"
        animation="blobFloat2 20s ease-in-out infinite"
        pointerEvents="none"
      />
      <Box
        position="absolute"
        top="30%"
        right="15%"
        boxSize="260px"
        borderRadius="full"
        bg="white"
        opacity={0.12}
        filter="blur(70px)"
        animation="blobFloat3 14s ease-in-out infinite"
        pointerEvents="none"
      />

      <Box
        maxW="md"
        w="full"
        bg="white"
        borderRadius="2xl"
        overflow="hidden"
        position="relative"
        boxShadow="0 30px 60px -15px rgba(40, 19, 63, 0.55), 0 8px 20px -6px rgba(40, 19, 63, 0.3), 0 0 0 1px rgba(255,255,255,0.08)"
        animation="loginCardIn 0.55s cubic-bezier(0.16, 1, 0.3, 1)"
      >
        <VStack
          bg="brand.50"
          borderBottomWidth="1px"
          borderColor="brand.100"
          p={8}
          gap={3}
        >
          <Center h="20" w="20" bg="white" borderRadius="2xl" boxShadow="md" p={2}>
            <Image src={LOGO_ADULTOS} alt="Logo SIDES" h="full" w="full" objectFit="contain" />
          </Center>
          <Heading size="xl" color="gray.800" fontWeight="900" textAlign="center">
            {APP_TITLE || "Adultos Mayores"}
          </Heading>
          <Text color="brand.700" fontWeight="600" fontSize="xs" letterSpacing="wide" textTransform="uppercase">
            Sistema de Gestión Integral y Vulnerabilidad
          </Text>
        </VStack>

        <VStack p={8} gap={4} align="stretch">
          <Center flexDir="column" gap={2}>
            <ShieldCheck size={44} color="var(--chakra-colors-brand-600)" />
            <Heading size="md" color="gray.800" textAlign="center">
              Acceso Restringido
            </Heading>
            <Text color="gray.600" fontSize="sm" textAlign="center">
              Este sistema contiene información sensible y confidencial. Por favor, identificate de forma segura para continuar.
            </Text>
          </Center>

          <form onSubmit={handleSubmit}>
            <VStack gap={4} align="stretch">
              <Field.Root required>
                <Field.Label fontSize="xs" fontWeight="600" color="gray.600">
                  Correo Electrónico
                </Field.Label>
                <Box position="relative" w="full">
                  <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="gray.400" pointerEvents="none">
                    <Mail size={18} />
                  </Box>
                  <Input
                    type="email"
                    required
                    placeholder="ejemplo@ministerio.gob.ar"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    pl={10}
                    h="11"
                    focusRingColor="brand.600"
                  />
                </Box>
              </Field.Root>

              <Field.Root required>
                <Field.Label fontSize="xs" fontWeight="600" color="gray.600">
                  Contraseña
                </Field.Label>
                <Box position="relative" w="full">
                  <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="gray.400" pointerEvents="none">
                    <Lock size={18} />
                  </Box>
                  <Input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    pl={10}
                    h="11"
                    focusRingColor="brand.600"
                  />
                </Box>
              </Field.Root>

              {loginError && (
                <Box bg="red.50" color="red.600" borderWidth="1px" borderColor="red.200" borderRadius="lg" p={3} fontSize="xs" textAlign="center" fontWeight="500">
                  ⚠️ {loginError}
                </Box>
              )}

              <Button
                type="submit"
                loading={isSubmitting}
                loadingText="Autenticando..."
                bg="brand.600"
                color="white"
                _hover={{ bg: "brand.700" }}
                h="12"
                fontSize="md"
                fontWeight="700"
                mt={1}
              >
                <UserCircle size={20} />
                Ingresar al Sistema
              </Button>
            </VStack>
          </form>
        </VStack>
      </Box>
    </Center>
  );
}
