# Esquema de la Base de Datos - SIDES

Versión actualizada según lo que definimos juntas. Se generó una migración nueva y limpia (`drizzle/migrations/0000_shiny_thor_girl.sql`), probada contra un PostgreSQL real antes de entregarte esto: se aplicó sin errores y los 8 tests del proyecto pasaron.

Convenciones:
- **PK** = clave primaria (identifica cada fila de forma única)
- **FK** = clave foránea (referencia a otra tabla)
- **Obligatorio** = la base rechaza guardar la fila si ese campo viene vacío
- **Único** = no puede haber dos filas con el mismo valor en ese campo

---

## 1. `users` — Usuarios del sistema

El identificador de cada usuario es su **DNI** (columna `id`, tipo texto) — no hay un número autogenerado aparte.

| Campo | Tipo | Obligatorio | Único |
|---|---|---|---|
| id | texto (20) | **Sí — PK** | **Sí** | DNI del operador/a |
| nombre | texto (150) | **Sí** | - |
| apellido | texto (150) | **Sí** | - |
| email | texto (320) | No | - |
| passwordHash | texto (255) | No | - |
| loginMethod | texto (64) | No | - |
| role | `user` / `admin` / `superadmin` | Sí | - | por defecto `user` |
| createdAt / updatedAt / lastSignedIn | fecha y hora | Sí | - | automáticos |

---

## 2. `residencias` — Residencias de larga estadía

(Antes "geriátricos"; el nombre de tabla y de la interfaz ahora dicen "residencias".) El identificador sigue siendo un número autogenerado (`id`).

| Campo | Tipo | Obligatorio | Único |
|---|---|---|---|
| id | número | **Sí — PK (autogenerado)** | - |
| nombre | texto (255) | **Sí** | - | nombre de la institución (un solo campo) |
| direccion | texto largo | **Sí** | - |
| telefono, email, responsable | varios | No | - |
| nombreSolicitante, dniSolicitante | texto | No | - |
| nombreApoderado, dniApoderado | texto | No | - |
| capacidad | número | **Sí** | - |
| ocupacionActual | número | Sí | - | se calcula solo |
| estadoHabilitacion | `vigente` / `vencida` / `en_tramite` / `suspendida` | Sí | - |
| fechaHabilitacion, fechaVencimientoHabilitacion | fecha | No | - |
| observaciones | texto largo | No | - |
| reqNota...reqFotos (9 campos) | sí/no | No | - | checklist de documentación |
| activo | sí/no | Sí | - | baja lógica |
| createdAt / updatedAt | fecha y hora | Sí | - |

---

## 3. `adultosMayores` — Legajos de adultos mayores

Recortada a los campos que realmente existen hoy en el formulario de "Nueva Ficha Social" (sacamos Apoderado Legal, red de hijos, ubicación de vivienda, médico de cabecera, última consulta, estado general de salud y el vínculo con residencias — ninguno tenía un campo visible en el formulario). El identificador sigue siendo un número autogenerado (`id`); el DNI de la persona es un campo aparte, único, pero no es la clave primaria.

**Expediente y solicitante**

| Campo | Tipo | Obligatorio | Único |
|---|---|---|---|
| id | número | **Sí — PK (autogenerado)** | - |
| expediente | texto (50) | **Sí** | **Sí** | antes había dos campos duplicados (expediente/numeroLegajo); ahora es uno solo |
| trabajadorSocial | texto (150) | No | - | texto libre por ahora |
| fechaFicha | fecha | No | - |
| nombre, apellido | texto (255) | **Sí** | - |
| dni | texto (20) | **Sí** | **Sí** |
| fechaNacimiento | fecha | **Sí** | - |
| telefono, estadoCivil, domicilio, barrio, localidad | varios | No | - |

**Socioeconómico:** ocupacion, oficio, monto, beneficioSocial, cualBeneficio, asistenciaPrevisional, diaCobro, medioCobro, tarjetas, prestamos — todos opcionales.

**Red familiar:** redFamiliar (lista de familiares, guardada como texto/JSON) — opcional.

**Vivienda:** tenenciaVivienda, tipoVivienda, situacionHabitacionalPersonas, situacionHabitacionalHabitaciones, materialParedes, materialPisos, materialTechos, bano, cocina, servicioLuz, servicioAgua, servicioGas — todos opcionales.

**Salud y cierre:** obraSocial, numeroAfiliado, enfermedad, sugerencia — todos opcionales.

**Sistema:** activo (baja lógica), createdAt, updatedAt.

---

## 4. `seguimientos` — Visitas, reportes, controles

| Campo | Tipo | Obligatorio |
|---|---|---|
| id | número (PK, autogenerado) | - |
| adultoMayorId | número (FK → adultosMayores.id) | **Sí** |
| userId | texto (FK → users.id, o sea el DNI de quien lo carga) | **Sí** — se completa solo con tu sesión |
| tipoSeguimiento | `visita` / `reporte_vulnerabilidad` / `control_medico` / `entrevista_social` / `otro` | **Sí** |
| fecha | fecha y hora | Sí (automática) |
| descripcion | texto largo | **Sí** |
| observaciones | texto largo | No |
| responsable | texto (255) | **Sí** |
| createdAt / updatedAt | fecha y hora | Sí |

---

## 5. `alertas` — Casos críticos

| Campo | Tipo | Obligatorio |
|---|---|---|
| id | número (PK, autogenerado) | - |
| adultoMayorId | número (FK → adultosMayores.id) | **Sí** |
| userId | texto (FK → users.id) | **Sí** — nuevo, se completa solo con tu sesión |
| tipoAlerta | `falta_medicacion` / `salud_critica` / `abandono` / `abuso_economico` / `abuso_psicologico` / `abuso_fisico` / `otro` | **Sí** |
| prioridad | `baja` / `media` / `alta` / `critica` | Sí (default `media`) |
| titulo | texto (255) | **Sí** |
| descripcion | texto largo | **Sí** |
| estado | `pendiente` / `en_atencion` / `resuelta` | Sí (default `pendiente`) |
| fechaDeteccion | fecha y hora | Sí (automática) |
| fechaResolucion, responsableAtencion, observacionesResolucion | varios | No |
| createdAt / updatedAt | fecha y hora | Sí |

---

## 6. `derivaciones` — Derivaciones a la Justicia

| Campo | Tipo | Obligatorio |
|---|---|---|
| id | número (PK, autogenerado) | - |
| adultoMayorId | número (FK → adultosMayores.id) | **Sí** |
| userId | texto (FK → users.id) | **Sí** — se completa solo con tu sesión |
| fechaDerivacion | fecha y hora | Sí (automática) |
| motivo, juzgado | texto | **Sí** |
| numeroExpediente, fiscalia, documentacionAdjunta, observaciones | varios | No |
| estadoDerivacion | `iniciada` / `en_tramite` / `finalizada` / `archivada` | Sí (default `iniciada`) |
| responsable | texto (255) | **Sí** |
| createdAt / updatedAt | fecha y hora | Sí |

---

## 7. `ampliaciones` — Historial de ampliación de legajo

| Campo | Tipo | Obligatorio |
|---|---|---|
| id | número (PK, autogenerado) | - |
| adultoMayorId | número (FK → adultosMayores.id) | No |
| expediente, trabajadorSocial, fecha, ocupacion, oficio, cualPrograma, asistPrevisional, diaCobro, medioCobro, extensionANombreDe, prestamos, sugerencia | varios | No |
| benefProgramaSocial, poseeTarjetas | sí/no | No |

---

## Cómo se relacionan las tablas ahora

```
residencias                    (sin relación con adultosMayores)

adultosMayores ──< seguimientos
               ──< alertas
               ──< derivaciones
               ──< ampliaciones

users ──< seguimientos   (quién cargó el seguimiento)
users ──< alertas        (quién cargó la alerta)
users ──< derivaciones   (quién cargó la derivación)
```

Sacamos la relación entre `residencias` y `adultosMayores` (ya no existe `geriatricoId`). El campo "T. Social" de la ficha del adulto mayor sigue siendo texto libre por ahora — si más adelante querés que sea un desplegable real conectado a `users`, lo conversamos y lo armamos.

## Cambios importantes que corregimos de paso

- **Bug encontrado:** el formulario de "Nueva Ficha Social" cargaba muchísimos campos (vivienda, salud, socioeconómicos, red familiar) que **nunca se guardaban en la base** — el servidor solo persistía un puñado de campos. Ya está corregido: ahora todo lo que se completa en el formulario se guarda de verdad.
- `seguimientos`, `alertas` y `derivaciones` antes no registraban quién las cargó (el campo `userId` no se completaba nunca, a pesar de ser obligatorio). Ahora se completa automáticamente con el usuario de tu sesión.
