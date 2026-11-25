import { getPool } from '../../../config/database.js';
import { inTransaction } from '../../../shared/transaction.js';
import { assertPasswordChanged } from '../../auth/auth.access.js';
import { readCalendar, periodColumns, periodRow } from './repository.js';
import { readInsertedId } from '../../../shared/inserted-id.js';

async function readActivity(connection, yearId, levels) {
  const places = levels.map(() => '?').join(', '), params = [yearId, ...levels];
  const [sessions] = await connection.execute(`SELECT sa.id, sa.fecha, sa.version, s.nivel
    FROM sesiones_asistencia sa JOIN secciones s ON s.id = sa.seccion_id AND s.anio_escolar_id = sa.anio_escolar_id
    WHERE sa.anio_escolar_id = ? AND s.nivel IN (${places}) ORDER BY sa.id FOR UPDATE`, params);
  const [attendance] = await connection.execute(`SELECT a.id, a.fecha, a.version, s.nivel
    FROM asistencias a JOIN secciones s ON s.id = a.seccion_id AND s.anio_escolar_id = a.anio_escolar_id
    WHERE a.anio_escolar_id = ? AND s.nivel IN (${places}) ORDER BY a.id FOR UPDATE`, params);
  const rows = values => values.map(row => ({ ...row, id: String(row.id) }));
  return { sessions: rows(sessions), attendance: rows(attendance) };
}
async function savePlans(connection, data, actorId, contexts, plans) {
  const changed = plans.some(plan => ['crear', 'modificar', 'quitar'].some(key => plan.cambios[key].length));
  if (!changed) return;
  for (const plan of plans) {
    for (const row of plan.cambios.quitar) {
      const [result] = await connection.execute('DELETE FROM periodos_lectivos WHERE id = ?', [row.id]);
      if (result.affectedRows !== 1) throw new Error('No se retiró un único período.');
    }
    // Evitar colisiones transitorias de UNIQUE(año,nivel,inicio) sin fechas ficticias.
    const earlier = plan.cambios.modificar.filter(row => row.despues.fecha_inicio <= row.antes.fecha_inicio);
    const later = plan.cambios.modificar.filter(row => row.despues.fecha_inicio > row.antes.fecha_inicio).reverse();
    for (const { antes, despues } of [...earlier, ...later]) {
      const [result] = await connection.execute('UPDATE periodos_lectivos SET fecha_inicio = ?, fecha_fin = ? WHERE id = ?',
        [despues.fecha_inicio, despues.fecha_fin, antes.id]);
      if (result.affectedRows !== 1) throw new Error('No se actualizó un único período.');
    }
    for (const row of plan.cambios.crear) {
      const [result] = await connection.execute('INSERT INTO periodos_lectivos (anio_escolar_id, nivel, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?)',
        [data.anio_escolar_id, plan.nivel, row.fecha_inicio, row.fecha_fin]);
      if (result.affectedRows !== 1) throw new Error('No se creó un único período.');
      await readInsertedId(connection);
    }
  }
  const after = [];
  for (const plan of plans) {
    const [rows] = await connection.execute(`SELECT ${periodColumns} FROM periodos_lectivos
      WHERE anio_escolar_id = ? AND nivel = ? ORDER BY id FOR UPDATE`, [data.anio_escolar_id, plan.nivel]);
    after.push({ nivel: plan.nivel, periodos: rows.map(periodRow) });
  }
  await connection.execute(`INSERT INTO auditoria_administrativa
    (usuario_id, accion, entidad, registro_id, datos_anteriores, datos_nuevos) VALUES (?, ?, ?, ?, ?, ?)`,
  [actorId, 'PROGRAMAR_PERIODOS_LECTIVOS', 'anios_escolares', data.anio_escolar_id,
    JSON.stringify(contexts.map(row => ({ nivel: row.nivel, periodos: row.periods }))), JSON.stringify(after)]);
}

export function createProgrammingRepository(poolProvider = getPool) {
  return {
    transact(data, actorId, authorize, work) {
      return inTransaction(poolProvider(), async connection => {
        const [actors] = await connection.execute(
          'SELECT id, rol, activo, debe_cambiar_password FROM usuarios WHERE id = ? LIMIT 1 FOR UPDATE', [actorId]);
        assertPasswordChanged(actors[0]); authorize(actors[0] ?? null);
        const contexts = [];
        for (const nivel of data.niveles) {
          contexts.push({ ...await readCalendar(connection, { anio_escolar_id: data.anio_escolar_id, nivel }, true), nivel });
        }
        const activity = await readActivity(connection, data.anio_escolar_id, data.niveles);
        return work(contexts, activity, plans => savePlans(connection, data, actorId, contexts, plans));
      });
    },
  };
}
