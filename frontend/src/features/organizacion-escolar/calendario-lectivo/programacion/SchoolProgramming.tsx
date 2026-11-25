import { useId, useState } from 'react';
import type { SchoolYear } from '../../anios-escolares/aniosEscolares.types';
import ProgrammingEditor from './ProgrammingEditor';
import { useNavigationProtection } from '../../../../shared/navigation/NavigationProtectionContext';

export default function SchoolProgramming({ years, disabled, onRefreshYears }: {
  years: SchoolYear[]; disabled: boolean; onRefreshYears: () => void;
}) {
  const id = useId(), [selected, setSelected] = useState(''), [working, setWorking] = useState(false);
  const navigation = useNavigationProtection();
  const year = years.find(row => row.id === selected);
  return <section aria-labelledby={`${id}-title`} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 text-institutional-950 shadow-sm sm:p-7">
    <h2 id={`${id}-title`} className="text-2xl font-bold">Programación del año escolar</h2>
    <div><label htmlFor={`${id}-year`} className="mb-2 block text-sm font-semibold">Año escolar</label>
      <select id={`${id}-year`} value={selected} disabled={disabled || working}
        onChange={event => { const value = event.target.value; void navigation.request(() => setSelected(value)); }}
        className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 sm:max-w-xs">
        <option value="">Selecciona un año escolar</option>{years.map(row => <option key={row.id} value={row.id}>{row.anio} · {row.estado}</option>)}
      </select></div>
    {year ? <ProgrammingEditor key={`${year.id}:${year.fecha_inicio}:${year.fecha_fin}:${year.estado}`} year={year} disabled={disabled}
      onWorking={setWorking} onRefreshYears={onRefreshYears} />
      : <p className="text-sm text-slate-600">Selecciona un año para consultar sus períodos de clases y preparar los recesos.</p>}
  </section>;
}
