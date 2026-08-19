# TODO - Sistema de Gestión de Adultos Mayores

## RF5: Gestión de Geriátricos (ABM)
- [x] Crear tabla de geriátricos en base de datos
- [x] Implementar CRUD completo de geriátricos (Alta, Baja, Modificación)
- [x] Agregar campo de estado de habilitación con fecha de vencimiento
- [x] Validar estado de habilitación al asignar adultos mayores
- [x] Bloquear asignación si habilitación está vencida
- [x] Interfaz de usuario para gestión de geriátricos

## RF6: Legajos Digitales de Adultos Mayores
- [x] Crear tabla de adultos mayores en base de datos
- [x] Implementar creación de legajos digitales
- [x] Implementar consulta y visualización de legajos
- [x] Agregar campos completos del legajo (datos personales, médicos, sociales)
- [x] Interfaz de usuario para gestión de legajos

## RF7: Historial de Seguimiento de Casos
- [x] Crear tabla de seguimientos en base de datos
- [x] Implementar registro de visitas
- [x] Implementar registro de reportes de vulnerabilidad
- [x] Asociar seguimientos con adultos mayores
- [x] Interfaz de usuario para visualizar historial completo
- [x] Interfaz de usuario para agregar nuevos seguimientos

## RF8: Alertas Visuales de Casos Críticos
- [x] Crear tabla de alertas en base de datos
- [x] Definir tipos de casos críticos (falta medicación, maltrato, habilitación vencida)
- [x] Implementar sistema de detección automática de alertas
- [x] Crear dashboard con alertas visuales destacadas
- [x] Implementar notificaciones en tiempo real
- [x] Marcar alertas como atendidas/resueltas

## RF9: Derivación a la Justicia
- [x] Crear tabla de derivaciones en base de datos
- [x] Implementar registro de derivación judicial
- [x] Asociar derivaciones con casos/adultos mayores
- [x] Agregar campos de seguimiento de derivación (fecha, juzgado, estado)
- [x] Interfaz de usuario para registrar derivaciones
- [x] Interfaz de usuario para consultar derivaciones

## Configuración y Diseño
- [x] Integrar logos institucionales (Santiago del Estero y Ministerio)
- [x] Configurar tema y colores institucionales
- [x] Implementar layout de dashboard con navegación
- [x] Configurar autenticación y roles de usuario

## Testing y Deployment
- [x] Escribir tests unitarios con vitest
- [x] Validar funcionalidades en navegador
- [x] Crear checkpoint para deployment


## Nueva Funcionalidad: Visitas y Reportes
- [x] Crear página de Visitas y Reportes con listado consolidado
- [x] Integrar listado de seguimientos en Dashboard
- [x] Integrar listado de seguimientos en Adultos Mayores
- [x] Integrar listado de seguimientos en Geriátricos
- [x] Integrar listado de seguimientos en Derivaciones
- [x] Agregar filtros por tipo de seguimiento, fecha y adulto mayor
- [x] Agregar opción para descargar reportes


## Mejoras: Listar y Actualizar en Módulos
- [x] Agregar funcionalidad de listar adultos mayores con tabla
- [x] Agregar funcionalidad de actualizar adultos mayores
- [x] Agregar funcionalidad de listar geriátricos con tabla
- [x] Agregar funcionalidad de actualizar geriátricos
- [x] Agregar funcionalidad de listar derivaciones con tabla
- [x] Agregar funcionalidad de actualizar derivaciones


## Mejoras: Listar y Actualizar en Seguimientos
- [x] Agregar funcionalidad de listar seguimientos con tabla
- [x] Agregar funcionalidad de actualizar seguimientos
- [x] Agregar vista de tarjetas para seguimientos
- [x] Agregar filtros por tipo, adulto mayor y fecha


## Bugs Reportados
- [x] BUG: La edad no se actualiza al modificar la fecha de nacimiento en Adultos Mayores

- [x] MEJORA: Mostrar edad calculada automáticamente en el formulario mientras se ingresa la fecha de nacimiento

- [x] MEJORA: Permitir ingresar fechas de nacimiento a partir del año 1925 en el formulario
