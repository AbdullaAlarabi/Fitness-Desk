import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { subscribeDashboardRefresh } from '../lib/dashboardEvents';
import {
  FitnessDeskStateSyncError,
  getFitnessDeskState,
  getInitialFitnessDeskState,
  type FitnessDeskState
} from '../services/fitnessDeskState';

type FitnessDeskStateContextValue = {
  state: FitnessDeskState;
  syncing: boolean;
  syncError: string | null;
  refresh: () => Promise<void>;
};

const FitnessDeskStateContext = createContext<FitnessDeskStateContextValue | null>(null);

export function FitnessDeskStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FitnessDeskState>(() => getInitialFitnessDeskState());
  const [syncing, setSyncing] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  async function refresh() {
    setSyncing(true);
    try {
      const next = await getFitnessDeskState();
      setState(next);
      setSyncError(null);
    } catch (error) {
      console.error('Fitness Desk state sync failed.', error);
      if (error instanceof FitnessDeskStateSyncError) {
        setSyncError(error.message);
      } else if (error instanceof Error) {
        setSyncError(error.message);
      } else {
        setSyncError('Unknown Supabase sync error.');
      }
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    void refresh();
    const unsubscribe = subscribeDashboardRefresh(() => {
      void refresh();
    });
    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({
      state,
      syncing,
      syncError,
      refresh
    }),
    [state, syncing, syncError]
  );

  return <FitnessDeskStateContext.Provider value={value}>{children}</FitnessDeskStateContext.Provider>;
}

export function useFitnessDeskState() {
  const context = useContext(FitnessDeskStateContext);
  if (!context) {
    throw new Error('useFitnessDeskState must be used inside FitnessDeskStateProvider.');
  }
  return context;
}
