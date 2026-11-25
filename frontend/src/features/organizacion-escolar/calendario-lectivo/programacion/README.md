# Programación del año escolar — aprobación 24/11/2026

Sección ADMIN debajo de las tarjetas existentes de Años escolares. Solo se
añaden su importación y composición a SchoolYearsPage; creación, edición,
apertura y cierre conservan sus handlers y condiciones. Tarjeta blanca,
fechas del año de solo lectura, niveles, filas de fechas con iconos, agregar/
quitar receso, revisión de intervalos, vista previa y confirmación explícita.
Sin bibliotecas nuevas, modo oscuro, SQL manual ni cambios de estado del año.

Carga todos los períodos mediante GET paginado existente para los tres niveles.
Reconstruye el complemento de los períodos dentro del año; no usa fines de
semana ni excepciones para inferir vacaciones. Sin períodos no reconstruye un
receso anual. Períodos inválidos/solapados bloquean la programación para revisión.
«Usar intervalos de [nivel]» requiere una elección expresa; no hay copia automática
entre niveles. Una revisión obligatoria informa de programaciones diferentes.

Las ediciones de fechas/niveles y la adopción de intervalos invalidan la vista
previa y su confirmación. Modificar controles no envía DML ni solicitudes de
guardado: Revisar programación usa VISTA_PREVIA y Confirmar programación usa
CONFIRMAR en el único POST nuevo. La vista previa muestra todos los períodos
resultantes y cambios, incluidas retiradas de períodos que dejan de usarse.
Muestra impacto en asistencias y requiere aceptación expresa antes de confirmar.
Consultar programación descarta el borrador y renueva tanto períodos como años.

Un fallo incierto de confirmación bloquea nuevas operaciones hasta consultar;
no repite automáticamente el POST. Los años CERRADOS permiten solo consulta.
La revisión vence a los 15 minutos y al reiniciar/cambiar proceso del backend;
en ese caso se debe consultar/revisar otra vez. Los huecos siguen siendo ambiguos
al reabrir la interfaz: no se almacena una clasificación de vacaciones.

Mapa: programacion.types define contratos; programacion.intervals reconstruye
intervalos y presenta fechas; programacion.api hace HTTP; useProgramming maneja
carga/revisión/confirmación; ProgrammingEditor administra el borrador; la vista
previa y SchoolProgramming componen la presentación. Se reutilizan fechas,
botones, protección de navegación, iconos y errores del proyecto.

Pruebas: `node --test test/programming.test.mjs` y
`node --test --test-concurrency=1 test/programming.browser.mjs` desde frontend.
Navegador con arnés ficticio y adaptador en memoria, sin backend ni MySQL reales.
El arnés usa Edge headless; su canal CDP requiere ejecución autorizada fuera del
sandbox de este entorno. Cachés/perfiles permanecen dentro de node_modules/.tmp.

Validación: cuatro unitarias nuevas y ocho pruebas de navegador de programación
y regresión anual aprobadas; typecheck, build y lint del alcance aprobados.
Suite general: 367 aprobadas, una integración omitida y los mismos cuatro fallos
preexistentes: auth.test.mjs:51 (navegación), integratedAttendance.test.mjs:61/80
(presentación/navegación) y registrarPresentation.test.mjs:40 (cabecera Volver).
No se alteran esos archivos o funcionalidades para hacer pasar las pruebas.
