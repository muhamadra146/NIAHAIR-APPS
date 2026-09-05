/**
 * ui-utils.ts — shared UI constants untuk konsistensi design di semua halaman.
 *
 * Import dari sini, jangan hardcode ulang di tiap file.
 */

/**
 * CSS class standar untuk filter input (search input, select dropdown).
 * Dipakai di semua halaman pada area filter/search.
 *
 * @example
 * <Input className={filterInputCls} placeholder="Cari..." />
 * <select className={filterInputCls}>...</select>
 */
export const filterInputCls =
  "h-9 rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow " +
  "hover:shadow-md focus-visible:shadow-md focus-visible:ring-ring/30";

/**
 * CSS class standar untuk skeleton loading rows di dalam tabel.
 * Gunakan sebagai className pada Skeleton component.
 */
export const skeletonRowCls = "h-12 w-full rounded-none";
