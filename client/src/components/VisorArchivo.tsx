import { Box, Button, Dialog, Flex, IconButton, Portal, Text } from "@chakra-ui/react";
import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

export type ArchivoVisor = {
  nombre: string;
  dataUri: string; // data:application/pdf;base64,... o data:image/...
};

// Visor dentro de la misma pantalla (PDF o imagen) con botón X para volver.
export default function VisorArchivo({ archivo, onClose }: { archivo: ArchivoVisor | null; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [esPdf, setEsPdf] = useState(false);

  useEffect(() => {
    if (!archivo) {
      setUrl(null);
      return;
    }
    let creada: string | null = null;
    let cancelado = false;
    (async () => {
      const blob = await (await fetch(archivo.dataUri)).blob();
      if (cancelado) return;
      creada = URL.createObjectURL(blob);
      setEsPdf(blob.type === "application/pdf");
      setUrl(creada);
    })();
    return () => {
      cancelado = true;
      if (creada) URL.revokeObjectURL(creada);
    };
  }, [archivo]);

  const descargar = () => {
    if (!url || !archivo) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = archivo.nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog.Root open={!!archivo} onOpenChange={d => !d.open && onClose()} size="lg" scrollBehavior="inside">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="min(860px, 94vw)" h="min(80vh, 760px)" display="flex" flexDirection="column">
            <Flex
              align="center"
              justify="space-between"
              gap={3}
              px={4}
              py={3}
              borderBottomWidth="1px"
              borderColor="gray.200"
              flexShrink={0}
            >
              <Dialog.Title fontSize="md" fontWeight="700" truncate>
                {archivo?.nombre}
              </Dialog.Title>
              <Flex gap={2} align="center">
                <Button size="xs" variant="outline" onClick={descargar} disabled={!url}>
                  <Download size={13} /> Descargar
                </Button>
                <Dialog.CloseTrigger asChild>
                  <IconButton aria-label="Cerrar" size="sm" variant="ghost">
                    <X size={18} />
                  </IconButton>
                </Dialog.CloseTrigger>
              </Flex>
            </Flex>

            <Box flex={1} minH={0} bg="bg.muted" display="flex" alignItems="center" justifyContent="center" overflow="auto">
              {!url ? (
                <Text color="gray.500" fontSize="sm">Cargando...</Text>
              ) : esPdf ? (
                <iframe src={url} title={archivo?.nombre} style={{ width: "100%", height: "100%", border: 0 }} />
              ) : (
                <img src={url} alt={archivo?.nombre} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              )}
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
