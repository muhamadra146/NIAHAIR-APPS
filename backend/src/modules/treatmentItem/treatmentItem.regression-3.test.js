'use strict';

// Regression: G1-17 — DELETE item treatment yang material usage item-nya sudah dihapus → 500
// (induk MaterialUsage yang kosong masih menahan FK treatmentItem).
// Found by /qa on 2026-10-15

jest.mock('./treatmentItem.repository');

const repo = require('./treatmentItem.repository');
const svc  = require('./treatmentItem.service');

beforeEach(() => {
  jest.clearAllMocks();
  repo.findById.mockResolvedValue({ id: 'ti1', treatmentSessionId: 'ts1', _count: { assignments: 0 } });
});

test('induk MaterialUsage kosong ikut dihapus bersama item (bukan 500)', async () => {
  repo.findDeleteDependencies.mockResolvedValue({
    materialUsages: [{ id: 'mu1', _count: { usageItems: 0 } }],
    _count: { jobAssignments: 0 },
  });

  await svc.deleteTreatmentItem('ti1', 'ts1');

  expect(repo.deleteWithEmptyUsages).toHaveBeenCalledWith('ti1', ['mu1']);
  expect(repo.deleteById).not.toHaveBeenCalled();
});

test('masih ada pemakaian bahan → 409 jelas', async () => {
  repo.findDeleteDependencies.mockResolvedValue({
    materialUsages: [{ id: 'mu1', _count: { usageItems: 2 } }],
    _count: { jobAssignments: 0 },
  });
  await expect(svc.deleteTreatmentItem('ti1', 'ts1')).rejects.toMatchObject({ statusCode: 409 });
  expect(repo.deleteWithEmptyUsages).not.toHaveBeenCalled();
});

test('sudah ada input pengerjaan (job) → 409 jelas', async () => {
  repo.findDeleteDependencies.mockResolvedValue({ materialUsages: [], _count: { jobAssignments: 1 } });
  await expect(svc.deleteTreatmentItem('ti1', 'ts1')).rejects.toMatchObject({ statusCode: 409 });
  expect(repo.deleteById).not.toHaveBeenCalled();
});

test('tanpa data turunan → hapus biasa', async () => {
  repo.findDeleteDependencies.mockResolvedValue({ materialUsages: [], _count: { jobAssignments: 0 } });
  await svc.deleteTreatmentItem('ti1', 'ts1');
  expect(repo.deleteById).toHaveBeenCalledWith('ti1');
});
