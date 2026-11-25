import { HttpError } from '../../../shared/http-error.js';
import { assertYear } from './access.js';
import { effectiveDay } from './resolution.js';

export function shiftDate(date, days) {
  const value = new Date(`${date}T00:00:00Z`); value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function subtractBreaks(year, breaks) {
  let start = year.fecha_inicio;
  const result = [];
  for (const row of breaks) {
    if (start < row.fecha_inicio) result.push({ fecha_inicio: start, fecha_fin: shiftDate(row.fecha_inicio, -1) });
    start = row.fecha_fin === year.fecha_fin ? null : shiftDate(row.fecha_fin, 1);
  }
  if (start && start <= year.fecha_fin) result.push({ fecha_inicio: start, fecha_fin: year.fecha_fin });
  return result;
}
export function planPeriods(before, after) {
  const same = (a, b) => a.fecha_inicio === b.fecha_inicio && a.fecha_fin === b.fecha_fin;
  const conservar = before.filter(row => after.some(next => same(row, next)));
  const old = before.filter(row => !conservar.includes(row)).sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio));
  const next = after.filter(row => !conservar.some(prior => same(prior, row)));
  const count = Math.min(old.length, next.length);
  return { conservar, modificar: old.slice(0, count).map((row, i) => ({ antes: row, despues: next[i] })),
    quitar: old.slice(count), crear: next.slice(count) };
}
export function buildProgramming(data, contexts, activity) {
  const year = contexts[0].year;
  assertYear(year, undefined, undefined, true);
  for (const row of data.recesos) assertYear(year, row.fecha_inicio, row.fecha_fin, true);
  const periods = subtractBreaks(year, data.recesos);
  return contexts.map(context => {
    const { nivel, exceptions } = context;
    const sorted = [...context.periods].sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio));
    if (sorted.some((row, i) => row.fecha_inicio < year.fecha_inicio || row.fecha_fin > year.fecha_fin
      || row.fecha_inicio > row.fecha_fin || (i > 0 && row.fecha_inicio <= sorted[i - 1].fecha_fin))) {
      throw new HttpError(409, `Los períodos existentes de ${nivel} requieren revisión. No se reemplazaron.`);
    }
    if (exceptions.some(row => row.es_lectivo && data.recesos.some(gap => gap.fecha_inicio <= row.fecha && row.fecha <= gap.fecha_fin))) {
      throw new HttpError(409, `Hay una recuperación autorizada dentro de un receso de ${nivel}. Conserva esa fecha fuera del receso.`);
    }
    const changed = row => effectiveDay(row.fecha, context.periods, exceptions).es_lectivo !== effectiveDay(row.fecha, periods, exceptions).es_lectivo;
    const sessions = activity.sessions.filter(row => row.nivel === nivel && changed(row));
    const attendance = activity.attendance.filter(row => row.nivel === nivel && changed(row));
    return { nivel, periodos: periods, cambios: planPeriods(context.periods, periods), excepciones_conservadas: exceptions.length,
      impacto: { sesiones: sessions.length, asistencias: attendance.length },
      // Solo para vincular la confirmación a los registros revisados; no se expone ni audita.
      activity: { sessions, attendance } };
  });
}
