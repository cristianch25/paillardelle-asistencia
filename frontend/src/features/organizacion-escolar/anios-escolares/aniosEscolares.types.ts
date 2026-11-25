import type { Pagination } from '../../../shared/types/pagination';
import type { ProgramPeriod } from '../calendario-lectivo/programacion/programacion.types';

export type SchoolYear = {
  id: string;
  anio: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'PLANIFICADO' | 'ABIERTO' | 'CERRADO';
  created_at: string;
  updated_at: string;
};
export type SchoolYearsResponse = { anios_escolares: SchoolYear[]; pagination: Pagination };
export type SchoolYearInput = Pick<SchoolYear, 'anio' | 'fecha_inicio' | 'fecha_fin'>;
export type SchoolYearUpdate = Partial<Pick<SchoolYear, 'fecha_inicio' | 'fecha_fin'>> & {
  valores_esperados: Pick<SchoolYear, 'fecha_inicio' | 'fecha_fin' | 'estado'> & { periodos: ProgramPeriod[] };
};
