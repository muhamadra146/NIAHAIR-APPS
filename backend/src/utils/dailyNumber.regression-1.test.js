'use strict';

// Regression: ISSUE-G1-02 — nomor booking/pembayaran/pembayaran DP memakai jumlah hari ini + 1;
// setelah satu dokumen dihapus, nomor berikutnya bentrok → 409 "Duplicate entry" seharian.
// Found by /qa on 2026-10-15
// Report: .gstack/qa-reports/run-20261015T083444Z/qa-report-localhost-2026-10-15.md

const { dailyPrefix, nextDailyNumber } = require('./dailyNumber');

describe('nextDailyNumber', () => {
  test('mulai dari 0001 bila belum ada nomor hari ini', () => {
    expect(nextDailyNumber('PAY-20261015-', null)).toBe('PAY-20261015-0001');
  });

  test('melanjutkan dari nomor TERBESAR, walau ada nomor yang sudah dihapus', () => {
    // 0003, 0004, 0005 ada; 0001–0002 dihapus → jumlah = 3, tapi nomor berikutnya harus 0006
    expect(nextDailyNumber('PAY-20261015-', 'PAY-20261015-0005')).toBe('PAY-20261015-0006');
  });

  test('nomor rusak dianggap 0', () => {
    expect(nextDailyNumber('BKG-20261015-', 'BKG-20261015-xx')).toBe('BKG-20261015-0001');
  });
});

test('dailyPrefix memakai tanggal WIB (23:30 WIB tetap hari itu)', () => {
  expect(dailyPrefix('DPAY', new Date('2026-10-15T16:30:00Z'))).toBe('DPAY-20261015-');
  expect(dailyPrefix('DPAY', new Date('2026-10-15T17:30:00Z'))).toBe('DPAY-20261016-');
});

describe('generator di service memakai nomor terbesar', () => {
  test.each([
    ['payment/payment.service', 'payment/payment.repository'],
    ['depositPayment/depositPayment.service', 'depositPayment/depositPayment.repository'],
  ])('%s', (svcPath, repoPath) => {
    const src = require('fs').readFileSync(require.resolve(`../modules/${svcPath}`), 'utf8');
    expect(src).toMatch(/findLastNumber\(prefix\)/);
    expect(src).not.toMatch(/countToday/);
  });
});
