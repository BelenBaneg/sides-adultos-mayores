import { Box, Button, Card, Flex, Heading, Text, VStack } from "@chakra-ui/react";
import { ExternalLink, Newspaper } from "lucide-react";

const PORTAL_URL = "https://87h75b1r-3000.brs.devtunnels.ms/";

// Texto que se muestra debajo del botón. Cambialo acá cuando tengas la leyenda definitiva.
const LEYENDA =
  "Desde este portal se gestionan las publicaciones del Ministerio de Desarrollo Social. El acceso es exclusivo para personal autorizado.";

export default function PortalPublicaciones() {
  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="2xl" color="heading" display="flex" alignItems="center" gap={2}>
          <Newspaper size={30} color="var(--chakra-colors-brand-600)" />
          Portal de Publicaciones
        </Heading>
        <Text color="gray.500" mt={2}>
          Acceso al portal de publicaciones
        </Text>
      </Box>

      <Flex justify="center" pt={{ base: 4, md: 10 }}>
        <Card.Root maxW="480px" w="full" textAlign="center">
          <Card.Body py={10} px={8}>
            <VStack gap={5}>
              <Flex boxSize="16" borderRadius="full" bg="brand.50" align="center" justify="center">
                <Newspaper size={30} color="var(--chakra-colors-brand-600)" />
              </Flex>

              <Heading size="lg" color="heading">
                Ingreso al Portal de Publicaciones
              </Heading>

              <Button
                as="a"
                {...({ href: PORTAL_URL, target: "_blank", rel: "noopener noreferrer" } as any)}
                size="lg"
                bg="brand.600"
                color="white"
                _hover={{ bg: "brand.700" }}
                w="full"
              >
                <ExternalLink size={18} />
                Abrir en una pestaña nueva
              </Button>

              <Text fontSize="sm" color="gray.500">
                {LEYENDA}
              </Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      </Flex>
    </VStack>
  );
}
