import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster as SonnerToaster } from 'sonner';
import './App.css';
import { AppLayout } from '@/components/AppLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { FullPageLoading } from '@/components/Feedback';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { UploadPage } from '@/pages/UploadPage';
import { AnalysisPage } from '@/pages/AnalysisPage';
import { ProfilesPage } from '@/pages/ProfilesPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { bootstrap } from '@/lib/service';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { ThemeProvider } from '@/lib/theme-context';

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return <FullPageLoading label="Initializing…" />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/profiles" element={<ProfilesPage />} />
          <Route path="/profiles/:name" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await bootstrap();
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return <FullPageLoading label="Initializing database and sample data…" />;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <SonnerToaster position="top-right" richColors closeButton />
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
