import { useEffect, useId, useRef, useState } from 'react';
import Button from '../../../shared/components/Button';
import ErrorState from '../../../shared/components/ErrorState';
import { useUnsavedChanges } from '../../../shared/navigation/useUnsavedChanges';
import type { SchoolYear, SchoolYearUpdate } from './aniosEscolares.types';
import { loadPrograms } from '../calendario-lectivo/programacion/programacion.api';
import type { ProgramPeriod } from '../calendario-lectivo/programacion/programacion.types';
import LoadingState from '../../../shared/components/LoadingState';
import { apiErrorMessage } from '../../../shared/api/apiError';

export default function SchoolYearEditForm({ year, busy, uncertain, error, onSave, onCancel, onRefresh }: {
  year: SchoolYear; busy: boolean; uncertain: boolean; error: string;
  onSave: (input: SchoolYearUpdate) => void; onCancel: () => void; onRefresh: () => void;
}) {
  const id = useId(), dialog = useRef<HTMLDialogElement>(null);
  const [start, setStart] = useState(year.fecha_inicio), [end, setEnd] = useState(year.fecha_fin);
  const [snapshot, setSnapshot] = useState<{ periods: ProgramPeriod[]; error: string } | null>(null);
  useEffect(() => {
    let current = true;
    loadPrograms(year).then(levels => { if (current) setSnapshot({ periods: levels.flatMap(level => level.periodos), error: '' }); })
      .catch((cause: unknown) => { if (current) setSnapshot({ periods: [], error: apiErrorMessage(cause) }); });
    return () => { current = false; };
  }, [year]);
  const dirty = start !== year.fecha_inicio || end !== year.fecha_fin;
  useUnsavedChanges(`edit-school-year:${year.id}`, dirty || uncertain, busy);
  useEffect(() => { const element = dialog.current!; element.showModal(); return () => element.close(); }, []);
  const disabled = busy || uncertain || !snapshot || Boolean(snapshot.error);
  const field = 'mt-2 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2';
  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || !dirty) return;
    onSave({
      ...(start !== year.fecha_inicio ? { fecha_inicio: start } : {}),
      ...(end !== year.fecha_fin ? { fecha_fin: end } : {}),
      valores_esperados: { fecha_inicio: year.fecha_inicio, fecha_fin: year.fecha_fin, estado: year.estado, periodos: snapshot!.periods },
    });
  }
  return <dialog ref={dialog} aria-labelledby={`${id}-title`}
    onCancel={event => { event.preventDefault(); if (!busy && !uncertain) onCancel(); }}
    className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-950/40">
    <form aria-label={`Editar año escolar ${year.anio}`} onSubmit={submit} className="space-y-4">
      <h2 id={`${id}-title`} className="text-xl font-bold">Editar año escolar {year.anio}</h2>
      <p className="text-sm text-slate-600">Actualiza las fechas del año escolar. El año y su estado se conservan.</p>
      {!snapshot && <LoadingState message="Consultando los períodos del año…" />}
      {snapshot?.error && <ErrorState message={snapshot.error} />}
      <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-2">
        <label htmlFor={`${id}-start`} className="text-sm font-semibold">Fecha de inicio
          <input id={`${id}-start`} name="fecha_inicio" type="date" required min="1000-01-01" max={end || '9999-12-31'}
            className={field} value={start} onChange={event => setStart(event.target.value)} /></label>
        <label htmlFor={`${id}-end`} className="text-sm font-semibold">Fecha de finalización
          <input id={`${id}-end`} name="fecha_fin" type="date" required min={start || '1000-01-01'} max="9999-12-31"
            className={field} value={end} onChange={event => setEnd(event.target.value)} /></label>
      </fieldset>
      {error && <ErrorState message={error} />}
      <div className="flex flex-wrap gap-3">
        {!uncertain && <><Button type="submit" disabled={disabled || !dirty}>{busy ? 'Guardando…' : 'Guardar cambios'}</Button>
          <Button variant="secondary" disabled={busy} onClick={onCancel}>Cancelar</Button></>}
        {(error || snapshot?.error) && <Button variant="secondary" disabled={busy} onClick={onRefresh}>Consultar años</Button>}
      </div>
    </form>
  </dialog>;
}
