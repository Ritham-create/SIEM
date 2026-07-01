import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Layout
import Layout from './components/layout/Layout';

// Pages
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import LogExplorer from './pages/LogExplorer/LogExplorer';
import Alerts from './pages/Alerts/Alerts';
import Cases from './pages/Cases/Cases';
import Rules from './pages/Rules/Rules';
import Intel from './pages/Intel/Intel';
import Users from './pages/Users/Users';
import ThreatIntel from './pages/ThreatIntel/ThreatIntel'; // 

// Shield Protected Route component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#ffffff] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2979ff]"></div>
          <span className="mt-4 text-[#666666] font-medium text-sm">Authenticating Secure Gateway...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes inside Layout */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/alerts" element={
          <ProtectedRoute>
            <Layout>
              <Alerts />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/search" element={
          <ProtectedRoute>
            <Layout>
              <LogExplorer />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/rules" element={
          <ProtectedRoute>
            <Layout>
              <Rules />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/cases" element={
          <ProtectedRoute>
            <Layout>
              <Cases />
            </Layout>
          </ProtectedRoute>
        } />

        {/* Admin Only Route */}
        <Route path="/users" element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <Layout>
              <Users />
            </Layout>
          </ProtectedRoute>
        } />

        {/* ✅ NEW: Threat Intelligence Route */}
        <Route path="/threat-intel" element={
          <ProtectedRoute>
            <Layout>
              <ThreatIntel />
            </Layout>
          </ProtectedRoute>
        } />

        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
