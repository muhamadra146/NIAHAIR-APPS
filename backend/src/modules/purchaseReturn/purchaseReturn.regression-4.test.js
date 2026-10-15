// Regression: G4-18 — subtotal/grandTotal retur pembelian mengabaikan diskon baris
// Found by /qa on 2026-10-15
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
  $transaction:       jest.fn(),
}));

const prisma = require('../../config/prisma');
const svc    = require('./purchaseReturn.service');

test('2 × 50.000 diskon 10% → subtotal baris & total 90.000', async () => {
  prisma.purchaseInvoice.findUnique.mockResolvedValue({
    id: 'pi1', status: 'POSTED', warehouse: { id: 'wh1' }, items: [{ itemId: 'i1', unitId: 'u1', qty: '5' }],
  });
  const create = jest.fn().mockResolvedValue({ id: 'pr1' });
  prisma.$transaction.mockImplementation((fn) => fn({ purchaseReturn: { create } }));

  await svc.createPurchaseReturn({
    purchaseInvoiceId: 'pi1', returnDate: '2026-10-15',
    items: [{ itemId: 'i1', unitId: 'u1', qty: 2, price: 50000, discount: 10, subtotal: 90000 }],
  });

  const data = create.mock.calls[0][0].data;
  expect(data.items.create[0].subtotal.toString()).toBe('90000');
  expect(data.subtotal.toString()).toBe('90000');
  expect(data.grandTotal.toString()).toBe('90000');
});
