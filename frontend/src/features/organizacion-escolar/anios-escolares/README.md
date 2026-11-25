# Años escolares — ADMIN

Ruta `/anios-escolares` y menú exclusivos de ADMIN. Los selectores compartidos
de otros módulos conservan `useSchoolYears` y sus consultas existentes.
Referencias: P02, RN-03/RN-05 y RF-03 V8, aprobación del 19/11/2026.
La aprobación del 24/11/2026 amplía exclusivamente la edición posterior de fechas.
La aprobación del 25/11/2026 añade períodos iniciales automáticos y sincronización
conservadora de extremos, sin alterar las operaciones manuales de abrir/cerrar.

- Lista años, fechas y estados; contempla carga, vacío, errores y consulta renovada.
- Formulario con solo Año escolar, Fecha de inicio y Fecha de finalización.
  Delimitan el año; no son matrícula individual ni días lectivos.
- Crea PLANIFICADO con POST existente; abre mediante PATCH existente y confirmación.
  El backend crea un período completo por nivel en la misma transacción; el
  formulario sigue teniendo solo tres campos y no solicita confirmación adicional.
- Cierra ABIERTO mediante PATCH `/:id/cerrar` y confirmación explícita de efectos.
  El botón se habilita después de fecha_fin en Lima; el servidor revalida fecha/estado.
- Error de red/servidor con resultado incierto impide repetir escrituras hasta consultar.
- Tarjetas blancas en dos columnas (una en móvil), badge e icono Editar, con
  botones de apertura/cierre conservados. Sin Retirar ni reapertura.
- Editar abre diálogo con fechas precargadas en PLANIFICADO/ABIERTO, sin campos
  para cambiar año o estado. Envía solo fechas modificadas y valores_esperados
  de ambas fechas/estado originales y todos los períodos de los tres niveles.
  Carga la instantánea mediante GET paginado existente; impide guardar si falla
  esa consulta. No utiliza updated_at como versión y no agrega endpoints.
  El servidor solo ajusta extremos seguros, conserva IDs/recesos y rechaza huecos
  ambiguos, años cerrados, períodos eliminados o registros fuera del nuevo año.
- Conserva borrador y muestra conflictos; Consultar años descarta el formulario
  y recarga. Una respuesta incierta bloquea guardado/cancelación hasta consultar.
- Conserva excepciones, importador y datos reales; no traslada datos de otro año.
  La programación de recesos mantiene su interfaz y las reglas de lectividad.

SchoolYearsPage compone listado/formulario/confirmación; SchoolYearForm administra
los tres campos; SchoolYearConfirmation presenta el diálogo accesible;
useSchoolYearManagement coordina carga, escritura única, errores e incertidumbre.
Se reutilizan componentes, cliente HTTP, protección de navegación y fechas civiles.
SchoolYearEditForm gestiona únicamente el diálogo de edición y su borrador.

Pruebas de navegador con arnés ficticio:
`node --test --test-concurrency=1 test/schoolYears.browser.mjs` desde frontend.
Edición: `node --test --test-concurrency=1 test/schoolYearEdit.browser.mjs`.
No conecta a MySQL ni al backend real.

Validación 24/11/2026: seis pruebas de navegador aprobadas en Edge headless con
arnés ficticio, incluidos edición, conflicto, incertidumbre, roles y regresión
de creación/apertura/cierre; tamaños 1440 y 320 px. Typecheck, build y lint de
los archivos de esta funcionalidad aprobados. El canal CDP de Edge agota tiempo
dentro del sandbox; la ejecución autorizada fuera del sandbox pasa.
Suite unitaria general: 363 aprobadas, una integración omitida y cuatro fallos
preexistentes: auth.test.mjs:51 (navegación), integratedAttendance.test.mjs:61/80
(presentación y navegación) y registrarPresentation.test.mjs:40 (cabecera Volver).
Lint global: errores ajenos en AttendanceJustifyDialog, AttendanceHistoryDialog
y test/usuarios.browser.mjs. Esos archivos y comportamientos permanecen intactos.

Verificación 25/11/2026: nueve pruebas de navegador de creación/edición/programación
aprobadas con arnés ficticio, incluida instantánea de períodos, conflicto sin
cambio del año y bloqueo ante fallo de lectura. Typecheck, build y lint del alcance
aprobados. Suite unitaria: 367 aprobadas, una integración omitida y los mismos
cuatro fallos previos de auth.test.mjs:51, integratedAttendance.test.mjs:61/80
y registrarPresentation.test.mjs:40; sin cambios ajenos para hacerlas pasar.
El PATCH ampliado requiere el formulario actualizado; clientes anteriores sin
valores_esperados.periodos reciben 400 y no pueden guardar fechas sin revisarlos.
