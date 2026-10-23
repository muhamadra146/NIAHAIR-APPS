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

/** Baris POS yang dibutuhkan untuk menghitung diskon membership persen */
export interface PosDiscountLine {
  price:        string;
  qty:          string;
  discount:     string;
  discountType: "AMOUNT" | "PERCENT";
  isMaterial:   boolean;
  memberItem?:  MemberEligibilityItem | null;
}

/**
 * Total diskon membership persen dari baris POS (dikirim sebagai membershipDiscountTotal).
 * Di POS persen membership dipasang langsung sebagai persen baris; bagian membership per baris
 * maksimal persen paket — persen yang dinaikkan kasir (mis. 20% untuk Gold 10%) kelebihannya
 * adalah diskon item, bukan diskon membership.
 */
export function posMembershipPercentTotal(
  lines: PosDiscountLine[],
  membership: (MemberDiscountConfig & { discountValue: string | number }) | null | undefined,
): number {
  if (!membership) return 0;
  const memberPct = Number(membership.discountValue) || 0;
  return lines.reduce((sum, l) => {
    if (!isMemberDiscountEligible(l.memberItem, membership, l.isMaterial) || l.discountType !== "PERCENT") return sum;
    const price = parseFloat(l.price) || 0;
    const qty   = parseFloat(l.qty)   || 0;
    const pct   = Math.min(parseFloat(l.discount) || 0, memberPct);
    return sum + (price * qty * pct) / 100;
  }, 0);
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

  let ownPct = item.discountPercent != null ? Number(item.discountPercent) : null;
  if (item.discountType === "PERCENT" && ownPct != null) {
    own     = Math.round(((gross * ownPct) / 100) * 100) / 100;
    memPart = Math.max(0, total - own);
    if (memPct > 0 && memPart <= 0.009) {
      // Invoice dari POS: persen membership dipasang langsung sebagai persen baris (tidak ditambah).
      // Bagian membership = min(persen baris, persen paket); sisanya diskon item.
      const memLinePct = Math.min(ownPct, memPct);
      memPart = Math.min(total, Math.round(((gross * memLinePct) / 100) * 100) / 100);
      own     = Math.max(0, total - memPart);
      ownPct  = ownPct - memLinePct;
    }
  } else {
    memPart = Math.min(memPart, total);
    own     = Math.max(0, total - memPart);
  }

  const parts: DiscountPart[] = [];
  if (own > 0.009) {
    const label = item.discountType === "PERCENT" && ownPct != null
      ? `Diskon ${pct(ownPct)}`
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
