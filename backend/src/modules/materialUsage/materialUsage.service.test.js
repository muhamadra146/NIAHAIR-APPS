'use strict';

jest.mock('./materialUsage.repository');
jest.mock('../inventory/inventory.service', () => ({
  generateServiceMovement:     jest.fn(),
  reverseServiceUsageMovement: jest.fn(),
}));
jest.mock('../invoice/invoice.sync.service', () => ({
  syncInvoiceToAccurate: jest.fn(),
}));

const repo      = require('./materialUsage.repository');
const inventory = require('../inventory/inventory.service');
const invSync   = require('../invoice/invoice.sync.service');
const svc       = require('./materialUsage.service');

const SESSION = { id: 'ts1' };
const USAGE   = { id: 'mu1', treatmentItemId: 'ti1' };
const USAGE_ITEM = { id: 'ui1', qty: 2, inventoryMovementId: null };

beforeEach(() => {
  jest.clearAllMocks();
  inventory.generateServiceMovement.mockResolvedValue(undefined);
  inventory.reverseServiceUsageMovement.mockResolvedValue(undefined);
  invSync.syncInvoiceToAccurate.mockResolvedValue(undefined);
});

// ── getBySession ───────────────────────────────────────────────────────

describe('getBySession', () => {
  test('throws 404 when session not found', async () => {
    repo.findSessionById.mockResolvedValue(null);
    await expect(svc.getBySession('x')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('returns material usage for session', async () => {
    repo.findSessionById.mockResolvedValue(SESSION);
    repo.findBySession.mockResolvedValue([USAGE]);
    repo.countBySession.mockResolvedValue(1);

    const result = await svc.getBySession('ts1');
    expect(repo.findBySession).toHaveBeenCalledWith('ts1', { skip: 0, take: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta).toMatchObject({ total: 1, page: 1, limit: 10 });
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
    repo.findUsageItemById.mockResolvedValue(USAGE_ITEM);
    repo.updateUsageItemQty.mockResolvedValue({ ...USAGE_ITEM, qty: 5 });

    const result = await svc.bulkSave('ts1', [{ id: 'ui1', treatmentItemId: 'ti1', qty: 5 }]);
    expect(repo.updateUsageItemQty).toHaveBeenCalledWith('ui1', 5);
    expect(inventory.reverseServiceUsageMovement).not.toHaveBeenCalled();
    expect(inventory.generateServiceMovement).toHaveBeenCalledWith('ts1');
    expect(result[0].qty).toBe(5);
  });

  test('creates new item when no row.id', async () => {
    repo.findSessionById.mockResolvedValue(SESSION);
    repo.findTreatmentItem.mockResolvedValue({ id: 'ti1' });
    repo.findOrCreateUsage.mockResolvedValue(USAGE);
    repo.createUsageItem.mockResolvedValue({ ...USAGE_ITEM, qty: 3 });

    const result = await svc.bulkSave('ts1', [{ treatmentItemId: 'ti1', materialItemId: 'm1', unitId: 'u1', qty: 3 }]);
    expect(repo.createUsageItem).toHaveBeenCalled();
    expect(inventory.generateServiceMovement).toHaveBeenCalledWith('ts1');
    expect(result[0].qty).toBe(3);
  });
});

// ── removeUsageItem ────────────────────────────────────────────────────

describe('removeUsageItem', () => {
  test('throws 404 when usage item not found', async () => {
    repo.findUsageItemById.mockResolvedValue(null);
    await expect(svc.removeUsageItem('x')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('reverses inventory movement before deleting when movement already generated', async () => {
    repo.findUsageItemById.mockResolvedValue({ ...USAGE_ITEM, inventoryMovementId: 'im1' });
    repo.deleteUsageItem.mockResolvedValue(undefined);

    await svc.removeUsageItem('ui1');
    expect(inventory.reverseServiceUsageMovement).toHaveBeenCalledWith('im1', 'ui1');
    expect(repo.deleteUsageItem).toHaveBeenCalledWith('ui1');
    expect(inventory.reverseServiceUsageMovement.mock.invocationCallOrder[0])
      .toBeLessThan(repo.deleteUsageItem.mock.invocationCallOrder[0]);
  });

  test('does not delete when movement reversal fails', async () => {
    repo.findUsageItemById.mockResolvedValue({ ...USAGE_ITEM, inventoryMovementId: 'im1' });
    inventory.reverseServiceUsageMovement.mockRejectedValue(new Error('reverse failed'));

    await expect(svc.removeUsageItem('ui1')).rejects.toThrow('reverse failed');
    expect(repo.deleteUsageItem).not.toHaveBeenCalled();
  });

  test('deletes item when no inventory movement', async () => {
    repo.findUsageItemById.mockResolvedValue(USAGE_ITEM);
    repo.deleteUsageItem.mockResolvedValue(undefined);

    await svc.removeUsageItem('ui1');
    expect(inventory.reverseServiceUsageMovement).not.toHaveBeenCalled();
    expect(repo.deleteUsageItem).toHaveBeenCalledWith('ui1');
  });

  test('re-syncs invoice to Accurate when session is completed', async () => {
    repo.findUsageItemById.mockResolvedValue({
      ...USAGE_ITEM,
      materialUsage: { treatmentItem: { treatmentSessionId: 'ts1' } },
    });
    repo.deleteUsageItem.mockResolvedValue(undefined);
    repo.findSessionById.mockResolvedValue({ id: 'ts1', completedAt: new Date(), invoiceId: 'inv1' });

    await svc.removeUsageItem('ui1');
    expect(invSync.syncInvoiceToAccurate).toHaveBeenCalledWith('inv1');
  });
});
