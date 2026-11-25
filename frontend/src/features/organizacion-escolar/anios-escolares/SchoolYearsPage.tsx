import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import Button from '../../../shared/components/Button';
import ErrorState from '../../../shared/components/ErrorState';
import LoadingState from '../../../shared/components/LoadingState';
import { formatCivilDate, peruToday } from '../../../shared/dates/civilDate';
import { changeSchoolYear, createSchoolYear, updateSchoolYear } from './aniosEscolares.api';
import type { SchoolYear, SchoolYearInput, SchoolYearUpdate } from './aniosEscolares.types';
import { useSchoolYearManagement } from './useSchoolYearManagement';
import SchoolYearForm from './SchoolYearForm';
import SchoolYearConfirmation from './SchoolYearConfirmation';
import SchoolYearEditForm from './SchoolYearEditForm';
import SchoolProgramming from '../calendario-lectivo/programacion/SchoolProgramming';

function closingAvailableFrom(end: string) {
  const date = new Date(`${end}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

function SchoolYearsContent() {
  const management = useSchoolYearManagement(), [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<{ year: SchoolYear; action: 'abrir' | 'cerrar' } | null>(null);
  const [editing, setEditing] = useState<SchoolYear | null>(null);
  const disabled = management.busy || management.uncertain || management.loading || Boolean(management.error);
  const actionDisabled = disabled || creating || Boolean(selected) || Boolean(editing);
  async function update(input: SchoolYearUpdate) {
    if (editing && await management.save(() => updateSchoolYear(editing.id, input), 'Fechas del año escolar actualizadas.')) setEditing(null);
  }
  async function create(input: SchoolYearInput) {
    if (await management.save(() => createSchoolYear(input), 'Año escolar creado en PLANIFICADO.')) setCreating(false);
  }
  async function transition() {
    if (selected && await management.save(() => changeSchoolYear(selected.year.id, selected.action),
      selected.action === 'abrir' ? 'Año escolar abierto.' : 'Año escolar cerrado. El historial se conserva.')) setSelected(null);
  }
  function refresh() { setSelected(null); setCreating(false); setEditing(null); management.refresh(); }
  return <div className="min-w-0 space-y-6">
    <header className="space-y-2"><h1 className="text-3xl font-bold tracking-tight">Años escolares</h1></header>
    <div className="flex flex-wrap gap-3"><Button disabled={actionDisabled} onClick={() => setCreating(true)}>Crear año escolar</Button></div>
    {management.message && <p role="status" className="rounded-lg bg-sky-soft p-3">{management.message}</p>}
    {management.error && !selected && !editing && <><ErrorState message={management.error} />
      <Button variant="secondary" disabled={management.busy || management.loading} onClick={refresh}>Consultar años</Button></>}
    {creating && <SchoolYearForm disabled={management.busy || management.uncertain || management.loading} busy={management.busy}
      onSave={input => void create(input)} onCancel={() => setCreating(false)} />}
    {management.loading ? <LoadingState message="Cargando años escolares…" /> : !management.error && !management.years.length ? <p>No hay años escolares registrados.</p> : null}
    {!management.loading && <div className="grid gap-4 lg:grid-cols-2">{management.years.map(year => <article key={year.id} aria-label={`Año escolar ${year.anio}`}
      className="min-w-0 space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-3xl font-bold">{year.anio}</h2><span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">{year.estado}</span></div>
      <p className="text-lg text-slate-600">{formatCivilDate(year.fecha_inicio)} – {formatCivilDate(year.fecha_fin)}</p>
      {year.estado !== 'CERRADO' && <Button variant="secondary" className="w-full rounded-full" disabled={actionDisabled}
        onClick={() => setEditing(year)}><Pencil size={20} aria-hidden="true" />Editar</Button>}
      {year.estado === 'PLANIFICADO' && <Button disabled={actionDisabled} onClick={() => setSelected({ year, action: 'abrir' })}>Abrir año</Button>}
      {year.estado === 'ABIERTO' && <><Button variant="secondary" disabled={actionDisabled || peruToday() <= year.fecha_fin}
        onClick={() => setSelected({ year, action: 'cerrar' })}>Cerrar año</Button>
        {peruToday() <= year.fecha_fin && <p className="text-sm text-slate-600">Podrás cerrar el año escolar a partir del {closingAvailableFrom(year.fecha_fin)}.</p>}</>}
      {year.estado === 'CERRADO' && <p className="text-sm text-slate-600">Cerrado. Se conserva la consulta histórica según permisos.</p>}
    </article>)}</div>}
    <SchoolProgramming years={management.years} disabled={actionDisabled} onRefreshYears={management.refresh} />
    {selected && <SchoolYearConfirmation {...selected} busy={management.busy} uncertain={management.uncertain} error={management.error}
      onConfirm={() => void transition()} onCancel={() => setSelected(null)} onRefresh={refresh} />}
    {editing && <SchoolYearEditForm key={editing.id} year={editing} busy={management.busy} uncertain={management.uncertain} error={management.error}
      onSave={input => void update(input)} onCancel={() => setEditing(null)} onRefresh={refresh} />}
  </div>;
}

export default function SchoolYearsPage() {
  const { session } = useAuth();
  return session?.user.rol === 'ADMIN' ? <SchoolYearsContent key={session.user.id} /> : <ErrorState message="La gestión de años escolares está reservada a ADMIN." />;
}
