# Estado de activación — 16 de octubre de 2026

## Verificado en producción

- Proyecto Supabase: `xapconCRM`; proyecto Vercel: `xapcon-crm`.
- Dominio: `https://crm.xapcongroup.com`.
- SQL de auditoría aplicado: tablas privadas y RPC presentes; cero estimaciones compartidas con `profitMargin`.
- `case-files` privado; `documents` se conserva público por sus recursos de marca compartidos.
- Supabase Auth: Site URL corregida desde `http://localhost:3001` al dominio del CRM; redirección autorizada `https://crm.xapcongroup.com/**`.
- Inventario inicial: 144 expedientes; 61 objetos en `documents` y 2 comprobantes privados.
- Simulación de migración histórica: 10 expedientes y 46 referencias de archivos.

## En curso

- Copia verificada de archivos históricos a `case-files`, conservando los originales.
- Publicación y verificación del nuevo código.

## Validación local

TypeScript y compilación correctos. Las 58 pruebas pasaron al permitir la conexión local que necesita la prueba HTTP del servidor (57 en la suite y la prueba HTTP repetida por separado). El primer intento de esa prueba fue bloqueado por el aislamiento de red (`EACCES`), no por una aserción de la aplicación.

## Pendiente de comprobación final

- Apertura y descarga con cuentas reales de ambos roles.
- Correo recibido y recuperación de contraseña con un destinatario de prueba autorizado.
- URLs aprobadas de términos y privacidad, si existen.
- Retirada irreversible de los originales públicos: requiere aprobación específica después de verificar las copias y coordinar el cierre de sesiones antiguas.

Las credenciales administrativas temporales se mantienen fuera de Git y del frontend y se retiran al terminar la ejecución.
