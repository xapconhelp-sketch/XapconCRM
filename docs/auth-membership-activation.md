# Activación de cuentas, empresas y colaboración

## Aplicar la actualización

En el SQL Editor del proyecto Supabase del CRM, ejecutar `schema_auth_membership_complete.sql` completo. Requiere las tablas base del CRM e incluye las dependencias de seguridad, invitaciones y notificaciones antes de la actualización de cuentas. El script usa una transacción: un fallo revierte la actualización completa. Es reutilizable y conserva empresas, casos, tareas y cuentas existentes.

Si `schema_auth_membership_tasks.sql` produjo `relation "public.user_invitations" does not exist`, faltaba una dependencia previa. Ejecutar el archivo completo indicado arriba; no crear manualmente una tabla incompleta. El script que falló usa una transacción y no llegó a confirmar sus cambios.

Si hay códigos duplicados o roles fuera de los valores admitidos, la actualización se detiene con un error; no elimina datos para resolverlo. Las cuentas antiguas con vínculos incompletos se reparan al iniciar sesión solo cuando se puede verificar su pertenencia. No se puede aplicar esta migración con la clave pública de la aplicación.

Después de ejecutar el script, presionar **Reintentar** en la pantalla de acceso o recargar el CRM. No volver a ejecutar los scripts antiguos después de este; si se ejecutan, aplicar este nuevamente al final.

En Supabase Auth, configurar la URL del sitio y las URL de redirección permitidas para el dominio de producción y el localhost usado (`http://127.0.0.1:5173`, si corresponde). Configurar el proveedor de correo y la confirmación de email. La política de contraseña de Supabase debe exigir al menos 8 caracteres; la aplicación también lo valida. Para registros públicos, habilitar las protecciones de registro y el límite de solicitudes que corresponda al proyecto.

## Comportamiento esperado

- Propietario: su registro crea una empresa, un código único protegido por un índice y la membresía de propietario dentro de la misma transacción. Un reintento no crea otra empresa.
- Colaborador por código: el servidor valida el código y vincula la cuenta a esa organización durante el registro. El rol enviado por el navegador no puede convertirlo en administrador. Debe confirmar su correo para acceder.
- Invitación por correo: solo el propietario de esa empresa o un superadministrador puede enviarla. Se reclama después de autenticar el correo; vence a los 14 días. Si falla el envío, la invitación pendiente se conserva para reintentar.
- Equipo Xapcon: desde **Personal & Crews**, el superadministrador puede invitar un **Colaborador Xapcon (acceso limitado)** o un **Superadministrador (acceso global)**. Las cuentas globales existentes mantienen sus permisos. El espacio interno no admite registro por código público.
- Acceso de colaboradores Xapcon: el superadministrador edita a la persona y marca **Empresas autorizadas**. El colaborador puede cambiar entre su espacio interno y las empresas asignadas; no puede administrar sus equipos o su identidad. Quitar una empresa revoca su acceso en la base de datos.
- Menciones y responsables: se identifican por el ID de usuario y sus membresías, aunque existan nombres idénticos. Los superadministradores pueden trabajar en cualquier caso; los demás requieren membresía en la empresa del caso.
- Tareas y agenda: guardan el responsable y generan la notificación juntos. Si no se puede crear la notificación, el guardado se revierte. El dashboard ofrece **Mis tareas** y **Toda la empresa**. Completar una tarea notifica al creador y al responsable cuando no son quien la completó.
- Notificaciones: las personales son privadas para el destinatario. Los avisos de empresa tienen una confirmación de lectura por usuario. Al pulsar un aviso, se abre el caso si aún es accesible.
- Actualización: el CRM usa Realtime cuando está disponible y consulta de respaldo cada 30 segundos; los permisos y empresas de la cuenta se actualizan cada 60 segundos.

## Verificación local automatizada

`npm test` ejecuta PostgreSQL local mediante PGlite. Prueba los scripts reales, los triggers y las políticas RLS; no modifica Supabase. También ejecutar `npm run lint` y `npm run build`.

La compilación completa puede requerir permitir que esbuild lea directorios padre fuera del aislamiento del agente. Este permiso no cambia la lógica de autenticación ni los permisos de Supabase.

## Verificación contra Supabase

Realizar estas pruebas con identidades de prueba en un proyecto de pruebas o con cuentas expresamente destinadas a verificación:

1. Registrar un propietario, confirmar su correo y comprobar que tiene una sola empresa y un código en **Personal & Crews**. Cerrar sesión e ingresar otra vez: debe conservar la misma empresa y código.
2. Registrar un colaborador con ese código, confirmar su correo y comprobar que comparte la organización. En la cuenta del propietario, debe aparecer en el directorio, las menciones y la asignación de actividades.
3. Crear una tarea asignada al colaborador. Debe aparecer en **Mis tareas** y en su campana. Otro colaborador de la empresa no debe ver esa notificación personal.
4. Etiquetarlo seleccionándolo del menú de menciones; comprobar aviso y navegación al caso. Completar su tarea: el propietario debe recibir el aviso.
5. Repetir con otra empresa: sus usuarios no deben aparecer en selectores ni acceder a casos o avisos de la primera, incluso consultando la API directamente.
6. Invitar por correo desde la cuenta del propietario. Abrir el enlace, crear la contraseña en **Configuración** e ingresar posteriormente con ella. Comprobar que el invitado queda integrado a esa empresa.
7. Desde superadmin, invitar un colaborador Xapcon limitado. Comprobar su espacio interno y que no puede ver empresas sin autorización. Autorizar una empresa desde su ficha, verificar menciones/tareas y revocar el acceso.
8. Probar recuperación de contraseña con un correo de prueba y comprobar que el enlace abre la pantalla para establecer una nueva contraseña.

Las pruebas locales no acreditan el envío y recepción reales de correos, las URL autorizadas, los límites del proveedor de Auth ni la aplicación del SQL en el proyecto remoto. Esas comprobaciones requieren el proyecto real y acceso a los buzones de prueba.
