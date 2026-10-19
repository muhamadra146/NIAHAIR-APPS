// Regression: G4-20 — lastSyncAt opname/produksi/terima-transfer tersimpan +7 jam (NOW() WIB ke kolom TIMESTAMP tanpa zona)
// Found by /qa on 2026-10-15
'use strict';

jest.mock('../../config/prisma', () => ({ $executeRawUnsafe: jest.fn().mockResolvedValue(1) }));

const prisma = require('../../config/prisma');
const productionRepo = require('./production.sync.repository');
const opnameRepo     = require('../stockOpname/stockOpname.sync.repository');
const transferRepo   = require('../stockTransfer/stockTransfer.sync.repository');

beforeEach(() => jest.clearAllMocks());

const lastSql = () => prisma.$executeRawUnsafe.mock.calls.at(-1)[0];
const expectUtc = (sql) => {
  expect(sql).toMatch(/NOW\(\) AT TIME ZONE 'UTC'/);
  expect(sql).not.toMatch(/=\s*NOW\(\)\s*(,|\n|$)/);
};

test('production: markPekerjaanSynced & markPenyelesaianSynced menyimpan waktu UTC', async () => {
  await productionRepo.markPekerjaanSynced({ id: 'po1', accuratePekerjaanId: 1, accuratePekerjaanNumber: 'JC' });
  expectUtc(lastSql());
  await productionRepo.markPenyelesaianSynced({ id: 'po1', accuratePenyelesaianId: 1, accuratePenyelesaianNumber: 'RO' });
  expectUtc(lastSql());
});

test('stock opname: markOpnameAdjustmentSynced & markOpnameNoDifference menyimpan waktu UTC', async () => {
  const client = { $executeRawUnsafe: prisma.$executeRawUnsafe, inventoryMovement: { updateMany: jest.fn() } };
  await opnameRepo.markOpnameAdjustmentSynced({ id: 'o1', accurateAdjustmentId: 1, movementIds: ['m1'], glAccountId: 'g1' }, client);
  expectUtc(prisma.$executeRawUnsafe.mock.calls[0][0]);
  await opnameRepo.markOpnameNoDifference('o1');
  expectUtc(lastSql());
});

test('stock transfer: markTransferReceiveSynced menyimpan waktu UTC', async () => {
  await transferRepo.markTransferReceiveSynced({ id: 't1', accurateReceiveId: 1, accurateReceiveNumber: 'X' });
  expectUtc(lastSql());
});
