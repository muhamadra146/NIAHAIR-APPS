// Regression: B7 — Batal Terima mengabaikan respons Accurate {s:false} saat hapus TRANSFER_IN
//   (ERP dibalik, dokumen Accurate tetap ada → stok ERP ≠ Accurate)
// Regression: UX — klik ganda Kirim/Terima memberi pesan "Tidak bisa mengubah status dari X ke X"
// Found by /qa on 2026-10-18
'use strict';

jest.mock('./stockTransfer.repository');
jest.mock('../syncQueue/syncQueue.service');
jest.mock('../inventory/inventory.period.service');
jest.mock('../accurate/accurate.client', () => ({ accurateRequest: jest.fn() }));
jest.mock('./stockTransfer.sync.repository', () => ({ findReceiveAccurateId: jest.fn() }));
jest.mock('./stockTransfer.sync.service', () => ({ restoreTransferOutInAccurate: jest.fn() }));
jest.mock('../../config/prisma', () => ({ $transaction: jest.fn() }));

const repo     = require('./stockTransfer.repository');
const prisma   = require('../../config/prisma');
const syncRepo = require('./stockTransfer.sync.repository');
const { accurateRequest } = require('../accurate/accurate.client');
const svc      = require('./stockTransfer.service');

const ITEM = { id: 'ti1', itemId: 'i1', qty: '5', item: { name: 'Shampoo', itemType: 'INVENTORY' } };
const base = (status, extra = {}) => ({
  id: 'tr1', transferNo: 'TRF-1', status,
  sourceWarehouseId: 'wh1', destinationWarehouseId: 'wh2',
  sourceWarehouse: { branchId: 'b1', name: 'A' }, destinationWarehouse: { branchId: 'b2', name: 'B' },
  accurateTransferId: null, items: [ITEM], ...extra,
});

const makeTx = () => ({
  stockTransfer:     { updateMany: jest.fn().mockResolvedValue({ count: 1 }), findUnique: jest.fn(), update: jest.fn() },
  inventory:         { upsert: jest.fn().mockResolvedValue({ id: 'inv2', qtyOnHand: '10', qtyReserved: '0' }), update: jest.fn() },
  inventoryMovement: { create: jest.fn(), aggregate: jest.fn().mockResolvedValue({ _sum: { qtyChange: '-5' } }) },
  $executeRawUnsafe: jest.fn().mockResolvedValue(1),
  $queryRawUnsafe:   jest.fn().mockResolvedValue([{ id: 'ti1', receivedQty: '5', qty: '5' }]),
});

beforeEach(() => jest.clearAllMocks());

test('Batal Terima: Accurate {s:false} & dokumen masih ada → 422, pembalikan ERP dibatalkan', async () => {
  repo.findById.mockResolvedValue(base('RECEIVED'));
  syncRepo.findReceiveAccurateId.mockResolvedValue(600);
  const tx = makeTx();
  let committed = false;
  prisma.$transaction.mockImplementation(async (fn) => { const r = await fn(tx); committed = true; return r; });
  accurateRequest.mockImplementation((ep) => Promise.resolve(ep.startsWith('/item-transfer/detail.do')
    ? { s: true, d: { id: 600 } } : { s: false, d: ['Periode sudah ditutup'] }));

  await expect(svc.undoReceive('tr1', 'SUPER_ADMIN', null)).rejects.toMatchObject({
    statusCode: 422, message: expect.stringContaining('Periode sudah ditutup'),
  });
  expect(committed).toBe(false); // throw di dalam transaksi → rollback
  expect(accurateRequest).toHaveBeenCalledWith('/item-transfer/delete.do?id=600', { method: 'DELETE' });
});

test('Batal Terima: Accurate sukses → selesai, Accurate dihapus setelah guard status', async () => {
  repo.findById.mockResolvedValue(base('RECEIVED'));
  syncRepo.findReceiveAccurateId.mockResolvedValue(600);
  const tx = makeTx();
  prisma.$transaction.mockImplementation((fn) => fn(tx));
  accurateRequest.mockResolvedValue({ s: true });
  await svc.undoReceive('tr1', 'SUPER_ADMIN', null);
  expect(tx.$executeRawUnsafe.mock.invocationCallOrder[0]).toBeLessThan(accurateRequest.mock.invocationCallOrder[0]);
});

test('Batal Terima paralel (status sudah bukan RECEIVED) → 409, Accurate tidak disentuh', async () => {
  repo.findById.mockResolvedValue(base('RECEIVED'));
  syncRepo.findReceiveAccurateId.mockResolvedValue(600);
  const tx = makeTx();
  tx.$executeRawUnsafe.mockResolvedValue(0);
  prisma.$transaction.mockImplementation((fn) => fn(tx));
  await expect(svc.undoReceive('tr1', 'SUPER_ADMIN', null)).rejects.toMatchObject({ statusCode: 409 });
  expect(accurateRequest).not.toHaveBeenCalled();
});

test('hapus IN_TRANSIT: Accurate menolak hapus TRANSFER_OUT → 422 (tidak lagi diabaikan)', async () => {
  repo.findById.mockResolvedValue(base('IN_TRANSIT', { accurateTransferId: 501 }));
  const tx = makeTx();
  tx.stockTransfer.findUnique.mockResolvedValue({ accurateTransferId: 501 });
  prisma.$transaction.mockImplementation((fn) => fn(tx));
  accurateRequest.mockImplementation((ep) => Promise.resolve(ep.startsWith('/item-transfer/detail.do')
    ? { s: true, d: { id: 501 } } : { s: false, d: ['Tidak bisa dihapus'] }));
  await expect(svc.deleteTransfer('tr1', 'SUPER_ADMIN', null)).rejects.toMatchObject({ statusCode: 422 });
  expect(tx.stockTransfer.update).not.toHaveBeenCalled();
});

test('klik ganda Kirim (sudah IN_TRANSIT) → 409 dengan pesan ramah', async () => {
  repo.findById.mockResolvedValue(base('IN_TRANSIT'));
  await expect(svc.updateStatus('tr1', 'IN_TRANSIT', 'SUPER_ADMIN', null)).rejects.toMatchObject({
    statusCode: 409, message: expect.stringContaining('Transfer ini sudah dikirim'),
  });
  expect(prisma.$transaction).not.toHaveBeenCalled();
});
