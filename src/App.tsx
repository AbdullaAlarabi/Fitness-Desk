import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout';
import { TodayPage } from './pages/today-page';
import { PlanPage } from './pages/plan-page';
import { WorkoutPage } from './pages/workout-page';
import { BodyPage } from './pages/body-page';
import { ProgressPage } from './pages/progress-page';
import { SeedPage } from './pages/seed-page';

export default function App() {
  return (
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
  );
}
