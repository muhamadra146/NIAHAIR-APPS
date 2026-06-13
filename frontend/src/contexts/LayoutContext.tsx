import { createContext, useContext, useState } from "react";

interface LayoutContextValue {
  sidebarOpen:      boolean;
  sidebarCollapsed: boolean;
  toggleSidebar:    () => void;
  closeSidebar:     () => void;
  toggleCollapsed:  () => void;
}

const LayoutContext = createContext<LayoutContextValue>({
  sidebarOpen:      false,
  sidebarCollapsed: false,
  toggleSidebar:    () => {},
  closeSidebar:     () => {},
  toggleCollapsed:  () => {},
});

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen,      setSidebarOpen]      = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <LayoutContext.Provider
      value={{
        sidebarOpen,
        sidebarCollapsed,
        toggleSidebar:   () => setSidebarOpen((v) => !v),
        closeSidebar:    () => setSidebarOpen(false),
        toggleCollapsed: () => setSidebarCollapsed((v) => !v),
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export const useLayout = () => useContext(LayoutContext);
