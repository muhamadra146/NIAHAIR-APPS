// Regression: receive parsial — sisa yang tidak diterima tertahan di "Transit (AOL System)" Accurate,
// sedangkan ERP mengembalikannya ke gudang asal (G4-23). Accurate mengabaikan rejectedQuantity dan
// TRANSFER_IN selalu masuk ke gudang tujuan → qty TRANSFER_OUT disamakan dengan qty diterima.
// Diverifikasi live 2026-10-17 (IT.2026.10.00007/00008).
'use strict';

jest.mock('../accurate/accurate.client', () => ({ accurateRequest: jest.fn() }));
jest.mock('../branch/branch.repository', () => ({ getAccurateBranchId: jest.fn() }));
jest.mock('./stockTransfer.sync.repository', () => ({
  findTransferForSync:       jest.fn(),
  markTransferSynced:        jest.fn(),
  markTransferReceiveSynced: jest.fn(),
  markTransferItemSynced:    jest.fn(),
  clearTransferOutSynced:    jest.fn(),
  findReceiveAccurateId:     jest.fn(),
}));

const { accurateRequest } = require('../accurate/accurate.client');
const syncRepo = require('./stockTransfer.sync.repository');
const { syncTransferReceiveToAccurate, restoreTransferOutInAccurate, syncTransferToAccurate } =
  require('./stockTransfer.sync.service');

const line = (id, accItemId, qty, receivedQty, accurateDetailId) => ({
  id, qty: String(qty), receivedQty: receivedQty == null ? null : String(receivedQty), accurateDetailId,
  item: { itemCode: `C${accItemId}`, itemType: 'INVENTORY', accurateItemId: accItemId, defaultUnit: { accurateUnitId: 601 } },
});
const transfer = (items, extra = {}) => ({
  id: 'tr1', transferNo: 'TRF-1', status: 'RECEIVED', accurateTransferId: 501,
  sourceWarehouse:      { name: 'NIAHAIR GUDANG', accurateWarehouseId: 150 },
  destinationWarehouse: { name: 'REMI GUDANG',    accurateWarehouseId: 50 },
  items, ...extra,
});

// Router mock Accurate: detail.do → baris OUT saat ini; save.do OUT → echo; save.do IN → id 600
const mockAccurate = (outLines) => {
  accurateRequest.mockImplementation(async (ep, opts = {}) => {
    if (ep.startsWith('/item-transfer/detail.do')) return { s: true, d: { id: 501, detailItem: outLines } };
    if (ep.startsWith('/item-transfer/delete.do')) return { s: true };
    if (ep === '/item-transfer/save.do' && opts.body.itemTransferType === 'TRANSFER_OUT') {
      let next = 900;
      const det = opts.body.detailItem.filter((d) => d._status !== 'delete')
        .map((d) => ({ id: d.id ?? next++, itemId: d.itemId, quantity: d.quantity }));
      return { s: true, r: { id: 501, detailItem: det } };
    }
    return { s: true, r: { id: 600, number: 'IT-IN-1' } };
  });
};
const posts = () => accurateRequest.mock.calls.filter(([ep]) => ep === '/item-transfer/save.do').map(([, o]) => o.body);

beforeEach(() => {
  jest.clearAllMocks();
  syncRepo.findReceiveAccurateId.mockResolvedValue(null);
});

test('kirim 3 terima 1 → TRANSFER_OUT disesuaikan ke 1 sebelum TRANSFER_IN 1 (tanpa rejectedQuantity)', async () => {
  syncRepo.findTransferForSync.mockResolvedValue(transfer([line('ti1', 9869, 3, 1, 11)]));
  mockAccurate([{ id: 11, itemId: 9869, quantity: 3 }]);

  await syncTransferReceiveToAccurate('tr1');

  const [out, inn] = posts();
  expect(out).toEqual({
    id: 501, itemTransferType: 'TRANSFER_OUT', warehouseId: 150, referenceWarehouseId: 50,
    detailItem: [{ id: 11, itemId: 9869, unitId: 601, quantity: 1 }],
  });
  expect(inn).toMatchObject({ itemTransferType: 'TRANSFER_IN', fromItemTransferId: 501, warehouseId: 50 });
  expect(inn.detailItem).toEqual([{ itemId: 9869, quantity: 1, unitId: 601, fromItemTransferDetailId: 11 }]);
  expect(syncRepo.markTransferReceiveSynced).toHaveBeenCalledWith({ id: 'tr1', accurateReceiveId: 600, accurateReceiveNumber: 'IT-IN-1' });
});

test('baris diterima 0 → dihapus dari TRANSFER_OUT dan tidak ikut TRANSFER_IN', async () => {
  syncRepo.findTransferForSync.mockResolvedValue(transfer([line('ti1', 9869, 3, 3, 11), line('ti2', 9870, 2, 0, 12)]));
  mockAccurate([{ id: 11, itemId: 9869, quantity: 3 }, { id: 12, itemId: 9870, quantity: 2 }]);

  await syncTransferReceiveToAccurate('tr1');

  const [out, inn] = posts();
  expect(out.detailItem).toEqual([
    { id: 11, itemId: 9869, unitId: 601, quantity: 3 },
    { id: 12, _status: 'delete' },
  ]);
  expect(inn.detailItem.map((d) => d.itemId)).toEqual([9869]);
});

test('terima penuh → TRANSFER_OUT tidak disentuh', async () => {
  syncRepo.findTransferForSync.mockResolvedValue(transfer([line('ti1', 9869, 3, 3, 11)]));
  mockAccurate([{ id: 11, itemId: 9869, quantity: 3 }]);

  await syncTransferReceiveToAccurate('tr1');

  expect(accurateRequest.mock.calls.some(([ep]) => ep.startsWith('/item-transfer/detail.do'))).toBe(false);
  expect(posts().map((b) => b.itemTransferType)).toEqual(['TRANSFER_IN']);
});

test('retry setelah TRANSFER_OUT sudah disesuaikan → tidak menyimpan ulang TRANSFER_OUT (idempotent)', async () => {
  syncRepo.findTransferForSync.mockResolvedValue(transfer([line('ti1', 9869, 3, 1, 11)]));
  mockAccurate([{ id: 11, itemId: 9869, quantity: 1 }]);

  await syncTransferReceiveToAccurate('tr1');

  expect(posts().map((b) => b.itemTransferType)).toEqual(['TRANSFER_IN']);
});

test('TRANSFER_IN sudah tersinkron → dilewati', async () => {
  syncRepo.findTransferForSync.mockResolvedValue(transfer([line('ti1', 9869, 3, 1, 11)]));
  syncRepo.findReceiveAccurateId.mockResolvedValue(600);

  await expect(syncTransferReceiveToAccurate('tr1')).resolves.toMatchObject({ skipped: true });
  expect(accurateRequest).not.toHaveBeenCalled();
});

test('semua diterima 0 → TRANSFER_OUT dihapus di Accurate & referensi dilepas, tanpa TRANSFER_IN', async () => {
  syncRepo.findTransferForSync.mockResolvedValue(transfer([line('ti1', 9869, 3, 0, 11)]));
  mockAccurate([]);

  await expect(syncTransferReceiveToAccurate('tr1')).resolves.toMatchObject({ outDeleted: true });

  expect(accurateRequest).toHaveBeenCalledWith('/item-transfer/delete.do?id=501', { method: 'DELETE' });
  expect(syncRepo.clearTransferOutSynced).toHaveBeenCalledWith('tr1');
  expect(posts()).toHaveLength(0);
  expect(syncRepo.markTransferReceiveSynced).not.toHaveBeenCalled();
});

test('sync TRANSFER_OUT untuk transfer RECEIVED yang semuanya diterima 0 → dilewati', async () => {
  syncRepo.findTransferForSync.mockResolvedValue(transfer([line('ti1', 9869, 3, 0, null)], { accurateTransferId: null }));
  await expect(syncTransferToAccurate('tr1')).resolves.toMatchObject({ skipped: true });
  expect(accurateRequest).not.toHaveBeenCalled();
});

test('undo receive: TRANSFER_OUT dikembalikan ke qty dikirim, baris yang dihapus ditambahkan lagi', async () => {
  syncRepo.findTransferForSync.mockResolvedValue(transfer(
    [line('ti1', 9869, 3, null, 11), line('ti2', 9870, 2, null, 12)], { status: 'IN_TRANSIT' }));
  mockAccurate([{ id: 11, itemId: 9869, quantity: 1 }]); // baris 12 dulu dihapus

  await restoreTransferOutInAccurate('tr1');

  const [out] = posts();
  expect(out.detailItem).toEqual([
    { id: 11, itemId: 9869, unitId: 601, quantity: 3 },
    { itemId: 9870, unitId: 601, quantity: 2 },
  ]);
  expect(syncRepo.markTransferItemSynced).toHaveBeenCalledWith('ti2', 900);
});
