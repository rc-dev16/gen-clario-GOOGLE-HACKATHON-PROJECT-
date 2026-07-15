import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from '@/shared/layouts/PublicLayout';
import { AppLayout } from '@/shared/layouts/AppLayout';
import { ProtectedRoute } from '@/shared/routing/ProtectedRoute';
import LandingPage from '@/features/landing/pages/LandingPage';
import AuthPage from '@/features/auth/pages/AuthPage';
import AnalyzerPage from '@/features/analyze/pages/AnalyzerPage';
import DashboardPage from '@/features/dashboard/pages/DashboardPage';
import ResultPage from '@/features/results/pages/ResultPage';

const DocumentAITest = lazy(() => import('@/features/dev/DocumentAITest'));

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        {import.meta.env.DEV ? (
          <Route
            path="/test"
            element={
              <Suspense
                fallback={
                  <div className="min-h-screen flex items-center justify-center text-gray-600">
                    Loading test tools...
                  </div>
                }
              >
                <DocumentAITest />
              </Suspense>
            }
          />
        ) : null}
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/analyzer" element={<AnalyzerPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/results/:id" element={<ResultPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
