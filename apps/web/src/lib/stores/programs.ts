/**
 * Programs store — available programs and switching logic.
 */
import { writable, get } from 'svelte/store';
import { api } from '$lib/api/client';
import { profile, saveProfile } from './auth';
import { loadPhases } from './phases';
import { loadRules } from './rules';

export interface Program {
  id: string;
  name: string;
  description: string;
  color: string;
  sort_order: number;
}

export const programs = writable<Program[]>([]);
export const programsLoaded = writable(false);

const CACHE_KEY = 'aevum_programs_cache';

let _loadPromise: Promise<void> | null = null;

export function loadPrograms(): Promise<void> {
  if (_loadPromise) return _loadPromise;

  _loadPromise = api<{ programs: Program[] }>('programs', {}, { contentType: 'text/plain;charset=utf-8' })
    .then((d) => {
      if (d?.programs && Array.isArray(d.programs)) {
        programs.set(d.programs);
        programsLoaded.set(true);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(d.programs)); } catch { /* noop */ }
      }
    })
    .catch((err) => {
      console.error('[AEVUM] loadPrograms failed:', err.message || err);
      // Fallback to cache only if API fails
      if (typeof window !== 'undefined') {
        const c = localStorage.getItem(CACHE_KEY);
        if (c) {
          try { programs.set(JSON.parse(c)); } catch { /* noop */ }
        }
      }
    })
    .finally(() => { _loadPromise = null; });

  return _loadPromise;
}

/** Get the user's current program from their profile */
export function currentProgramId(): string {
  const p = get(profile);
  return (p as any)?.program_id || 'aevum';
}

/** Get the current program object */
export function currentProgram(): Program | null {
  const id = currentProgramId();
  return get(programs).find(p => p.id === id) || null;
}

/** Switch the user to a different program */
export async function switchProgram(programId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const d = await api<{ ok?: boolean; error?: string; program_id?: string }>('set_program', { program_id: programId });
    if (d?.error) return { ok: false, error: d.error };

    // Update profile with new program_id
    const p = get(profile);
    if (p) {
      saveProfile({ ...p, program_id: programId } as any);
    }

    // Reload phases and rules for the new program
    loadPhases();
    loadRules();

    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
