'use strict';

jest.mock('./stockTransfer.repository');
jest.mock('../syncQueue/syncQueue.service');
jest.mock('../inventory/inventory.period.service');
jest.mock('../../config/prisma', () => ({
  warehouse:     { findUnique: jest.fn() },
  $transaction:  jest.fn((fn, _opts) => fn({
    stockTransfer:     { update: jest.fn() },
    inventory:         { upsert: jest.fn(), update: jest.fn() },
    inventoryMovement: { create: jest.fn() },
  })),
}));

const repo           = require('./stockTransfer.repository');
const { createSyncJob } = require('../syncQueue/syncQueue.service');
const { validatePeriodOpen } = require('../inventory/inventory.period.service');
const prisma         = require('../../config/prisma');
const svc            = require('./stockTransfer.service');

const TRANSFER_PENDING = {
  id: 'tr1', transferNo: 'TRF-20240601-0001',
  status: 'PENDING',
  sourceWarehouseId:      'wh1',
  destinationWarehouseId: 'wh2',
  sourceWarehouse:      { branchId: 'b1', name: 'WH-A' },
  destinationWarehouse: { branchId: 'b2', name: 'WH-B' },
  items: [],
};

beforeEach(() => jest.clearAllMocks());

// ── getAll ─────────────────────────────────────────────────────────────

describe('getAll', () => {
  test('returns paginated list', async () => {
    repo.findAll.mockResolvedValue([TRANSFER_PENDING]);
    repo.count.mockResolvedValue(1);

    const result = await svc.getAll({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

// ── getById ────────────────────────────────────────────────────────────

describe('getById', () => {
  test('returns transfer when found', async () => {
    repo.findById.mockResolvedValue(TRANSFER_PENDING);
    await expect(svc.getById('tr1')).resolves.toEqual(TRANSFER_PENDING);
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.getById('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── create ─────────────────────────────────────────────────────────────

describe('create', () => {
  beforeEach(() => {
    prisma.warehouse.findUnique.mockResolvedValue({ id: 'wh1' });
    repo.findMaxSeqToday.mockResolvedValue(0);
    repo.create.mockResolvedValue(TRANSFER_PENDING);
    prisma.$transaction.mockImplementation((fn) => fn({
      stockTransfer: { update: jest.fn() }, inventory: { upsert: jest.fn(), update: jest.fn() },
      inventoryMovement: { create: jest.fn() },
    }));
  });

  test('throws 400 when source and destination are the same warehouse', async () => {
    await expect(svc.create({
      sourceWarehouseId: 'wh1', destinationWarehouseId: 'wh1',
      transferDate: '2024-06-01', items: [{ itemId: 'i1', qty: 1 }],
    })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('throws 400 when items array is empty', async () => {
    await expect(svc.create({
      sourceWarehouseId: 'wh1', destinationWarehouseId: 'wh2',
      transferDate: '2024-06-01', items: [],
    })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('throws 404 when source warehouse not found', async () => {
    prisma.warehouse.findUnique
      .mockResolvedValueOnce(null)  // src → not found
      .mockResolvedValueOnce({ id: 'wh2' });
    await expect(svc.create({
      sourceWarehouseId: 'bad', destinationWarehouseId: 'wh2',
      transferDate: '2024-06-01', items: [{ itemId: 'i1', qty: 1 }],
    })).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 404 when destination warehouse not found', async () => {
    prisma.warehouse.findUnique
      .mockResolvedValueOnce({ id: 'wh1' })   // src → found
      .mockResolvedValueOnce(null);             // dst → not found
    await expect(svc.create({
      sourceWarehouseId: 'wh1', destinationWarehouseId: 'bad',
      transferDate: '2024-06-01', items: [{ itemId: 'i1', qty: 1 }],
    })).rejects.toMatchObject({ statusCode: 404 });
  });

  test('creates transfer with PENDING status and auto-generated transferNo', async () => {
    const result = await svc.create({
      sourceWarehouseId: 'wh1', destinationWarehouseId: 'wh2',
      transferDate: '2024-06-01', items: [{ itemId: 'i1', qty: 2 }],
    }, 'u1');
    expect(result).toEqual(TRANSFER_PENDING);
  });
});

// ── updateStatus ───────────────────────────────────────────────────────

describe('updateStatus', () => {
  beforeEach(() => {
    validatePeriodOpen.mockResolvedValue(undefined);
    createSyncJob.mockResolvedValue(undefined);
    repo.findById.mockResolvedValue(TRANSFER_PENDING);
    prisma.$transaction.mockImplementation((fn) => fn({
      stockTransfer: { update: jest.fn() }, inventory: { upsert: jest.fn(), update: jest.fn() },
      inventoryMovement: { create: jest.fn() },
    }));
  });

  test('throws 404 when transfer not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.updateStatus('x', 'IN_TRANSIT', 'STAFF', 'b1'))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 400 on invalid PENDING → RECEIVED transition', async () => {
    await expect(svc.updateStatus('tr1', 'RECEIVED', 'SUPER_ADMIN', null))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('throws 403 when non-admin tries to send from another branch', async () => {
    await expect(svc.updateStatus('tr1', 'IN_TRANSIT', 'STAFF', 'b_other'))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  test('PENDING → IN_TRANSIT: queues Accurate sync', async () => {
    repo.findById
      .mockResolvedValueOnce(TRANSFER_PENDING)
      .mockResolvedValueOnce({ ...TRANSFER_PENDING, status: 'IN_TRANSIT' });

    await svc.updateStatus('tr1', 'IN_TRANSIT', 'SUPER_ADMIN', null);
    expect(createSyncJob).toHaveBeenCalledWith(expect.objectContaining({
      entityType: 'STOCK_TRANSFER',
      direction:  'APP_TO_ACCURATE',
    }));
  });

  test('SUPER_ADMIN bypasses branch authorization', async () => {
    repo.findById
      .mockResolvedValueOnce(TRANSFER_PENDING)
      .mockResolvedValueOnce({ ...TRANSFER_PENDING, status: 'IN_TRANSIT' });

    await expect(svc.updateStatus('tr1', 'IN_TRANSIT', 'SUPER_ADMIN', 'any_branch'))
      .resolves.toBeDefined();
  });
});
