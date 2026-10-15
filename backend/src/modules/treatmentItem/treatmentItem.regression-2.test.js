'use strict';

// Regression: G1-16 — PUT/DELETE /treatment-sessions/:sessionId/items/:id mengubah item milik sesi lain.
// Found by /qa on 2026-10-15

jest.mock('./treatmentItem.repository');

const repo = require('./treatmentItem.repository');
const svc  = require('./treatmentItem.service');

const TITEM = { id: 'ti1', treatmentSessionId: 'ts-A', _count: { assignments: 0 } };

beforeEach(() => {
  jest.clearAllMocks();
  repo.findById.mockResolvedValue(TITEM);
  repo.findDeleteDependencies.mockResolvedValue({ materialUsages: [], _count: { jobAssignments: 0 } });
});

test('update item lewat sesi lain → 404, tidak diubah', async () => {
  await expect(svc.updateTreatmentItem('ti1', { qty: 5 }, 'ts-B')).rejects.toMatchObject({ statusCode: 404 });
  expect(repo.update).not.toHaveBeenCalled();
});

test('delete item lewat sesi lain → 404, tidak dihapus', async () => {
  await expect(svc.deleteTreatmentItem('ti1', 'ts-B')).rejects.toMatchObject({ statusCode: 404 });
  expect(repo.deleteById).not.toHaveBeenCalled();
});

test('update item lewat sesinya sendiri → diubah', async () => {
  await svc.updateTreatmentItem('ti1', { qty: 5 }, 'ts-A');
  expect(repo.update).toHaveBeenCalledWith('ti1', { qty: 5 });
});
