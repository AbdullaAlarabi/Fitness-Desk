const DASHBOARD_REFRESH_EVENT = 'fitness-desk:dashboard-refresh';

export function emitDashboardRefresh() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(DASHBOARD_REFRESH_EVENT));
}

export function subscribeDashboardRefresh(listener: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(DASHBOARD_REFRESH_EVENT, listener);
  return () => window.removeEventListener(DASHBOARD_REFRESH_EVENT, listener);
}

