import { readInsertedId } from '../../../shared/inserted-id.js';
import { periodColumns, periodRow } from './repository.js';

async function find(connection, id) {
  const [rows] = await connection.execute(`SELECT ${periodColumns} FROM periodos_lectivos WHERE id = ? LIMIT 1`, [id]);
  if (!rows[0]) throw new Error('No se pudo consultar el período lectivo.');
  return periodRow(rows[0]);
}
export function createYearPeriodsRepository() {
  return {
    async list(connection, yearId) {
      const [rows] = await connection.execute(`SELECT ${periodColumns} FROM periodos_lectivos WHERE anio_escolar_id = ? ORDER BY id FOR UPDATE`, [yearId]);
      return rows.map(periodRow);
    },
    async insert(connection, year, level) {
      const [result] = await connection.execute('INSERT INTO periodos_lectivos (anio_escolar_id, nivel, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?)',
        [year.id, level, year.fecha_inicio, year.fecha_fin]);
      if (result.affectedRows !== 1) throw new Error('No se creó un único período inicial.');
      return find(connection, await readInsertedId(connection));
    },
    async update(connection, period) {
      const [result] = await connection.execute('UPDATE periodos_lectivos SET fecha_inicio = ?, fecha_fin = ? WHERE id = ?',
        [period.fecha_inicio, period.fecha_fin, period.id]);
      if (result.affectedRows !== 1) throw new Error('No se actualizó un único período del año.');
      return find(connection, period.id);
    },
    async audit(connection, actorId, before, after) {
      await connection.execute(`INSERT INTO auditoria_administrativa
        (usuario_id, accion, entidad, registro_id, datos_anteriores, datos_nuevos) VALUES (?, ?, ?, ?, ?, ?)`,
      [actorId, before ? 'ACTUALIZAR_PERIODO_LECTIVO' : 'CREAR_PERIODO_LECTIVO', 'periodos_lectivos', after.id,
        before ? JSON.stringify(before) : null, JSON.stringify(after)]);
    },
  };
}
