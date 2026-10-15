// Regression: G4-03 — dua POST /purchase-returns/:id/post paralel memposting dua kali (stok keluar dua kali)
// Found by /qa on 2026-10-15
'use strict';

jest.mock('./purchaseReturn.repository');
jest.mock('./purchaseReturn.accurate.sync.service', () => ({ pushPurchaseReturnToAccurate: jest.fn() }));
jest.mock('../syncQueue/syncQueue.service');
jest.mock('../inventory/inventory.period.service');
jest.mock('../../config/prisma', () => ({ $transaction: jest.fn() }));

const repo   = require('./purchaseReturn.repository');
const prisma = require('../../config/prisma');
const { createSyncJob } = require('../syncQueue/syncQueue.service');
const svc    = require('./purchaseReturn.service');

test('DRAFT → POSTED bersyarat; count 0 → 409, tidak ada movement & sync', async () => {
  repo.findById.mockResolvedValue({
    id: 'pr1', status: 'DRAFT', purchaseInvoiceId: 'pi1', returnNo: 'PR-1', returnDate: '2026-10-15',
    items: [{ id: 'ri1', itemId: 'i1', unitId: 'u1', qty: '1', price: '10', item: { name: 'A', itemType: 'INVENTORY' } }],
  });
  const tx = {
    purchaseReturn:    { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    $queryRawUnsafe:   jest.fn(),
    inventoryMovement: { create: jest.fn() },
  };
  prisma.$transaction.mockImplementation((fn) => fn(tx));

  await expect(svc.postPurchaseReturn('pr1', 'e1')).rejects.toMatchObject({ statusCode: 409, message: 'Dokumen sudah diproses' });
  expect(tx.purchaseReturn.updateMany).toHaveBeenCalledWith({ where: { id: 'pr1', status: 'DRAFT' }, data: { status: 'POSTED' } });
  expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
  expect(createSyncJob).not.toHaveBeenCalled();
});
