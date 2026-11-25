import { useState } from 'react';
import Button from '../../../../shared/components/Button';
import { levelNames, type ProgramPreview } from './programacion.types';
import { intervalLabel } from './programacion.intervals';

export default function ProgrammingPreview({ preview, disabled, onConfirm }: {
  preview: ProgramPreview; disabled: boolean; onConfirm: () => void;
}) {
  const [accepted, setAccepted] = useState(false);
  return <section aria-label="Vista previa de programación" className="space-y-4 rounded-xl bg-sky-50 p-4 text-institutional-950">
    <h3 className="text-xl font-bold">Vista previa</h3>
    <p className="text-sm">Revisa los cambios de cada nivel antes de confirmar.</p>
    {preview.niveles.map(plan => <div key={plan.nivel} className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="font-bold">{levelNames[plan.nivel]}</h4>
      <p className="text-sm font-semibold">Períodos de clases resultantes</p>
      {plan.periodos.length ? <ul className="space-y-1 text-sm">{plan.periodos.map(row => <li key={row.fecha_inicio}>{intervalLabel(row)}</li>)}</ul>
        : <p className="text-sm">No habrá períodos de clases en este nivel.</p>}
      <ul className="space-y-1 text-sm">
        {plan.cambios.conservar.map(row => <li key={`keep-${row.id}`}>Conservar: {intervalLabel(row)}</li>)}
        {plan.cambios.modificar.map(row => <li key={`change-${row.antes.id}`}>Modificar: {intervalLabel(row.antes)} → {intervalLabel(row.despues)}</li>)}
        {plan.cambios.crear.map(row => <li key={`new-${row.fecha_inicio}`}>Crear: {intervalLabel(row)}</li>)}
        {plan.cambios.quitar.map(row => <li key={`remove-${row.id}`}>Dejar de usar el período: {intervalLabel(row)}</li>)}
      </ul>
      <p className="text-sm">Excepciones individuales que se conservan: {plan.excepciones_conservadas}.</p>
      {plan.impacto.sesiones > 0 || plan.impacto.asistencias > 0 ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
        Hay {plan.impacto.sesiones} sesiones y {plan.impacto.asistencias} registros de asistencia en fechas cuya condición lectiva cambiará.
        Se conservarán íntegros; las fechas no lectivas quedarán disponibles solo para consulta de las asistencias existentes.
      </p> : <p className="text-sm">No hay asistencias ni sesiones en fechas cuya condición lectiva cambie.</p>}
    </div>)}
    <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={accepted} disabled={disabled}
      className="mt-1 size-4 shrink-0" onChange={event => setAccepted(event.target.checked)} />
      Confirmo la programación revisada y la conservación de las asistencias anteriores.</label>
    <Button disabled={disabled || !accepted} onClick={onConfirm}>Confirmar programación</Button>
  </section>;
}
