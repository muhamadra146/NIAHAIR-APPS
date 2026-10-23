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

/**
 * Nominal diskon membership persen satu baris: harga × qty × persen, dibulatkan ke rupiah.
 * Sama dengan backend membership.discount.js memberLineDiscount.
 */
export function memberLineDiscount(price: string | number, qty: string | number, percent: string | number): number {
  return Math.round((Number(price) * Number(qty) * Number(percent)) / 100);
}

/** Baris POS (input kasir) yang dibutuhkan untuk menghitung diskon efektif */
export interface PosDiscountLine {
  price:        string;
  qty:          string;
  discount:     string;               // diskon MANUAL kasir (persen atau nominal)
  discountType: "AMOUNT" | "PERCENT";
  isMaterial:   boolean;
  memberItem?:  MemberEligibilityItem | null;
}

type PercentMembership = (MemberDiscountConfig & { discountType?: string; discountValue: string | number }) | null | undefined;

export interface LineDiscountResult {
  discount:     number;   // diskon yang dipakai pada baris
  memberShare:  number;   // bagian membership (0 bila diskon manual yang dipakai)
  manual:       number;   // nominal diskon manual
  member:       number;   // nominal diskon membership (0 bila tidak berlaku)
}

/**
 * Diskon efektif satu baris POS (keputusan owner 2026-10-23, CRM-014): pada item yang dapat
 * diskon member, dipakai yang NOMINALNYA lebih besar antara diskon membership persen dan diskon
 * manual — tidak ditumpuk; seri → membership. Sama dengan backend computeInvoiceLines.
 * `membership` = paket persen yang sedang diterapkan (null bila tidak ada / dimatikan kasir).
 */
export function effectiveLineDiscount(l: PosDiscountLine, membership: PercentMembership): LineDiscountResult {
  const price  = parseFloat(l.price) || 0;
  const qty    = parseFloat(l.qty)   || 0;
  const disc   = parseFloat(l.discount) || 0;
  // Persen dibulatkan 2 desimal seperti backend
  const manual = l.discountType === "PERCENT" ? Math.round(price * qty * disc) / 100 : disc;
  const member = membership && membership.discountType !== "FIXED_AMOUNT"
    && isMemberDiscountEligible(l.memberItem, membership, l.isMaterial)
    ? memberLineDiscount(price, qty, membership.discountValue)
    : 0;
  if (member > 0 && member >= manual) return { discount: member, memberShare: member, manual, member };
  return { discount: manual, memberShare: 0, manual, member };
}

/** Total diskon membership persen dari baris POS (dikirim sebagai membershipDiscountTotal) */
export function posMembershipPercentTotal(lines: PosDiscountLine[], membership: PercentMembership): number {
  return lines.reduce((sum, l) => sum + effectiveLineDiscount(l, membership).memberShare, 0);
}

// ── Teks diskon invoice ──────────────────────────────────────────────────────
// Kolom `discount` per item menyimpan diskon yang dipakai: diskon membership persen ATAU diskon
// item, mana yang lebih besar (keputusan owner 2026-10-23; data lama bisa berisi keduanya
// ditumpuk). Fungsi di sini menentukan jenisnya untuk ditampilkan:
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

  const memPct = isMemberDiscountEligible(item.item, invoice.membership, item.isMaterial ?? false) ? membershipPercent(invoice) : 0;
  const ownPct = item.discountType === "PERCENT" && item.discountPercent != null ? Number(item.discountPercent) : null;
  let own     = total;
  let memPart = 0;

  if (memPct > 0) {
    const gross     = Number(item.price) * Number(item.qty);
    const memberAmt = memberLineDiscount(item.price, item.qty, memPct);
    const ownAmt    = ownPct != null ? Math.round(((gross * ownPct) / 100) * 100) / 100 : null;
    if (Math.abs(total - memberAmt) < 0.01) {
      // Diskon membership yang dipakai (lebih besar / sama dengan diskon manual)
      memPart = total;
      own     = 0;
    } else if (ownAmt != null && total - ownAmt > 0.009) {
      // Data lama (sebelum 2026-10-23): diskon item + membership ditumpuk
      memPart = total - ownAmt;
      own     = ownAmt;
    }
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
