'use strict';

// Diskon membership per kategori (keputusan user 2026-10-14):
// GOLD = semua treatment (JASA), PLATINUM = treatment + rambut (induk RAMBUT).
// Ongkos PP, Service Charge, semua Charge & Cancel tidak pernah kena diskon.

jest.mock('./membership.repository');

const repo = require('./membership.repository');
const svc  = require('./membership.service');
const { isMemberDiscountEligible } = require('./membership.discount');
const { mapInvoiceToAccurate }     = require('../invoice/invoice.sync.mapper');

const JASA = 'cat-jasa', RAMBUT = 'cat-rambut', VIP = 'cat-vip', CAT = 'cat-cat', SUPLEMEN = 'cat-suplemen';
const GOLD     = { discountCategories: [{ categoryId: JASA }] };
const PLATINUM = { discountCategories: [{ categoryId: JASA }, { categoryId: RAMBUT }] };

const treatment   = { categoryId: JASA, excludeMemberDiscount: false, category: { parentId: null } };
const ongkosPP    = { categoryId: JASA, excludeMemberDiscount: true,  category: { parentId: null } };
const rambutVip   = { categoryId: VIP,  excludeMemberDiscount: false, category: { parentId: RAMBUT } };
const catRambut   = { categoryId: CAT,  excludeMemberDiscount: false, category: { parentId: SUPLEMEN } };

describe('isMemberDiscountEligible', () => {
  test('GOLD: treatment dapat diskon, rambut tidak', () => {
    expect(isMemberDiscountEligible(treatment, GOLD)).toBe(true);
    expect(isMemberDiscountEligible(rambutVip, GOLD)).toBe(false);
  });

  test('PLATINUM: kategori induk RAMBUT mencakup sub-kategori VIP', () => {
    expect(isMemberDiscountEligible(treatment, PLATINUM)).toBe(true);
    expect(isMemberDiscountEligible(rambutVip, PLATINUM)).toBe(true);
    expect(isMemberDiscountEligible(catRambut, PLATINUM)).toBe(false);
  });

  test('item yang dikecualikan tidak pernah dapat diskon walau kategorinya dicentang', () => {
    expect(isMemberDiscountEligible(ongkosPP, GOLD)).toBe(false);
    expect(isMemberDiscountEligible(ongkosPP, PLATINUM)).toBe(false);
  });

  test('bahan baku treatment & tanpa membership → tidak dapat diskon', () => {
    expect(isMemberDiscountEligible(treatment, GOLD, true)).toBe(false);
    expect(isMemberDiscountEligible(treatment, null)).toBe(false);
    expect(isMemberDiscountEligible(treatment, { discountCategories: [] })).toBe(false);
  });
});

describe('membership — kategori diskon', () => {
  beforeEach(() => jest.clearAllMocks());

  test('create menyimpan kategori tanpa duplikat', async () => {
    repo.countCategories.mockResolvedValue(2);
    repo.create.mockResolvedValue({ id: 'm1' });
    await svc.create({ name: 'Platinum', price: 1, durationDays: 365, discountType: 'PERCENTAGE', discountValue: 15, categoryIds: [JASA, RAMBUT, JASA] });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ categoryIds: [JASA, RAMBUT] }));
  });

  test('create tanpa categoryIds → default kategori JASA', async () => {
    repo.findDefaultDiscountCategory.mockResolvedValue({ id: JASA });
    repo.create.mockResolvedValue({ id: 'm1' });
    await svc.create({ name: 'Gold', price: 1, durationDays: 30, discountType: 'PERCENTAGE', discountValue: 10 });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ categoryIds: [JASA] }));
  });

  test('kategori tidak dikenal ditolak', async () => {
    repo.countCategories.mockResolvedValue(1);
    await expect(svc.create({ name: 'X', price: 1, durationDays: 1, discountType: 'PERCENTAGE', discountValue: 5, categoryIds: [JASA, 'nope'] }))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(repo.create).not.toHaveBeenCalled();
  });

  test('update tanpa categoryIds tidak mengubah daftar kategori', async () => {
    repo.findById.mockResolvedValue({ id: 'm1', discountType: 'PERCENTAGE', discountValue: 10 });
    repo.update.mockResolvedValue({ id: 'm1' });
    await svc.update('m1', { name: 'Gold' });
    expect(repo.update.mock.calls[0][1].categoryIds).toBeUndefined();
  });
});

describe('sinkron Accurate — diskon membership nominal', () => {
  const line = (id, item, price, extra = {}) => ({
    id, qty: 1, price, subtotal: price, discount: 0, discountType: 'AMOUNT', taxable: false, isMaterial: false,
    item: { itemCode: id, accurateItemId: 1, itemType: 'SERVICE', ...item }, unit: { name: 'PCS' }, ...extra,
  });
  const invoice = (membership, items) => ({
    invoiceNo: 'INV-1', invoiceDate: new Date('2026-10-14'), taxable: false, inclusiveTax: false,
    customer: { customerNo: 'C1' }, membershipDiscountTotal: 30000, membership: { discountType: 'FIXED_AMOUNT', ...membership },
    items, invoiceDeposits: [], treatmentSessions: [],
  });
  const cashDiscount = (payload, no) => payload.detailItem.find((d) => d.itemNo === no)?.itemCashDiscount;

  test('dibagi hanya ke item yang dapat diskon (Ongkos PP dilewati)', () => {
    const payload = mapInvoiceToAccurate(invoice(GOLD, [
      line('COLOR', treatment, 200000),
      line('PP', ongkosPP, 100000),
    ]), null);
    expect(cashDiscount(payload, 'COLOR')).toBe(30000);
    expect(cashDiscount(payload, 'PP')).toBeUndefined();
  });

  test('tidak ada item cocok (konfigurasi berubah) → dibagi ke semua item agar total tetap sama', () => {
    const payload = mapInvoiceToAccurate(invoice({ discountCategories: [] }, [
      line('A', treatment, 100000),
      line('B', treatment, 200000),
    ]), null);
    expect(cashDiscount(payload, 'A') + cashDiscount(payload, 'B')).toBe(30000);
  });
});
