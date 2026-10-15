import { describe, it, expect, afterEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useViewOnly } from "./useViewOnly";

// Regression: ISSUE-002 — Finance dilempar ke Dashboard saat membuka invoice dari Dashboard Keuangan.
// Keputusan user 2026-10-15: Finance boleh MELIHAT invoice & pembayaran, tanpa tombol aksi.
// Found by /qa on 2026-10-15
// Report: .gstack/qa-reports/qa-report-localhost-2026-10-15.md

afterEach(cleanup);

const viewOnlyAt = (roleCode: string, path: string) => {
  useAuthStore.setState({ user: { roleCode } as never });
  const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>;
  return renderHook(() => useViewOnly(), { wrapper }).result.current;
};

describe("useViewOnly — halaman Invoice", () => {
  it.each(["/invoices", "/invoices/inv-1", "/invoice-payments"])("Finance lihat saja di %s", (path) => {
    expect(viewOnlyAt("FINANCE", path)).toBe(true);
  });

  it.each(["CASHIER", "MANAGER", "SUPER_ADMIN"])("%s tetap bisa beraksi di /invoices", (role) => {
    expect(viewOnlyAt(role, "/invoices")).toBe(false);
  });
});
