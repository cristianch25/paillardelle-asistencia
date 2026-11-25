import { httpClient } from '../../../../shared/api/httpClient';
import type { SchoolYear } from '../../anios-escolares/aniosEscolares.types';
import { programLevels, type LevelProgram, type ProgramInput, type ProgramPeriod, type ProgramPreview } from './programacion.types';
import { reconstructIntervals } from './programacion.intervals';
export async function loadPrograms(year: SchoolYear): Promise<LevelProgram[]> {
  return Promise.all(programLevels.map(async nivel => {
    const periodos: ProgramPeriod[] = []; let more = true;
    for (let page = 1; more; page++) {
      const { data } = await httpClient.get('/periodos-lectivos', { params: { anio_escolar_id: year.id, nivel, page, limit: 100 } });
      if (data.pagination?.page !== page || !Array.isArray(data.periodos_lectivos)) throw new Error('No se pudo confirmar la programación.');
      periodos.push(...data.periodos_lectivos.map((row: ProgramPeriod & { anio_escolar_id: string }) => {
        if (row.anio_escolar_id !== year.id || row.nivel !== nivel || typeof row.id !== 'string') throw new Error('Período de otro año o nivel.');
        return { id: row.id, nivel, fecha_inicio: row.fecha_inicio, fecha_fin: row.fecha_fin };
      }));
      more = data.pagination.has_more;
      if (periodos.length > 2000) throw new Error('La programación requiere revisión por su extensión.');
    }
    return { nivel, periodos, intervalos: reconstructIntervals(year, periodos) };
  }));
}
export async function requestProgramming(input: ProgramInput, revision?: string): Promise<ProgramPreview> {
  const { data } = await httpClient.post<ProgramPreview>('/periodos-lectivos/programacion', {
    ...input, modo: revision ? 'CONFIRMAR' : 'VISTA_PREVIA', ...(revision ? { revision } : {}),
  });
  if (data.guardado !== Boolean(revision) || !Array.isArray(data.niveles) || (!revision && !data.revision)) throw new Error('Resultado no confirmado.');
  return data;
}
