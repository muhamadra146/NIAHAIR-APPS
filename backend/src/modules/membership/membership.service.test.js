'use strict';

jest.mock('./membership.repository');
jest.mock('../../config/prisma', () => ({
  customer:           { findUnique: jest.fn() },
  customerMembership: { updateMany: jest.fn(), update: jest.fn(), create: jest.fn(), count: jest.fn() },
  invoice:            { count: jest.fn() },
  $transaction: jest.fn((fn) => fn({
    customerMembership: { updateMany: jest.fn(), update: jest.fn().mockResolvedValue({ id: 'cm1', membership: {} }), create: jest.fn().mockResolvedValue({ id: 'cm1', membership: {} }) },
    customer:           { update: jest.fn() },
    membershipHistory:  { create: jest.fn() },
  })),
}));

const repo   = require('./membership.repository');
const prisma = require('../../config/prisma');
const svc    = require('./membership.service');

const MEMBERSHIP = {
  id: 'm1', name: 'Gold', price: 500000,
  durationDays: 365, discountType: 'PERCENT', discountValue: 10,
};

beforeEach(() => jest.clearAllMocks());

// ── getAll ─────────────────────────────────────────────────────────────

describe('getAll', () => {
  test('returns paginated list', async () => {
    repo.findAll.mockResolvedValue([MEMBERSHIP]);
    repo.count.mockResolvedValue(1);

    const result = await svc.getAll({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

// ── getById ────────────────────────────────────────────────────────────

describe('getById', () => {
  test('returns membership when found', async () => {
    repo.findById.mockResolvedValue(MEMBERSHIP);
    await expect(svc.getById('m1')).resolves.toEqual(MEMBERSHIP);
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.getById('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── create ─────────────────────────────────────────────────────────────

describe('create', () => {
  test('creates membership with given fields', async () => {
    repo.create.mockResolvedValue(MEMBERSHIP);
    const result = await svc.create({
      name: 'Gold', price: 500000, durationDays: 365,
      discountType: 'PERCENT', discountValue: 10,
    });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Gold' }));
    expect(result).toEqual(MEMBERSHIP);
  });
});

// ── update ─────────────────────────────────────────────────────────────

describe('update', () => {
  test('throws 404 when membership not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.update('x', { name: 'Platinum' })).rejects.toMatchObject({ statusCode: 404 });
  });

  test('updates allowed fields', async () => {
    repo.findById.mockResolvedValue(MEMBERSHIP);
    repo.update.mockResolvedValue({ ...MEMBERSHIP, name: 'Platinum' });

    const result = await svc.update('m1', { name: 'Platinum' });
    expect(repo.update).toHaveBeenCalledWith('m1', expect.objectContaining({ name: 'Platinum' }));
    expect(result.name).toBe('Platinum');
  });
});

// ── remove ─────────────────────────────────────────────────────────────

describe('remove', () => {
  test('throws 404 when membership not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.remove('x')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 409 when membership is in use by customers', async () => {
    repo.findById.mockResolvedValue(MEMBERSHIP);
    repo.countCustomers.mockResolvedValue(5);
    await expect(svc.remove('m1')).rejects.toMatchObject({ statusCode: 409 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('throws 409 when membership has ACTIVE subscriptions', async () => {
    repo.findById.mockResolvedValue(MEMBERSHIP);
    repo.countCustomers.mockResolvedValue(0);
    prisma.customerMembership.count.mockResolvedValue(2);
    await expect(svc.remove('m1')).rejects.toMatchObject({ statusCode: 409 });
    expect(prisma.customerMembership.count).toHaveBeenCalledWith({
      where: { membershipId: 'm1', status: 'ACTIVE' },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('throws 409 when membership is referenced by invoices', async () => {
    repo.findById.mockResolvedValue(MEMBERSHIP);
    repo.countCustomers.mockResolvedValue(0);
    prisma.customerMembership.count.mockResolvedValue(0);
    prisma.invoice.count.mockResolvedValue(1);
    await expect(svc.remove('m1')).rejects.toMatchObject({ statusCode: 409 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('removes membership with its history in a transaction when not in use', async () => {
    repo.findById.mockResolvedValue(MEMBERSHIP);
    repo.countCustomers.mockResolvedValue(0);
    prisma.customerMembership.count.mockResolvedValue(0);
    prisma.invoice.count.mockResolvedValue(0);
    const tx = {
      membershipHistory:  { deleteMany: jest.fn() },
      customerMembership: { deleteMany: jest.fn() },
      membership:         { delete: jest.fn().mockResolvedValue(MEMBERSHIP) },
    };
    prisma.$transaction.mockImplementationOnce((fn) => fn(tx));

    await svc.remove('m1');
    expect(tx.membershipHistory.deleteMany).toHaveBeenCalledWith({ where: { membershipId: 'm1' } });
    expect(tx.customerMembership.deleteMany).toHaveBeenCalledWith({ where: { membershipId: 'm1' } });
    expect(tx.membership.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
  });
});

// ── getCustomerMembership ──────────────────────────────────────────────

describe('getCustomerMembership', () => {
  test('throws 404 when customer not found', async () => {
    prisma.customer.findUnique.mockResolvedValue(null);
    repo.findActiveMembership.mockResolvedValue(null);
    await expect(svc.getCustomerMembership('c999')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('returns customer with active membership', async () => {
    prisma.customer.findUnique.mockResolvedValue({ id: 'c1', name: 'Nia' });
    repo.findActiveMembership.mockResolvedValue({ membership: MEMBERSHIP });

    const result = await svc.getCustomerMembership('c1');
    expect(result.customer.name).toBe('Nia');
    expect(result.activeMembership).toEqual(MEMBERSHIP);
  });

  test('returns null activeMembership when none active', async () => {
    prisma.customer.findUnique.mockResolvedValue({ id: 'c1', name: 'Nia' });
    repo.findActiveMembership.mockResolvedValue(null);

    const result = await svc.getCustomerMembership('c1');
    expect(result.activeMembership).toBeNull();
  });
});

// ── assignMembership ───────────────────────────────────────────────────

describe('assignMembership', () => {
  beforeEach(() => {
    prisma.customer.findUnique.mockResolvedValue({ id: 'c1', name: 'Nia' });
    repo.findById.mockResolvedValue(MEMBERSHIP);
    prisma.$transaction.mockImplementation((fn) =>
      fn({
        customerMembership: {
          updateMany: jest.fn(),
          create:     jest.fn().mockResolvedValue({ id: 'cm1', membership: MEMBERSHIP }),
        },
        customer:          { update: jest.fn() },
        membershipHistory: { create: jest.fn() },
      })
    );
  });

  test('throws 404 when customer not found', async () => {
    prisma.customer.findUnique.mockResolvedValue(null);
    await expect(svc.assignMembership('c999', 'm1', 'u1'))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 404 when membership not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.assignMembership('c1', 'bad', 'u1'))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('runs $transaction and returns new CustomerMembership record', async () => {
    const result = await svc.assignMembership('c1', 'm1', 'u1');
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'cm1' });
  });
});

// ── cancelMembership ───────────────────────────────────────────────────

describe('cancelMembership', () => {
  test('throws 400 when customer has no active membership', async () => {
    repo.findActiveCustomerMembership.mockResolvedValue(null);
    await expect(svc.cancelMembership('c1')).rejects.toMatchObject({ statusCode: 400 });
  });

  test('runs $transaction on successful cancellation', async () => {
    repo.findActiveCustomerMembership.mockResolvedValue({ id: 'cm1' });
    prisma.$transaction.mockImplementation((fn) =>
      fn({
        customerMembership: { update: jest.fn().mockResolvedValue({ id: 'cm1', status: 'CANCELLED', membership: {} }) },
        customer:           { update: jest.fn() },
      })
    );

    const result = await svc.cancelMembership('c1');
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'cm1' });
  });
});
