'use strict';

jest.mock('./item.repository');
jest.mock('../syncQueue/syncQueue.service');

const repo = require('./item.repository');
const { createSyncJob } = require('../syncQueue/syncQueue.service');
const svc  = require('./item.service');

const ITEM = {
  id: 'item1', itemCode: 'ITM-001', name: 'Hair Extension 20cm',
  itemType: 'PRODUCT', isActive: true, commissionCategoryId: null,
};

beforeEach(() => jest.clearAllMocks());

// ── getAll ─────────────────────────────────────────────────────────────

describe('getAll', () => {
  test('returns paginated list', async () => {
    repo.findAll.mockResolvedValue([ITEM]);
    repo.count.mockResolvedValue(1);

    const result = await svc.getAll({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

// ── getById ────────────────────────────────────────────────────────────

describe('getById', () => {
  test('returns item when found', async () => {
    repo.findById.mockResolvedValue(ITEM);
    await expect(svc.getById('item1')).resolves.toEqual(ITEM);
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.getById('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── createItem ─────────────────────────────────────────────────────────

describe('createItem', () => {
  test('throws 409 when itemCode already exists', async () => {
    repo.findByItemCode.mockResolvedValue(ITEM);
    await expect(svc.createItem({ itemCode: 'ITM-001', name: 'Test' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('creates item and queues Accurate sync', async () => {
    repo.findByItemCode.mockResolvedValue(null);
    repo.create.mockResolvedValue(ITEM);
    createSyncJob.mockResolvedValue(undefined);

    const result = await svc.createItem({ itemCode: 'ITM-002', name: 'New Item' });
    expect(repo.create).toHaveBeenCalled();
    expect(createSyncJob).toHaveBeenCalledWith(expect.objectContaining({
      entityType: 'ITEM',
      entityId:   ITEM.id,
      direction:  'APP_TO_ACCURATE',
    }));
    expect(result.item).toEqual(ITEM);
    expect(result.message).toContain('sync');
  });
});

// ── updateItem ─────────────────────────────────────────────────────────

describe('updateItem', () => {
  beforeEach(() => {
    repo.findById.mockResolvedValue(ITEM);
    repo.findByItemCode.mockResolvedValue(null);
    repo.findCommissionCategoryById.mockResolvedValue({ id: 'cc1' });
    repo.update.mockResolvedValue({ ...ITEM, name: 'Updated' });
  });

  test('throws 404 when item not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.updateItem('x', {})).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 409 when new itemCode already taken', async () => {
    repo.findByItemCode.mockResolvedValue({ id: 'other' });
    await expect(svc.updateItem('item1', { itemCode: 'TAKEN' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('skips itemCode check when code unchanged', async () => {
    await svc.updateItem('item1', { itemCode: ITEM.itemCode, name: 'Updated' });
    expect(repo.findByItemCode).not.toHaveBeenCalled();
  });

  test('throws 404 when commissionCategory not found', async () => {
    repo.findCommissionCategoryById.mockResolvedValue(null);
    await expect(svc.updateItem('item1', { commissionCategoryId: 'bad' }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('skips category check when commissionCategoryId is null', async () => {
    await svc.updateItem('item1', { commissionCategoryId: null });
    expect(repo.findCommissionCategoryById).not.toHaveBeenCalled();
  });

  test('updates item successfully', async () => {
    const result = await svc.updateItem('item1', { name: 'Updated' });
    expect(repo.update).toHaveBeenCalledWith('item1', { name: 'Updated' });
    expect(result.name).toBe('Updated');
  });
});

// ── getServiceMaterials ────────────────────────────────────────────────

describe('getServiceMaterials', () => {
  test('throws 404 when item not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.getServiceMaterials('x')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('returns service materials when item found', async () => {
    repo.findById.mockResolvedValue(ITEM);
    repo.findServiceMaterials.mockResolvedValue([{ itemId: 'item1', qty: 2 }]);

    const result = await svc.getServiceMaterials('item1');
    expect(repo.findServiceMaterials).toHaveBeenCalledWith('item1');
    expect(result).toHaveLength(1);
  });
});
