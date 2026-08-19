import { trpc } from "@/lib/trpc";
import {
  Box,
  Button,
  Card,
  Checkbox,
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
  SimpleGrid,
  Skeleton,
  Table,
  Tabs,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { Users, Plus, Edit, FileText, Trash, Pencil, Search, Printer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Familiar = { nombre: string; dni: string; vinculo: string; ocupacion: string; oficio: string; ingresos: string };

type AdultoMayorForm = {
  expediente: string;
  trabajadorSocial: string;
  fechaFicha: string;

  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  telefono: string;
  estadoCivil: string;
  domicilio: string;
  barrio: string;
  localidad: string;

  ocupacion: string;
  oficio: string;
  monto: string;
  beneficioSocial: string;
  cualBeneficio: string;
  asistenciaPrevisional: string;
  diaCobro: string;
  medioCobro: string;
  tarjetas: string;
  prestamos: string;

  redFamiliar: Familiar[];

  tenenciaVivienda: string;
  tipoVivienda: string;
  situacionHabitacionalPersonas: number | "";
  situacionHabitacionalHabitaciones: number | "";
  materialParedes: string;
  materialPisos: string;
  materialTechos: string;
  bano: string;
  cocina: string;
  servicioLuz: boolean;
  servicioAgua: boolean;
  servicioGas: boolean;

  obraSocial: string;
  numeroAfiliado: string;
  enfermedad: string;
  sugerencia: string;
};

const initialForm: AdultoMayorForm = {
  expediente: "", trabajadorSocial: "", fechaFicha: new Date().toISOString().split('T')[0],
  nombre: "", apellido: "", dni: "", fechaNacimiento: "", telefono: "", estadoCivil: "Soltera/o", domicilio: "", barrio: "", localidad: "",
  ocupacion: "", oficio: "", monto: "", beneficioSocial: "NO", cualBeneficio: "", asistenciaPrevisional: "No", diaCobro: "", medioCobro: "", tarjetas: "", prestamos: "",
  redFamiliar: [],
  tenenciaVivienda: "", tipoVivienda: "", situacionHabitacionalPersonas: "", situacionHabitacionalHabitaciones: "", materialParedes: "", materialPisos: "", materialTechos: "", bano: "", cocina: "", servicioLuz: false, servicioAgua: false, servicioGas: false,
  obraSocial: "", numeroAfiliado: "", enfermedad: "", sugerencia: "",
};

const initialAmpliacion = {
  id: null as number | null,
  beneficioSocial: "NO", cualBeneficio: "", asistenciaPrevisional: "No", diaCobro: "", medioCobro: "", tarjetas: "NO", extensionANombreDe: "", prestamos: "", sugerencia: ""
};

export default function AdultosMayores() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState(false);
  const [openAmpliacion, setOpenAmpliacion] = useState(false);

  const [form, setForm] = useState<AdultoMayorForm>(initialForm);
  const [ampliacion, setAmpliacion] = useState(initialAmpliacion);
  const [busqueda, setBusqueda] = useState("");

  const { data: adultosMayores, isLoading } = trpc.adultosMayores.list.useQuery();
  const utils = trpc.useUtils();

  // ======= CONSULTA AUTOMÁTICA DEL HISTORIAL SEMESTRAL =======
  const { data: historialAmpliaciones, refetch: refetchHistorial } = trpc.ampliaciones.getByAdultoMayor.useQuery(
    { adultoMayorId: editingId ?? 0 },
    { enabled: !!editingId }
  );

  const createMutation = trpc.adultosMayores.create.useMutation({
    onSuccess: () => { toast.success("Ficha Social creada"); utils.adultosMayores.list.invalidate(); setOpen(false); setForm(initialForm); },
    onError: (error) => { toast.error(error.message || "Error al crear la ficha"); },
  });

  const updateMutation = trpc.adultosMayores.update.useMutation({
    onSuccess: () => { toast.success("Ficha Social actualizada"); utils.adultosMayores.list.invalidate(); setOpen(false); setForm(initialForm); setEditingId(null); },
    onError: (error) => { toast.error(error.message || "Error al actualizar la ficha"); },
  });

  // ======= MUTACIÓN PARA ELIMINAR FICHA PRINCIPAL COMPLETA =======
  const deleteMutation = trpc.adultosMayores.delete.useMutation({
    onSuccess: () => { toast.success("Ficha Social eliminada correctamente"); utils.adultosMayores.list.invalidate(); setOpen(false); setEditingId(null); setViewMode(false); },
    onError: (error) => { toast.error(error.message || "Error al eliminar la ficha"); },
  });

  const createAmpliacionMutation = trpc.ampliaciones.create.useMutation({
    onSuccess: () => {
      toast.success("¡Ampliación de Sugerencia guardada con éxito!");
      refetchHistorial();
      setOpenAmpliacion(false);
      setAmpliacion(initialAmpliacion);
    },
    onError: (error) => { toast.error(error.message || "Error al guardar la ampliación"); },
  });

  // ======= MUTACIONES NUEVAS PARA EDITAR Y ELIMINAR AMPLIACIONES =======
  const updateAmpliacionMutation = trpc.ampliaciones.update.useMutation({
    onSuccess: () => { toast.success("¡Ampliación modificada con éxito!"); refetchHistorial(); setOpenAmpliacion(false); setAmpliacion(initialAmpliacion); },
    onError: (error) => { toast.error(error.message || "Error al modificar la ampliación"); },
  });

  const deleteAmpliacionMutation = trpc.ampliaciones.delete.useMutation({
    onSuccess: () => { toast.success("Ampliación eliminada correctamente"); refetchHistorial(); },
    onError: (error) => { toast.error(error.message || "Error al eliminar la ampliación"); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.expediente || !form.nombre || !form.apellido || !form.dni || !form.fechaNacimiento) {
      toast.error("Faltan datos obligatorios", { description: "Revisa la pestaña 'Solicitante'." });
      return;
    }

    // 🚨 EL SALVAVIDAS ANTI-ZOD:
    const parseOptionalDate = (val: any) => {
      if (!val || val === "" || String(val).includes("1970-01-01")) return undefined;
      return new Date(val);
    };

    // 🎯 Objeto directo y limpio
    const payload = {
      expediente: form.expediente,
      trabajadorSocial: form.trabajadorSocial || "",
      fechaFicha: parseOptionalDate(form.fechaFicha),

      nombre: form.nombre,
      apellido: form.apellido,
      dni: form.dni,
      fechaNacimiento: new Date(form.fechaNacimiento),
      telefono: form.telefono || "",
      estadoCivil: form.estadoCivil || "Soltera/o",
      domicilio: form.domicilio || "",
      barrio: form.barrio || "",
      localidad: form.localidad || "",

      ocupacion: form.ocupacion || "",
      oficio: form.oficio || "",
      monto: form.monto || "",
      beneficioSocial: form.beneficioSocial || "NO",
      cualBeneficio: form.cualBeneficio || "",
      asistenciaPrevisional: form.asistenciaPrevisional || "No",
      diaCobro: form.diaCobro || "",
      medioCobro: form.medioCobro || "",
      tarjetas: form.tarjetas || "",
      prestamos: form.prestamos || "",

      redFamiliar: JSON.stringify(form.redFamiliar || []),

      tenenciaVivienda: form.tenenciaVivienda || "",
      tipoVivienda: form.tipoVivienda || "",
      situacionHabitacionalPersonas: form.situacionHabitacionalPersonas === "" ? undefined : Number(form.situacionHabitacionalPersonas),
      situacionHabitacionalHabitaciones: form.situacionHabitacionalHabitaciones === "" ? undefined : Number(form.situacionHabitacionalHabitaciones),

      materialParedes: form.materialParedes || "",
      materialPisos: form.materialPisos || "",
      materialTechos: form.materialTechos || "",
      bano: form.bano || "",
      cocina: form.cocina || "",
      servicioLuz: !!form.servicioLuz,
      servicioAgua: !!form.servicioAgua,
      servicioGas: !!form.servicioGas,

      obraSocial: form.obraSocial || "",
      numeroAfiliado: form.numeroAfiliado || "",
      enfermedad: form.enfermedad || "",
      sugerencia: form.sugerencia || "",
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload } as any);
    } else {
      createMutation.mutate(payload as any);
    }
  };

  const handleGuardarAmpliacion = () => {
    if (!ampliacion.sugerencia.trim()) {
      toast.error("El campo 'Sugerencia' no puede estar vacío.");
      return;
    }

    const payload = {
      benefProgramaSocial: ampliacion.beneficioSocial === "SI",
      cualPrograma: ampliacion.cualBeneficio,
      asistPrevisional: ampliacion.asistenciaPrevisional,
      diaCobro: ampliacion.diaCobro,
      medioCobro: ampliacion.medioCobro,
      poseeTarjetas: ampliacion.tarjetas === "SI",
      extensionANombreDe: ampliacion.extensionANombreDe,
      prestamos: ampliacion.prestamos,
      sugerencia: ampliacion.sugerencia,
    };

    if (ampliacion.id) {
      updateAmpliacionMutation.mutate({ id: ampliacion.id, ...payload });
    } else {
      if (!editingId) {
        toast.error("Error: No se encontró el ID del Adulto Mayor.");
        return;
      }
      createAmpliacionMutation.mutate({
        adultoMayorId: editingId,
        expediente: form.expediente,
        trabajadorSocial: form.trabajadorSocial,
        ocupacion: form.ocupacion,
        oficio: form.oficio,
        ...payload
      });
    }
  };

  const handleEliminarFichaPrincipal = () => {
    if (!editingId) return;
    if (confirm("🚨 ¿Está seguro de que desea eliminar por completo esta Ficha Social? Esta acción dará de baja el registro primario.")) {
      deleteMutation.mutate({ id: editingId });
    }
  };

  const handleEliminarAmpliacion = (id: number) => {
    if (confirm("⚠️ ¿Desea eliminar este registro de ampliación semestral?")) {
      deleteAmpliacionMutation.mutate({ id });
    }
  };

  const handleEditarAmpliacion = (amp: any) => {
    setAmpliacion({
      id: amp.id,
      beneficioSocial: amp.benefProgramaSocial ? "SI" : "NO",
      cualBeneficio: amp.cualPrograma || "",
      asistenciaPrevisional: amp.asistPrevisional || "No",
      diaCobro: amp.diaCobro || "",
      medioCobro: amp.medioCobro || "",
      tarjetas: amp.poseeTarjetas ? "SI" : "NO",
      extensionANombreDe: amp.extensionANombreDe || "",
      prestamos: amp.prestamos || "",
      sugerencia: amp.sugerencia || ""
    });
    setOpenAmpliacion(true);
  };

  const helperDate = (d: any) => d ? new Date(d).toISOString().split('T')[0] : "";

  const handleEdit = (adulto: any) => {
    setEditingId(adulto.id);
    let redParsed: Familiar[] = [];
    try { redParsed = adulto.redFamiliar ? JSON.parse(adulto.redFamiliar) : []; } catch (e) {}

    setForm({
      ...initialForm, ...adulto,
      fechaNacimiento: helperDate(adulto.fechaNacimiento),
      fechaFicha: helperDate(adulto.fechaFicha),
      redFamiliar: redParsed,
    });
    setViewMode(true);
    setOpen(true);
  };

  const addFamiliar = () => setForm({ ...form, redFamiliar: [...form.redFamiliar, { nombre: "", dni: "", vinculo: "", ocupacion: "", oficio: "", ingresos: "" }] });
  const updateFamiliar = (index: number, field: keyof Familiar, value: string) => {
    const newRed = [...form.redFamiliar]; newRed[index][field] = value; setForm({ ...form, redFamiliar: newRed });
  };
  const removeFamiliar = (index: number) => setForm({ ...form, redFamiliar: form.redFamiliar.filter((_, i) => i !== index) });

  const openNew = () => {
    setForm(initialForm);
    setEditingId(null);
    setViewMode(false);
    setOpen(true);
  };

  const calcularEdad = (fechaNacimiento: any) => {
    if (!fechaNacimiento) return "--";
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
  };

  const handleImprimir = () => {
    const v = (val: any) => (val === undefined || val === null || val === "" ? "S/D" : val);
    const formatFecha = (val: any) => {
      if (!val) return "S/D";
      const d = new Date(val);
      return isNaN(d.getTime()) ? "S/D" : d.toLocaleDateString("es-AR");
    };

    const filasFamiliares = form.redFamiliar.length > 0
      ? form.redFamiliar.map(f => `
          <tr>
            <td>${v(f.nombre)}</td>
            <td>${v(f.dni)}</td>
            <td>${v(f.vinculo)}</td>
          </tr>`).join("")
      : `<tr><td colspan="3" style="text-align:center;color:#888;">Sin familiares registrados</td></tr>`;

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Ficha Social ${v(form.expediente)}</title>
        <style>
          @page { margin: 18mm 14mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; font-size: 12px; line-height: 1.5; }
          .encabezado { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #5B2D8E; padding-bottom: 10px; margin-bottom: 16px; }
          .encabezado h1 { font-size: 18px; margin: 0; color: #5B2D8E; }
          .encabezado p { margin: 2px 0 0; color: #555; font-size: 11px; }
          .encabezado .exp { text-align: right; font-size: 13px; font-weight: bold; }
          h2.seccion { font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #5B2D8E; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin: 18px 0 10px; }
          table.datos { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
          table.datos td { padding: 5px 6px; vertical-align: top; width: 25%; }
          table.datos td.label { color: #666; font-size: 10px; text-transform: uppercase; padding-bottom: 0; }
          table.datos tr.valores td { padding-top: 0; font-weight: 600; padding-bottom: 10px; border-bottom: 1px solid #eee; }
          table.familiares { width: 100%; border-collapse: collapse; margin-top: 4px; }
          table.familiares th, table.familiares td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 11px; }
          table.familiares th { background: #f3eefa; color: #5B2D8E; }
          .servicios span { display: inline-block; margin-right: 16px; }
          .sugerencia { border: 1px solid #ddd; border-radius: 4px; padding: 10px; min-height: 50px; white-space: pre-wrap; background: #fafafa; }
          .firmas { display: flex; justify-content: space-between; margin-top: 60px; page-break-inside: avoid; }
          .firma-box { width: 45%; text-align: center; }
          .firma-linea { border-top: 1px solid #333; margin-bottom: 6px; padding-top: 6px; }
          .lugar-fecha { margin-top: 40px; font-size: 12px; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="encabezado">
          <div>
            <h1>SIDES · Ficha Social</h1>
            <p>Ministerio de Desarrollo Social de Santiago del Estero</p>
          </div>
          <div class="exp">
            Expediente N° ${v(form.expediente)}<br/>
            <span style="font-weight:400; font-size:11px; color:#555;">Fecha de ficha: ${formatFecha(form.fechaFicha)}</span>
          </div>
        </div>

        <h2 class="seccion">Datos del Solicitante</h2>
        <table class="datos">
          <tr><td class="label">Nombres</td><td class="label">Apellidos</td><td class="label">DNI</td><td class="label">Fecha de Nacimiento</td></tr>
          <tr class="valores"><td>${v(form.nombre)}</td><td>${v(form.apellido)}</td><td>${v(form.dni)}</td><td>${formatFecha(form.fechaNacimiento)}</td></tr>
          <tr><td class="label">Teléfono</td><td class="label">Estado Civil</td><td class="label">Barrio</td><td class="label">Localidad</td></tr>
          <tr class="valores"><td>${v(form.telefono)}</td><td>${v(form.estadoCivil)}</td><td>${v(form.barrio)}</td><td>${v(form.localidad)}</td></tr>
          <tr><td class="label" colspan="4">Domicilio</td></tr>
          <tr class="valores"><td colspan="4">${v(form.domicilio)}</td></tr>
          <tr><td class="label">Trabajador/a Social</td></tr>
          <tr class="valores"><td>${v(form.trabajadorSocial)}</td></tr>
        </table>

        <h2 class="seccion">Red Familiar de Apoyo</h2>
        <table class="familiares">
          <thead><tr><th>Nombre</th><th>DNI</th><th>Vínculo</th></tr></thead>
          <tbody>${filasFamiliares}</tbody>
        </table>

        <h2 class="seccion">Datos Socioeconómicos</h2>
        <table class="datos">
          <tr><td class="label">Ocupación</td><td class="label">Oficio</td><td class="label">Monto</td><td class="label">Beneficio Prog. Social</td></tr>
          <tr class="valores"><td>${v(form.ocupacion)}</td><td>${v(form.oficio)}</td><td>${v(form.monto)}</td><td>${v(form.beneficioSocial)}${form.cualBeneficio ? ` (${v(form.cualBeneficio)})` : ""}</td></tr>
          <tr><td class="label">Asistencia Previsional</td><td class="label">Día de Cobro</td><td class="label">Medio de Cobro</td><td class="label">Tarjetas / Préstamos</td></tr>
          <tr class="valores"><td>${v(form.asistenciaPrevisional)}</td><td>${v(form.diaCobro)}</td><td>${v(form.medioCobro)}</td><td>${v(form.tarjetas)} / ${v(form.prestamos)}</td></tr>
        </table>

        <h2 class="seccion">Situación de la Vivienda</h2>
        <table class="datos">
          <tr><td class="label">Tenencia</td><td class="label">Tipo de Vivienda</td><td class="label">Cant. Personas</td><td class="label">Cant. Habitaciones</td></tr>
          <tr class="valores"><td>${v(form.tenenciaVivienda)}</td><td>${v(form.tipoVivienda)}</td><td>${v(form.situacionHabitacionalPersonas)}</td><td>${v(form.situacionHabitacionalHabitaciones)}</td></tr>
          <tr><td class="label">Material Paredes</td><td class="label">Material Pisos</td><td class="label">Material Techos</td><td class="label">Baño / Cocina</td></tr>
          <tr class="valores"><td>${v(form.materialParedes)}</td><td>${v(form.materialPisos)}</td><td>${v(form.materialTechos)}</td><td>${v(form.bano)} / ${v(form.cocina)}</td></tr>
        </table>
        <p class="servicios">
          <span>LUZ: <strong>${form.servicioLuz ? "SÍ" : "NO"}</strong></span>
          <span>AGUA: <strong>${form.servicioAgua ? "SÍ" : "NO"}</strong></span>
          <span>GAS: <strong>${form.servicioGas ? "SÍ" : "NO"}</strong></span>
        </p>

        <h2 class="seccion">Situación Sanitaria</h2>
        <table class="datos">
          <tr><td class="label">Obra Social</td><td class="label">N° Afiliado</td><td class="label" colspan="2">Enfermedad</td></tr>
          <tr class="valores"><td>${v(form.obraSocial)}</td><td>${v(form.numeroAfiliado)}</td><td colspan="2">${v(form.enfermedad)}</td></tr>
        </table>

        <h2 class="seccion">Sugerencia</h2>
        <div class="sugerencia">${v(form.sugerencia)}</div>

        <div class="lugar-fecha">Santiago del Estero, ____ de ____________________ de ________</div>

        <div class="firmas">
          <div class="firma-box">
            <div class="firma-linea">Firma del Solicitante / Familiar Responsable</div>
            <div>Aclaración: ____________________________</div>
          </div>
          <div class="firma-box">
            <div class="firma-linea">Firma del/la Trabajador/a Social</div>
            <div>Aclaración: ____________________________</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const ventana = window.open("", "_blank", "width=900,height=1000");
    if (!ventana) {
      toast.error("El navegador bloqueó la ventana de impresión. Habilitá los pop-ups para este sitio.");
      return;
    }
    ventana.document.write(html);
    ventana.document.close();
    ventana.focus();
    setTimeout(() => {
      ventana.print();
    }, 300);
  };

  const adultosFiltrados = (adultosMayores ?? []).filter((adulto: any) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    const nombreCompleto = `${adulto.nombre ?? ""} ${adulto.apellido ?? ""}`.toLowerCase();
    const dni = (adulto.dni ?? "").toLowerCase();
    return nombreCompleto.includes(q) || dni.includes(q);
  });

  return (
    <VStack align="stretch" gap={6}>
      <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} gap={3}>
        <Box>
          <Heading size="2xl" color="heading" display="flex" alignItems="center" gap={2}>
            <Users size={30} color="var(--chakra-colors-brand-600)" />
            Adultos Mayores
          </Heading>
          <Text color="gray.500" mt={2}>
            Gestión de expedientes e informes sociales
          </Text>
        </Box>
        <Button bg="brand.600" color="white" _hover={{ bg: "brand.700" }} onClick={openNew}>
          <Plus size={16} />
          Nueva Ficha Social
        </Button>
      </Flex>

      <Dialog.Root
        open={open}
        onOpenChange={d => {
          setOpen(d.open);
          if (!d.open) { setForm(initialForm); setEditingId(null); setViewMode(false); }
        }}
        size="full"
        scrollBehavior="inside"
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="min(1200px, 95vw)" maxH="90vh" m="auto">
              <Dialog.Body p={6} overflowY="auto">
                {viewMode ? (
                  <VStack align="stretch" gap={6}>
                    <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} gap={4} pb={4} borderBottomWidth="1px" borderColor="gray.200">
                      <Box>
                        <Dialog.Title fontSize="2xl" fontWeight="800" color="heading">
                          Ficha N° {form.expediente}
                        </Dialog.Title>
                        <Text mt={1} color="gray.600" fontSize="lg">
                          {form.nombre} {form.apellido} | DNI: {form.dni}
                        </Text>
                      </Box>
                      <HStack gap={2} flexWrap="wrap">
                        <Button variant="outline" borderColor="gray.300" color="fg" onClick={handleImprimir}>
                          <Printer size={15} /> Imprimir Ficha
                        </Button>
                        <Button variant="outline" borderColor="brand.400" color="brand.700" onClick={() => setViewMode(false)}>
                          <Edit size={15} /> Editar Ficha Original
                        </Button>
                        <Button bg="brand.600" color="white" _hover={{ bg: "brand.700" }} onClick={() => { setAmpliacion(initialAmpliacion); setOpenAmpliacion(true); }}>
                          <Plus size={15} /> Nueva Ampliación de Sugerencia
                        </Button>
                        <Button bg="red.600" color="white" _hover={{ bg: "red.700" }} onClick={handleEliminarFichaPrincipal}>
                          <Trash size={15} /> Eliminar Ficha
                        </Button>
                      </HStack>
                    </Flex>

                    <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={8}>
                      <Box>
                        <Heading size="md" borderBottomWidth="2px" borderColor="gray.100" pb={2} mb={3}>
                          Datos Personales y Domicilio
                        </Heading>
                        <SimpleGrid columns={2} gap={4} fontSize="sm">
                          <DetailField label="Nacimiento" value={form.fechaNacimiento} />
                          <DetailField label="Teléfono" value={form.telefono} />
                          <DetailField label="Estado Civil" value={form.estadoCivil} />
                          <DetailField label="Domicilio" value={form.domicilio} />
                          <DetailField label="Barrio" value={form.barrio} />
                          <DetailField label="Localidad" value={form.localidad} />
                        </SimpleGrid>
                      </Box>

                      <VStack align="stretch" gap={6}>
                        <Box>
                          <Heading size="md" borderBottomWidth="2px" borderColor="gray.100" pb={2} mb={3}>
                            Red Familiar de Apoyo
                          </Heading>
                          {form.redFamiliar && form.redFamiliar.length > 0 ? (
                            <VStack align="stretch" gap={2} fontSize="sm">
                              {form.redFamiliar.map((fam, idx) => (
                                <Box key={idx} bg="bg.muted" p={3} borderRadius="md" borderWidth="1px" borderColor="gray.200">
                                  <Text fontWeight="700" color="brand.700">{fam.nombre} - DNI: {fam.dni}</Text>
                                  <Text color="gray.500">Vínculo: {fam.vinculo}</Text>
                                </Box>
                              ))}
                            </VStack>
                          ) : (
                            <Text fontSize="sm" color="gray.500" fontStyle="italic">No se registraron familiares.</Text>
                          )}
                        </Box>

                        <Box>
                          <Heading size="md" borderBottomWidth="2px" borderColor="gray.100" pb={2} mb={3}>
                            Datos del Expediente
                          </Heading>
                          <SimpleGrid columns={2} gap={4} fontSize="sm">
                            <DetailField label="Trabajador/a Social" value={form.trabajadorSocial} />
                            <DetailField label="Fecha de Ficha" value={form.fechaFicha} />
                          </SimpleGrid>
                        </Box>
                      </VStack>
                    </Grid>

                    {/* ======= HISTORIAL VISUAL DE AMPLIACIONES SEMESTRALES ======= */}
                    <Box mt={2} pt={6} borderTopWidth="1px" borderColor="gray.200">
                      <Heading size="lg" display="flex" alignItems="center" gap={2} mb={4}>
                        📝 Historial de Ampliaciones Semestrales (Ayuda Alimentaria)
                      </Heading>

                      {historialAmpliaciones && historialAmpliaciones.length > 0 ? (
                        <VStack align="stretch" gap={4}>
                          {historialAmpliaciones.map((amp: any) => (
                            <Card.Root key={amp.id} borderLeftWidth="4px" borderLeftColor="brand.600" boxShadow="sm">
                              <Card.Body p={4}>
                                <VStack align="stretch" gap={3}>
                                  <Flex justify="space-between" align="center" bg="bg.muted" p={2} borderRadius="md" fontSize="xs" color="fg.muted" fontWeight="500">
                                    <Text>📅 Fecha: {amp.fecha ? new Date(amp.fecha).toLocaleDateString() : "--"}</Text>
                                    <HStack gap={2}>
                                      <IconButton aria-label="Editar" variant="ghost" size="xs" color="brand.600" onClick={() => handleEditarAmpliacion(amp)}>
                                        <Pencil size={14} />
                                      </IconButton>
                                      <IconButton aria-label="Eliminar" variant="ghost" size="xs" color="red.600" onClick={() => handleEliminarAmpliacion(amp.id)}>
                                        <Trash size={14} />
                                      </IconButton>
                                    </HStack>
                                  </Flex>

                                  <SimpleGrid columns={{ base: 2, md: 4 }} gap={4} fontSize="xs" pb={2} borderBottomWidth="1px" borderColor="gray.100">
                                    <Text><Text as="span" fontWeight="600" color="gray.500">Prog. Social:</Text> {amp.benefProgramaSocial ? `SÍ (${amp.cualPrograma || 'S/D'})` : 'NO'}</Text>
                                    <Text><Text as="span" fontWeight="600" color="gray.500">Asist. Previsional:</Text> {amp.asistPrevisional || '--'}</Text>
                                    <Text><Text as="span" fontWeight="600" color="gray.500">Día/Medio Cobro:</Text> {amp.diaCobro || '--'} ({amp.medioCobro || '--'})</Text>
                                    <Text><Text as="span" fontWeight="600" color="gray.500">Tarjetas/Préstamos:</Text> {amp.poseeTarjetas ? 'SÍ' : 'NO'} / {amp.prestamos || 'Ninguno'}</Text>
                                  </SimpleGrid>

                                  <Box>
                                    <Text fontWeight="700" fontSize="sm" color="fg" mb={1}>Sugerencia Semestral:</Text>
                                    <Box
                                      fontSize="sm"
                                      color="fg.muted"
                                      bg={{ base: "amber.50", _dark: "amber.950" }}
                                      p={3}
                                      borderRadius="md"
                                      borderWidth="1px"
                                      borderColor={{ base: "amber.100", _dark: "amber.800" }}
                                      whiteSpace="pre-wrap"
                                      fontStyle="italic"
                                    >
                                      "{amp.sugerencia}"
                                    </Box>
                                  </Box>
                                </VStack>
                              </Card.Body>
                            </Card.Root>
                          ))}
                        </VStack>
                      ) : (
                        <Box textAlign="center" py={6} bg="bg.muted" borderRadius="lg" borderWidth="1px" borderStyle="dashed" borderColor="gray.200" color="fg.muted" fontSize="sm">
                          No se registran ampliaciones semestrales todavía para este titular.
                        </Box>
                      )}
                    </Box>
                  </VStack>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <VStack align="stretch" gap={6}>
                      <Box>
                        <Dialog.Title fontSize="xl" fontWeight="700">
                          {editingId ? "Editar" : "Nueva"} Ficha Social
                        </Dialog.Title>
                        <Dialog.Description color="gray.500">
                          Complete los datos requeridos como en el documento original.
                        </Dialog.Description>
                      </Box>

                      <Tabs.Root defaultValue="solicitante" variant="enclosed">
                        <Tabs.List flexWrap="wrap">
                          <Tabs.Trigger value="solicitante">Solicitante</Tabs.Trigger>
                          <Tabs.Trigger value="socioeconomico">Socio económico</Tabs.Trigger>
                          <Tabs.Trigger value="red">Red Familiar</Tabs.Trigger>
                          <Tabs.Trigger value="vivienda">Vivienda</Tabs.Trigger>
                          <Tabs.Trigger value="salud">Salud y Cierre</Tabs.Trigger>
                        </Tabs.List>

                        <Tabs.Content value="solicitante">
                          <VStack align="stretch" gap={4} pt={2}>
                            <Flex justify="flex-end" pb={4} borderBottomWidth="1px" borderColor="gray.200">
                              <Grid templateColumns="repeat(3, 1fr)" gap={4} w={{ base: "100%", md: "auto" }}>
                                <Field.Root required>
                                  <Field.Label fontWeight="700">Exp N°</Field.Label>
                                  <Input placeholder="Número manual único" value={form.expediente} onChange={e => setForm({ ...form, expediente: e.target.value })} required />
                                </Field.Root>
                                <Field.Root>
                                  <Field.Label fontWeight="700">T. Social</Field.Label>
                                  <Input value={form.trabajadorSocial} onChange={e => setForm({ ...form, trabajadorSocial: e.target.value })} />
                                </Field.Root>
                                <Field.Root required>
                                  <Field.Label fontWeight="700">Fecha</Field.Label>
                                  <Input type="date" value={form.fechaFicha} onChange={e => setForm({ ...form, fechaFicha: e.target.value })} />
                                </Field.Root>
                              </Grid>
                            </Flex>

                            <SectionLabel>Datos del Solicitante</SectionLabel>
                            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }} gap={4}>
                              <Field.Root required>
                                <Field.Label>Nombres</Field.Label>
                                <Input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
                              </Field.Root>
                              <Field.Root required>
                                <Field.Label>Apellidos</Field.Label>
                                <Input value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} required />
                              </Field.Root>
                              <Field.Root required>
                                <Field.Label>D.N.I</Field.Label>
                                <Input value={form.dni} onChange={e => setForm({ ...form, dni: e.target.value })} required />
                              </Field.Root>
                            </Grid>
                            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }} gap={4}>
                              <Field.Root required>
                                <Field.Label>Fecha de Nacimiento</Field.Label>
                                <Input type="date" value={form.fechaNacimiento} onChange={e => setForm({ ...form, fechaNacimiento: e.target.value })} required />
                              </Field.Root>
                              <Field.Root required>
                                <Field.Label>Teléfono</Field.Label>
                                <Input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} required />
                              </Field.Root>
                              <Field.Root required>
                                <Field.Label>Estado Civil</Field.Label>
                                <NativeSelect.Root>
                                  <NativeSelect.Field value={form.estadoCivil} onChange={e => setForm({ ...form, estadoCivil: e.target.value })}>
                                    <option value="Soltera/o">Soltera/o</option>
                                    <option value="Casada/o">Casada/o</option>
                                    <option value="Separada/o">Separada/o</option>
                                    <option value="Viuda/o">Viuda/o</option>
                                    <option value="Unión de Hecho">Unión de Hecho</option>
                                  </NativeSelect.Field>
                                  <NativeSelect.Indicator />
                                </NativeSelect.Root>
                              </Field.Root>
                            </Grid>
                            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }} gap={4}>
                              <Field.Root required>
                                <Field.Label>Domicilio</Field.Label>
                                <Input value={form.domicilio} onChange={e => setForm({ ...form, domicilio: e.target.value })} required />
                              </Field.Root>
                              <Field.Root required>
                                <Field.Label>Barrio</Field.Label>
                                <Input value={form.barrio} onChange={e => setForm({ ...form, barrio: e.target.value })} required />
                              </Field.Root>
                              <Field.Root required>
                                <Field.Label>Localidad</Field.Label>
                                <Input value={form.localidad} onChange={e => setForm({ ...form, localidad: e.target.value })} required />
                              </Field.Root>
                            </Grid>
                          </VStack>
                        </Tabs.Content>

                        <Tabs.Content value="socioeconomico">
                          <VStack align="stretch" gap={4} pt={2}>
                            <SectionLabel>Datos Socioeconómicos</SectionLabel>
                            <SimpleGrid columns={{ base: 1, md: 4 }} gap={4} pb={4} borderBottomWidth="1px" borderColor="gray.200">
                              <Field.Root>
                                <Field.Label>Ocupación</Field.Label>
                                <Input value={form.ocupacion} onChange={e => setForm({ ...form, ocupacion: e.target.value })} />
                              </Field.Root>
                              <Field.Root>
                                <Field.Label>Oficio</Field.Label>
                                <Input value={form.oficio} onChange={e => setForm({ ...form, oficio: e.target.value })} />
                              </Field.Root>
                              <Field.Root>
                                <Field.Label>Monto</Field.Label>
                                <Input value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} />
                              </Field.Root>
                              <Field.Root>
                                <Field.Label>Beneficio De Prog. Social</Field.Label>
                                <NativeSelect.Root>
                                  <NativeSelect.Field value={form.beneficioSocial} onChange={e => setForm({ ...form, beneficioSocial: e.target.value })}>
                                    <option value="SI">SI</option>
                                    <option value="NO">NO</option>
                                  </NativeSelect.Field>
                                  <NativeSelect.Indicator />
                                </NativeSelect.Root>
                              </Field.Root>
                              <Field.Root gridColumn={{ md: "span 2" }}>
                                <Field.Label>¿Cuál?</Field.Label>
                                <Input value={form.cualBeneficio} onChange={e => setForm({ ...form, cualBeneficio: e.target.value })} disabled={form.beneficioSocial === 'NO'} />
                              </Field.Root>
                              <Field.Root>
                                <Field.Label>Asistencia Previsional</Field.Label>
                                <NativeSelect.Root>
                                  <NativeSelect.Field value={form.asistenciaPrevisional} onChange={e => setForm({ ...form, asistenciaPrevisional: e.target.value })}>
                                    <option value="Municipal">Municipal</option>
                                    <option value="Provincial">Provincial</option>
                                    <option value="Nacional">Nacional</option>
                                    <option value="No">No</option>
                                  </NativeSelect.Field>
                                  <NativeSelect.Indicator />
                                </NativeSelect.Root>
                              </Field.Root>
                            </SimpleGrid>
                            <SimpleGrid columns={{ base: 1, md: 4 }} gap={4}>
                              <Field.Root>
                                <Field.Label>Día de cobro</Field.Label>
                                <Input value={form.diaCobro} onChange={e => setForm({ ...form, diaCobro: e.target.value })} />
                              </Field.Root>
                              <Field.Root>
                                <Field.Label>Medio de cobro</Field.Label>
                                <Input value={form.medioCobro} onChange={e => setForm({ ...form, medioCobro: e.target.value })} />
                              </Field.Root>
                              <Field.Root>
                                <Field.Label>Posee Tarjetas</Field.Label>
                                <Input value={form.tarjetas} onChange={e => setForm({ ...form, tarjetas: e.target.value })} />
                              </Field.Root>
                              <Field.Root>
                                <Field.Label>Préstamos</Field.Label>
                                <Input value={form.prestamos} onChange={e => setForm({ ...form, prestamos: e.target.value })} />
                              </Field.Root>
                            </SimpleGrid>
                          </VStack>
                        </Tabs.Content>

                        <Tabs.Content value="red">
                          <VStack align="stretch" gap={4} pt={2}>
                            <Flex justify="space-between" align="center">
                              <SectionLabel>Red Familiar</SectionLabel>
                              <Button variant="outline" size="sm" borderColor="brand.400" color="brand.700" onClick={addFamiliar} type="button">
                                <Plus size={14} /> Agregar Familiar
                              </Button>
                            </Flex>
                            <Card.Root>
                              <Card.Body p={0}>
                                <Table.Root>
                                  <Table.Header>
                                    <Table.Row>
                                      <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                      <Table.ColumnHeader>DNI</Table.ColumnHeader>
                                      <Table.ColumnHeader>Vínculo</Table.ColumnHeader>
                                      <Table.ColumnHeader w="50px" />
                                    </Table.Row>
                                  </Table.Header>
                                  <Table.Body>
                                    {form.redFamiliar.map((fam, idx) => (
                                      <Table.Row key={idx}>
                                        <Table.Cell><Input size="sm" value={fam.nombre} onChange={e => updateFamiliar(idx, 'nombre', e.target.value)} /></Table.Cell>
                                        <Table.Cell><Input size="sm" value={fam.dni} onChange={e => updateFamiliar(idx, 'dni', e.target.value)} /></Table.Cell>
                                        <Table.Cell><Input size="sm" value={fam.vinculo} onChange={e => updateFamiliar(idx, 'vinculo', e.target.value)} /></Table.Cell>
                                        <Table.Cell>
                                          <IconButton aria-label="Eliminar familiar" variant="ghost" size="sm" onClick={() => removeFamiliar(idx)} type="button">
                                            <Trash size={16} color="var(--chakra-colors-red-500)" />
                                          </IconButton>
                                        </Table.Cell>
                                      </Table.Row>
                                    ))}
                                    {form.redFamiliar.length === 0 && (
                                      <Table.Row>
                                        <Table.Cell colSpan={4} textAlign="center" py={4} color="gray.500">
                                          Sin familiares
                                        </Table.Cell>
                                      </Table.Row>
                                    )}
                                  </Table.Body>
                                </Table.Root>
                              </Card.Body>
                            </Card.Root>
                          </VStack>
                        </Tabs.Content>

                        <Tabs.Content value="vivienda">
                          <VStack align="stretch" gap={4} pt={2}>
                            <SectionLabel>Situación de la Vivienda</SectionLabel>
                            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }} gap={6}>
                              <VStack align="stretch" gap={4}>
                                <Field.Root>
                                  <Field.Label>Situación tenencia</Field.Label>
                                  <Input value={form.tenenciaVivienda} onChange={e => setForm({ ...form, tenenciaVivienda: e.target.value })} />
                                </Field.Root>
                                <Field.Root>
                                  <Field.Label>Tipo de Vivienda</Field.Label>
                                  <Input value={form.tipoVivienda} onChange={e => setForm({ ...form, tipoVivienda: e.target.value })} />
                                </Field.Root>
                              </VStack>
                              <VStack align="stretch" gap={4} px={{ md: 4 }} borderLeftWidth={{ md: "1px" }} borderRightWidth={{ md: "1px" }} borderColor="gray.200">
                                <Field.Root>
                                  <Field.Label>Material paredes</Field.Label>
                                  <Input value={form.materialParedes} onChange={e => setForm({ ...form, materialParedes: e.target.value })} />
                                </Field.Root>
                                <Field.Root>
                                  <Field.Label>Material pisos</Field.Label>
                                  <Input value={form.materialPisos} onChange={e => setForm({ ...form, materialPisos: e.target.value })} />
                                </Field.Root>
                              </VStack>
                              <VStack align="stretch" gap={4}>
                                <Text fontWeight="700">Situación Habitacional</Text>
                                <Field.Root>
                                  <Field.Label>Cant. Personas</Field.Label>
                                  <Input type="number" value={form.situacionHabitacionalPersonas} onChange={e => setForm({ ...form, situacionHabitacionalPersonas: e.target.value === "" ? "" : Number(e.target.value) })} />
                                </Field.Root>
                                <Field.Root>
                                  <Field.Label>Cant. Habitaciones</Field.Label>
                                  <Input type="number" value={form.situacionHabitacionalHabitaciones} onChange={e => setForm({ ...form, situacionHabitacionalHabitaciones: e.target.value === "" ? "" : Number(e.target.value) })} />
                                </Field.Root>
                              </VStack>
                            </Grid>

                            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr 1fr 1fr" }} gap={6} pt={4} mt={2} borderTopWidth="1px" borderColor="gray.200">
                              <Field.Root>
                                <Field.Label>Material techos</Field.Label>
                                <Input value={form.materialTechos} onChange={e => setForm({ ...form, materialTechos: e.target.value })} />
                              </Field.Root>
                              <Field.Root>
                                <Field.Label>Baño</Field.Label>
                                <Input value={form.bano} onChange={e => setForm({ ...form, bano: e.target.value })} />
                              </Field.Root>
                              <Field.Root>
                                <Field.Label>Cocina</Field.Label>
                                <Input value={form.cocina} onChange={e => setForm({ ...form, cocina: e.target.value })} />
                              </Field.Root>
                              <Box borderLeftWidth={{ md: "1px" }} pl={{ md: 4 }} borderColor="gray.200">
                                <Text mb={2} fontWeight="600">Servicios básicos</Text>
                                <VStack align="stretch" gap={2}>
                                  <Checkbox.Root checked={form.servicioLuz} onCheckedChange={d => setForm({ ...form, servicioLuz: !!d.checked })}>
                                    <Checkbox.HiddenInput />
                                    <Checkbox.Control />
                                    <Checkbox.Label>LUZ</Checkbox.Label>
                                  </Checkbox.Root>
                                  <Checkbox.Root checked={form.servicioAgua} onCheckedChange={d => setForm({ ...form, servicioAgua: !!d.checked })}>
                                    <Checkbox.HiddenInput />
                                    <Checkbox.Control />
                                    <Checkbox.Label>AGUA</Checkbox.Label>
                                  </Checkbox.Root>
                                  <Checkbox.Root checked={form.servicioGas} onCheckedChange={d => setForm({ ...form, servicioGas: !!d.checked })}>
                                    <Checkbox.HiddenInput />
                                    <Checkbox.Control />
                                    <Checkbox.Label>GAS</Checkbox.Label>
                                  </Checkbox.Root>
                                </VStack>
                              </Box>
                            </Grid>
                          </VStack>
                        </Tabs.Content>

                        <Tabs.Content value="salud">
                          <VStack align="stretch" gap={4} pt={2}>
                            <SectionLabel>Situación Sanitaria</SectionLabel>
                            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                              <Field.Root>
                                <Field.Label>Obra Social</Field.Label>
                                <Input value={form.obraSocial} onChange={e => setForm({ ...form, obraSocial: e.target.value })} />
                              </Field.Root>
                              <Field.Root>
                                <Field.Label>Nº AFILIADO</Field.Label>
                                <Input value={form.numeroAfiliado} onChange={e => setForm({ ...form, numeroAfiliado: e.target.value })} />
                              </Field.Root>
                              <Field.Root gridColumn={{ md: "span 2" }}>
                                <Field.Label>Enfermedad</Field.Label>
                                <Input value={form.enfermedad} onChange={e => setForm({ ...form, enfermedad: e.target.value })} />
                              </Field.Root>
                            </SimpleGrid>
                            <Box pt={4} mt={2} borderTopWidth="1px" borderColor="gray.200">
                              <Field.Root>
                                <Field.Label fontSize="lg" fontWeight="600" color="brand.700" mb={2}>Sugerencia:</Field.Label>
                                <Textarea value={form.sugerencia} onChange={e => setForm({ ...form, sugerencia: e.target.value })} rows={8} resize="none" />
                              </Field.Root>
                            </Box>
                          </VStack>
                        </Tabs.Content>
                      </Tabs.Root>

                      <HStack justify="flex-end" gap={2} pt={4} borderTopWidth="1px" borderColor="gray.100">
                        <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          bg="brand.600"
                          color="white"
                          _hover={{ bg: "brand.700" }}
                          loading={createMutation.isPending || updateMutation.isPending}
                        >
                          {editingId ? "Actualizar Ficha" : "Guardar Ficha"}
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

      <Box>
          <Box maxW="sm" mt={4}>
            <Box position="relative">
              <Input
                placeholder="Buscar por nombre o DNI..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                pl={9}
              />
              <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="gray.400" pointerEvents="none">
                <Search size={16} />
              </Box>
            </Box>
          </Box>

          {isLoading ? (
            <Skeleton h="96" mt={4} />
          ) : adultosFiltrados.length > 0 ? (
            <Card.Root mt={4}>
              <Card.Body p={0} overflowX="auto">
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                      <Table.ColumnHeader>Expediente</Table.ColumnHeader>
                      <Table.ColumnHeader>DNI</Table.ColumnHeader>
                      <Table.ColumnHeader>Edad</Table.ColumnHeader>
                      <Table.ColumnHeader>Teléfono</Table.ColumnHeader>
                      <Table.ColumnHeader>Barrio</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right">Acciones</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {adultosFiltrados.map((adulto: any) => (
                      <Table.Row key={adulto.id}>
                        <Table.Cell fontWeight="600" whiteSpace="nowrap">{adulto.nombre} {adulto.apellido}</Table.Cell>
                        <Table.Cell fontSize="sm" color="gray.500" whiteSpace="nowrap">{adulto.expediente || "S/D"}</Table.Cell>
                        <Table.Cell fontSize="sm" color="gray.500" whiteSpace="nowrap">{adulto.dni}</Table.Cell>
                        <Table.Cell fontSize="sm" color="gray.500" whiteSpace="nowrap">{calcularEdad(adulto.fechaNacimiento)}</Table.Cell>
                        <Table.Cell fontSize="sm" color="gray.500" whiteSpace="nowrap">{adulto.telefono || "S/D"}</Table.Cell>
                        <Table.Cell fontSize="sm" color="gray.500" whiteSpace="nowrap">{adulto.barrio || "S/D"}</Table.Cell>
                        <Table.Cell textAlign="right">
                          <IconButton aria-label="Ver / Editar" variant="ghost" size="sm" onClick={() => handleEdit(adulto)}>
                            <FileText size={16} color="var(--chakra-colors-brand-600)" />
                          </IconButton>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Card.Body>
            </Card.Root>
          ) : busqueda.trim() ? (
            <Card.Root mt={4}>
              <Card.Body>
                <VStack py={16} gap={3}>
                  <Search size={56} color="var(--chakra-colors-gray-300)" />
                  <Text color="fg" fontWeight="600" fontSize="lg">Sin resultados para "{busqueda}"</Text>
                  <Button variant="outline" onClick={() => setBusqueda("")}>
                    Limpiar búsqueda
                  </Button>
                </VStack>
              </Card.Body>
            </Card.Root>
          ) : (
            <Card.Root mt={4}>
              <Card.Body>
                <VStack py={16} gap={3}>
                  <Users size={56} color="var(--chakra-colors-gray-300)" />
                  <Text color="fg" fontWeight="600" fontSize="lg">No hay fichas</Text>
                  <Button bg="brand.600" color="white" _hover={{ bg: "brand.700" }} onClick={openNew}>
                    <Plus size={16} /> Crear primera ficha
                  </Button>
                </VStack>
              </Card.Body>
            </Card.Root>
          )}
      </Box>

      {/* ================= MODAL DE AMPLIACIÓN DE SUGERENCIA ================= */}
      <Dialog.Root open={openAmpliacion} onOpenChange={d => setOpenAmpliacion(d.open)} size="full" scrollBehavior="inside">
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="min(1000px, 90vw)" maxH="90vh" m="auto">
              <Dialog.Body p={6} overflowY="auto">
                <Dialog.Title fontSize="2xl" fontWeight="800" textAlign="center" pb={4} borderBottomWidth="1px" borderColor="gray.200">
                  {ampliacion.id ? "MODIFICAR AMPLIACIÓN DE SUGERENCIA" : "NUEVA AMPLIACIÓN DE SUGERENCIA"}
                </Dialog.Title>

                <VStack align="stretch" gap={6} mt={4}>
                  <Flex justify="flex-end">
                    <Grid templateColumns="1fr 1fr" gap={4} w={{ base: "100%", md: "50%" }}>
                      <Field.Root>
                        <Field.Label fontWeight="700">Exp N°</Field.Label>
                        <Input value={form.expediente} readOnly bg="bg.muted" />
                      </Field.Root>
                      <Field.Root>
                        <Field.Label fontWeight="700">Fecha</Field.Label>
                        <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                      </Field.Root>
                    </Grid>
                  </Flex>

                  <SectionLabel>Solicitante</SectionLabel>
                  <SimpleGrid columns={{ base: 1, md: 4 }} gap={4} bg="bg.muted" p={4} borderRadius="md" borderWidth="1px" borderColor="gray.200">
                    <Field.Root gridColumn={{ md: "span 2" }}>
                      <Field.Label>Nombre y Apellido</Field.Label>
                      <Input value={`${form.nombre} ${form.apellido}`} readOnly />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>D.N.I</Field.Label>
                      <Input value={form.dni} readOnly />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Fecha de Nacimiento</Field.Label>
                      <Input type="date" value={form.fechaNacimiento} readOnly />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Estado Civil</Field.Label>
                      <Input value={form.estadoCivil} readOnly />
                    </Field.Root>
                    <Field.Root gridColumn={{ md: "span 2" }}>
                      <Field.Label>Domicilio</Field.Label>
                      <Input value={form.domicilio} readOnly />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Barrio</Field.Label>
                      <Input value={form.barrio} readOnly />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Localidad</Field.Label>
                      <Input value={form.localidad} readOnly />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Ocupación</Field.Label>
                      <Input value={form.ocupacion} readOnly />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Oficio</Field.Label>
                      <Input value={form.oficio} readOnly />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Monto</Field.Label>
                      <Input value={form.monto} readOnly />
                    </Field.Root>
                  </SimpleGrid>

                  <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} pt={4} borderTopWidth="1px" borderColor="gray.200">
                    <Field.Root>
                      <Field.Label>Benef. De Prog. Social</Field.Label>
                      <NativeSelect.Root>
                        <NativeSelect.Field value={ampliacion.beneficioSocial} onChange={e => setAmpliacion({ ...ampliacion, beneficioSocial: e.target.value })}>
                          <option value="SI">SI</option>
                          <option value="NO">NO</option>
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    </Field.Root>
                    <Field.Root gridColumn={{ md: "span 2" }}>
                      <Field.Label>¿Cuál?</Field.Label>
                      <Input value={ampliacion.cualBeneficio} onChange={e => setAmpliacion({ ...ampliacion, cualBeneficio: e.target.value })} disabled={ampliacion.beneficioSocial === "NO"} />
                    </Field.Root>

                    <Field.Root>
                      <Field.Label>Asist. Previsional</Field.Label>
                      <NativeSelect.Root>
                        <NativeSelect.Field value={ampliacion.asistenciaPrevisional} onChange={e => setAmpliacion({ ...ampliacion, asistenciaPrevisional: e.target.value })}>
                          <option value="Municipal">Municipal</option>
                          <option value="Provincial">Provincial</option>
                          <option value="Nacional">Nacional</option>
                          <option value="No">No</option>
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Día de cobro</Field.Label>
                      <Input value={ampliacion.diaCobro} onChange={e => setAmpliacion({ ...ampliacion, diaCobro: e.target.value })} />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Medio de cobro</Field.Label>
                      <Input value={ampliacion.medioCobro} onChange={e => setAmpliacion({ ...ampliacion, medioCobro: e.target.value })} />
                    </Field.Root>

                    <Field.Root>
                      <Field.Label>Posee Tarjetas</Field.Label>
                      <NativeSelect.Root>
                        <NativeSelect.Field value={ampliacion.tarjetas} onChange={e => setAmpliacion({ ...ampliacion, tarjetas: e.target.value })}>
                          <option value="SI">SI</option>
                          <option value="NO">NO</option>
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Extensión a nombre de</Field.Label>
                      <Input placeholder="Nombre..." value={ampliacion.extensionANombreDe} onChange={e => setAmpliacion({ ...ampliacion, extensionANombreDe: e.target.value })} disabled={ampliacion.tarjetas === "NO"} />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Préstamos</Field.Label>
                      <Input value={ampliacion.prestamos} onChange={e => setAmpliacion({ ...ampliacion, prestamos: e.target.value })} />
                    </Field.Root>
                  </SimpleGrid>

                  <Box pt={4} borderTopWidth="1px" borderColor="gray.200">
                    <Field.Root>
                      <Field.Label fontSize="lg" fontWeight="700" mb={2}>Sugerencia:</Field.Label>
                      <Textarea
                        placeholder="Escriba la actualización de la sugerencia aquí..."
                        minH="200px"
                        fontSize="md"
                        lineHeight="tall"
                        p={4}
                        resize="none"
                        value={ampliacion.sugerencia}
                        onChange={e => setAmpliacion({ ...ampliacion, sugerencia: e.target.value })}
                      />
                    </Field.Root>
                  </Box>

                  <HStack justify="flex-end" gap={2} pt={4} borderTopWidth="1px" borderColor="gray.100">
                    <Button variant="outline" onClick={() => setOpenAmpliacion(false)}>Cancelar</Button>
                    <Button
                      bg="brand.600"
                      color="white"
                      _hover={{ bg: "brand.700" }}
                      onClick={handleGuardarAmpliacion}
                      loading={updateAmpliacionMutation.isPending || createAmpliacionMutation.isPending}
                    >
                      {ampliacion.id ? "Modificar Registro" : "Guardar Registro"}
                    </Button>
                  </HStack>
                </VStack>
              </Dialog.Body>
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text color="brand.700" fontWeight="700" textTransform="uppercase" letterSpacing="wide" fontSize="xs">
      {children}
    </Text>
  );
}
