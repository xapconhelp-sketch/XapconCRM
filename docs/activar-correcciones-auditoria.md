# Activación de las correcciones de auditoría

Estado de activación (16 de octubre de 2026): el SQL ya fue aplicado por el propietario y se verificó en el proyecto remoto. El bucket `case-files` es privado, existen los RPC de auditoría y ninguna estimación compartida conserva `profitMargin`. Se corrigió Supabase Auth para usar `https://crm.xapcongroup.com` como Site URL y permitir redirecciones dentro de ese dominio. La migración de archivos y la publicación del código se registran en [el estado de activación](estado-activacion-2026-10-16.md). Los pasos siguientes quedan como referencia; no es necesario repetir los ya verificados.

## Corregido en el repositorio

| Hallazgo | Resultado |
| --- | --- |
| Márgenes internos dentro del JSON compartido | `schema_crm_audit_fixes.sql` conserva los campos privados en `admin_estimate_private`, los retira de `leads.estimate` y protege nuevas escrituras con un trigger. Solo superadmin puede leer la tabla privada. Un contratista no puede sobrescribir esos campos privados. Requiere aplicar el SQL. |
| Archivos nuevos expuestos mediante URLs públicas | Se guardan en `case-files`, un bucket privado con acceso por caso/empresa. Los enlaces de apertura duran 60 segundos; las descargas usan sesión autenticada. Las fotos renuevan su autorización mientras están visibles en la pestaña. No se guardan enlaces firmados temporales en la base de datos. Requiere el SQL y desplegar el cliente. |
| Sobrescritura simultánea de documentos | RPC de anexado y borrado con bloqueo de fila e idempotencia; se revocan las actualizaciones directas de `documents`. El borrado ya no depende de una copia vieja del array en el navegador. |
| Archivos huérfanos | Cola persistente de limpieza tras errores de guardado, borrado de notas y eliminación de casos. El cliente reintenta en sesiones activas. Se incluye un trabajador administrativo opcional para ejecutar sin usuarios conectados. Los históricos se tratan por separado para conservar logos y avatares compartidos. |
| Datos pesados en consultas periódicas | Se excluyen adjuntos de la consulta general y se cargan al abrir un expediente. Las estimaciones se solicitan al entrar en la sección retail. Se conserva la caché de adjuntos cuando se refresca la lista y se evitan respuestas anteriores a un guardado local. |
| Clima en Vercel | Se incluye `api/contractor-weather.ts`; el enrutamiento respeta archivos/funciones antes del fallback de la SPA. La salida pública es `dist/client`, separada del servidor y sus mapas. |
| Caché del clima sin límite | Máximo 200 entradas y 16 solicitudes distintas en curso por proceso; caducidad, eliminación de entradas vencidas, deduplicación y respuesta 429 al alcanzar la capacidad. |
| Descargas externas de fuentes del PDF | Inter y Plus Jakarta Sans se incluyen como recursos locales de la sección retail. |
| Recursos pesados | Derivados WebP: logo de 750.758 a 126.638 bytes; foto de 1.302.346 a 379.758 bytes. Se mantienen los originales y las proporciones. |
| Etiquetas y enlaces de acceso | Campos asociados a sus etiquetas y autocompletado; apertura de documentos accesible por teclado. Se retiran los enlaces `#` y la afirmación de aceptación de documentos inexistentes. Los enlaces legales se muestran solo con URLs HTTPS configuradas. |

## Lo que debes hacer manualmente

### 1. Aplicar la migración en Supabase

Primero utiliza un entorno de prueba o una copia de seguridad recuperable. En producción, coordina una ventana de mantenimiento: la migración retira permisos de escritura directa y las pestañas con el cliente anterior deben cerrarse.

En **Supabase → SQL Editor**, ejecuta el archivo completo `schema_crm_audit_fixes.sql` sobre el proyecto correspondiente al CRM.

Prerrequisitos: las tablas base del CRM y las migraciones `schema_auth_membership_complete.sql` y `schema_task_workflow.sql` ya deben estar aplicadas. No vuelvas a ejecutar la migración de autenticación sin necesidad: si debes hacerlo, aplica **la migración de auditoría de nuevo al final**, porque la anterior vuelve a conceder permisos de columnas.

El archivo de auditoría es transaccional y se puede reaplicar. Archiva los datos financieros antes de retirarlos del JSON compartido. Si detecta una estimación con formato inválido, aborta con un error sin completar cambios: revisa ese registro antes de repetir. No convierte el bucket histórico `documents` en privado ni elimina sus archivos.

Verificación básica desde SQL Editor:

```sql
-- Debe devolver 0 tras aplicar la migración.
select count(*) as estimaciones_compartidas_con_margen
from public.leads where estimate::jsonb ? 'profitMargin';

-- Debe devolver false.
select public from storage.buckets where id = 'case-files';
```

Para comprobar la visibilidad con una cuenta contratista real, sustituye el UUID y ejecuta este bloque; termina con rollback:

```sql
begin;
select set_config('request.jwt.claim.sub', 'UUID_DEL_CONTRATISTA', true);
set local role authenticated;
select count(*) as filas_privadas_visibles from public.admin_estimate_private;
-- Esperado: 0.
rollback;
```

### 2. Migrar los documentos y fotos históricos

El bucket `documents` puede mezclar archivos de casos con logos y avatares. Cambiarlo entero a privado o borrarlo rompería recursos de marca. Preparé una herramienta que copia los archivos del expediente al bucket privado, verifica los bytes y cambia las referencias con control de concurrencia.

En PowerShell 7, desde la carpeta del CRM:

```powershell
$env:SUPABASE_URL = "https://TU-PROYECTO.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = Read-Host "Clave service_role de este proyecto" -MaskInput

# Simulación: inventaría sin copiar, cambiar registros ni eliminar archivos.
npm run migrate-legacy-files

# Copia, verifica y actualiza las referencias de los casos.
# Conserva los originales en documents.
npm run migrate-legacy-files -- --apply
```

Usa la clave administrativa solo en el terminal o en un job privado; no la pongas en una variable `VITE_`, no la guardes en Git ni la envíes por el chat. El comando muestra cantidades, no claves ni contenido de expedientes.

La herramienta guarda un manifiesto y copias de las referencias anteriores en `.audit-local/legacy-files-manifest.json`, excluido de Git. Conserva ese archivo durante la activación. Si un caso cambia mientras se copia, se rechaza su actualización: vuelve a ejecutar el comando. Los archivos originales y las copias verificadas se mantienen.

Después de desplegar el nuevo cliente y comprobar apertura/descarga con ambas cuentas, todavía con escrituras pausadas y las sesiones antiguas cerradas:

```powershell
npm run migrate-legacy-files -- --apply --retire-legacy-sources --maintenance-confirmed
```

Este paso **elimina originales públicos ya migrados**. Revisa el manifiesto y mantén un respaldo antes de ejecutarlo. La herramienta vuelve a inventariar casos, empresas y perfiles y conserva los originales aún referenciados por logos, avatares u otros campos. Las referencias externas fuera de este proyecto no se migran ni se borran. Si hay consumidores fuera del CRM que usan esas URLs, revísalos también antes de retirar los originales.

Este paso es necesario para cerrar la exposición de los históricos que estuvieran en un bucket público: copiar al bucket privado por sí solo no invalida el enlace público anterior. Los archivos nunca referenciados por un caso no forman parte de esta migración; cualquier limpieza de esos archivos requiere un inventario independiente.

Al terminar los comandos administrativos:

```powershell
Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY
Remove-Item Env:SUPABASE_URL
```

### 3. Desplegar el cliente y el servidor nuevos

Despliega el código junto con `package-lock.json`, los recursos de `src/assets/optimized` y las variables públicas correctas del proyecto. Aplica el SQL antes de habilitar el nuevo cliente: los RPC de documentos no tienen un fallback de escritura inseguro. No habilites tráfico de escritura del cliente antiguo durante el cambio.

Servidor Node:

```text
npm ci
npm run build
npm start
```

Sirve `dist/client` mediante el servidor de `dist/server.cjs`; el código del servidor debe permanecer fuera de la carpeta pública. `npm start` ya lo configura así.

En Vercel, usa el proyecto Vite con `vercel.json`: comando de build `npm run build`, salida `dist/client` y función `api/contractor-weather.ts`. Revisa que ninguna configuración externa del proyecto publique toda la carpeta `dist` ni retire las funciones. La configuración se preparó conforme a la [documentación de funciones Node de Vercel](https://vercel.com/docs/functions/runtimes/node-js) y su [configuración de rutas](https://vercel.com/docs/project-configuration/vercel-json); falta probar el despliegue real.

Después del despliegue, comprueba:

- `/server.cjs` y `/server.cjs.map` no devuelven código del servidor.
- `/api/contractor-weather` sin dirección devuelve JSON con estado 400, y con dirección válida devuelve clima o un error JSON controlado, nunca `index.html`.
- Una recarga de una ruta de contratista o superadmin vuelve a la pantalla correspondiente.
- Las variables de Supabase del frontend se configuraron **antes** de compilar; la clave administrativa no está en el frontend.

### 4. Configurar documentación legal y comprobar las cuentas

Publica las URLs reales y aprobadas de licencia y privacidad y configura `VITE_TERMS_URL` y `VITE_PRIVACY_URL` en el entorno de compilación. Mientras no existan, el acceso muestra únicamente que está reservado a usuarios autorizados.

En Supabase Auth, verifica Site URL, Redirect URLs y entrega de correo para el dominio desplegado. Estas son configuraciones del servicio y no se modificaron desde el repositorio.

Prueba con cuentas reales, en sesiones separadas:

- Contratista: solo su empresa, sin campos financieros internos; subida, apertura, descarga y borrado de documentos; fotos de notas; tareas e invitaciones según sus permisos.
- Superadmin: acceso administrativo, información privada y gestión de empresas.
- Con dos usuarios de la misma empresa: adjuntar documentos simultáneamente conserva ambas cargas.
- Sin sesión: el endpoint público de un objeto de `case-files` no permite descargarlo. Un enlace firmado sí permite acceso durante sus 60 segundos de vigencia; eso es intencional.
- Con otra empresa: el archivo privado del primer caso no se puede listar, firmar ni descargar.

### Opcional: limpieza sin usuarios conectados

El CRM reintenta la cola de archivos privados cada minuto mientras hay una sesión visible. Si quieres que la limpieza también se ejecute sin usuarios, configura un job privado con las variables administrativas anteriores y el comando `npm run cleanup-case-files`. Procesa hasta 100 entradas por ejecución, comprueba referencias y confirma en la base de datos que el objeto dejó de existir antes de retirar su trabajo de la cola. No procesa archivos históricos mezclados con recursos de marca.

## Límites que siguen requiriendo medición o desarrollo

La aplicación aún carga las listas completas y utiliza tareas/timeline para calcular los indicadores actuales. Se redujo la carga de adjuntos y estimaciones, pero una solución para grandes volúmenes requiere agregados del dashboard, paginación visible/búsqueda de servidor y medición de planes de consulta con datos representativos. Eso es trabajo de programación y validación, **no una corrección manual que debas hacer tú**. No se añadieron índices sobre tablas de negocio sin medirlos.

La división completa de los componentes grandes y la consolidación de CSS se mantienen como refactorizaciones futuras, sin cambiar el diseño ni las reglas de los roles. Tampoco se ha certificado toda la accesibilidad o todo el comportamiento financiero de producción.

## Pruebas locales

Validación final: **58 pruebas aprobadas, ninguna fallida u omitida**, `npm run lint` y `npm run build` correctos. La auditoría de npm después de instalar las dependencias adicionales reportó cero vulnerabilidades.

Se verificaron TypeScript, compilación y pruebas de PostgreSQL local/RLS: preservación de márgenes, aislamiento entre empresas y frente a anónimos, políticas antiguas demasiado amplias, escrituras atómicas, rechazo de accesos cruzados, migración idempotente, protección contra cambios simultáneos y limpieza después de eliminar el caso completo. También hay pruebas del cliente de archivos, del plan de migración histórica, de la caché y función de clima, del importador Excel y del servidor de producción.

Se inspeccionó el acceso de producción local a 1280 × 720 y 390 × 844 y el registro de contratistas/colaboradores en móvil: imágenes WebP cargadas, etiquetas asociadas a sus controles, ningún enlace `#` en el acceso y sin desbordamiento horizontal en las pantallas revisadas. No se enviaron formularios ni se crearon cuentas. Se restauró el tamaño del navegador y se cerró la pestaña temporal.

La integración remota de Supabase Storage, la ejecución completa de la herramienta contra tus archivos y las funciones desplegadas en Vercel siguen pendientes de los pasos anteriores. La prueba local no sustituye esas verificaciones.
