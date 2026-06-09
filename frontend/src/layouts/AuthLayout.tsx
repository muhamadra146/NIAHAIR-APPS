import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <span className="text-lg font-bold text-primary-foreground">N</span>
          </div>
          <h1 className="text-2xl font-bold">NIAHAIR ERP</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Salon management system
          </p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
