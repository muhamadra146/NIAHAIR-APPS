// Regression: B2 — retur pembelian menerima satuan yang bukan milik item (konversi stok salah)
// Regression: B3 — audit createdBy/postedBy retur selalu kosong (req.employee tidak pernah di-set)
// Regression: UX — tanggal retur sebelum tanggal faktur diterima
// Found by /qa on 2026-10-18
'use strict';

jest.mock('./purchaseReturn.repository');
jest.mock('./purchaseReturn.accurate.sync.service', () => ({ pushPurchaseReturnToAccurate: jest.fn() }));
jest.mock('../syncQueue/syncQueue.service');
jest.mock('../inventory/inventory.period.service');
jest.mock('../../config/prisma', () => ({
  purchaseInvoice:    { findUnique: jest.fn() },
  purchaseReturn:     { findFirst: jest.fn().mockResolvedValue(null) },
  purchaseReturnItem: { findMany: jest.fn().mockResolvedValue([]) },
  itemUnit:           { findUnique: jest.fn().mockResolvedValue(null) },
  item: {
    findMany:   jest.fn().mockResolvedValue([{ id: 'i1', name: 'Cat', defaultUnitId: 'GRAM', purchaseUnitId: null, itemUnits: [{ unitId: 'TUBE' }] }]),
    findUnique: jest.fn().mockResolvedValue({ name: 'Cat', defaultUnitId: 'GRAM' }),
  },
  $transaction: jest.fn(),
}));

const prisma = require('../../config/prisma');
const svc    = require('./purchaseReturn.service');

beforeEach(() => {
  jest.clearAllMocks();
  prisma.purchaseInvoice.findUnique.mockResolvedValue({
    id: 'pi1', status: 'POSTED', invoiceDate: new Date('2026-10-10T00:00:00Z'), warehouse: { id: 'wh1' },
    items: [{ itemId: 'i1', unitId: 'GRAM', qty: '100' }],
  });
});

test('satuan bukan milik item → 422, retur tidak dibuat', async () => {
  await expect(svc.createPurchaseReturn({
    purchaseInvoiceId: 'pi1', returnDate: '2026-10-15', items: [{ itemId: 'i1', unitId: 'PCS', qty: 1, price: 1 }],
  })).rejects.toMatchObject({ statusCode: 422, message: 'Satuan tidak valid untuk item "Cat"' });
  expect(prisma.$transaction).not.toHaveBeenCalled();
});

test('tanggal retur sebelum tanggal faktur → 422', async () => {
  await expect(svc.createPurchaseReturn({
    purchaseInvoiceId: 'pi1', returnDate: '2026-10-09', items: [{ itemId: 'i1', unitId: 'GRAM', qty: 1, price: 1 }],
  })).rejects.toMatchObject({ statusCode: 422, message: 'Tanggal retur tidak boleh sebelum tanggal faktur pembelian' });
});

test('controller meneruskan req.user.employeeId sebagai pembuat / pemosting', async () => {
  jest.resetModules();
  jest.doMock('./purchaseReturn.service', () => ({
    createPurchaseReturn: jest.fn().mockResolvedValue({}), postPurchaseReturn: jest.fn().mockResolvedValue({}),
  }));
  const service = require('./purchaseReturn.service');
  const ctrl    = require('./purchaseReturn.controller');
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  await ctrl.createController({ body: {}, user: { employeeId: 'emp1' } }, res, jest.fn());
  await ctrl.postController({ params: { id: 'pr1' }, user: { employeeId: 'emp1' } }, res, jest.fn());
  expect(service.createPurchaseReturn).toHaveBeenCalledWith({}, 'emp1');
  expect(service.postPurchaseReturn).toHaveBeenCalledWith('pr1', 'emp1');
});
