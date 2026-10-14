import type { Invoice, InvoiceLineItem, MemberEligibilityItem, MemberDiscountConfig } from "./types";

/**
 * Item dapat diskon membership bila: bukan bahan baku, tidak ditandai "tidak kena diskon member",
 * dan kategorinya (atau kategori induknya) dicentang di paket membership. Sama dengan backend
 * membership.discount.js (keputusan user 2026-10-14).
 */
export function isMemberDiscountEligible(
  item: MemberEligibilityItem | null | undefined,
  membership: MemberDiscountConfig | null | undefined,
  isMaterial = false,
): boolean {
  if (isMaterial || !item || !membership || item.excludeMemberDiscount) return false;
  const ids = new Set((membership.discountCategories ?? []).map((d) => d.categoryId));
  if (item.categoryId && ids.has(item.categoryId)) return true;
  const parentId = item.category?.parentId;
  return !!parentId && ids.has(parentId);
}

// ── Teks diskon invoice ──────────────────────────────────────────────────────
// Kolom `discount` per item menyimpan diskon item DITAMBAH diskon membership persen
// (khusus item yang dapat diskon member). Fungsi di sini memisahkan keduanya untuk ditampilkan:
//   "Diskon 10% Rp 50.000"            ← diskon item
//   "Diskon Membership Gold 10% Rp …" ← diskon membership

const rp  = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
const pct = (n: number) => `${Number(n.toFixed(2)).toLocaleString("id-ID")}%`;

export interface DiscountPart {
  label:  string;   // "Diskon 10%", "Diskon", "Diskon Membership Gold 10%"
  amount: number;
  kind:   "item" | "membership";
}

/** Persentase membership yang dipotong per item layanan (0 bila bukan membership persen) */
function membershipPercent(invoice: Invoice): number {
  const m = invoice.membership;
  if (!m || m.discountType !== "PERCENTAGE") return 0;
  return Number(invoice.membershipDiscountTotal ?? 0) > 0 ? Number(m.discountValue) : 0;
}

/** Pecah diskon satu baris item menjadi diskon item dan diskon membership */
export function itemDiscountParts(item: InvoiceLineItem, invoice: Invoice): DiscountPart[] {
  const total = Number(item.discount);
  if (!(total > 0)) return [];

  const gross   = Number(item.price) * Number(item.qty);
  const memPct  = isMemberDiscountEligible(item.item, invoice.membership, item.isMaterial ?? false) ? membershipPercent(invoice) : 0;
  let   memPart = memPct > 0 ? Math.round((gross * memPct) / 100) : 0;
  let   own: number;

  if (item.discountType === "PERCENT" && item.discountPercent != null) {
    own     = Math.round(((gross * Number(item.discountPercent)) / 100) * 100) / 100;
    memPart = Math.max(0, total - own);
  } else {
    memPart = Math.min(memPart, total);
    own     = Math.max(0, total - memPart);
  }

  const parts: DiscountPart[] = [];
  if (own > 0.009) {
    const label = item.discountType === "PERCENT" && item.discountPercent != null
      ? `Diskon ${pct(Number(item.discountPercent))}`
      : "Diskon";
    parts.push({ label, amount: own, kind: "item" });
  }
  if (memPart > 0.009) {
    parts.push({ label: `Diskon Membership ${invoice.membership?.name ?? ""} ${pct(memPct)}`.replace(/\s+/g, " "), amount: memPart, kind: "membership" });
  }
  return parts;
}

/** Teks satu bagian diskon, mis. "Diskon 10% Rp 50.000" */
export const discountText = (p: DiscountPart) => `${p.label} ${rp(p.amount)}`;

/** Ringkasan diskon invoice per jenis (untuk ringkasan, struk, WhatsApp) */
export function invoiceDiscountSummary(invoice: Invoice): DiscountPart[] {
  const totalDiscount = Number(invoice.totalDiscount ?? 0);
  const memTotal      = Number(invoice.membershipDiscountTotal ?? 0);
  const m             = invoice.membership;
  const parts: DiscountPart[] = [];

  if (m?.discountType === "PERCENTAGE" && memTotal > 0) {
    // diskon membership persen sudah termasuk di totalDiscount (per item layanan)
    const itemOnly = Math.max(0, totalDiscount - memTotal);
    if (itemOnly > 0.009) parts.push({ label: "Diskon Item", amount: itemOnly, kind: "item" });
    parts.push({ label: `Diskon Membership ${m.name} ${pct(Number(m.discountValue))}`, amount: memTotal, kind: "membership" });
  } else {
    if (totalDiscount > 0.009) parts.push({ label: "Diskon Item", amount: totalDiscount, kind: "item" });
    // membership nominal: dipotong dari total, tidak termasuk totalDiscount
    if (memTotal > 0.009) {
      parts.push({ label: `Diskon Membership${m ? ` ${m.name}` : ""}`, amount: memTotal, kind: "membership" });
    }
  }
  return parts;
}

/** Total semua diskon (item + membership) */
export const invoiceDiscountTotal = (invoice: Invoice) =>
  invoiceDiscountSummary(invoice).reduce((a, p) => a + p.amount, 0);
