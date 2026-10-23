'use strict';

// Keputusan owner 2026-10-23 (CRM-014): membership berlaku sampai akhir hari WIB
// (23:59:59.999 WIB) pada tanggal kedaluwarsa = tanggal mulai WIB + durasi hari.

jest.mock('../../config/prisma', () => ({ $transaction: jest.fn(), customer: { findUnique: jest.fn() } }));
jest.mock('./membership.repository', () => ({ findById: jest.fn() }));

const prisma = require('../../config/prisma');
const repo = require('./membership.repository');
const { membershipEndDate, assignMembership } = require('./membership.service');

describe('membershipEndDate', () => {
  test('ditetapkan 23 Okt 2026 10:29 WIB, 365 hari → 23 Okt 2027 23:59:59.999 WIB', () => {
    expect(membershipEndDate(new Date('2026-10-23T03:29:48Z'), 365).toISOString()).toBe('2027-10-23T16:59:59.999Z');
  });

  test('ditetapkan 00:30 WIB (masih tanggal sebelumnya di UTC) memakai tanggal WIB', () => {
    // 2026-10-23 00:30 WIB = 2026-10-22 17:30 UTC
    expect(membershipEndDate(new Date('2026-10-22T17:30:00Z'), 30).toISOString()).toBe('2026-11-22T16:59:59.999Z');
  });

  test('23:50 WIB pada tanggal kedaluwarsa masih berlaku (endDate > sekarang)', () => {
    const end = membershipEndDate(new Date('2026-10-23T03:00:00Z'), 1); // 24 Okt 2026 akhir hari WIB
    expect(end > new Date('2026-10-24T16:50:00Z')).toBe(true);  // 24 Okt 23:50 WIB
    expect(end > new Date('2026-10-24T17:00:00Z')).toBe(false); // 25 Okt 00:00 WIB
  });
});

test('assignMembership menyimpan endDate akhir hari WIB di langganan & riwayat', async () => {
  prisma.customer.findUnique.mockResolvedValue({ id: 'c1' });
  repo.findById.mockResolvedValue({ id: 'gold', isActive: true, durationDays: 365 });
  const tx = {
    customerMembership: { updateMany: jest.fn(), create: jest.fn().mockImplementation(async ({ data }) => data) },
    customer: { update: jest.fn() },
    membershipHistory: { create: jest.fn() },
  };
  prisma.$transaction.mockImplementation(async (fn) => fn(tx));
  const rec = await assignMembership('c1', 'gold', 'u1');
  const end = rec.endDate.toISOString();
  expect(end.endsWith('T16:59:59.999Z')).toBe(true);
  expect(tx.membershipHistory.create.mock.calls[0][0].data.endDate.toISOString()).toBe(end);
});
