import { createContext, useContext, useState } from "react";

interface LayoutContextValue {
  sidebarOpen:   boolean;
  toggleSidebar: () => void;
  closeSidebar:  () => void;
}

const LayoutContext = createContext<LayoutContextValue>({
  sidebarOpen:   false,
  toggleSidebar: () => {},
  closeSidebar:  () => {},
});

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <LayoutContext.Provider
      value={{
        sidebarOpen,
        toggleSidebar: () => setSidebarOpen((v) => !v),
        closeSidebar:  () => setSidebarOpen(false),
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export const useLayout = () => useContext(LayoutContext);
