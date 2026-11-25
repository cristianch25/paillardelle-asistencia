import { HttpError } from '../../../shared/http-error.js';
import { validDate } from '../../../shared/date-validation.js';
import { validateId } from '../../../shared/query-validation.js';
import { educationLevels } from '../../../shared/education-levels.js';

const dates = ['fecha_inicio', 'fecha_fin'];
function object(value, fields) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).every(key => fields.includes(key));
}
export function validateYearUpdate(body) {
  if (!object(body, [...dates, 'valores_esperados']) || !dates.some(key => Object.hasOwn(body, key))) {
    throw new HttpError(400, 'Envía al menos una fecha editable y los valores esperados. Solo se permiten fecha_inicio y fecha_fin.');
  }
  const expected = body.valores_esperados;
  if (!object(expected, [...dates, 'estado', 'periodos']) || !dates.every(key => validDate(expected[key]))
    || expected.fecha_inicio > expected.fecha_fin || !['PLANIFICADO', 'ABIERTO', 'CERRADO'].includes(expected.estado)) {
    throw new HttpError(400, 'valores_esperados debe contener fecha_inicio, fecha_fin y estado válidos.');
  }
  if (!Array.isArray(expected.periodos) || expected.periodos.length > 2000) {
    throw new HttpError(400, 'Consulta los períodos lectivos antes de guardar las fechas del año.');
  }
  for (const period of expected.periodos) {
    if (!object(period, ['id', 'nivel', ...dates]) || !educationLevels.includes(period.nivel)
      || !dates.every(key => validDate(period[key])) || period.fecha_inicio > period.fecha_fin) {
      throw new HttpError(400, 'La instantánea de períodos lectivos no es válida.');
    }
    validateId(period.id);
  }
  if (new Set(expected.periodos.map(period => period.id)).size !== expected.periodos.length) {
    throw new HttpError(400, 'La instantánea contiene períodos repetidos.');
  }
  const changes = Object.fromEntries(dates.filter(key => Object.hasOwn(body, key)).map(key => [key, body[key]]));
  if (Object.values(changes).some(value => !validDate(value))) {
    throw new HttpError(400, 'Las fechas deben ser reales en formato YYYY-MM-DD, entre 1000-01-01 y 9999-12-31.');
  }
  return { changes, expected };
}

export function decideYearUpdate(before, { changes, expected }) {
  if (!before) throw new HttpError(404, 'Año escolar no encontrado.');
  if (before.estado === 'CERRADO') throw new HttpError(409, 'No se puede editar un año escolar CERRADO.');
  if ([...dates, 'estado'].some(key => before[key] !== expected[key])) {
    throw new HttpError(409, 'El año escolar cambió. Actualiza la consulta antes de continuar.');
  }
  const after = { ...before, ...changes };
  if (after.fecha_inicio > after.fecha_fin) {
    throw new HttpError(400, 'fecha_inicio debe ser menor o igual a fecha_fin.');
  }
  return after;
}

export function assertYearRelations(conflict) {
  if (conflict) throw new HttpError(409, `El nuevo intervalo dejaría ${conflict} fuera del año escolar.`);
}
