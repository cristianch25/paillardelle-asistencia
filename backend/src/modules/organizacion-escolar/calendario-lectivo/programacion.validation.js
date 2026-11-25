import { HttpError } from '../../../shared/http-error.js';
import { validateId } from '../../../shared/query-validation.js';
import { educationLevels } from '../../../shared/education-levels.js';
import { validateInterval } from './validation.js';

function object(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) {
    throw new HttpError(400, 'Datos de programación no válidos.');
  }
}
export function validateProgramming(body) {
  object(body, ['modo', 'anio_escolar_id', 'niveles', 'recesos', 'base', 'revisado', 'revision']);
  if (!['VISTA_PREVIA', 'CONFIRMAR'].includes(body.modo) || typeof body.revisado !== 'boolean') {
    throw new HttpError(400, 'Indica la modalidad y la revisión de los intervalos existentes.');
  }
  const id = validateId(body.anio_escolar_id);
  if (!Array.isArray(body.niveles) || !body.niveles.length || body.niveles.length > 3
    || new Set(body.niveles).size !== body.niveles.length || body.niveles.some(level => !educationLevels.includes(level))) {
    throw new HttpError(400, 'Selecciona niveles válidos y sin repeticiones.');
  }
  if (!Array.isArray(body.recesos) || body.recesos.length > 50) throw new HttpError(400, 'Se admiten hasta 50 recesos.');
  const recesos = body.recesos.map(row => {
    object(row, ['fecha_inicio', 'fecha_fin']); validateInterval(row.fecha_inicio, row.fecha_fin);
    return { fecha_inicio: row.fecha_inicio, fecha_fin: row.fecha_fin };
  }).sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio));
  if (recesos.some((row, i) => i > 0 && row.fecha_inicio <= recesos[i - 1].fecha_fin)) {
    throw new HttpError(400, 'Los recesos no deben superponerse.');
  }
  object(body.base, ['fecha_inicio', 'fecha_fin', 'estado', 'periodos']);
  validateInterval(body.base.fecha_inicio, body.base.fecha_fin);
  if (!['PLANIFICADO', 'ABIERTO', 'CERRADO'].includes(body.base.estado)
    || !Array.isArray(body.base.periodos) || body.base.periodos.length > 2000) throw new HttpError(400, 'Consulta nuevamente los períodos del año.');
  const niveles = educationLevels.filter(level => body.niveles.includes(level));
  const periodos = body.base.periodos.map(row => {
    object(row, ['id', 'nivel', 'fecha_inicio', 'fecha_fin']); validateId(row.id);
    validateInterval(row.fecha_inicio, row.fecha_fin);
    if (!niveles.includes(row.nivel)) throw new HttpError(400, 'Los períodos revisados deben corresponder a los niveles seleccionados.');
    return { id: row.id, nivel: row.nivel, fecha_inicio: row.fecha_inicio, fecha_fin: row.fecha_fin };
  }).sort((a, b) => BigInt(a.id) < BigInt(b.id) ? -1 : 1);
  if (new Set(periodos.map(row => row.id)).size !== periodos.length) throw new HttpError(400, 'Hay períodos repetidos.');
  if (body.modo === 'CONFIRMAR' && (typeof body.revision !== 'string' || body.revision.length > 200)) {
    throw new HttpError(409, 'Genera una vista previa antes de confirmar.');
  }
  return { modo: body.modo, revision: body.revision, anio_escolar_id: id, niveles, recesos,
    revisado: body.revisado, base: { fecha_inicio: body.base.fecha_inicio, fecha_fin: body.base.fecha_fin, estado: body.base.estado, periodos } };
}
