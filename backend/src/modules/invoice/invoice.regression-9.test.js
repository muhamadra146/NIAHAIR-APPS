'use strict';

// Regression (keputusan user 2026-10-17): PPN ERP dibulatkan ke rupiah penuh mengikuti Accurate.
// Sebelumnya ERP menyimpan PPN bersen (exclusive 11%: ERP 159.716,09 vs Accurate 159.716,37;
// ERP 155.391,12 vs Accurate 155.391) → total ERP ≠ Accurate, pelunasan penuh ditolak.
// Accurate: PPN dihitung per dokumen (tax1Amount header = bulat(Σ PPN baris)), setengah ke atas.

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
jest.mock('../membership/membership.service', () => ({ getActiveMembership: jest.fn().mockResolvedValue(null) }));
jest.mock('../consultation/consultation.repository', () => ({ findByInvoiceId: jest.fn(), buildFirstInvoiceMap: jest.fn() }));
jest.mock('../treatment/treatmentJobAssignment.repository', () => ({ upsertMany: jest.fn() }));
jest.mock('../../config/prisma', () => ({
  commission:       { count: jest.fn().mockResolvedValue(0) },
  treatmentSession: { findFirst: jest.fn().mockResolvedValue(null) },
  invoice:          { findUnique: jest.fn().mockResolvedValue(null) },
}));

const repo = require('./invoice.repository');
const { computeDocumentTax, createInvoice, updateInvoice } = require('./invoice.service');

beforeEach(() => {
  jest.clearAllMocks();
  repo.findCustomerById.mockResolvedValue({ id: 'c1' });
  repo.findBranchById.mockResolvedValue({ id: 'b1' });
  repo.findItemById.mockResolvedValue({ id: 'i1', itemCode: 'SVC', categoryId: 'cat', excludeMemberDiscount: false, category: { parentId: null } });
  repo.findItemUnit.mockResolvedValue({ id: 'iu1' });
  repo.createWithTransaction.mockImplementation(async ({ invoiceData, itemsData }) => ({ id: 'inv1', ...invoiceData, items: itemsData }));
  repo.updateWithTransaction.mockImplementation(async ({ invoiceData }) => ({ id: 'inv1', ...invoiceData }));
});

const create = async (items, { inclusiveTax = false } = {}) => {
  await createInvoice({ customerId: 'c1', items, taxable: true, inclusiveTax }, 'u1', 'b1');
  const call = repo.createWithTransaction.mock.calls[0][0];
  return { inv: call.invoiceData, items: call.itemsData };
};
const svc = (price, extra = {}) => ({ itemId: 'i1', unitId: 'u1', qty: 1, price, taxable: true, ...extra });

describe('computeDocumentTax — bulat rupiah penuh, setengah ke atas', () => {
  test.each([
    ['143888.37', false, '15828'],  // 15.827,7207 → 15.828 (kasus 159.716,09 vs 159.716,37)
    ['139992',    false, '15399'],  // 15.399,12   → 15.399 (kasus 155.391,12 vs 155.391)
    ['13650',     false, '1502'],   // 1.501,5 tepat setengah → ke atas
    ['100',       false, '11'],
    ['7700000',   true,  '763063'], // inclusive: 763.063,063 (cocok faktur Accurate SI.2026.10.00007)
    ['5997200',   true,  '594317'], // inclusive: 594.317,117 (cocok faktur Accurate)
    ['0',         false, '0'],
  ])('dasar %s inclusive=%s → PPN %s', (base, inclusive, expected) => {
    expect(computeDocumentTax(base, inclusive).toString()).toBe(expected);
  });
});

describe('createInvoice — total ERP == total Accurate', () => {
  test('exclusive 143.888,37 → PPN 15.828, total 159.716,37 (bukan 159.716,09)', async () => {
    const { inv } = await create([svc(150000, { discountAmount: '6111.63' })]);
    expect(String(inv.totalTax)).toBe('15828');
    expect(String(inv.grandTotal)).toBe('159716.37');
  });

  test('exclusive 139.992 → PPN 15.399, total 155.391 (bukan 155.391,12)', async () => {
    const { inv } = await create([svc(139992)]);
    expect(String(inv.totalTax)).toBe('15399');
    expect(String(inv.grandTotal)).toBe('155391');
  });

  test('exclusive multi-baris: PPN dihitung sekali dari Σ dasar, bukan dijumlah per baris', async () => {
    // per baris: 1.100,44 + 1.100,44 = 2.200,88 ; per dokumen: bulat(20.008 × 11%) = bulat(2.200,88) = 2.201
    const { inv } = await create([svc(10004), svc(10004)]);
    expect(String(inv.totalTax)).toBe('2201');
    expect(String(inv.grandTotal)).toBe('22209');
  });

  test('inclusive: PPN bulat, Σ DPP baris + PPN = Σ harga, grand total = harga', async () => {
    const { inv, items } = await create([svc(7700000)], { inclusiveTax: true });
    expect(String(inv.totalTax)).toBe('763063');
    expect(String(inv.grandTotal)).toBe('7700000');
    expect(String(items[0].subtotal)).toBe('6936937');
    expect(String(inv.subtotal)).toBe('6936937');
  });

  test('inclusive multi-baris harga ganjil: selisih DPP ditaruh di baris kena PPN terakhir', async () => {
    const { inv, items } = await create([svc(123457), svc(98765), svc(55555, { taxable: false })], { inclusiveTax: true });
    // dasar = 222.222 → PPN = bulat(22.022,02) = 22.022 → DPP = 200.200
    expect(String(inv.totalTax)).toBe('22022');
    const dpp = items.filter((l) => l.taxable).reduce((s, l) => s + Number(l.subtotal), 0);
    expect(Math.round(dpp * 100) / 100).toBe(200200);
    expect(String(inv.grandTotal)).toBe('277777');
  });

  test('bahan baku tidak menambah dasar PPN', async () => {
    const { inv } = await create([svc(139992), svc(50000, { isMaterial: true })]);
    expect(String(inv.totalTax)).toBe('15399');
    expect(String(inv.grandTotal)).toBe('155391');
  });

  test('edit invoice memakai pembulatan yang sama', async () => {
    const { inv } = await create([svc(139992)]);
    repo.findById.mockResolvedValue({
      id: 'inv1', invoiceNo: 'INV-1', branchId: 'b1', customerId: 'c1', status: 'UNPAID',
      totalDeposit: '0', paidAmount: '0', ...inv,
    });
    await updateInvoice('inv1', { items: [svc(143888.37)], taxable: true, inclusiveTax: false }, 'u1');
    const updated = repo.updateWithTransaction.mock.calls[0][0].invoiceData;
    expect(String(updated.totalTax)).toBe('15828');
    expect(String(updated.grandTotal)).toBe('159716.37');
  });
});
