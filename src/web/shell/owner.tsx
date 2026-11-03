import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api, errorMessage, refreshWorkspace } from '../lib/api';
import { deviceTimeZone } from '../lib/dates/civil-date';
import type { Owner } from './LoginScreen';

export interface OwnerValue {
  owner: Owner;
  /**
   * The owner's time zone (docs/etapas/10-quadro-tarefa.md, decision 1): today, late and the 14 days of the
   * done column count in it. UTC until set; the first load sets it to this device's.
   */
  timeZone: string;
  /**
   * "Usar o fuso deste aparelho" in the Perfil: resolves to null once stored, or to why it was not, as a fixed
   * offset the server refuses.
   */
  setTimeZone: (timeZone: string) => Promise<string | null>;
}

const OwnerContext = createContext<OwnerValue | null>(null);

export function useOwner() {
  const value = useContext(OwnerContext);
  if (!value) throw new Error('Contexto do aplicativo indisponível');
  return value;
}

/** Who is signed in, and the time zone the app counts days in (WF-4). */
export function OwnerProvider({ owner, children }: { owner: Owner; children: ReactNode }) {
  const [timeZone, setZone] = useState(owner.timeZone ?? 'UTC');
  const setTimeZone = useCallback(async (next: string) => {
    try {
      const saved = await api.auth.setTimeZone({ timeZone: next });
      setZone(saved.timeZone);
      // The board's window and the late counts are the server's, in the zone just set.
      await refreshWorkspace();
      return null;
    } catch (error) {
      return errorMessage(error);
    }
  }, []);
  // The first load with no zone stored, or a stored offset the server now reads as none, gives it this device's
  // once per load; a refusal leaves UTC, which the Perfil shows.
  const unset = !owner.timeZone;
  useEffect(() => {
    if (unset) void setTimeZone(deviceTimeZone());
  }, [unset, setTimeZone]);
  const value: OwnerValue = { owner, timeZone, setTimeZone };
  return <OwnerContext.Provider value={value}>{children}</OwnerContext.Provider>;
}
