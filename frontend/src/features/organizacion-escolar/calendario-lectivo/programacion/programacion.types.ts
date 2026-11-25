import type { EducationLevel } from '../../secciones/secciones.types';
export type Interval = { fecha_inicio: string; fecha_fin: string };
export type ProgramPeriod = Interval & { id: string; nivel: EducationLevel };
export type LevelProgram = { nivel: EducationLevel; periodos: ProgramPeriod[]; intervalos: Interval[] };
export type ProgramInput = {
  anio_escolar_id: string; niveles: EducationLevel[]; recesos: Interval[]; revisado: boolean;
  base: Interval & { estado: string; periodos: ProgramPeriod[] };
};
export type ProgramPreview = { guardado: boolean; revision?: string; niveles: {
  nivel: EducationLevel; periodos: Interval[]; excepciones_conservadas: number;
  cambios: { conservar: ProgramPeriod[]; modificar: { antes: ProgramPeriod; despues: Interval }[]; quitar: ProgramPeriod[]; crear: Interval[] };
  impacto: { sesiones: number; asistencias: number };
}[] };
export const programLevels: EducationLevel[] = ['INICIAL', 'PRIMARIA', 'SECUNDARIA'];
export const levelNames: Record<EducationLevel, string> = { INICIAL: 'Inicial', PRIMARIA: 'Primaria', SECUNDARIA: 'Secundaria' };
