import { formatCivilDate, validCivilDate } from '../../../../shared/dates/civilDate';
import type { Interval, ProgramPeriod } from './programacion.types';

export const intervalLabel = (row: Interval) => `${formatCivilDate(row.fecha_inicio)} al ${formatCivilDate(row.fecha_fin)}`;
function shift(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`); value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function reconstructIntervals(year: Interval, periods: ProgramPeriod[]): Interval[] {
  if (!periods.length) return [];
  const sorted = [...periods].sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio));
  const gaps: Interval[] = []; let start: string | null = year.fecha_inicio;
  for (const row of sorted) {
    if (!validCivilDate(row.fecha_inicio) || !validCivilDate(row.fecha_fin) || row.fecha_inicio > row.fecha_fin
      || row.fecha_inicio < year.fecha_inicio || row.fecha_fin > year.fecha_fin || !start || row.fecha_inicio < start) {
      throw new Error('Los períodos existentes requieren revisión. No se reemplazarán desde esta pantalla.');
    }
    if (start < row.fecha_inicio) gaps.push({ fecha_inicio: start, fecha_fin: shift(row.fecha_inicio, -1) });
    start = row.fecha_fin === year.fecha_fin ? null : shift(row.fecha_fin, 1);
  }
  if (start) gaps.push({ fecha_inicio: start, fecha_fin: year.fecha_fin });
  return gaps;
}
