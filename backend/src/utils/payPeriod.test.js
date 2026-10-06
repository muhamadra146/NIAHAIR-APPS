'use strict';

const { buildWorkPeriod, workMonthFor, resolvePayPeriod } = require("./payPeriod");

const ymd = (d) => d.toISOString().slice(0, 10);
const span = (p) => [ymd(p.periodStart), ymd(p.periodEnd), ymd(p.payDate)];
// Waktu WIB sebagai instant UTC
const wib = (s) => new Date(`${s}+07:00`);

describe("buildWorkPeriod (nama gaji = bulan kerja)", () => {
  test("payDay 1: Gaji Oktober = kerja 1–31 Okt, dibayar 1 Nov", () => {
    expect(span(buildWorkPeriod(1, "2026-10"))).toEqual(["2026-10-01", "2026-10-31", "2026-11-01"]);
  });

  test("payDay 7: Gaji Oktober = kerja 7 Okt – 6 Nov, dibayar 7 Nov", () => {
    expect(span(buildWorkPeriod(7, "2026-10"))).toEqual(["2026-10-07", "2026-11-06", "2026-11-07"]);
  });

  test("Desember → dibayar Januari tahun depan", () => {
    expect(span(buildWorkPeriod(1, "2026-12"))).toEqual(["2026-12-01", "2026-12-31", "2027-01-01"]);
  });

  test("payDay 31: bulan pendek pakai hari terakhir", () => {
    expect(span(buildWorkPeriod(31, "2026-01"))).toEqual(["2026-01-31", "2026-02-27", "2026-02-28"]);
    expect(span(buildWorkPeriod(31, "2026-02"))).toEqual(["2026-02-28", "2026-03-30", "2026-03-31"]);
    expect(span(buildWorkPeriod(31, "2026-03"))).toEqual(["2026-03-31", "2026-04-29", "2026-04-30"]);
  });

  test("payDay 30 di tahun kabisat", () => {
    expect(span(buildWorkPeriod(30, "2028-01"))).toEqual(["2028-01-30", "2028-02-28", "2028-02-29"]);
  });

  test("periode berurutan selalu menyambung (tanpa celah/tumpang tindih) untuk semua payDay", () => {
    for (let p = 1; p <= 31; p++) {
      let prev = buildWorkPeriod(p, "2025-12");
      for (let m = 1; m <= 12; m++) {
        const cur = buildWorkPeriod(p, `2026-${String(m).padStart(2, "0")}`);
        expect(cur.periodStart.getTime() - prev.periodEnd.getTime()).toBe(24 * 60 * 60 * 1000);
        expect(ymd(cur.periodStart)).toBe(ymd(prev.payDate));
        prev = cur;
      }
    }
  });
});

describe("workMonthFor (kalender WIB)", () => {
  test("payDay 1 → bulan kalender berjalan", () => {
    expect(workMonthFor(1, wib("2026-10-05T10:00:00"))).toBe("2026-10");
  });

  test("sebelum tanggal gajian → periode bulan lalu", () => {
    expect(workMonthFor(7, wib("2026-10-05T10:00:00"))).toBe("2026-09");
  });

  test("tepat tanggal gajian → periode bulan ini", () => {
    expect(workMonthFor(7, wib("2026-10-07T00:30:00"))).toBe("2026-10");
  });

  test("Januari sebelum tanggal gajian → Desember tahun lalu", () => {
    expect(workMonthFor(7, wib("2027-01-03T10:00:00"))).toBe("2026-12");
  });

  test("payDay 31 di Februari: 28 Feb sudah gajian", () => {
    expect(workMonthFor(31, wib("2026-02-27T10:00:00"))).toBe("2026-01");
    expect(workMonthFor(31, wib("2026-02-28T10:00:00"))).toBe("2026-02");
  });

  test("tengah malam WIB tidak memakai tanggal UTC", () => {
    // 6 Okt 23:30 UTC = 7 Okt 06:30 WIB → sudah tanggal gajian 7
    expect(workMonthFor(7, new Date("2026-10-06T23:30:00Z"))).toBe("2026-10");
  });

  test("payDay kosong → default tanggal 1", () => {
    expect(workMonthFor(null, wib("2026-10-05T10:00:00"))).toBe("2026-10");
  });
});

describe("resolvePayPeriod", () => {
  test("bulan kerja eksplisit", () => {
    const r = resolvePayPeriod(5, "2026-10");
    expect(r.yearMonth).toBe("2026-10");
    expect(r.payDay).toBe(5);
    expect(span(r)).toEqual(["2026-10-05", "2026-11-04", "2026-11-05"]);
  });
});
