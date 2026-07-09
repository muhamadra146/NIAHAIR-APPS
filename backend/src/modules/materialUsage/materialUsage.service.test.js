'use strict';

jest.mock('./materialUsage.repository');

const repo = require('./materialUsage.repository');
const svc  = require('./materialUsage.service');

const SESSION = { id: 'ts1' };
const USAGE   = { id: 'mu1', treatmentItemId: 'ti1' };
const USAGE_ITEM = { id: 'ui1', qty: 2, inventoryMovementId: null };

beforeEach(() => jest.clearAllMocks());

// ── getBySession ───────────────────────────────────────────────────────

describe('getBySession', () => {
  test('throws 404 when session not found', async () => {
    repo.findSessionById.mockResolvedValue(null);
    await expect(svc.getBySession('x')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('returns material usage for session', async () => {
    repo.findSessionById.mockResolvedValue(SESSION);
    repo.findBySession.mockResolvedValue([USAGE]);

    const result = await svc.getBySession('ts1');
    expect(result).toHaveLength(1);
  });
});

// ── bulkSave ───────────────────────────────────────────────────────────

describe('bulkSave', () => {
  test('throws 404 when session not found', async () => {
    repo.findSessionById.mockResolvedValue(null);
    await expect(svc.bulkSave('bad', [{ treatmentItemId: 'ti1', qty: 1 }]))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 404 when treatment item not found', async () => {
    repo.findSessionById.mockResolvedValue(SESSION);
    repo.findTreatmentItem.mockResolvedValue(null);
    await expect(svc.bulkSave('ts1', [{ treatmentItemId: 'bad', qty: 1 }]))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('updates existing item when row.id provided', async () => {
    repo.findSessionById.mockResolvedValue(SESSION);
    repo.findTreatmentItem.mockResolvedValue({ id: 'ti1' });
    repo.findOrCreateUsage.mockResolvedValue(USAGE);
    repo.updateUsageItemQty.mockResolvedValue({ ...USAGE_ITEM, qty: 5 });

    const result = await svc.bulkSave('ts1', [{ id: 'ui1', treatmentItemId: 'ti1', qty: 5 }]);
    expect(repo.updateUsageItemQty).toHaveBeenCalledWith('ui1', 5);
    expect(result[0].qty).toBe(5);
  });

  test('creates new item when no row.id', async () => {
    repo.findSessionById.mockResolvedValue(SESSION);
    repo.findTreatmentItem.mockResolvedValue({ id: 'ti1' });
    repo.findOrCreateUsage.mockResolvedValue(USAGE);
    repo.createUsageItem.mockResolvedValue({ ...USAGE_ITEM, qty: 3 });

    const result = await svc.bulkSave('ts1', [{ treatmentItemId: 'ti1', materialItemId: 'm1', unitId: 'u1', qty: 3 }]);
    expect(repo.createUsageItem).toHaveBeenCalled();
    expect(result[0].qty).toBe(3);
  });
});

// ── removeUsageItem ────────────────────────────────────────────────────

describe('removeUsageItem', () => {
  test('throws 404 when usage item not found', async () => {
    repo.findUsageItemById.mockResolvedValue(null);
    await expect(svc.removeUsageItem('x')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 409 when inventory movement already generated', async () => {
    repo.findUsageItemById.mockResolvedValue({ ...USAGE_ITEM, inventoryMovementId: 'im1' });
    await expect(svc.removeUsageItem('ui1')).rejects.toMatchObject({ statusCode: 409 });
  });

  test('deletes item when no inventory movement', async () => {
    repo.findUsageItemById.mockResolvedValue(USAGE_ITEM);
    repo.deleteUsageItem.mockResolvedValue(undefined);

    await svc.removeUsageItem('ui1');
    expect(repo.deleteUsageItem).toHaveBeenCalledWith('ui1');
  });
});
