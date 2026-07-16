# Call Center Metrics

[English](./README.md)

Call Center Metrics es una aplicación Angular de una sola página para registrar la actividad diaria de un call center sin construir ni mantener un backend propio. Usa Supabase para autenticación y persistencia en base de datos, para que un equipo operativo pueda cargar métricas diarias, revisar la conversión acumulada del mes y entender cómo evolucionan las visitas técnicas y las transferencias respecto de las llamadas atendidas.

## El Problema Que Resuelve

Los equipos de call center suelen registrar la operación diaria en planillas o mensajes: cuántas llamadas se atendieron, cuántas visitas técnicas se enviaron y cuántas de esas visitas fueron reagendas o instalaciones. Ese enfoque trae varios problemas:

- Los registros diarios son fáciles de duplicar o perder.
- Los porcentajes acumulados del mes requieren recálculo manual.
- Es difícil comparar cómo cambia la conversión día a día dentro de un mes calendario completo.
- El contexto operativo se mezcla con datos crudos, haciendo más lentas las correcciones y el seguimiento.

Este proyecto convierte ese flujo en una app enfocada:

- Los operadores inician sesión de forma segura.
- Un formulario diario captura los cuatro datos operativos requeridos.
- Supabase guarda los datos por usuario autenticado.
- La vista de resumen calcula la conversión acumulada del mes calendario seleccionado.
- El gráfico permite ver cambios de tendencia de inmediato, incluyendo filtros que quitan reagendas, instalaciones o ambos del numerador.
- Una vista separada de transferencias permite medir el total y filtrarlo por Comercial, Retención u Otras.

## Flujo Principal

1. Los usuarios inician sesión o se registran mediante Supabase Auth.
2. Después de autenticarse, ingresan al dashboard.
3. El menú "Carga diaria" permite guardar las métricas del día:
   - Total de llamadas atendidas.
   - Total de visitas técnicas, incluyendo reagendas e instalaciones.
   - Visitas técnicas que son solo reagendas.
   - Visitas técnicas que son solo instalaciones.
4. La app evita que desde el formulario se cree un segundo registro para el día actual cuando ya existe uno.
5. Si se cargó mal un valor, el usuario puede editar ese día desde la tabla del resumen mensual.
6. El menú "Resumen" muestra un gráfico y una tabla del mes completo seleccionado.
7. El menú "Transferencias" usa los registros llamada a llamada para mostrar la tasa acumulada y filtrarla por sector de destino.

## Cálculo De Conversión

El gráfico de resumen usa un cálculo acumulado mes a la fecha.

Ejemplo:

- Día 1: 20 llamadas, 5 visitas técnicas = 25%.
- Día 2: 30 llamadas, 0 visitas técnicas.
- Resultado acumulado después del Día 2: 50 llamadas, 5 visitas técnicas = 10%.

El gráfico siempre abarca el mes calendario completo seleccionado, por ejemplo del 1 de julio al 31 de julio. No muestra rangos móviles como del 15 de mayo al 15 de junio.

Filtros disponibles para el gráfico:

- Total de visitas.
- Total de visitas menos reagendas.
- Total de visitas menos instalaciones.
- Total de visitas menos reagendas e instalaciones.

El gráfico también incluye una experiencia interactiva: al mover el mouse sobre el gráfico, se selecciona el día más cercano, aparece una línea vertical de guía y se muestra la fecha y el porcentaje exactos.

El gráfico de transferencias sigue el mismo modelo acumulado de mes completo: cantidad de llamadas transferidas dividida por todas las llamadas atendidas registradas hasta ese día del mes seleccionado. Cada llamada puede aportar como máximo una transferencia y la vista permite mostrar todas o solo las destinadas a Comercial, Retención u Otras.

## Funcionalidades

- Autenticación con email y contraseña mediante Supabase.
- Ruta de dashboard protegida.
- Formulario de métricas diarias con campos requeridos.
- Validación para que reagendas más instalaciones no superen el total de visitas técnicas.
- Prevención de duplicados diarios en la interfaz.
- Flujo de edición desde la tabla de resumen.
- Gráfico de conversión acumulada del mes completo.
- Controles de filtro para distintas definiciones del numerador.
- Tooltip interactivo en el gráfico con día, fecha y porcentaje exactos.
- Tabla mensual con llamadas acumuladas, visitas consideradas y conversión.
- Gráfico acumulado de transferencias separado, con filtros por sector de destino.
- Soporte para redirects de SPA en Netlify mediante `public/_redirects`.
- Ícono del navegador en `public/favicon.ico`.

## Stack Técnico

- Angular 21.
- Angular Router.
- Angular Reactive Forms.
- Cliente JavaScript de Supabase.
- Supabase Auth.
- Supabase Postgres.
- Import de Tailwind CSS más CSS personalizado.
- Vitest mediante el builder de unit tests de Angular.

## Estructura Del Proyecto

```text
src/app/core/services/auth/       Wrapper de autenticación con Supabase
src/app/core/services/metrics/    Operaciones de base de datos para métricas y llamadas
src/app/core/services/supabase/   Creación del cliente de Supabase
src/app/features/auth/            Pantalla de login y registro
src/app/features/dashboard/       Formulario, gráficos de visitas y transferencias, tablas y edición
src/app/models/metrics.ts         Interfaces de métricas diarias y registros de llamadas
src/environments/environment.ts   Configuración del proyecto Supabase
public/_redirects                 Regla de redirect de Netlify para rutas Angular
public/favicon.ico                Ícono de la pestaña del navegador
```

## Rutas

- `/auth`: pantalla de login y registro.
- `/dashboard`: dashboard protegido.
- `/privacy`: política de privacidad bilingüe y pública.
- `/`: redirige a `/dashboard`; los usuarios no autenticados son enviados a `/auth`.
- Cualquier ruta desconocida redirige a `/auth`.

## Backend Y Protección De Datos

La aplicación está conectada con Supabase para autenticación y persistencia. Supabase reemplaza un backend propio en este proyecto: la app Angular autentica usuarios, lee y escribe métricas diarias, y depende de reglas de acceso en la base de datos para proteger los datos operativos.

La base de datos guarda métricas diarias y registros individuales de llamadas para usuarios autenticados. Los registros de llamadas admiten cantidades de visitas técnicas y como máximo una transferencia clasificada por destino por llamada. Los detalles sensibles de implementación, como la definición completa de la tabla, constraints y policies de Row Level Security, se mantienen intencionalmente fuera de esta documentación pública. Deberían vivir en la configuración del proyecto Supabase o en notas internas de despliegue.

A nivel producto, la capa de datos debe garantizar:

- Los usuarios solo pueden acceder a los registros operativos que tengan permitido ver.
- Un usuario no puede crear registros duplicados para la misma fecha de trabajo.
- Los valores de desglose de visitas no pueden superar el total de visitas técnicas.
- La autenticación y autorización se aplican desde Supabase, no solo desde validaciones de interfaz.

## Deploy

Este proyecto está listo para hosting de SPA estilo Netlify. El archivo `public/_redirects` contiene:

```text
/* /index.html 200
```

Esa regla asegura que al entrar directamente a rutas como `/dashboard` se sirva `index.html`, permitiendo que Angular Router maneje la ruta en el navegador.

Con el output actual de Angular, el directorio deployable es:

```text
dist/call-center-metrics/browser
```

## Privacidad Y Seguridad

Call Center Metrics está diseñado para uso operativo autenticado. El dashboard no está disponible para visitantes anónimos, y los registros diarios quedan asociados a usuarios logueados mediante Supabase Auth.

Desde la mirada del lector, las garantías importantes son:

- El acceso comienza con autenticación por email y contraseña.
- La ruta del dashboard revisa que exista una sesión activa antes de mostrar datos operativos.
- Los registros diarios se validan antes de guardarse.
- La app evita cargas duplicadas accidentales para el mismo día.
- Las sesiones pueden persistir entre recargas del navegador, y los usuarios pueden cerrarlas explícitamente con "Cerrar sesión".

Las métricas operativas son datos de negocio. Por eso, la app debería desplegarse solo contra un proyecto Supabase con controles de acceso en base de datos activados y mantenidos por el propietario del proyecto.

## Dirección Del Producto

Buenas próximas mejoras serían:

- Acceso por roles para supervisores.
- Vistas de resumen a nivel equipo.
- Exportación CSV.
- Notas o historial de auditoría para días editados.
- Flujo de recuperación de contraseña.
- Separación de environments más preparada para producción.
