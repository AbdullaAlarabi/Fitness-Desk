import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { subscribeDashboardRefresh } from '../lib/dashboardEvents';
import { getFitnessDeskState, getInitialFitnessDeskState, type FitnessDeskState } from '../services/fitnessDeskState';

type FitnessDeskStateContextValue = {
  state: FitnessDeskState;
  syncing: boolean;
  refresh: () => Promise<void>;
};

const FitnessDeskStateContext = createContext<FitnessDeskStateContextValue | null>(null);

export function FitnessDeskStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FitnessDeskState>(() => getInitialFitnessDeskState());
  const [syncing, setSyncing] = useState(true);

  async function refresh() {
    setSyncing(true);
    try {
      const next = await getFitnessDeskState();
      setState(next);
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
      refresh
    }),
    [state, syncing]
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
