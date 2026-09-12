import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'sonner';
import ErrorBoundary from '@/components/ErrorBoundary';

import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import SessionWizardLayout from '@/components/layout/SessionWizardLayout';

// Pages
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import InstrumentsPage from '@/pages/InstrumentsPage';
import NewInstrumentPage from '@/pages/NewInstrumentPage';
import TestConditionsPage from '@/pages/TestConditionsPage';
import AccuracyTestPage from '@/pages/AccuracyTestPage';
import EccentricityTestPage from '@/pages/EccentricityTestPage';
import RepeatabilityTestPage from '@/pages/RepeatabilityTestPage';
import DiscriminationTestPage from '@/pages/DiscriminationTestPage';
import SummaryPage from '@/pages/SummaryPage';
import ReportViewPage from '@/pages/ReportViewPage';
import ReportsListPage from '@/pages/ReportsListPage';
import PublicVerifyPage from '@/pages/PublicVerifyPage';
import NotFoundPage from '@/pages/NotFoundPage';

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/verify/:reportNumber" element={<PublicVerifyPage />} />

            {/* Protected Routes (Wrapped in ProtectedRoute & AppLayout) */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/instruments" element={<InstrumentsPage />} />
              <Route path="/instruments/new" element={<NewInstrumentPage />} />

              {/* Test Session Wizard Routes (Wrapped in SessionWizardLayout) */}
              <Route path="/sessions/:id" element={<SessionWizardLayout />}>
                <Route path="conditions" element={<TestConditionsPage />} />
                <Route path="accuracy" element={<AccuracyTestPage />} />
                <Route path="eccentricity" element={<EccentricityTestPage />} />
                <Route path="repeatability" element={<RepeatabilityTestPage />} />
                <Route path="discrimination" element={<DiscriminationTestPage />} />
                <Route path="summary" element={<SummaryPage />} />
                <Route path="report" element={<ReportViewPage />} />
              </Route>

              {/* Reports Registry */}
              <Route path="/reports" element={<ReportsListPage />} />
            </Route>

            {/* 404 Catch-All */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>

        {/* Global Toast Provider */}
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
