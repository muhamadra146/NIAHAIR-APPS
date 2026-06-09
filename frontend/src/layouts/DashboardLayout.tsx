import { Outlet } from "react-router-dom";
import { LayoutProvider } from "@/contexts/LayoutContext";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { MobileSidebar } from "./components/MobileSidebar";

export function DashboardLayout() {
  return (
    <LayoutProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop sidebar — hidden on mobile */}
        <div className="hidden lg:flex lg:shrink-0">
          <Sidebar />
        </div>

        {/* Mobile drawer sidebar */}
        <MobileSidebar />

        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </LayoutProvider>
  );
}
