import { NavLink, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Activity, CalendarDays, Dumbbell, LineChart, Scale } from 'lucide-react';
import { assetUrl } from '../lib/assets';
import { buildDashboardCommandSummary } from '../services/dashboardCommandService';
import { useFitnessDeskState } from '../state/fitnessDeskState';

type NavItem = {
  to: string;
  label: string;
  icon: typeof Activity;
};

const navItems: NavItem[] = [
  { to: '/', label: 'Today', icon: Activity },
  { to: '/plan', label: 'Plan', icon: CalendarDays },
  { to: '/workout', label: 'Train', icon: Dumbbell },
  { to: '/body', label: 'Body', icon: Scale },
  { to: '/progress', label: 'Progress', icon: LineChart }
];

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { state } = useFitnessDeskState();
  const summary = buildDashboardCommandSummary(state, {
    runs: state.runningSessions,
    bestThreePointTwoKmSeconds: 1200,
    latestThreePointTwoKmSeconds: 1200,
    targetThreePointTwoKmSeconds: 900,
    baselineThreePointTwoKmSeconds: 1200,
    currentPaceSecondsPerKm: 375,
    targetPaceSecondsPerKm: 281,
    baselineSpeedKmh: 9.6,
    targetSpeedKmh: 12.8,
    latestSpeedKmh: 9.6,
    improvementSeconds: 0,
    progressPercent: 0,
    nextTestDate: '--',
    milestones: []
  });
  const headerContext = getHeaderContext(location.pathname, state);

  return (
    <div className="app-shell">
      <div className="fd-shell-root app-shell-root">
        <header className="app-header fd-shell-header">
          <div className="app-header__brand">
            <div className="app-header__logo">
              <img
                src={assetUrl('media/brand/fitness_desk_app_icon.png')}
                alt="Fitness Desk app icon"
                className="h-7 w-7 rounded-xl object-cover sm:h-8 sm:w-8"
              />
            </div>
            <div className="min-w-0">
              <p className="app-header__title">Fitness Desk</p>
              <p className="app-header__subtitle">{headerContext}</p>
            </div>
          </div>

          <div className="app-header__status">
            <p className="hidden max-w-[36rem] text-sm leading-6 text-white/72 lg:block">
              {summary.commandLine}
            </p>
            <div className="app-header__chip">
              <span className="h-2 w-2 rounded-full bg-gold" />
              <span>{state.currentSession.title}</span>
            </div>
          </div>
        </header>

        <div className="app-main">
          <aside className="desktop-nav hidden lg:block">
            <nav className="fd-card sticky top-5 p-3">
              <div className="mb-4 px-3 pt-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Navigation</p>
              </div>
              <div className="space-y-2">{navItems.map((item) => <NavEntry key={item.to} item={item} />)}</div>
            </nav>
          </aside>

          <main className="page safe-bottom min-w-0" data-app-ready="true" data-app-source={state.source}>
            <div className="content-stack mx-auto w-full max-w-[var(--page-max-width)]">{children}</div>
          </main>
        </div>
      </div>

      <nav className="mobile-tabbar fd-shell-mobile-nav lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1.5 px-2">
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
          mobile ? 'min-h-[52px] flex-col gap-1 px-2 py-2.5 text-[11px]' : 'gap-3 px-4 py-3.5 text-sm',
          isActive
            ? mobile
              ? 'bg-teal text-white shadow-float'
              : 'bg-teal text-white shadow-float'
            : 'text-muted hover:border-line hover:bg-[rgba(255,255,255,0.52)] hover:text-teal'
        ].join(' ')
      }
      aria-label={item.label}
    >
      {({ isActive }) => (
        <>
          {!mobile ? <span className={`absolute left-0 top-3 bottom-3 w-1 rounded-full ${isActive ? 'bg-gold' : 'bg-transparent'}`} /> : null}
          <Icon className={mobile ? `h-[18px] w-[18px] ${isActive ? 'text-gold' : ''}` : `h-4 w-4 ${isActive ? 'text-gold' : ''}`} />
          <span className="font-medium">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

function getHeaderContext(pathname: string, state: ReturnType<typeof useFitnessDeskState>['state']) {
  if (pathname === '/') return `${state.currentDateLabel} · ${state.currentSession.title}`;
  if (pathname === '/plan') return 'Private Performance Desk';
  if (pathname === '/workout') return `${state.currentSession.dayNumber}/7 · ${state.currentSession.title}`;
  if (pathname === '/body') return state.body.dailyWeightKg !== null ? `${state.body.dailyWeightKg} kg latest` : 'Daily check-ins';
  if (pathname === '/progress') return `Consistency ${state.progress.consistencyScore}%`;
  return 'Private Performance Desk';
}
