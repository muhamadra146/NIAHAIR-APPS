'use strict';

// FIN-039 — pendapatan kotor & bersih (keputusan user 2026-10-14).
// Angka mengikuti contoh yang disepakati: kotor 1.550.000, bersih sebelum komisi 1.075.000,
// bersih setelah komisi 985.000.

const { buildRevenue, invoiceComponents } = require('./dashboard.revenue');

const codes = {
  ongkosPP:     new Set(['PP']),
  chargeLembur: new Set(['LEMBUR']),
  homeService:  new Set(['HS']),
};

const line = (itemCode, subtotal, extra = {}) => ({
  subtotal, isMaterial: false, item: { itemCode, commissionCategoryId: null }, ...extra,
});
const commission = (itemCode, amount) => ({ commissionAmount: amount, serviceItem: { itemCode } });

// Treatment 1.000.000 − membership 10% = 900.000; PP 100.000; HS 300.000 (tim 3×75.000);
// lembur 200.000; PPN 50.000; komisi treatment 90.000 (+ komisi lembur 100.000 tidak dihitung ulang)
const INVOICE = {
  id: 'inv1', grandTotal: 1550000, totalTax: 50000,
  items: [
    line('COLOR', 900000, { item: { itemCode: 'COLOR', commissionCategoryId: 'cat-color' } }),
    line('PP', 100000), line('HS', 300000), line('LEMBUR', 200000),
    line('BAHAN', 50000, { isMaterial: true }),
  ],
  commissions: [commission('HS', 75000), commission('HS', 75000), commission('HS', 75000),
                commission('COLOR', 90000), commission('LEMBUR', 100000)],
};

const pay = (amount, date, invoiceId = 'inv1') => ({
  paymentNo: `PAY-${date}`, amount, paymentDate: new Date(`${date}T10:00:00+07:00`), invoiceId,
  invoice: { invoiceNo: 'INV-1', customer: { name: 'Ani' } },
});
const build = (over) => buildRevenue({
  invoicePayments: [], depositPayments: [], depositApplications: [], depositRefunds: [],
  invoices: [INVOICE], codes, ...over,
});

describe('invoiceComponents', () => {
  test('potongan dari item & komisi; bahan baku diabaikan', () => {
    expect(invoiceComponents(INVOICE, codes)).toMatchObject({
      grandTotal: 1550000, tax: 50000, ongkosPP: 100000, lemburTeam: 100000, hsTeam: 225000, commission: 90000,
      commissionPending: false,
    });
  });

  test('item berkategori komisi tanpa komisi → komisi belum dihitung', () => {
    expect(invoiceComponents({ ...INVOICE, commissions: [] }, codes).commissionPending).toBe(true);
  });
});

describe('buildRevenue', () => {
  test('invoice lunas sekali bayar', () => {
    const { summary } = build({ invoicePayments: [pay(1550000, '2026-10-10')] });
    expect(summary).toMatchObject({ gross: 1550000, netBefore: 1075000, netAfter: 985000 });
    expect(summary.deductions).toEqual({ tax: 50000, ongkosPP: 100000, lemburTeam: 100000, hsTeam: 225000, commission: 90000 });
  });

  test('pembayaran sebagian: potongan sebanding, total tetap sama', () => {
    const { rows, summary, daily } = build({ invoicePayments: [pay(465000, '2026-10-01'), pay(1085000, '2026-10-10')] });
    expect(rows.map((r) => [r.date, r.gross, r.netBefore, r.netAfter])).toEqual([
      ['2026-10-01', 465000, 322500, 295500],
      ['2026-10-10', 1085000, 752500, 689500],
    ]);
    expect(summary).toMatchObject({ gross: 1550000, netBefore: 1075000, netAfter: 985000 });
    expect(daily).toHaveLength(2);
  });

  test('DP dari menu Deposit: penuh saat dibayar, potongan saat dipakai di invoice', () => {
    const { rows, summary } = build({
      depositPayments: [{ paymentNo: 'DP-1', amount: 465000, paidAt: new Date('2026-10-01T09:00:00+07:00'), depositId: 'd1', deposit: { customer: { name: 'Ani' } } }],
      depositApplications: [{ amountApplied: 465000, createdAt: new Date('2026-10-10T09:00:00+07:00'), invoiceId: 'inv1', depositId: 'd1', invoice: { invoiceNo: 'INV-1', customer: { name: 'Ani' } } }],
      invoicePayments: [pay(1085000, '2026-10-10')],
    });
    const dp = rows.find((r) => r.type === 'DEPOSIT_PAYMENT');
    const applied = rows.find((r) => r.type === 'DEPOSIT_APPLIED');
    expect([dp.gross, dp.netBefore, dp.netAfter]).toEqual([465000, 465000, 465000]);
    expect([applied.gross, applied.netBefore, applied.netAfter]).toEqual([0, -142500, -169500]);
    // Total sama dengan invoice lunas sekali bayar
    expect(summary).toMatchObject({ gross: 1550000, netBefore: 1075000, netAfter: 985000 });
  });

  test('refund DP mengurangi kotor & bersih pada tanggal refund', () => {
    const { rows, summary } = build({
      depositPayments: [{ paymentNo: 'DP-1', amount: 200000, paidAt: new Date('2026-10-01T09:00:00+07:00'), depositId: 'd1', deposit: { customer: { name: 'Ani' } } }],
      depositRefunds: [{ id: 'd1', status: 'REFUNDED', refundedAmount: 200000, refundedAt: new Date('2026-10-05T09:00:00+07:00'), customer: { name: 'Ani' } }],
    });
    expect(rows.at(-1)).toMatchObject({ type: 'DEPOSIT_REFUND', date: '2026-10-05', gross: -200000, netAfter: -200000 });
    expect(summary).toMatchObject({ gross: 0, netBefore: 0, netAfter: 0 });
    expect(summary.breakdown).toMatchObject({ depositPayments: 200000, refunds: 200000 });
  });

  test('tanggal mengikuti WIB (bayar 23:30 WIB tetap hari itu)', () => {
    const late = { ...pay(1550000, '2026-10-10'), paymentDate: new Date('2026-10-10T23:30:00+07:00') };
    expect(build({ invoicePayments: [late] }).rows[0].date).toBe('2026-10-10');
  });
});
