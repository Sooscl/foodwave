import { Navigate, Route, Routes } from 'react-router';
import { AuthProvider } from '../auth/contexts/AuthContext';
import { AppShellProvider } from '../shared/contexts/AppProviders';
import { appRoutes } from '../shared/routes';

export function AppRoutes() {
  return (
    <AppShellProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<div className="p-6 text-white">Dashboard module placeholder</div>} />
          <Route path="/crm" element={<div className="p-6 text-white">CRM module placeholder</div>} />
          <Route path="/marketing" element={<div className="p-6 text-white">Marketing module placeholder</div>} />
          <Route path="/meta" element={<div className="p-6 text-white">Meta module placeholder</div>} />
          <Route path="/google" element={<div className="p-6 text-white">Google module placeholder</div>} />
          <Route path="/wallet" element={<div className="p-6 text-white">Wallet module placeholder</div>} />
          <Route path="/notifications" element={<div className="p-6 text-white">Notifications module placeholder</div>} />
          <Route path="/analytics" element={<div className="p-6 text-white">Analytics module placeholder</div>} />
          <Route path="/settings" element={<div className="p-6 text-white">Settings module placeholder</div>} />
          <Route path="/auth/*" element={<div className="p-6 text-white">Auth module placeholder</div>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </AppShellProvider>
  );
}

export { appRoutes };
