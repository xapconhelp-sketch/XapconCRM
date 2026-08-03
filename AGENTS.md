# Reglas de Proyecto Xapcon CRM

## 🎯 Distinción de Roles y Aplicaciones

1. **Aplicación de contratista** (`userRole !== "admin"`)
   - Todas las solicitudes referentes a "aplicación de contratista" deben implementarse y limitarse estrictamente a la vista y lógica para contratistas.
   - No mostrar márgenes de ganancia, costos internos, datos globales restringidos ni funciones administrativas en esta vista.

2. **Aplicación de superadmin** (`userRole === "admin"`)
   - Todas las solicitudes referentes a "aplicación de superadmin" deben implementarse únicamente en la sesión, vistas y funcionalidades de la cuenta de superadministrador.
   - Incluye visibilidad financiera completa, métricas avanzadas, gestión de usuarios/empresas y control total del sistema.
