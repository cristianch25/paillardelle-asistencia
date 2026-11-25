import { HttpError } from '../../../shared/http-error.js';
import { educationLevels } from '../../../shared/education-levels.js';

const labels = { INICIAL: 'Inicial', PRIMARIA: 'Primaria', SECUNDARIA: 'Secundaria' };
export function periodSnapshot(rows) {
  return rows.map(({ id, nivel, fecha_inicio, fecha_fin }) => ({ id: String(id), nivel, fecha_inicio, fecha_fin }))
    .sort((a, b) => BigInt(a.id) < BigInt(b.id) ? -1 : 1);
}
export function assertPeriodSnapshot(rows, expected) {
  if (JSON.stringify(periodSnapshot(rows)) !== JSON.stringify(periodSnapshot(expected))) {
    throw new HttpError(409, 'Los períodos lectivos cambiaron. Consulta nuevamente el año antes de editar sus fechas.');
  }
}
export function planYearPeriodEdges(before, after, periods) {
  const changes = [];
  for (const nivel of educationLevels) {
    const name = labels[nivel];
    const rows = periods.filter(row => row.nivel === nivel).sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio));
    if (!rows.length) throw new HttpError(409, `${name} no tiene períodos lectivos. Revisa su programación antes de cambiar las fechas del año.`);
    if (rows.some((row, i) => row.fecha_inicio < before.fecha_inicio || row.fecha_fin > before.fecha_fin
      || row.fecha_inicio > row.fecha_fin || (i > 0 && row.fecha_inicio <= rows[i - 1].fecha_fin))) {
      throw new HttpError(409, `Los períodos existentes de ${name} requieren revisión. No se modificaron.`);
    }
    if (rows.some(row => row.fecha_fin < after.fecha_inicio || row.fecha_inicio > after.fecha_fin)) {
      throw new HttpError(409, `Las nuevas fechas dejarían un período completo de ${name} fuera del año. No se puede eliminarlo automáticamente.`);
    }
    const planned = rows.map(row => ({ ...row })), first = planned[0], last = planned.at(-1);
    if (after.fecha_inicio < before.fecha_inicio && first.fecha_inicio !== before.fecha_inicio) {
      throw new HttpError(409, `${name} tiene un intervalo sin clases al inicio. No se puede ampliarlo ni convertirlo en lectivo automáticamente; revisa su programación.`);
    }
    if (after.fecha_fin > before.fecha_fin && last.fecha_fin !== before.fecha_fin) {
      throw new HttpError(409, `${name} tiene un intervalo sin clases al final. No se puede ampliarlo ni convertirlo en lectivo automáticamente; revisa su programación.`);
    }
    if (first.fecha_inicio === before.fecha_inicio || after.fecha_inicio > first.fecha_inicio) first.fecha_inicio = after.fecha_inicio;
    if (last.fecha_fin === before.fecha_fin || after.fecha_fin < last.fecha_fin) last.fecha_fin = after.fecha_fin;
    if (planned.some(row => row.fecha_inicio > row.fecha_fin || row.fecha_inicio < after.fecha_inicio || row.fecha_fin > after.fecha_fin)) {
      throw new HttpError(409, `Las nuevas fechas eliminarían un período completo o atravesarían un receso de ${name}. Revisa su programación.`);
    }
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].fecha_inicio !== planned[i].fecha_inicio || rows[i].fecha_fin !== planned[i].fecha_fin) {
        changes.push({ before: rows[i], after: planned[i] });
      }
    }
  }
  return changes;
}
