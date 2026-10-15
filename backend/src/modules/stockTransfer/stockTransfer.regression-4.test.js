// Regression: G4-23 — receive parsial: unit yang dikirim tapi tidak diterima hilang dari stok
// (keputusan owner: sisa otomatis kembali ke gudang asal sebagai movement pembalik)
// Found by /qa on 2026-10-15
'use strict';

jest.mock('./stockTransfer.repository');
jest.mock('../syncQueue/syncQueue.service');
jest.mock('../inventory/inventory.period.service');
jest.mock('./stockTransfer.sync.repository', () => ({ findReceiveAccurateId: jest.fn().mockResolvedValue(null) }));
jest.mock('../../config/prisma', () => ({ $transaction: jest.fn() }));

const repo   = require('./stockTransfer.repository');
const prisma = require('../../config/prisma');
const svc    = require('./stockTransfer.service');

const transfer = (status) => ({
  id: 'tr1', transferNo: 'TRF-1', status,
  sourceWarehouseId: 'wh1', destinationWarehouseId: 'wh2',
  sourceWarehouse: { branchId: 'b1', name: 'A' }, destinationWarehouse: { branchId: 'b2', name: 'B' },
  items: [{ id: 'ti1', itemId: 'i1', qty: '10', item: { name: 'Shampoo', itemType: 'INVENTORY' } }],
});

let tx;
beforeEach(() => {
  jest.clearAllMocks();
  tx = {
    stockTransfer:     { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    inventory:         {
      upsert: jest.fn(({ where }) => Promise.resolve(
        where.warehouseId_itemId.warehouseId === 'wh1'
          ? { id: 'invSrc', qtyOnHand: '0', qtyReserved: '0' }
          : { id: 'invDst', qtyOnHand: '0', qtyReserved: '0' })),
      update: jest.fn(),
    },
    inventoryMovement: { create: jest.fn(), aggregate: jest.fn() },
    $executeRawUnsafe: jest.fn().mockResolvedValue(1),
    $queryRawUnsafe:   jest.fn(),
  };
  prisma.$transaction.mockImplementation((fn) => fn(tx));
});

test('kirim 10, terima 7 → 3 kembali ke gudang asal (TRANSFER_IN, referensi transfer)', async () => {
  repo.findById.mockResolvedValue(transfer('IN_TRANSIT'));

  await svc.updateStatus('tr1', 'RECEIVED', 'SUPER_ADMIN', null, [{ itemId: 'i1', receivedQty: 7 }]);

  const moves = tx.inventoryMovement.create.mock.calls.map((c) => c[0].data);
  const back  = moves.find((m) => m.warehouseId === 'wh1');
  const inDst = moves.find((m) => m.warehouseId === 'wh2');
  expect(back).toMatchObject({ movementType: 'TRANSFER_IN', referenceType: 'TRANSFER', referenceId: 'tr1' });
  expect(back.qtyChange.toString()).toBe('3');
  expect(inDst.qtyChange.toString()).toBe('7');
});

test('terima penuh → tidak ada movement pengembalian', async () => {
  repo.findById.mockResolvedValue(transfer('IN_TRANSIT'));
  await svc.updateStatus('tr1', 'RECEIVED', 'SUPER_ADMIN', null, null);
  const moves = tx.inventoryMovement.create.mock.calls.map((c) => c[0].data);
  expect(moves.filter((m) => m.warehouseId === 'wh1')).toHaveLength(0);
});

test('undo receive menarik kembali sisa yang dikembalikan ke gudang asal', async () => {
  repo.findById.mockResolvedValue(transfer('RECEIVED'));
  tx.$queryRawUnsafe.mockResolvedValue([{ id: 'ti1', receivedQty: '7', qty: '10' }]);
  // net movement transfer ini di gudang asal: −10 (kirim) + 3 (sisa) = −7 → outstanding 3
  tx.inventoryMovement.aggregate.mockResolvedValue({ _sum: { qtyChange: '-7' } });
  tx.inventory.upsert.mockImplementation(() => Promise.resolve({ id: 'inv', qtyOnHand: '20', qtyReserved: '0' }));

  await svc.undoReceive('tr1', 'SUPER_ADMIN', null);

  const moves = tx.inventoryMovement.create.mock.calls.map((c) => c[0].data);
  const srcOut = moves.find((m) => m.warehouseId === 'wh1');
  expect(srcOut).toMatchObject({ movementType: 'TRANSFER_OUT' });
  expect(srcOut.qtyChange.toString()).toBe('-3');
  expect(moves.find((m) => m.warehouseId === 'wh2').qtyChange.toString()).toBe('-7');
});
