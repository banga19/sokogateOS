import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'

// Lazy-loaded pages for code splitting
const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const TermsAcceptancePage = lazy(() => import('./pages/TermsAcceptancePage'))
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage'))
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'))
const ProcurementDashboard = lazy(() => import('./pages/ProcurementDashboard'))
const LogisticsDashboard = lazy(() => import('./pages/LogisticsDashboard'))
const ExecutiveDashboard = lazy(() => import('./pages/ExecutiveDashboard'))
const QMeDashboard = lazy(() => import('./pages/QMeDashboard'))
const WhatsAppDashboard = lazy(() => import('./pages/WhatsAppDashboard'))
const SupplierTrustDashboard = lazy(() => import('./pages/SupplierTrustDashboard'))
const CustomsDashboard = lazy(() => import('./pages/CustomsDashboard'))
const LandingPage = lazy(() => import('./pages/LandingPage'))
const HermesAdminPage = lazy(() => import('./pages/HermesAdminPage'))

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-primary-600 border-t-transparent" />
        <p className="text-gray-500 dark:text-gray-400 text-sm animate-pulse">Loading...</p>
      </div>
    </div>
  )
}

function PageSuspense({ children }) {
  return <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingFallback />
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingFallback />
  }

  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<PageSuspense><LandingPage /></PageSuspense>} />
        <Route path="/login" element={
          <PageSuspense>{user ? <Navigate to="/" replace /> : <LoginPage />}</PageSuspense>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary fallbackMessage="Failed to load the main dashboard.">
                <PageSuspense><DashboardPage /></PageSuspense>
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/terms-acceptance" element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary fallbackMessage="Failed to load terms acceptance page.">
                <PageSuspense><TermsAcceptancePage /></PageSuspense>
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/terms-of-service" element={
          <PageSuspense><TermsOfServicePage /></PageSuspense>
        } />
        <Route path="/privacy-policy" element={
          <PageSuspense><PrivacyPolicyPage /></PageSuspense>
        } />
        <Route path="/procurement" element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary fallbackMessage="Failed to load the procurement dashboard.">
                <PageSuspense><ProcurementDashboard /></PageSuspense>
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/logistics" element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary fallbackMessage="Failed to load the logistics dashboard.">
                <PageSuspense><LogisticsDashboard /></PageSuspense>
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/executive" element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary fallbackMessage="Failed to load the executive dashboard.">
                <PageSuspense><ExecutiveDashboard /></PageSuspense>
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/qme" element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary fallbackMessage="Failed to load the QMe dashboard.">
                <PageSuspense><QMeDashboard /></PageSuspense>
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/whatsapp" element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary fallbackMessage="Failed to load the WhatsApp dashboard.">
                <PageSuspense><WhatsAppDashboard /></PageSuspense>
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/supplier-trust" element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary fallbackMessage="Failed to load the Supplier Trust Network.">
                <PageSuspense><SupplierTrustDashboard /></PageSuspense>
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/hermes-admin" element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary fallbackMessage="Failed to load the Hermes Admin Page.">
                <PageSuspense><HermesAdminPage /></PageSuspense>
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/customs" element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary fallbackMessage="Failed to load the Customs Engine.">
                <PageSuspense><CustomsDashboard /></PageSuspense>
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  )
}
