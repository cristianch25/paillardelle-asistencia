import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { apiErrorMessage } from '../../../../shared/api/apiError';
import type { SchoolYear } from '../../anios-escolares/aniosEscolares.types';
import { loadPrograms, requestProgramming } from './programacion.api';
import type { LevelProgram, ProgramInput, ProgramPreview } from './programacion.types';

export function useProgramming(year: SchoolYear) {
  const [reload, setReload] = useState(0), alive = useRef(true), running = useRef(false);
  const [loaded, setLoaded] = useState<{ reload: number; levels: LevelProgram[]; error: string }>({ reload: -1, levels: [], error: '' });
  const [preview, setPreview] = useState<ProgramPreview | null>(null), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [uncertain, setUncertain] = useState(false), [message, setMessage] = useState('');
  useEffect(() => {
    let current = true; alive.current = true;
    loadPrograms(year).then(levels => { if (current) setLoaded({ reload, levels, error: '' }); })
      .catch((cause: unknown) => { if (current) setLoaded({ reload, levels: [], error: cause instanceof Error ? cause.message : apiErrorMessage(cause) }); });
    return () => { current = false; alive.current = false; };
  }, [year, reload]);
  function invalidate() { setPreview(null); setError(''); setMessage(''); }
  async function request(input: ProgramInput, confirm = false) {
    if (running.current || uncertain || loaded.reload !== reload || loaded.error || (confirm && !preview?.revision)) return;
    running.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const response = await requestProgramming(input, confirm ? preview!.revision : undefined);
      if (!alive.current) return;
      if (confirm) { setPreview(null); setMessage('Programación guardada. Las asistencias anteriores se conservan.'); setReload(value => value + 1); }
      else setPreview(response);
      return true;
    } catch (cause) {
      if (!alive.current) return;
      setPreview(null);
      const status = axios.isAxiosError(cause) ? cause.response?.status : undefined;
      const unknown = confirm && ![400, 401, 403, 404, 409, 413].includes(status ?? 0);
      setUncertain(unknown);
      const detail: unknown = axios.isAxiosError(cause) ? cause.response?.data?.error : undefined;
      setError(unknown ? 'No se pudo confirmar el resultado. Consulta la programación antes de volver a guardar.'
        : typeof detail === 'string' ? detail : apiErrorMessage(cause));
    } finally { running.current = false; if (alive.current) setBusy(false); }
  }
  function refresh() {
    if (running.current) return;
    setUncertain(false); invalidate(); setReload(value => value + 1);
  }
  return { levels: loaded.levels, loading: loaded.reload !== reload, error: error || loaded.error,
    preview, busy, uncertain, message, invalidate, request, refresh };
}
