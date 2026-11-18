import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { StaticSchema } from './api';

export const StaticCtx = createContext<StaticSchema | null>(null);
export function useStatic(): StaticSchema {
  const v = useContext(StaticCtx);
  if (!v) throw new Error('Schema belum dimuat');
  return v;
}

type Toast = { kind: 'ok' | 'err'; text: string };
export const ToastCtx = createContext<(t: Toast) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export const navigate = (hash: string) => {
  location.hash = hash;
};
