import { educationLevels } from '../../../shared/education-levels.js';
import { createYearPeriodsRepository } from './year-periods.repository.js';
import { assertPeriodSnapshot, planYearPeriodEdges } from './year-periods.rules.js';

// Servicio interno: siempre usa la conexión de la transacción del año; no crea otra.
export function createYearPeriodsService(repository = createYearPeriodsRepository()) {
  return {
    async initialize(connection, year, actorId) {
      for (const level of educationLevels) {
        const period = await repository.insert(connection, year, level);
        await repository.audit(connection, actorId, null, period);
      }
    },
    async plan(connection, before, after, expected) {
      const current = await repository.list(connection, before.id);
      assertPeriodSnapshot(current, expected);
      if (before.fecha_inicio === after.fecha_inicio && before.fecha_fin === after.fecha_fin) return [];
      return planYearPeriodEdges(before, after, current);
    },
    async save(connection, changes, actorId) {
      for (const change of changes) {
        const period = await repository.update(connection, change.after);
        await repository.audit(connection, actorId, change.before, period);
      }
    },
  };
}
