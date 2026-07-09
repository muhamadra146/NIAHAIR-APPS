'use strict';

jest.mock('./warehouse.repository');
jest.mock('./warehouseAccurate.service');

const repo     = require('./warehouse.repository');
const svc      = require('./warehouse.service');

const WAREHOUSE = { id: 'wh1', name: 'Gudang Utama', branchId: 'b1', isActive: true };

beforeEach(() => jest.clearAllMocks());

// ── listWarehouses ─────────────────────────────────────────────────────

describe('listWarehouses', () => {
  test('returns paginated list', async () => {
    repo.findAll.mockResolvedValue([WAREHOUSE]);
    repo.count.mockResolvedValue(1);

    const result = await svc.listWarehouses({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

// ── getWarehouseById ───────────────────────────────────────────────────

describe('getWarehouseById', () => {
  test('returns warehouse when found', async () => {
    repo.findById.mockResolvedValue(WAREHOUSE);
    await expect(svc.getWarehouseById('wh1')).resolves.toEqual(WAREHOUSE);
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.getWarehouseById('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── updateWarehouseBranchMapping ───────────────────────────────────────

describe('updateWarehouseBranchMapping', () => {
  test('throws 404 when warehouse not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.updateWarehouseBranchMapping('x', { branchId: 'b1' }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 404 when branch not found', async () => {
    repo.findById.mockResolvedValue(WAREHOUSE);
    repo.findBranchById.mockResolvedValue(null);
    await expect(svc.updateWarehouseBranchMapping('wh1', { branchId: 'bad' }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('updates branch mapping on success', async () => {
    repo.findById.mockResolvedValue(WAREHOUSE);
    repo.findBranchById.mockResolvedValue({ id: 'b2' });
    repo.updateBranchMapping.mockResolvedValue({ ...WAREHOUSE, branchId: 'b2' });

    const result = await svc.updateWarehouseBranchMapping('wh1', { branchId: 'b2' });
    expect(repo.updateBranchMapping).toHaveBeenCalledWith('wh1', 'b2');
    expect(result.branchId).toBe('b2');
  });
});

// ── updateWarehouseMapping ─────────────────────────────────────────────

describe('updateWarehouseMapping', () => {
  test('throws 404 when warehouse not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.updateWarehouseMapping('x', { accurateWarehouseId: 123 }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('updates accurate mapping on success', async () => {
    repo.findById.mockResolvedValue(WAREHOUSE);
    repo.updateAccurateMapping.mockResolvedValue({ ...WAREHOUSE, accurateWarehouseId: 123 });

    const result = await svc.updateWarehouseMapping('wh1', { accurateWarehouseId: 123 });
    expect(repo.updateAccurateMapping).toHaveBeenCalledWith('wh1', 123);
    expect(result.accurateWarehouseId).toBe(123);
  });
});
