'use strict';

jest.mock('./commission.repository');

const repo = require('./commission.repository');
const svc  = require('./commission.service');

const COMMISSION = { id: 'cm1', status: 'PENDING', amount: '50000', employeeId: 'e1' };

beforeEach(() => jest.clearAllMocks());

// ── listCommissions ────────────────────────────────────────────────────

describe('listCommissions', () => {
  test('returns paginated list', async () => {
    repo.findAll.mockResolvedValue([COMMISSION]);
    repo.count.mockResolvedValue(1);

    const result = await svc.listCommissions({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  test('passes employeeId filter to repository', async () => {
    repo.findAll.mockResolvedValue([]);
    repo.count.mockResolvedValue(0);

    await svc.listCommissions({ page: 1, limit: 10, employeeId: 'e1' });
    expect(repo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ employeeId: 'e1' }) })
    );
  });
});

// ── getCommissionById ──────────────────────────────────────────────────

describe('getCommissionById', () => {
  test('returns commission when found', async () => {
    repo.findById.mockResolvedValue(COMMISSION);
    await expect(svc.getCommissionById('cm1')).resolves.toEqual(COMMISSION);
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.getCommissionById('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── approveCommission ──────────────────────────────────────────────────

describe('approveCommission', () => {
  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.approveCommission('x', 'u1')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 422 when status is not PENDING', async () => {
    repo.findById.mockResolvedValue({ ...COMMISSION, status: 'APPROVED' });
    await expect(svc.approveCommission('cm1', 'u1')).rejects.toMatchObject({ statusCode: 422 });
  });

  test('throws 422 when status is PAID', async () => {
    repo.findById.mockResolvedValue({ ...COMMISSION, status: 'PAID' });
    await expect(svc.approveCommission('cm1', 'u1')).rejects.toMatchObject({ statusCode: 422 });
  });

  test('calls approveOne when status is PENDING', async () => {
    repo.findById.mockResolvedValue(COMMISSION);
    repo.approveOne.mockResolvedValue({ ...COMMISSION, status: 'APPROVED' });

    const result = await svc.approveCommission('cm1', 'u1');
    expect(repo.approveOne).toHaveBeenCalledWith('cm1', 'u1');
    expect(result.status).toBe('APPROVED');
  });
});

// ── markCommissionPaid ─────────────────────────────────────────────────

describe('markCommissionPaid', () => {
  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.markCommissionPaid('x', 'u1')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 422 when status is PENDING (not APPROVED)', async () => {
    repo.findById.mockResolvedValue(COMMISSION);
    await expect(svc.markCommissionPaid('cm1', 'u1')).rejects.toMatchObject({ statusCode: 422 });
  });

  test('throws 422 when status is PAID', async () => {
    repo.findById.mockResolvedValue({ ...COMMISSION, status: 'PAID' });
    await expect(svc.markCommissionPaid('cm1', 'u1')).rejects.toMatchObject({ statusCode: 422 });
  });

  test('calls markPaidOne when status is APPROVED', async () => {
    repo.findById.mockResolvedValue({ ...COMMISSION, status: 'APPROVED' });
    repo.markPaidOne.mockResolvedValue({ ...COMMISSION, status: 'PAID' });

    const result = await svc.markCommissionPaid('cm1', 'u1');
    expect(repo.markPaidOne).toHaveBeenCalledWith('cm1', 'u1');
    expect(result.status).toBe('PAID');
  });
});

// ── deleteOne ──────────────────────────────────────────────────────────

describe('deleteCommission', () => {
  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.deleteCommission('x')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 422 when status is not PENDING', async () => {
    repo.findById.mockResolvedValue({ ...COMMISSION, status: 'APPROVED' });
    await expect(svc.deleteCommission('cm1')).rejects.toMatchObject({ statusCode: 422 });
  });

  test('calls deleteOne when status is PENDING', async () => {
    repo.findById.mockResolvedValue(COMMISSION);
    repo.deleteOne.mockResolvedValue(COMMISSION);

    await svc.deleteCommission('cm1');
    expect(repo.deleteOne).toHaveBeenCalledWith('cm1');
  });
});
