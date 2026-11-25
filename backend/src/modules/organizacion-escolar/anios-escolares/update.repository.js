import { assertPasswordChanged } from '../../auth/auth.access.js';
import { inTransaction } from '../../../shared/transaction.js';

function outside(start, end) {
  return `(${start} < ? OR ${start} > ? OR (${end} IS NOT NULL AND (${end} < ? OR ${end} > ?)))`;
}
const relations = [
  ['excepciones de calendario', 'SELECT c.id FROM calendario_lectivo c WHERE c.anio_escolar_id = ? AND (c.fecha < ? OR c.fecha > ?)', true],
  ['matrículas', `SELECT m.id FROM matriculas m WHERE m.anio_escolar_id = ? AND ${outside('m.fecha_ingreso', 'm.fecha_retiro')}`],
  ['vínculos de matrícula con secciones', `SELECT ms.id FROM matricula_secciones ms WHERE ms.anio_escolar_id = ? AND ${outside('ms.fecha_inicio', 'ms.fecha_fin')}`],
  ['asignaciones', `SELECT a.id FROM asignaciones a JOIN secciones s ON s.id = a.seccion_id WHERE s.anio_escolar_id = ? AND ${outside('a.fecha_inicio', 'a.fecha_fin')}`],
  ['sesiones de asistencia', 'SELECT sa.id FROM sesiones_asistencia sa WHERE sa.anio_escolar_id = ? AND (sa.fecha < ? OR sa.fecha > ?)', true],
  ['asistencias', 'SELECT a.id FROM asistencias a WHERE a.anio_escolar_id = ? AND (a.fecha < ? OR a.fecha > ?)', true],
];

// Lecturas actuales bajo el bloqueo del año, compartido por los escritores académicos.
async function findConflict(connection, year) {
  const range = [year.fecha_inicio, year.fecha_fin];
  for (const [label, sql, singleDate] of relations) {
    const [rows] = await connection.execute(`${sql} LIMIT 1 FOR UPDATE`,
      [year.id, ...range, ...(singleDate ? [] : range)]);
    if (rows.length) return label;
  }
  return null;
}

export function updateYear(pool, id, actorId, hooks, helpers) {
  const { columns, publicRow, auditYear, yearPeriods } = helpers;
  return inTransaction(pool, async connection => {
    // Mismo orden que abrir/cerrar: actor, año; nunca otros usuarios después del año.
    const [actors] = await connection.execute(
      'SELECT id, rol, activo, debe_cambiar_password FROM usuarios WHERE id = ? LIMIT 1 FOR UPDATE', [actorId]);
    assertPasswordChanged(actors[0]);
    hooks.authorize(actors[0] ?? null);
    const [rows] = await connection.execute(
      `SELECT ${columns} FROM anios_escolares WHERE id = ? LIMIT 1 FOR UPDATE`, [id]);
    const before = rows[0] ? publicRow(rows[0]) : null;
    const proposed = hooks.decide(before);
    const periodChanges = await yearPeriods.plan(connection, before, proposed, hooks.expectedPeriods);
    if (before.fecha_inicio === proposed.fecha_inicio && before.fecha_fin === proposed.fecha_fin) return before;
    hooks.assertRelations(await findConflict(connection, proposed));
    const [result] = await connection.execute(
      'UPDATE anios_escolares SET fecha_inicio = ?, fecha_fin = ? WHERE id = ?',
      [proposed.fecha_inicio, proposed.fecha_fin, id]);
    if (result.affectedRows !== 1) throw new Error('No se actualizó un único año escolar.');
    const [updated] = await connection.execute(`SELECT ${columns} FROM anios_escolares WHERE id = ? LIMIT 1`, [id]);
    if (!updated[0]) throw new Error('No se pudo consultar el año actualizado.');
    const after = publicRow(updated[0]);
    await auditYear(connection, actorId, 'EDITAR_ANIO_ESCOLAR', before, after);
    await yearPeriods.save(connection, periodChanges, actorId);
    return after;
  });
}
