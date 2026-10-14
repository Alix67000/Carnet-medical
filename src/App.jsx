import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { InjectionsProvider } from './context/InjectionsContext';
import ProtectedRoute from './components/ProtectedRoute';
import TopHeader from './components/TopHeader';
import BottomNav from './components/BottomNav';
import OfflineIndicator from './components/OfflineIndicator';

import Login from './pages/Login';
import Home from './pages/Home';
import NewInjection from './pages/NewInjection';
import History from './pages/History';
import Settings from './pages/Settings';

// Layout principal pour les pages connectées (Mobile-First)
function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900">
      <div className="w-full">
        <OfflineIndicator />
        <TopHeader />
        <main className="max-w-md mx-auto px-4 pt-4 pb-20 w-full">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <InjectionsProvider>
        <BrowserRouter>
          <Routes>
            {/* Route publique de connexion */}
            <Route path="/login" element={<Login />} />

            {/* Routes privées protégées par Firebase Auth */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/new" element={<NewInjection />} />
                <Route path="/history" element={<History />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>

            {/* Fallback de redirection */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </InjectionsProvider>
    </AuthProvider>
  );
}
