// Regression: B9 — produksi menerima satuan bukan milik item & barang jadi = bahan baku
// Regression: B10 — batal produksi IN_PROGRESS tidak mengembalikan material ke stok (keputusan owner 2026-10-19)
// Regression: B6/B10 — hapus produksi menghapus di Accurate sebelum ERP dibalik (restart → Accurate terhapus, ERP tidak)
// Found by /qa on 2026-10-18
'use strict';

jest.mock('./production.repository');
jest.mock('./production.sync.service', () => ({ syncProductionToAccurate: jest.fn(), deleteFromAccurate: jest.fn() }));
jest.mock('../../config/prisma', () => ({
  $transaction: jest.fn(),
  item: { findMany: jest.fn() },
}));

const repo   = require('./production.repository');
const prisma = require('../../config/prisma');
const { deleteFromAccurate } = require('./production.sync.service');
const svc    = require('./production.service');

beforeEach(() => jest.clearAllMocks());

const body = (over = {}) => ({
  branchId: 'b1', warehouseId: 'wh1', productionDate: '2026-10-18',
  items:     [{ itemId: 'fg', unitId: 'PCS', plannedQuantity: 1, costAllocationPercentage: 100 }],
  materials: [{ itemId: 'mat', unitId: 'GRAM', plannedQuantity: 10 }],
  ...over,
});

describe('create', () => {
  beforeEach(() => prisma.item.findMany.mockResolvedValue([
    { id: 'fg',  name: 'Produk', defaultUnitId: 'PCS',  purchaseUnitId: null, itemUnits: [] },
    { id: 'mat', name: 'Cat',    defaultUnitId: 'GRAM', purchaseUnitId: null, itemUnits: [{ unitId: 'TUBE' }] },
  ]));

  test('barang jadi sama dengan bahan baku → 422', async () => {
    await expect(svc.create(body({ materials: [{ itemId: 'fg', unitId: 'PCS', plannedQuantity: 1 }] }), 'e1'))
      .rejects.toMatchObject({ statusCode: 422, message: 'Barang jadi tidak boleh sama dengan bahan baku' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('satuan bahan baku bukan milik item → 422', async () => {
    await expect(svc.create(body({ materials: [{ itemId: 'mat', unitId: 'PCS', plannedQuantity: 1 }] }), 'e1'))
      .rejects.toMatchObject({ statusCode: 422, message: 'Satuan tidak valid untuk item "Cat"' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

// tx dengan saldo bersih movement per referensi (simulasi kartu stok)
const makeTx = (netByRef) => {
  const tx = {
    productionOrder:   { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    inventoryMovement: {
      findUnique: jest.fn(({ where }) => Promise.resolve({
        mvMat: { inventoryId: 'invA', qtyChange: '-160', warehouseId: 'wh1', referenceId: 'm1' },
        mvFg:  { inventoryId: 'invB', qtyChange: '1',    warehouseId: 'wh1', referenceId: 'p1' },
      }[where.id])),
      aggregate:  jest.fn(({ where }) => Promise.resolve({ _sum: { qtyChange: netByRef[where.referenceId] } })),
      create:     jest.fn(),
    },
    inventory: {
      findUnique: jest.fn(({ where }) => Promise.resolve({ id: where.id, qtyOnHand: '40', qtyReserved: '0' })),
      update:     jest.fn(),
    },
    $queryRawUnsafe: jest.fn().mockResolvedValue([{}]),
  };
  prisma.$transaction.mockImplementation((fn) => fn(tx));
  return tx;
};

const ORDER = (status) => ({
  id: 'po1', productionNo: 'PROD-1', status, warehouseId: 'wh1',
  materials: [{ id: 'm1', itemId: 'mat', inventoryMovementId: 'mvMat', item: { name: 'Cat' } }],
  items:     [{ id: 'p1', itemId: 'fg', inventoryMovementId: null, item: { name: 'Produk' } }],
});

describe('batal IN_PROGRESS', () => {
  test('material yang sudah dikonsumsi dikembalikan ke stok dengan movement pembalik', async () => {
    repo.findById.mockResolvedValue(ORDER('IN_PROGRESS'));
    const tx = makeTx({ m1: '-160' });
    await svc.updateStatus('po1', 'CANCELLED', 'e1');
    const created = tx.inventoryMovement.create.mock.calls.map((c) => c[0].data);
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ inventoryId: 'invA', referenceType: 'PRODUCTION', referenceId: 'm1', createdByEmployeeId: 'e1' });
    expect(created[0].qtyChange.toString()).toBe('160');
    expect(created[0].qtyAfter.toString()).toBe('200');
    expect(repo.addTimeline.mock.calls.find((c) => c[0].timelineType === 'CANCELLED')[0].description)
      .toContain('1 material dikembalikan ke stok');
  });

  test('hapus setelah batal tidak mengembalikan stok dua kali (saldo bersih 0)', async () => {
    repo.findById.mockResolvedValue(ORDER('CANCELLED'));
    const tx = makeTx({ m1: '0' });
    await svc.remove('po1');
    expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
    expect(repo.remove).toHaveBeenCalledWith('po1', tx);
  });
});

describe('hapus — Accurate di dalam transaksi setelah guard & pembalikan', () => {
  test('Accurate gagal → error, order tidak dihapus (transaksi ERP rollback)', async () => {
    repo.findById.mockResolvedValue({ ...ORDER('COMPLETED'), items: [{ id: 'p1', itemId: 'fg', inventoryMovementId: 'mvFg', item: { name: 'Produk' } }] });
    const tx = makeTx({ m1: '-160', p1: '1' });
    tx.$queryRawUnsafe.mockResolvedValue([{ accuratePekerjaanId: 11, accuratePenyelesaianId: 12 }]);
    deleteFromAccurate.mockRejectedValue(Object.assign(new Error('Tidak bisa menghapus'), { statusCode: 422 }));
    await expect(svc.remove('po1')).rejects.toMatchObject({ statusCode: 422 });
    expect(tx.productionOrder.updateMany).toHaveBeenCalled(); // guard dulu
    expect(repo.remove).not.toHaveBeenCalled();
  });

  test('guard gagal (paralel) → 409, Accurate tidak disentuh', async () => {
    repo.findById.mockResolvedValue(ORDER('COMPLETED'));
    const tx = makeTx({});
    tx.productionOrder.updateMany.mockResolvedValue({ count: 0 });
    await expect(svc.remove('po1')).rejects.toMatchObject({ statusCode: 409 });
    expect(deleteFromAccurate).not.toHaveBeenCalled();
  });
});
