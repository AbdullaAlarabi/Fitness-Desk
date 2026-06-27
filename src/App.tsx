import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout';
import { TodayPage } from './pages/today-page';
import { PlanPage } from './pages/plan-page';
import { WorkoutPage } from './pages/workout-page';
import { BodyPage } from './pages/body-page';
import { ProgressPage } from './pages/progress-page';
import { SeedPage } from './pages/seed-page';
import { FitnessDeskStateProvider } from './state/fitnessDeskState';

export default function App() {
  return (
    <FitnessDeskStateProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/workout" element={<WorkoutPage />} />
          <Route path="/body" element={<BodyPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/seed" element={<SeedPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </FitnessDeskStateProvider>
  );
}
