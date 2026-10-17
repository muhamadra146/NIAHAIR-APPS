'use strict';

// Regression (QA POS 2026-10-17):
//   P2 — edit invoice memotong diskon membership dua kali (10% → 20%)
//   P3 — edit invoice dengan total baru < uang yang sudah diterima diam-diam jadi Lunas
//   P4 — faktur ber-PPN / diskon persen terkirim ke Accurate dengan total salah
//        → pembayaran gagal "melebihi nilai piutang"
// Found by /qa on 2026-10-17

jest.mock('./invoice.repository', () => ({
  findById:              jest.fn(),
  findCustomerById:      jest.fn(),
  findAppointmentById:   jest.fn(),
  findBranchById:        jest.fn(),
  findItemById:          jest.fn(),
  findItemUnit:          jest.fn(),
  findActivePrice:       jest.fn(),
  findActivePriceGlobal: jest.fn(),
  findMaxInvoiceSeqToday: jest.fn().mockResolvedValue(0),
  createWithTransaction: jest.fn(),
  updateWithTransaction: jest.fn(),
}));
jest.mock('../syncQueue/syncQueue.service', () => ({ createSyncJob: jest.fn() }));
jest.mock('../inventory/inventory.service', () => ({
  generateSaleMovement: jest.fn(), reverseInvoiceSaleMovements: jest.fn(), reverseInvoiceServiceMovements: jest.fn(),
}));
jest.mock('../accurate/accurate.client', () => ({ accurateRequest: jest.fn() }));
jest.mock('./invoice.workflow', () => ({ handleInvoicePaid: jest.fn() }));
jest.mock('../membership/membership.service', () => ({ getActiveMembership: jest.fn() }));
jest.mock('../consultation/consultation.repository', () => ({ findByInvoiceId: jest.fn(), buildFirstInvoiceMap: jest.fn() }));
jest.mock('../treatment/treatmentJobAssignment.repository', () => ({ upsertMany: jest.fn() }));
jest.mock('../../config/prisma', () => ({
  commission:       { count: jest.fn().mockResolvedValue(0) },
  treatmentSession: { findFirst: jest.fn().mockResolvedValue(null) },
  invoice:          { findUnique: jest.fn().mockResolvedValue(null) },
}));

const repo = require('./invoice.repository');
const { getActiveMembership } = require('../membership/membership.service');
const { handleInvoicePaid } = require('./invoice.workflow');
const { createInvoice, updateInvoice } = require('./invoice.service');
const { mapInvoiceToAccurate } = require('./invoice.sync.mapper');

const JASA = 'cat-jasa';
const GOLD10 = { membership: { id: 'm1', name: 'Gold', discountType: 'PERCENTAGE', discountValue: '10', discountCategories: [{ categoryId: JASA }] } };

beforeEach(() => {
  jest.clearAllMocks();
  repo.findCustomerById.mockResolvedValue({ id: 'c1' });
  repo.findBranchById.mockResolvedValue({ id: 'b1' });
  repo.findItemById.mockResolvedValue({ id: 'i1', itemCode: 'SVC', categoryId: JASA, excludeMemberDiscount: false, category: { parentId: null } });
  repo.findItemUnit.mockResolvedValue({ id: 'iu1' });
  repo.createWithTransaction.mockImplementation(async ({ invoiceData }) => ({ id: 'inv1', ...invoiceData }));
  repo.updateWithTransaction.mockImplementation(async ({ invoiceData }) => ({ id: 'inv1', ...invoiceData }));
});

const totals = (d) => ({
  subtotal: String(d.subtotal), totalDiscount: String(d.totalDiscount), totalTax: String(d.totalTax),
  grandTotal: String(d.grandTotal), membershipDiscountTotal: String(d.membershipDiscountTotal),
});
const existingFrom = (created, extra = {}) => ({
  id: 'inv1', invoiceNo: 'INV-1', branchId: 'b1', customerId: 'c1', status: 'UNPAID',
  totalDeposit: '0', paidAmount: '0', ...created, ...extra,
});

describe('P2 — edit invoice tidak memotong diskon membership dua kali', () => {
  const line = { itemId: 'i1', unitId: 'u1', qty: 1, price: 500000, taxable: false };

  test('create member 10% → update tanpa perubahan (payload sama) → total sama', async () => {
    getActiveMembership.mockResolvedValue(GOLD10);
    const body = { customerId: 'c1', items: [line] };
    await createInvoice(body, 'u1', 'b1');
    const created = repo.createWithTransaction.mock.calls[0][0].invoiceData;
    expect(String(created.grandTotal)).toBe('450000');

    repo.findById.mockResolvedValue(existingFrom(created));
    await updateInvoice('inv1', { items: [line] }, 'u1');
    const updated = repo.updateWithTransaction.mock.calls[0][0].invoiceData;
    expect(totals(updated)).toEqual(totals(created));
  });

  test('payload edit dari POS (baris 10% + membershipDiscountTotal) → tetap 10%, bukan 20%', async () => {
    getActiveMembership.mockResolvedValue(GOLD10);
    // Create dari POS: diskon member sudah dipasang di baris (PERCENT 10) + override total
    const posLine = { ...line, discountType: 'PERCENT', discountPercent: 10 };
    await createInvoice({ customerId: 'c1', items: [posLine], membershipDiscountTotal: 50000 }, 'u1', 'b1');
    const created = repo.createWithTransaction.mock.calls[0][0].invoiceData;
    expect(String(created.grandTotal)).toBe('450000');

    repo.findById.mockResolvedValue(existingFrom(created));
    await updateInvoice('inv1', { items: [posLine], membershipDiscountTotal: 50000 }, 'u1');
    const updated = repo.updateWithTransaction.mock.calls[0][0].invoiceData;
    expect(totals(updated)).toEqual(totals(created));
    expect(String(updated.totalDiscount)).toBe('50000');
  });
});

test('P2 — validasi PATCH /invoices/:id tidak membuang membershipDiscountTotal', () => {
  const { safeParse } = require('valibot');
  const { updateInvoiceSchema } = require('./invoice.validation');
  const r = safeParse(updateInvoiceSchema, { items: [{ itemId: 'i1', unitId: 'u1', qty: 1 }], membershipDiscountTotal: 50000 });
  expect(r.success).toBe(true);
  expect(r.output.membershipDiscountTotal).toBe(50000);
});

describe('P3 — total baru lebih kecil dari uang yang sudah diterima ditolak', () => {
  test('DP 300rb + bayar 200rb, total baru 450rb → 422, invoice tidak diubah', async () => {
    getActiveMembership.mockResolvedValue(null);
    repo.findById.mockResolvedValue(existingFrom({ grandTotal: '600000', subtotal: '600000', totalDiscount: '0', totalTax: '0' }, {
      status: 'PARTIAL', totalDeposit: '300000', paidAmount: '200000',
    }));
    await expect(updateInvoice('inv1', { items: [{ itemId: 'i1', unitId: 'u1', qty: 1, price: 450000 }] }, 'u1'))
      .rejects.toMatchObject({
        statusCode: 422,
        message: 'Total baru (Rp 450.000) lebih kecil dari uang yang sudah diterima (Rp 500.000). Hapus pembayaran / lepas DP dulu.',
      });
    expect(repo.updateWithTransaction).not.toHaveBeenCalled();
    expect(handleInvoicePaid).not.toHaveBeenCalled();
  });

  test('total baru = uang diterima → boleh, jadi Lunas', async () => {
    getActiveMembership.mockResolvedValue(null);
    repo.findById.mockResolvedValue(existingFrom({ grandTotal: '600000' }, { status: 'PARTIAL', totalDeposit: '300000', paidAmount: '200000' }));
    await updateInvoice('inv1', { items: [{ itemId: 'i1', unitId: 'u1', qty: 1, price: 500000 }] }, 'u1');
    const data = repo.updateWithTransaction.mock.calls[0][0].invoiceData;
    expect(data.status).toBe('PAID');
    expect(String(data.outstandingAmount)).toBe('0');
  });
});

// ── P4: total yang akan dihitung Accurate dari payload == grandTotal ERP ─────────
// Model hitung Accurate (diverifikasi live 2026-10-17): jumlah baris = unitPrice × qty − itemCashDiscount;
// inclusive → total = Σ jumlah; exclusive → total = Σ jumlah + PPN 11% dibulatkan ke rupiah penuh.
// Baris hanya kena PPN bila dikirim useTax1 (dan master item Accurate punya PPN).
const accurateTotal = (p) => {
  const rows = p.detailItem.filter((d) => d._status !== 'DELETE');
  const amt  = (d) => d.unitPrice * d.quantity - (d.itemCashDiscount ?? 0);
  const sum  = rows.reduce((s, d) => s + amt(d), 0);
  if (!p.taxable || p.inclusiveTax) return Math.round(sum * 100) / 100;
  const taxBase = rows.filter((d) => d.useTax1).reduce((s, d) => s + amt(d), 0);
  return Math.round((sum + Math.round(taxBase * 0.11)) * 100) / 100;
};

const inv = (over, items) => ({
  invoiceNo: 'INV-1', invoiceDate: new Date('2026-10-17T03:00:00Z'), taxable: false, inclusiveTax: false,
  customer: { customerNo: 'C1' }, membershipDiscountTotal: 0, membership: null,
  invoiceDeposits: [], treatmentSessions: [], ...over, items,
});
const svc = (id, price, extra = {}) => ({
  id, qty: 1, price, discount: 0, discountType: 'AMOUNT', discountPercent: null, taxable: false, isMaterial: false, lineGroup: null,
  item: { itemCode: id, itemType: 'SERVICE', categoryId: JASA, excludeMemberDiscount: false, category: { parentId: null } },
  unit: { name: 'PCS' }, ...extra,
});

describe('P4 — mapper Accurate: total faktur sama dengan grandTotal ERP', () => {
  test('tanpa PPN', () => {
    expect(accurateTotal(mapInvoiceToAccurate(inv({}, [svc('A', 700000)]), null))).toBe(700000);
  });

  test('PPN exclusive 11%', () => {
    const p = mapInvoiceToAccurate(inv({ taxable: true }, [svc('A', 700000, { taxable: true, subtotal: 700000 })]), null);
    expect(p.detailItem[0].unitPrice).toBe(700000);
    expect(accurateTotal(p)).toBe(777000);
  });

  test('PPN inclusive 11% — harga tidak dikurangi PPN dua kali (SI.2026.10.00007)', () => {
    const p = mapInvoiceToAccurate(inv({ taxable: true, inclusiveTax: true }, [svc('A', 7700000, { taxable: true, subtotal: 6936936.94 })]), null);
    expect(p.detailItem[0].unitPrice).toBe(7700000);
    expect(accurateTotal(p)).toBe(7700000);
  });

  test('diskon persen + PPN inclusive tidak dipotong dua kali (SI.2026.10.00006)', () => {
    const p = mapInvoiceToAccurate(inv({ taxable: true, inclusiveTax: true }, [
      svc('A', 11600000, { taxable: true, discountType: 'PERCENT', discountPercent: 48.3, discount: 5602800, subtotal: 5402882.88 }),
    ]), null);
    expect(p.detailItem[0].itemDiscPercent).toBeUndefined();
    expect(p.detailItem[0].itemCashDiscount).toBe(5602800);
    expect(accurateTotal(p)).toBe(5997200);
  });

  test('diskon nominal + PPN exclusive', () => {
    const p = mapInvoiceToAccurate(inv({ taxable: true }, [svc('A', 700000, { taxable: true, discount: 100000, subtotal: 600000 })]), null);
    expect(accurateTotal(p)).toBe(666000);
  });

  test('membership nominal + PPN exclusive (ERP potong setelah PPN)', () => {
    // ERP: 700.000 + PPN 77.000 − 50.000 = 727.000
    const p = mapInvoiceToAccurate(inv({
      taxable: true, membershipDiscountTotal: 50000,
      membership: { discountType: 'FIXED_AMOUNT', discountCategories: [{ categoryId: JASA }] },
    }, [svc('A', 700000, { taxable: true, subtotal: 700000 })]), null);
    expect(p.detailItem[0].itemCashDiscount).toBe(45045);
    expect(accurateTotal(p)).toBe(727000);
  });

  test('membership persen yang paketnya kemudian diubah ke nominal → tidak dipotong lagi', () => {
    // ERP: 155.547 − member 10% 15.555 = 139.992 + PPN 15.399,12 = 155.391,12 (diskon member di baris)
    const p = mapInvoiceToAccurate(inv({
      taxable: true, membershipDiscountTotal: 15555, subtotal: 139992, totalTax: 15399.12, grandTotal: 155391.12,
      membership: { discountType: 'FIXED_AMOUNT', discountCategories: [{ categoryId: JASA }] },
    }, [svc('A', 155547, { taxable: true, discount: 15555, subtotal: 139992 })]), null);
    expect(p.detailItem[0].itemCashDiscount).toBe(15555);
    expect(Math.abs(accurateTotal(p) - 155391.12)).toBeLessThan(1);
  });

  test('membership nominal dikenali dari angka invoice walau paket sekarang persen', () => {
    const p = mapInvoiceToAccurate(inv({
      taxable: false, membershipDiscountTotal: 50000, subtotal: 700000, totalTax: 0, grandTotal: 650000,
      membership: { discountType: 'PERCENTAGE', discountCategories: [{ categoryId: JASA }] },
    }, [svc('A', 700000, { subtotal: 700000 })]), null);
    expect(accurateTotal(p)).toBe(650000);
  });

  test('bahan baku dialokasikan dari layanan ber-PPN exclusive → total tetap', () => {
    // ERP: layanan 700.000 → 700.000 + PPN 77.000 = 777.000 (bahan baku tidak ditagih)
    const p = mapInvoiceToAccurate(inv({ taxable: true }, [
      svc('A', 700000, { taxable: true, subtotal: 700000, lineGroup: 'g1' }),
      svc('M', 33333.33, { isMaterial: true, qty: 1, subtotal: 33333.33, lineGroup: 'g1', item: { itemCode: 'M', itemType: 'SERVICE' } }),
    ]), null);
    expect(p.detailItem.find((d) => d.itemNo === 'M').tax1Name).toBe('PPN');
    expect(accurateTotal(p)).toBe(777000);
  });

  test('alokasi bahan baku tidak habis dibagi qty → sisa pembulatan jadi diskon nominal, total tetap', () => {
    const p = mapInvoiceToAccurate(inv({}, [
      svc('A', 100000, { qty: 3, subtotal: 300000, lineGroup: 'g1' }),
      svc('M', 100, { isMaterial: true, qty: 1, subtotal: 100, lineGroup: 'g1', item: { itemCode: 'M', itemType: 'SERVICE' } }),
    ]), null);
    expect(accurateTotal(p)).toBe(300000);
  });
});
