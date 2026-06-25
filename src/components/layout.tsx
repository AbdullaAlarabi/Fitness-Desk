import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Activity, CalendarDays, Dumbbell, LineChart, Scale } from 'lucide-react';
import { subscribeDashboardRefresh } from '../lib/dashboardEvents';
import { getDashboardCommandSummary, type DashboardCommandSummary } from '../services/dashboardCommandService';

type NavItem = {
  to: string;
  label: string;
  icon: typeof Activity;
};

const navItems: NavItem[] = [
  { to: '/', label: 'Today', icon: Activity },
  { to: '/plan', label: 'Plan', icon: CalendarDays },
  { to: '/workout', label: 'Workout', icon: Dumbbell },
  { to: '/body', label: 'Body', icon: Scale },
  { to: '/progress', label: 'Progress', icon: LineChart }
];

export function AppShell({ children }: { children: ReactNode }) {
  const [summary, setSummary] = useState<DashboardCommandSummary | null>(null);
  const location = useLocation();
  const isTodayPage = location.pathname === '/';

  useEffect(() => {
    async function loadSummary() {
      const next = await getDashboardCommandSummary();
      setSummary(next);
    }

    let mounted = true;
    void loadSummary().then(() => undefined);
    const unsubscribe = subscribeDashboardRefresh(() => {
      if (mounted) void loadSummary();
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-cream text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-[1280px] flex-col px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 lg:px-8">
        <header className={`fd-panel-dark relative mb-6 overflow-hidden ${isTodayPage ? 'px-5 py-4 sm:px-6 sm:py-4' : 'px-5 py-4 sm:px-6 sm:py-4'}`}>
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/80 to-transparent" />
          <div className="absolute -right-16 top-0 h-32 w-32 rounded-full bg-gold/12 blur-3xl" />
          <div className={isTodayPage ? '' : 'space-y-2'}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/54">Fitness Desk</p>
                <h1 className={`${isTodayPage ? 'text-xl' : 'text-base'} mt-2 font-semibold tracking-[-0.04em] text-white`}>
                  {isTodayPage ? 'Private performance desk' : 'Performance view'}
                </h1>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-white/72">
                {summary?.commandLine ?? 'Train clean. Track honestly. Adjust with data.'}
              </p>
            </div>
          </div>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[232px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <nav className="fd-card sticky top-6 p-3">
              <div className="mb-4 px-3 pt-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Navigation</p>
              </div>
              <div className="space-y-2">{navItems.map((item) => <NavEntry key={item.to} item={item} />)}</div>
            </nav>
          </aside>

          <main className="min-w-0">
            <div className="mx-auto w-full max-w-[1120px]">{children}</div>
          </main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/96 px-2 pb-[calc(0.65rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur md:px-4 lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
          {navItems.map((item) => (
            <NavEntry key={item.to} item={item} mobile />
          ))}
        </div>
      </nav>
    </div>
  );
}

function NavEntry({ item, mobile = false }: { item: NavItem; mobile?: boolean }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        [
          'group relative flex items-center rounded-2xl transition',
          mobile ? 'flex-col gap-1 px-2 py-3.5 text-[11px]' : 'gap-3 px-4 py-3.5 text-sm',
          isActive
            ? 'bg-teal text-white shadow-float'
            : 'text-muted hover:border-line hover:bg-[rgba(255,255,255,0.52)] hover:text-teal'
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          {!mobile ? <span className={`absolute left-0 top-3 bottom-3 w-1 rounded-full ${isActive ? 'bg-gold' : 'bg-transparent'}`} /> : null}
          <Icon className={mobile ? `h-5 w-5 ${isActive ? 'text-gold' : ''}` : `h-4 w-4 ${isActive ? 'text-gold' : ''}`} />
          <span className="font-medium">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}
