'use strict';

// Regression: QA G3-10 (2026-10-15) — login & reset password harus tidak peka huruf besar/kecil.

jest.mock('../../config/prisma', () => ({
  user: { findFirst: jest.fn().mockResolvedValue(null), findUnique: jest.fn().mockResolvedValue(null) },
}));

const prisma = require('../../config/prisma');
const repo   = require('./auth.repository');
const svc    = require('./auth.service');

beforeEach(() => jest.clearAllMocks());

test('findUserByEmail mencari tanpa beda huruf besar/kecil', async () => {
  await repo.findUserByEmail(' Nia@Salon.com ');
  expect(prisma.user.findFirst.mock.calls[0][0].where).toEqual({ email: { equals: 'Nia@Salon.com', mode: 'insensitive' } });
});

test('findUserByEmailRaw (lupa password) juga tidak peka huruf', async () => {
  await repo.findUserByEmailRaw('nia@salon.com');
  expect(prisma.user.findFirst.mock.calls[0][0].where.email.mode).toBe('insensitive');
});

test('login dengan email huruf besar + spasi → dicari dengan email huruf kecil', async () => {
  await expect(svc.login({ identifier: '  NIA@Salon.com ', password: 'x' })).rejects.toMatchObject({ statusCode: 401 });
  expect(prisma.user.findFirst.mock.calls[0][0].where.email.equals).toBe('nia@salon.com');
});
