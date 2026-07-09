'use strict';

jest.mock('./consultation.repository');
jest.mock('../../config/prisma', () => ({
  invoice: { findUnique: jest.fn() },
}));

const repo   = require('./consultation.repository');
const prisma = require('../../config/prisma');
const svc    = require('./consultation.service');

const NOTE = {
  id: 'n1', invoiceId: 'inv1', customerId: 'c1', branchId: 'b1',
  filledByEmployeeId: 'e1', notes: 'Rambut kering',
};

const INVOICE_ACTIVE = { id: 'inv1', customerId: 'c1', branchId: 'b1', status: 'PAID' };

const MANAGER_USER  = { roleCode: 'OWNER',      employeeId: 'e1' };
const STAFF_USER    = { roleCode: 'STAFF',       employeeId: 'e1' };
const OTHER_STAFF   = { roleCode: 'STAFF',       employeeId: 'eOther' };

beforeEach(() => jest.clearAllMocks());

// ── listNotes ──────────────────────────────────────────────────────────

describe('listNotes', () => {
  test('returns paginated list', async () => {
    repo.findAll.mockResolvedValue([NOTE]);
    repo.count.mockResolvedValue(1);

    const result = await svc.listNotes({ page: 1, limit: 10 }, MANAGER_USER);
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

// ── getNoteById ────────────────────────────────────────────────────────

describe('getNoteById', () => {
  test('returns note when found', async () => {
    repo.findById.mockResolvedValue(NOTE);
    await expect(svc.getNoteById('n1')).resolves.toEqual(NOTE);
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.getNoteById('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── createNote ─────────────────────────────────────────────────────────

describe('createNote', () => {
  beforeEach(() => {
    prisma.invoice.findUnique.mockResolvedValue(INVOICE_ACTIVE);
    repo.findByInvoiceId.mockResolvedValue(null);
    repo.isEmployeeAssignedToInvoice.mockResolvedValue(true);
    repo.create.mockResolvedValue(NOTE);
  });

  test('throws 404 when invoice not found', async () => {
    prisma.invoice.findUnique.mockResolvedValue(null);
    await expect(svc.createNote({ invoiceId: 'bad', notes: 'x' }, MANAGER_USER))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 422 when invoice is CANCELLED', async () => {
    prisma.invoice.findUnique.mockResolvedValue({ ...INVOICE_ACTIVE, status: 'CANCELLED' });
    await expect(svc.createNote({ invoiceId: 'inv1', notes: 'x' }, MANAGER_USER))
      .rejects.toMatchObject({ statusCode: 422 });
  });

  test('throws 409 when note for invoice already exists', async () => {
    repo.findByInvoiceId.mockResolvedValue(NOTE);
    await expect(svc.createNote({ invoiceId: 'inv1', notes: 'x' }, MANAGER_USER))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('throws 403 when non-manager is not assigned to invoice', async () => {
    repo.isEmployeeAssignedToInvoice.mockResolvedValue(false);
    await expect(svc.createNote({ invoiceId: 'inv1', notes: 'x' }, OTHER_STAFF))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  test('creates note for manager without assignment check', async () => {
    const result = await svc.createNote({ invoiceId: 'inv1', notes: 'Rambut kering' }, MANAGER_USER);
    expect(repo.isEmployeeAssignedToInvoice).not.toHaveBeenCalled();
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      invoiceId:  'inv1',
      customerId: 'c1',
    }));
    expect(result).toEqual(NOTE);
  });

  test('creates note for assigned staff', async () => {
    const result = await svc.createNote({ invoiceId: 'inv1', notes: 'x' }, STAFF_USER);
    expect(repo.isEmployeeAssignedToInvoice).toHaveBeenCalled();
    expect(repo.create).toHaveBeenCalled();
    expect(result).toEqual(NOTE);
  });
});

// ── updateNote ─────────────────────────────────────────────────────────

describe('updateNote', () => {
  beforeEach(() => {
    repo.findById.mockResolvedValue(NOTE);
    repo.isEmployeeAssignedToInvoice.mockResolvedValue(true);
    repo.update.mockResolvedValue({ ...NOTE, notes: 'Updated' });
  });

  test('throws 404 when note not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.updateNote('x', {}, MANAGER_USER)).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 403 when non-manager is not assigned to invoice', async () => {
    repo.isEmployeeAssignedToInvoice.mockResolvedValue(false);
    await expect(svc.updateNote('n1', { notes: 'x' }, OTHER_STAFF))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  test('updates note for manager', async () => {
    const result = await svc.updateNote('n1', { notes: 'Updated' }, MANAGER_USER);
    expect(repo.isEmployeeAssignedToInvoice).not.toHaveBeenCalled();
    expect(repo.update).toHaveBeenCalled();
    expect(result.notes).toBe('Updated');
  });
});

// ── deleteNote ─────────────────────────────────────────────────────────

describe('deleteNote', () => {
  beforeEach(() => {
    repo.findById.mockResolvedValue(NOTE);
    repo.isEmployeeAssignedToInvoice.mockResolvedValue(true);
    repo.remove.mockResolvedValue(undefined);
  });

  test('throws 404 when note not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.deleteNote('x', MANAGER_USER)).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 403 when non-manager is not assigned', async () => {
    repo.isEmployeeAssignedToInvoice.mockResolvedValue(false);
    await expect(svc.deleteNote('n1', OTHER_STAFF)).rejects.toMatchObject({ statusCode: 403 });
  });

  test('deletes note for manager', async () => {
    await svc.deleteNote('n1', MANAGER_USER);
    expect(repo.isEmployeeAssignedToInvoice).not.toHaveBeenCalled();
    expect(repo.remove).toHaveBeenCalledWith('n1');
  });
});
