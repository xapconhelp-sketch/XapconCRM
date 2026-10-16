# Auditoría técnica de Xapcon CRM — 16 de octubre de 2026

Estado de la primera revisión: correcciones locales verificadas; validación de producción y recorridos autenticados pendiente. **Actualización posterior:** se implementaron correcciones adicionales y se preparó una migración. Consulta [la guía vigente de activación y tareas manuales](activar-correcciones-auditoria.md).

Se revisaron el arranque, compilación, dependencias, carga de datos, sincronización, notificaciones, roles, estimaciones, documentos, finanzas, importación de catálogo y configuración de despliegue. Se preservaron los cambios que ya existían en autenticación, membresías, tareas, documentación y pruebas. No se aplicaron migraciones ni se modificaron cuentas o registros en Supabase.

## Resultados medidos

| Comprobación | Antes | Después |
| --- | --- | --- |
| Pruebas automatizadas | 25 aprobadas | 33 aprobadas, 0 fallidas |
| TypeScript | Aprobaba sin los tipos oficiales de React | Aprueba con `@types/react` y `@types/react-dom` |
| Auditoría de dependencias npm | 1 vulnerabilidad crítica y 2 altas | 0 vulnerabilidades reportadas |
| Mayor archivo JavaScript de navegador | 617,27 kB | 214,06 kB |
| Archivo JavaScript de entrada | 617,27 kB | 152,25 kB |
| Importación de Excel | 92 materiales | Los mismos 92 objetos, con igualdad completa de campos |
| Compilación de producción | Advertencia por archivo mayor de 500 kB | Compila sin esa advertencia |

La separación en archivos no equivale a una reducción del mismo porcentaje en la descarga total: React, Supabase y UI siguen siendo necesarios. Mejora su reutilización en caché y permite diferir las pantallas de acceso. No se midieron tiempos reales de navegación con cuentas y datos de producción, ni Core Web Vitals; no se afirma una mejora porcentual de velocidad.

## Hallazgos corregidos

| Prioridad | Hallazgo y reproducción | Corrección |
| --- | --- | --- |
| P1 | Express servía toda la carpeta `dist`, incluido `/server.cjs` y `/server.cjs.map`. | Aplicación de producción separada: publica únicamente `/assets` e `index.html`; devuelve 404 para código del servidor, mapas, archivos ocultos y API desconocida. Prueba HTTP real. |
| P1 | Dependencias `proxy-addr`, `source-map-js` y `xlsx` vulnerables según npm. | Actualizaciones compatibles de las dos primeras; reemplazo de `xlsx` por `read-excel-file`. Auditoría final sin alertas. |
| P1 | Consultas sin paginación podían omitir registros al alcanzar el límite de respuesta de Supabase. | Lectura por páginas con orden estable en casos, equipo, directorio, historiales administrativos, analítica y pagos. Un fallo de página no se interpreta como lista completa. Prueba con 1.253 registros. |
| P2 | Intervalos, foco y realtime podían iniciar varias cargas simultáneas del mismo recurso. | Coordinación de consultas: máximo una carga activa y una repetición pendiente; pausa en pestañas ocultas y actualización al volver a verlas. Aplicado a casos, equipo, directorio, membresías y notificaciones. |
| P2 | Abrir/cerrar notificaciones vaciaba su estado y recreaba su canal realtime; además consultaba cada cinco segundos con el panel abierto. | Suscripción estable por usuario/empresa, actualización al abrir, realtime y respaldo cada 30 segundos. |
| P2 | Tres consultas administrativas independientes se ejecutaban en serie. | Ejecución simultánea, manteniendo el acceso exclusivo de superadmin y el filtro de empresa. Se evita enviar listas enormes de UUID en la URL. |
| P2 | `npm start` podía iniciar Vite si `NODE_ENV` no estaba definido. | Lanzador que establece producción explícitamente y admite `PORT`. Se elimina el fallback de HTML redundante de Vite y la lectura síncrona asociada. |
| P2 | Recursos sin política de caché prolongada y sin compresión en Express. | Caché inmutable de un año para archivos versionados, HTML con revalidación y compresión HTTP. Prueba de cabecera gzip. |
| P2 | El guardado de documentos actualizaba la pantalla antes de confirmar la base de datos; el borrado eliminaba el archivo antes de confirmar la actualización del caso e ignoraba errores de esta. | El estado se actualiza tras la confirmación de la base de datos. El borrado del archivo ocurre después de retirar su referencia; se informa de fallos de limpieza de Storage. |
| P2 | Las respuestas de finanzas podían pertenecer al caso anterior tras cambiar de selección. | Remontaje del panel al cambiar caso/empresa para aislar su estado y las respuestas anteriores. |
| P2 | Prospectos activos y tasa de cierre del equipo se inventaban con `Math.random()`. | Se retiran esos valores. La vista muestra «Sin datos» hasta disponer de métricas reales. |
| P2 | Las fuentes principales requerían CSS y archivos externos de Google. | DM Sans y Manrope se sirven desde los recursos versionados del propio CRM, con `font-display: swap`. |
| P3 | Lecturas/escrituras de la selección del caso podían romper la aplicación si el navegador bloqueaba el almacenamiento. | Manejo de almacenamiento no disponible. |
| P3 | La interfaz en español declaraba `lang="en"`. | Se declara `lang="es"`. |
| P3 | La interfaz de autenticación tipaba el cambio de organización como asignación directa aunque se utilizaban actualizaciones funcionales. | Se corrige a `React.Dispatch<React.SetStateAction<Organization | null>>`; validado con los tipos oficiales de React. |
| P3 | Limpieza de compilación dependiente de `rm -rf`, incompatible con PowerShell. | Script Node con destinos explícitos. |

## Código eliminado

Se comprobó el árbol de importaciones desde `src/main.tsx` y se buscaron referencias en el proyecto antes de retirar:

- `src/components/ui/badge.tsx` y `src/components/ui/tabs.tsx`: componentes sin consumidores.
- `check_estimates.ts`: diagnóstico aislado con credenciales incrustadas; no formaba parte de los comandos del proyecto.
- `src/check_tasks.ts`: diagnóstico aislado sin referencias.
- `dump_server.cjs`: receptor de volcados con CORS abierto y sin autenticación, ajeno al servidor del CRM.

También se eliminaron imports de React sin uso, el envoltorio asíncrono innecesario al mapear casos y el fallback de desarrollo redundante. Se preservaron los archivos de datos, hojas de cálculo y recursos gráficos; no se trataron como código descartable.

## Pendientes identificados en la primera revisión

Esta lista conserva el diagnóstico inicial. El estado actualizado de cada corrección y sus requisitos de producción están en [la guía de activación](activar-correcciones-auditoria.md):

1. **P1 — Datos financieros internos dentro de la estimación.** `src/App.tsx` solicita la fila completa de `leads`, incluida `estimate`; `EstimatorView.tsx` guarda `profitMargin` dentro de ese JSON. La tarjeta visual está restringida a `userRole === "admin"`, pero ocultarla no impide que el JSON llegue al navegador del contratista si las políticas desplegadas permiten leer toda la fila. Hace falta verificar la respuesta real por rol y separar los campos internos en una tabla o API privada con permisos de base de datos. No se asumió que eliminar el campo de la interfaz corrigiera la autorización.
2. **P1 — Privacidad de documentos en Storage.** El código genera URLs mediante `getPublicUrl` para documentos e imágenes del caso. Si el bucket `documents` está configurado como público, conocer el enlace puede permitir acceder sin sesión. Deben comprobarse el bucket y sus políticas reales y preparar URLs firmadas para contenido privado, manteniendo públicos únicamente los recursos de marca que corresponda. No se cambió la privacidad del bucket porque no se dispone de su configuración y podría romper enlaces existentes.
3. **P2 — Escalabilidad de los casos.** Se corrigió la truncación, pero las pantallas y los indicadores todavía dependen de cargar listas completas con documentos, tareas y timeline. Para grandes volúmenes conviene búsqueda/paginación de pantalla en el servidor, agregados del dashboard y carga del detalle al abrir el caso. Medir primero tiempos de consulta y tamaños con datos representativos; no añadir índices a ciegas. La paginación de transporte añadida mantiene el comportamiento actual, pero no resuelve por sí sola el crecimiento indefinido de datos.
4. **P2 — Escrituras concurrentes en documentos.** La confirmación de errores ahora es correcta, pero dos usuarios aún pueden sobrescribir el array JSON de documentos si guardan desde copias distintas. Requiere una operación atómica/RPC o tabla normalizada. Un archivo subido puede quedar huérfano si falla después el guardado de su referencia; debe existir una limpieza verificable. La eliminación del registro y la limpieza de Storage tampoco constituyen una transacción única.
5. **P2 — Vercel y clima.** `vercel.json` reescribe las rutas a `index.html`; el endpoint de clima se implementa en Express/Vite y no existe una función serverless equivalente en este repositorio. Si el despliegue real es Vercel estático, hay que verificar y adaptar ese endpoint. La ruta está probada únicamente en el servidor Node local.
6. **P2 — Caché del clima.** El servidor mantiene un `Map` por dirección sin límite de tamaño ni eliminación periódica de entradas caducadas. Es necesario acotarlo y deduplicar solicitudes en curso antes de exponer el endpoint a alto tráfico.
7. **P2 — Configuración real y cobertura privada.** Falta comprobar migraciones efectivamente aplicadas, RLS y permisos de Storage del proyecto remoto, índices/planes de ejecución, suscripciones realtime habilitadas, invitaciones por correo, recuperación de contraseña, recibos, edición simultánea y navegación con cuentas de cada rol. Las pruebas PostgreSQL locales existentes cubren autenticación, membresías, tareas y notificaciones; no certifican todos los módulos financieros ni el servicio remoto.
8. **P3 — Recursos pesados y CSS.** La imagen de acceso pesa aproximadamente 1,30 MB y un logo 751 kB. Hay tres hojas globales y componentes de hasta 128 kB de fuente. Conviene optimizar los recursos con comparación visual y modularizar por responsabilidad. Los estilos de impresión del estimador todavía solicitan sus fuentes externas específicas; las fuentes principales del CRM ya son locales.
9. **P3 — Enlaces legales y accesibilidad.** En el acceso, los enlaces de licencia y privacidad apuntan a `#`; faltan documentos reales. Algunas etiquetas de formulario carecen de asociación explícita con sus inputs. Hace falta revisar teclado y lector de pantalla de los recorridos completos.

## Evidencia de validación

- `npm run lint`: aprobado después de instalar los tipos oficiales de React.
- `npm run build`: aprobado; mayor chunk de navegador 214,06 kB. Se conservan mapas del servidor para diagnóstico, pero Express no los publica.
- `npm test`: 33/33 pruebas aprobadas, ninguna omitida. Incluye PostgreSQL local/PGlite, seis pruebas de paginación y coordinación de refrescos, una prueba de regresión de Excel y una prueba HTTP de producción con múltiples rutas, caché, compresión y archivos privados.
- `npm audit --json`: cero alertas reportadas al finalizar. Esto no constituye garantía de ausencia de vulnerabilidades desconocidas.
- El reemplazo del importador produjo exactamente el mismo catálogo de 92 materiales sin sobrescribir el archivo de referencia durante la prueba.
- Navegador real, compilación de producción local, `http://localhost:3001/?audit=20261016`: pantalla de acceso observada a 844 × 884 y 390 × 844; cambio entre equipo Xapcon y contratistas; apertura de registro de dueño y colaborador. En móvil se inspeccionaron capturas del acceso y del registro de colaborador; ambos sin desbordamiento horizontal y con imágenes cargadas. Se comprobó la familia principal local y el estado de fuentes cargadas. Se restauró el tamaño del navegador.
- No se enviaron formularios, correos o registros de prueba al backend real. No había una sesión autenticada utilizable en el navegador conectado. La revisión visual privada queda **parcial**.
- Los tests HTTP requieren permiso de conexión local en este entorno de ejecución; se ejecutaron con ese acceso. La ejecución aislada falló inicialmente por `EACCES`, no por un error de producto.

## Despliegue y reversibilidad

En la primera revisión no se publicaron cambios ni se añadió una migración. La corrección posterior sí requiere aplicar `schema_crm_audit_fixes.sql`, migrar los históricos y desplegar el cliente siguiendo [la guía de activación](activar-correcciones-auditoria.md). La salida pública ahora es `dist/client`, separada de `dist/server.cjs`. Las migraciones que ya estaban pendientes antes de la revisión conservan su estado original.

Antes de considerar cerrada la auditoría de producción deben verificarse los dos riesgos P1, ejecutar los recorridos autenticados con cuentas de superadmin/contratista y medir consultas y navegación con datos reales.
