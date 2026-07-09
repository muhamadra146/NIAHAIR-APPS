'use strict';

jest.mock('./treatmentItem.repository');

const repo = require('./treatmentItem.repository');
const svc  = require('./treatmentItem.service');

const SESSION      = { id: 'ts1', customerId: 'c1', branchId: 'b1' };
const ITEM         = { id: 'item1', name: 'Hair Extension' };
const ITEM_UNIT    = { conversionFactor: '100' };
const ITEM_PRICE   = { sellingPrice: '50000' };
const TITEM        = { id: 'ti1', treatmentSessionId: 'ts1', itemId: 'item1', qty: 1, priceSnapshot: 50000, _count: { assignments: 0 } };

beforeEach(() => jest.clearAllMocks());

// ── getBySession ───────────────────────────────────────────────────────

describe('getBySession', () => {
  test('throws 404 when session not found', async () => {
    repo.findSessionById.mockResolvedValue(null);
    await expect(svc.getBySession('x')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('returns items for session', async () => {
    repo.findSessionById.mockResolvedValue(SESSION);
    repo.findBySession.mockResolvedValue([TITEM]);

    const result = await svc.getBySession('ts1');
    expect(result).toHaveLength(1);
  });
});

// ── getById ────────────────────────────────────────────────────────────

describe('getById', () => {
  test('returns treatment item when found', async () => {
    repo.findById.mockResolvedValue(TITEM);
    await expect(svc.getById('ti1')).resolves.toEqual(TITEM);
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.getById('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── createTreatmentItem ────────────────────────────────────────────────

describe('createTreatmentItem', () => {
  beforeEach(() => {
    repo.findSessionById.mockResolvedValue(SESSION);
    repo.findItemById.mockResolvedValue(ITEM);
    repo.findItemUnit.mockResolvedValue(ITEM_UNIT);
    repo.findActiveItemPrice.mockResolvedValue(ITEM_PRICE);
    repo.create.mockResolvedValue(TITEM);
  });

  test('throws 404 when session not found', async () => {
    repo.findSessionById.mockResolvedValue(null);
    await expect(svc.createTreatmentItem('bad', { itemId: 'item1', unitId: 'u1', qty: 1 }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 404 when item not found', async () => {
    repo.findItemById.mockResolvedValue(null);
    await expect(svc.createTreatmentItem('ts1', { itemId: 'bad', unitId: 'u1', qty: 1 }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 422 when unit is not registered for item', async () => {
    repo.findItemUnit.mockResolvedValue(null);
    await expect(svc.createTreatmentItem('ts1', { itemId: 'item1', unitId: 'bad', qty: 1 }))
      .rejects.toMatchObject({ statusCode: 422 });
  });

  test('throws 422 when no active price found', async () => {
    repo.findActiveItemPrice.mockResolvedValue(null);
    await expect(svc.createTreatmentItem('ts1', { itemId: 'item1', unitId: 'u1', qty: 1 }))
      .rejects.toMatchObject({ statusCode: 422 });
  });

  test('creates treatment item with price and conversion snapshots', async () => {
    const result = await svc.createTreatmentItem('ts1', { itemId: 'item1', unitId: 'u1', qty: 2 });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      treatmentSessionId:  'ts1',
      priceSnapshot:       50000,
      conversionSnapshot:  100,
    }));
    expect(result).toEqual(TITEM);
  });
});

// ── updateTreatmentItem ────────────────────────────────────────────────

describe('updateTreatmentItem', () => {
  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.updateTreatmentItem('x', { qty: 3 })).rejects.toMatchObject({ statusCode: 404 });
  });

  test('updates qty and notes only', async () => {
    repo.findById.mockResolvedValue(TITEM);
    repo.update.mockResolvedValue({ ...TITEM, qty: 3, notes: 'Updated' });

    await svc.updateTreatmentItem('ti1', { qty: 3, notes: 'Updated' });
    expect(repo.update).toHaveBeenCalledWith('ti1', { qty: 3, notes: 'Updated' });
  });
});

// ── deleteTreatmentItem ────────────────────────────────────────────────

describe('deleteTreatmentItem', () => {
  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.deleteTreatmentItem('x')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 409 when item has assignments', async () => {
    repo.findById.mockResolvedValue({ ...TITEM, _count: { assignments: 2 } });
    await expect(svc.deleteTreatmentItem('ti1')).rejects.toMatchObject({ statusCode: 409 });
  });

  test('deletes when no assignments', async () => {
    repo.findById.mockResolvedValue(TITEM);
    repo.deleteById.mockResolvedValue(undefined);

    await svc.deleteTreatmentItem('ti1');
    expect(repo.deleteById).toHaveBeenCalledWith('ti1');
  });
});
