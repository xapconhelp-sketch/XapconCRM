# Estado de activación — 16 de octubre de 2026

## Verificado en producción

- Proyecto Supabase: `xapconCRM`; proyecto Vercel: `xapcon-crm`.
- Dominio: `https://crm.xapcongroup.com`.
- SQL de auditoría aplicado: tablas privadas y RPC presentes; cero estimaciones compartidas con `profitMargin`.
- `case-files` privado; `documents` se conserva público por sus recursos de marca compartidos.
- Supabase Auth: Site URL corregida desde `http://localhost:3001` al dominio del CRM; redirección autorizada `https://crm.xapcongroup.com/**`.
- Inventario inicial: 144 expedientes; 61 objetos en `documents` y 2 comprobantes privados.
- Simulación de migración histórica: 10 expedientes y 46 referencias de archivos.
- Migración ejecutada: 46 archivos copiados y verificados, referencias actualizadas en 10 expedientes; originales conservados. Manifiesto de recuperación local excluido de Git.
- Comprobación HTTP de una copia: descarga firmada 200, acceso público sin firma 400 y solicitud de firma anónima rechazada.
- Comprobación con identidad contratista en PostgreSQL (transacción terminada con rollback): cero filas privadas y cero casos fuera de sus permisos; escritura directa de documentos, tareas y timeline denegada.
- SMTP personalizado ya habilitado; no se cambió su configuración ni se enviaron correos.
- Segunda simulación después de migrar: cero expedientes y cero referencias históricas pendientes.
- Preview de Vercel carecía de variables Supabase: se añadieron exclusivamente `VITE_SUPABASE_URL` y la clave pública `anon` como Config para Preview; las variables existentes de producción se conservaron. La clave administrativa no se subió a Vercel.
- El runtime remoto del clima reveló una importación sin extensión (`requestCache`), incompatible con Node ESM. Se corrigió a `requestCache.js` y se añadió una prueba que ejecuta JavaScript compilado con la resolución nativa de Node.
- Código publicado en `main`: `3c71a87`. [Despliegue de producción verificado](https://vercel.com/xapcon-groups-projects/xapcon-crm/FcP91rabeSG1TrnZarwHiKNYMRyU), estado Ready, asignado al dominio principal.
- Verificación HTTP en el dominio principal: acceso y ruta SPA correctos; clima sin dirección devuelve JSON 400, POST devuelve 405 y dirección pública válida devuelve clima 200; los archivos del servidor y su mapa no exponen código.
- Credencial administrativa temporal retirada del disco al terminar la migración. Manifiesto de recuperación conservado en `.audit-local/`, fuera de Git.
- Sesión real de superadmin verificada: dashboard, lista y detalle de expedientes, visualización de los documentos migrados, apertura de un PDF con enlace privado firmado y descarga autenticada correcta. No se modificaron registros durante esta comprobación.
- Actualización de documentación publicada como `b3522d8`, sin cambios adicionales de aplicación; [despliegue final Ready](https://vercel.com/xapcon-groups-projects/xapcon-crm/Cs1Y3JaM5uvp1Hn7DRngi7BKm6wB).
- Cuenta contratista real comprobada antes de la interrupción: dashboard limitado a su empresa, cinco reclamos visibles y documentos privados migrados presentes en un expediente propio; sin navegación administrativa. La descarga quedó interrumpida y no se da por verificada.
- Revisión del 18 de octubre: `main` conserva `b3522d8`; el dominio, la ruta SPA, las respuestas JSON 400/405 del clima, la consulta real 200 y la ausencia de código del servidor expuesto siguen correctos.
- Verificación interactiva completada el 18 de octubre con la cuenta contratista real: expediente de su empresa, descarga autenticada terminada y PDF abierto mediante enlace firmado de `case-files`. Sin errores ni advertencias en la consola. No se modificaron expedientes ni se eliminaron archivos.

## Alcance de las comprobaciones interactivas

- Superadmin y contratista: inicio de sesión real, dashboard, navegación por expedientes y apertura/descarga de documentos migrados comprobados.
- No se hicieron cargas o borrados de prueba sobre expedientes reales. Sus operaciones atómicas, validaciones y políticas están cubiertas por las pruebas automatizadas; esto no equivale a haber probado todas las acciones de producción.

## Validación local

TypeScript y compilación correctos. La suite completa pasó con 59 pruebas, ninguna fallida ni omitida, incluyendo la nueva prueba de Node ESM. Se permitió la conexión local que necesita la prueba HTTP del servidor; el primer intento aislado había sido bloqueado por el entorno (`EACCES`), no por una aserción de la aplicación.

## Pendiente de comprobación final

- Correo recibido y recuperación de contraseña con un destinatario de prueba autorizado.
- URLs aprobadas de términos y privacidad, si existen.
- Retirada irreversible de los originales públicos: requiere aprobación específica después de verificar las copias y coordinar el cierre de sesiones antiguas.

Las credenciales administrativas no se incluyeron en Git ni en el frontend.
