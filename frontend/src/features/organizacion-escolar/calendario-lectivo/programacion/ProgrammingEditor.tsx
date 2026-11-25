import { useId, useState } from 'react';
import { CalendarDays, Plus, Trash2 } from 'lucide-react';
import Button from '../../../../shared/components/Button';
import ErrorState from '../../../../shared/components/ErrorState';
import LoadingState from '../../../../shared/components/LoadingState';
import { formatCivilDate, validCivilDate } from '../../../../shared/dates/civilDate';
import { useUnsavedChanges } from '../../../../shared/navigation/useUnsavedChanges';
import type { SchoolYear } from '../../anios-escolares/aniosEscolares.types';
import { useProgramming } from './useProgramming';
import { levelNames, programLevels, type Interval } from './programacion.types';
import ProgrammingPreview from './ProgrammingPreview';
import { intervalLabel } from './programacion.intervals';

export default function ProgrammingEditor({ year, disabled: externalDisabled, onWorking, onRefreshYears }: {
  year: SchoolYear; disabled: boolean; onWorking: (busy: boolean) => void; onRefreshYears: () => void;
}) {
  const id = useId(), manager = useProgramming(year);
  const [levels, setLevels] = useState(programLevels), [breaks, setBreaks] = useState<Interval[]>([]);
  const [reviewed, setReviewed] = useState(false), [dirty, setDirty] = useState(false);
  const disabled = externalDisabled || manager.busy || manager.uncertain || manager.loading || year.estado === 'CERRADO';
  useUnsavedChanges(`programming:${year.id}`, dirty || manager.uncertain, manager.busy);
  function change(work: () => void) { manager.invalidate(); setDirty(true); setReviewed(false); work(); }
  const selected = manager.levels.filter(row => levels.includes(row.nivel));
  const existing = selected.some(row => row.periodos.length);
  const different = new Set(selected.map(row => JSON.stringify(row.periodos.map(period => [period.fecha_inicio, period.fecha_fin]).sort()))).size > 1;
  const valid = levels.length > 0 && breaks.every(row => validCivilDate(row.fecha_inicio) && validCivilDate(row.fecha_fin)
    && row.fecha_inicio <= row.fecha_fin && row.fecha_inicio >= year.fecha_inicio && row.fecha_fin <= year.fecha_fin);
  async function request(confirm = false) {
    if (disabled || !valid || (existing && !reviewed)) return;
    onWorking(true);
    try {
      const result = await manager.request({ anio_escolar_id: year.id, niveles: levels, recesos: breaks, revisado: reviewed || !existing,
        base: { fecha_inicio: year.fecha_inicio, fecha_fin: year.fecha_fin, estado: year.estado, periodos: selected.flatMap(row => row.periodos) } }, confirm);
      if (confirm && result) setDirty(false);
    } finally { onWorking(false); }
  }
  function refresh() { setBreaks([]); setReviewed(false); setDirty(false); manager.refresh(); onRefreshYears(); }
  const inputClass = 'min-h-12 w-full min-w-0 rounded-2xl border border-slate-300 bg-white py-3 pl-10 pr-2 text-sm text-institutional-950';
  return <div className="space-y-6">
    <dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-slate-600">Inicio de clases</dt><dd className="text-xl font-bold">{formatCivilDate(year.fecha_inicio)}</dd></div>
      <div><dt className="text-slate-600">Fin de clases</dt><dd className="text-xl font-bold">{formatCivilDate(year.fecha_fin)}</dd></div></dl>
    {year.estado === 'CERRADO' && <p>Este año está cerrado. Puedes consultar su programación.</p>}
    {manager.loading && <LoadingState message="Consultando la programación…" />}
    {manager.error && <ErrorState message={manager.error} />}
    {manager.message && <p role="status" className="rounded-xl bg-sky-50 p-3">{manager.message}</p>}
    <fieldset disabled={disabled} className="space-y-5">
      <legend className="mb-3 font-bold">Niveles</legend>
      <div className="flex flex-wrap gap-5">{programLevels.map(level => <label key={level} className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={levels.includes(level)} onChange={event => change(() => setLevels(current =>
          event.target.checked ? programLevels.filter(value => current.includes(value) || value === level) : current.filter(value => value !== level)))} />{levelNames[level]}</label>)}</div>
      {different && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">Los niveles tienen programaciones diferentes. Puedes seleccionar un solo nivel o revisar expresamente los cambios antes de aplicar una programación común.</p>}
      {selected.map(row => <details key={row.nivel} className="rounded-xl border border-slate-200 p-3" open>
        <summary className="cursor-pointer font-semibold">Programación existente de {levelNames[row.nivel]}</summary>
        {!row.periodos.length ? <p className="mt-2 text-sm">Sin programación. Esto no significa que todo el año sea un receso.</p> : <div className="mt-2 space-y-2 text-sm">
          <p>Períodos de clases: {row.periodos.map(intervalLabel).join('; ')}.</p>
          <p>Intervalos sin clases por revisar: {row.intervalos.length ? row.intervalos.map(intervalLabel).join('; ') : 'ninguno'}.</p>
          <p>Estos intervalos no se consideran vacaciones automáticamente.</p>
          <Button variant="secondary" onClick={() => change(() => setBreaks(row.intervalos.map(gap => ({ ...gap }))))}>Usar intervalos de {levelNames[row.nivel]}</Button>
        </div>}
      </details>)}
      <h3 className="text-xl font-bold">Recesos programados</h3>
      {breaks.map((row, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto]">
        {(['fecha_inicio', 'fecha_fin'] as const).map((field, position) => <div key={field} className={position ? 'col-start-1 sm:col-start-3' : ''}>
          <label htmlFor={`${id}-${index}-${field}`} className="mb-2 block text-sm font-medium">{position ? 'Hasta' : 'Desde'} · receso {index + 1}</label>
          <div className="relative"><CalendarDays size={19} aria-hidden="true" className="pointer-events-none absolute left-3 top-4 text-slate-600" />
            <input id={`${id}-${index}-${field}`} type="date" min={year.fecha_inicio} max={year.fecha_fin} value={row[field]} className={inputClass}
              onChange={event => change(() => setBreaks(current => current.map((item, i) => i === index ? { ...item, [field]: event.target.value } : item)))} /></div>
        </div>)}
        <span aria-hidden="true" className="hidden self-end pb-3 text-slate-600 sm:col-start-2 sm:row-start-1 sm:block">al</span>
        <Button variant="tertiary" className="col-start-2 row-span-2 row-start-1 sm:col-start-4 sm:row-span-1" aria-label={`Quitar receso ${index + 1}`}
          onClick={() => change(() => setBreaks(current => current.filter((_, i) => i !== index)))}><Trash2 size={22} /></Button>
      </div>)}
      <Button variant="secondary" className="w-full rounded-full text-blue-700" disabled={disabled || breaks.length >= 50}
        onClick={() => change(() => setBreaks(current => [...current, { fecha_inicio: '', fecha_fin: '' }]))}><Plus size={22} />Agregar receso</Button>
      {existing && <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={reviewed} className="mt-1 size-4 shrink-0"
        onChange={event => { manager.invalidate(); setReviewed(event.target.checked); setDirty(true); }} />Revisé los intervalos existentes de los niveles seleccionados y quiero preparar esta programación.</label>}
      <Button disabled={disabled || !valid || (existing && !reviewed) || Boolean(manager.error)} onClick={() => void request()}>Revisar programación</Button>
    </fieldset>
    {manager.preview ? <ProgrammingPreview key={manager.preview.revision} preview={manager.preview} disabled={disabled}
      onConfirm={() => void request(true)} /> : <section aria-label="Vista previa de programación"><h3 className="text-xl font-bold">Vista previa</h3>
      <p className="mt-2 text-sm text-slate-600">{breaks.length} recesos configurados. Revisa la programación antes de guardar.</p></section>}
    <Button variant="secondary" disabled={manager.busy || manager.loading} onClick={refresh}>Consultar programación</Button>
  </div>;
}
