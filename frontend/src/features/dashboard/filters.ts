import { useSearchParams } from "react-router-dom";
import { toWibDateStr, wibMonthRange } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import type { FinanceDashboardParams } from "./api";

/** Nilai "cabang" di URL untuk semua cabang */
export const ALL_BRANCHES = "semua";

/**
 * Filter Dashboard Keuangan disimpan di URL (?dari=&sampai=&cabang=) supaya
 * halaman rincian dan tombol kembali memakai periode & cabang yang sama.
 * Default: bulan ini s/d hari ini, cabang aktif di header.
 */
export function useFinanceFilters() {
  const [sp, setSp] = useSearchParams();
  const activeBranchId = useAuthStore((s) => s.branchId);

  const startDate = sp.get("dari")   ?? wibMonthRange().start;
  const endDate   = sp.get("sampai") ?? toWibDateStr();
  const branch    = sp.get("cabang") ?? activeBranchId ?? ALL_BRANCHES;

  const apiParams: FinanceDashboardParams = {
    startDate,
    endDate,
    ...(branch !== ALL_BRANCHES ? { branchId: branch } : {}),
  };

  const setFilters = (next: { startDate?: string; endDate?: string; branch?: string }) => {
    const p = new URLSearchParams(sp);
    if (next.startDate !== undefined) p.set("dari", next.startDate);
    if (next.endDate   !== undefined) p.set("sampai", next.endDate);
    if (next.branch    !== undefined) p.set("cabang", next.branch);
    setSp(p, { replace: true });
  };

  /** Query string filter, untuk tautan ke halaman rincian */
  const query = new URLSearchParams({ dari: startDate, sampai: endDate, cabang: branch }).toString();

  return { startDate, endDate, branch, apiParams, setFilters, query };
}
