import { Navigate, Route, Routes } from 'react-router-dom';
import { PrivateRoute } from '../auth/PrivateRoute';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginPage } from '../features/auth/LoginPage';
import { TestCaseListPage } from '../features/test-cases/TestCaseListPage';
import { BugListPage } from '../features/bugs/BugListPage';
import { MonitoringDashboardPage } from '../features/monitoring/MonitoringDashboardPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<PrivateRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/test-cases" replace />} />
          <Route path="/test-cases" element={<TestCaseListPage />} />
          <Route path="/bugs" element={<BugListPage />} />
          <Route path="/monitoring" element={<MonitoringDashboardPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
