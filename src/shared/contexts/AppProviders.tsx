import { createContext, useContext, useMemo, useState } from 'react';

interface AppShellContextValue {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (value: boolean) => void;
}

const AppShellContext = createContext<AppShellContextValue | undefined>(undefined);

export function AppShellProvider({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const value = useMemo(
    () => ({ sidebarCollapsed, setSidebarCollapsed }),
    [sidebarCollapsed],
  );

  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

export function useAppShell() {
  const context = useContext(AppShellContext);

  if (!context) {
    throw new Error('useAppShell must be used within AppShellProvider');
  }

  return context;
}
