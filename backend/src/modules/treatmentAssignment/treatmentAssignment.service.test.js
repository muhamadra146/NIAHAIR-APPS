'use strict';

jest.mock('./treatmentAssignment.repository');

const repo = require('./treatmentAssignment.repository');
const svc  = require('./treatmentAssignment.service');

const TREATMENT_ITEM = { id: 'ti1', qty: 1, conversionSnapshot: '100' }; // maxWork = 100
const EMPLOYEE_ACTIVE = { id: 'e1', name: 'Nia', isActive: true };
const ASSIGNMENT = {
  id: 'a1', treatmentItemId: 'ti1', employeeId: 'e1',
  slotKey: 'colorist', workQty: 50, notes: null,
  treatmentItem: TREATMENT_ITEM,
};

beforeEach(() => jest.clearAllMocks());

// ── getByItem ──────────────────────────────────────────────────────────

describe('getByItem', () => {
  test('throws 404 when treatment item not found', async () => {
    repo.findTreatmentItemById.mockResolvedValue(null);
    await expect(svc.getByItem('x')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('returns assignments for treatment item', async () => {
    repo.findTreatmentItemById.mockResolvedValue(TREATMENT_ITEM);
    repo.findByItem.mockResolvedValue([ASSIGNMENT]);
    repo.countByItem.mockResolvedValue(1);

    const result = await svc.getByItem('ti1');
    expect(repo.findByItem).toHaveBeenCalledWith('ti1', { skip: 0, take: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta).toMatchObject({ total: 1, page: 1, limit: 10 });
  });
});

// ── getById ────────────────────────────────────────────────────────────

describe('getById', () => {
  test('returns assignment when found', async () => {
    repo.findById.mockResolvedValue(ASSIGNMENT);
    await expect(svc.getById('a1')).resolves.toEqual(ASSIGNMENT);
  });

  test('throws 404 when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.getById('x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── createAssignment ───────────────────────────────────────────────────

describe('createAssignment', () => {
  beforeEach(() => {
    repo.findTreatmentItemById.mockResolvedValue(TREATMENT_ITEM);
    repo.findEmployeeById.mockResolvedValue(EMPLOYEE_ACTIVE);
    repo.create.mockResolvedValue(ASSIGNMENT);
  });

  test('throws 404 when treatment item not found', async () => {
    repo.findTreatmentItemById.mockResolvedValue(null);
    await expect(svc.createAssignment('bad', { employeeId: 'e1', workQty: 50 }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 404 when employee not found', async () => {
    repo.findEmployeeById.mockResolvedValue(null);
    await expect(svc.createAssignment('ti1', { employeeId: 'bad', workQty: 50 }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 422 when employee is inactive', async () => {
    repo.findEmployeeById.mockResolvedValue({ ...EMPLOYEE_ACTIVE, isActive: false });
    await expect(svc.createAssignment('ti1', { employeeId: 'e1', workQty: 50 }))
      .rejects.toMatchObject({ statusCode: 422 });
  });

  test('throws 422 when workQty exceeds max (qty * conversionFactor)', async () => {
    await expect(svc.createAssignment('ti1', { employeeId: 'e1', workQty: 150 }))
      .rejects.toMatchObject({ statusCode: 422 });
  });

  test('creates assignment when workQty within max', async () => {
    const result = await svc.createAssignment('ti1', { employeeId: 'e1', slotKey: 'colorist', workQty: 80 });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      treatmentItemId: 'ti1',
      employeeId:      'e1',
      workQty:         80,
    }));
    expect(result).toEqual(ASSIGNMENT);
  });
});

// ── updateAssignment ───────────────────────────────────────────────────

describe('updateAssignment', () => {
  test('throws 404 when assignment not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.updateAssignment('x', { workQty: 50 })).rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 422 when new workQty exceeds max', async () => {
    repo.findById.mockResolvedValue(ASSIGNMENT);
    repo.sumWorkQtyBySlot.mockResolvedValue(0); // no other assignment in slot (self excluded)
    await expect(svc.updateAssignment('a1', { workQty: 200 })).rejects.toMatchObject({ statusCode: 422 });
    expect(repo.sumWorkQtyBySlot).toHaveBeenCalledWith('ti1', 'colorist', 'a1');
    expect(repo.update).not.toHaveBeenCalled();
  });

  test('throws 422 when new workQty exceeds remaining slot quota', async () => {
    repo.findById.mockResolvedValue(ASSIGNMENT);
    repo.sumWorkQtyBySlot.mockResolvedValue(70); // remaining = 100 - 70 = 30
    await expect(svc.updateAssignment('a1', { workQty: 40 })).rejects.toMatchObject({ statusCode: 422 });
  });

  test('updates slotKey and workQty when within max', async () => {
    repo.findById.mockResolvedValue(ASSIGNMENT);
    repo.sumWorkQtyBySlot.mockResolvedValue(0);
    repo.update.mockResolvedValue({ ...ASSIGNMENT, workQty: 60, slotKey: 'assistant' });

    await svc.updateAssignment('a1', { slotKey: 'assistant', workQty: 60 });
    expect(repo.update).toHaveBeenCalledWith('a1', { slotKey: 'assistant', workQty: 60 });
  });
});

// ── deleteAssignment ───────────────────────────────────────────────────

describe('deleteAssignment', () => {
  test('throws 404 when assignment not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(svc.deleteAssignment('x')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('deletes assignment when found', async () => {
    repo.findById.mockResolvedValue(ASSIGNMENT);
    repo.deleteById.mockResolvedValue(undefined);

    await svc.deleteAssignment('a1');
    expect(repo.deleteById).toHaveBeenCalledWith('a1');
  });
});
