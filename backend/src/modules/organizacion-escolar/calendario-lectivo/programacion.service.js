import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { HttpError } from '../../../shared/http-error.js';
import { unauthorized } from '../../auth/auth.errors.js';
import { createProgrammingRepository } from './programacion.repository.js';
import { validateProgramming } from './programacion.validation.js';
import { buildProgramming } from './programacion.plan.js';
import { calendarWrite } from './access.js';

function authorize(actor) {
  if (!actor || !(actor.activo === 1 || actor.activo === true)) throw unauthorized();
  if (actor.rol !== 'ADMIN') throw new HttpError(403, 'La programación del año está reservada a ADMIN.');
}
function baseOf(contexts) {
  const { fecha_inicio, fecha_fin, estado } = contexts[0].year;
  const periodos = contexts.flatMap(context => context.periods.map(({ id, nivel, fecha_inicio, fecha_fin }) =>
    ({ id, nivel, fecha_inicio, fecha_fin }))).sort((a, b) => BigInt(a.id) < BigInt(b.id) ? -1 : 1);
  return { fecha_inicio, fecha_fin, estado, periodos };
}
export function createProgrammingService({ repository = createProgrammingRepository(), now = Date.now } = {}) {
  // Clave efímera por proceso/servicio: no hay nuevas credenciales ni almacenamiento de recesos.
  const key = randomBytes(32);
  const sign = (expires, fingerprint) => createHmac('sha256', key).update(`${expires}:${fingerprint}`).digest('hex');
  return async function program(body, actor) {
    if (actor?.rol !== 'ADMIN') throw new HttpError(403, 'La programación del año está reservada a ADMIN.');
    const data = validateProgramming(body);
    return calendarWrite(() => repository.transact(data, actor.id, authorize, async (contexts, activity, persist) => {
      if (!contexts[0].year) throw new HttpError(404, 'Año escolar no encontrado.');
      if (JSON.stringify(data.base) !== JSON.stringify(baseOf(contexts))) throw new HttpError(409, 'La programación cambió. Vuelve a consultar el año y revisa sus intervalos.');
      if (contexts.some(context => context.periods.length) && !data.revisado) {
        throw new HttpError(400, 'Revisa los intervalos existentes de cada nivel antes de continuar.');
      }
      const plans = buildProgramming(data, contexts, activity);
      const fingerprint = createHash('sha256').update(JSON.stringify({ actor: String(actor.id), year: data.anio_escolar_id,
        base: data.base, niveles: data.niveles, recesos: data.recesos, contexts, plans })).digest('hex');
      let revision;
      if (data.modo === 'CONFIRMAR') {
        const match = /^(\d+)\.([a-f0-9]{64})$/.exec(data.revision);
        const [, expires, signature] = match ?? [];
        const valid = Boolean(match)
          && Number(expires) > now() && Number(expires) <= now() + 900000
          && timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(sign(expires, fingerprint), 'hex'));
        if (!valid) throw new HttpError(409, 'La vista previa venció o los datos cambiaron. Vuelve a revisar antes de confirmar.');
        await persist(plans);
      } else {
        const expires = now() + 900000;
        revision = `${expires}.${sign(expires, fingerprint)}`;
      }
      return { guardado: data.modo === 'CONFIRMAR', ...(revision ? { revision } : {}),
        niveles: plans.map(({ activity: _activity, ...plan }) => plan) };
    }));
  };
}
