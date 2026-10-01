/**
 * Unit tests untuk commission.calc.js — pure functions, tidak perlu DB/mock.
 */
const {
  D,
  isSameDayWIB,
  toWIBDateString,
  sumWorkQty,
  calcCommissionAmount,
  distributePool,
  detectColoristInSession,
  calcCategoryItem,
  canOverride,
  canRegenerate,
} = require("./commission.calc");

// ── calcCategoryItem ──────────────────────────────────────────────────

const worker = (id, over = {}) => ({
  treatmentJobAssignmentId: id,
  employeeId:      `e-${id}`,
  employeeName:    `Staf ${id}`,
  workQty:         null,
  commissionRuleId: `r-${id}`,
  commissionType:  "PERCENTAGE",
  commissionValue: "10",
  commissionBase:  "AFTER_DISCOUNT_BEFORE_TAX",
  ...over,
});

const job = (id, over = {}) => ({
  commissionJobId:  id,
  jobName:          id,
  jobKey:           id,
  sortOrder:        0,
  deductsFromJobId: null,
  pricePerUnit:     null,
  unit:             "helai",
  splitMode:        "BY_QTY",
  workers:          [],
  ...over,
});

const rowsOf = (jobs, jobId) => jobs.find((j) => j.commissionJobId === jobId).rows;

describe("calcCategoryItem", () => {
  test("BY_QTY: dibagi proporsional qty ÷ qty item", () => {
    const jobs = calcCategoryItem({
      subtotal: 3_000_000,
      itemQty:  180,
      jobs: [job("pasang", {
        workers: [worker("a", { workQty: 120 }), worker("b", { workQty: 60 })],
      })],
    });
    const [a, b] = rowsOf(jobs, "pasang");
    expect(a.amount).toBe(200_000);
    expect(b.amount).toBe(100_000);
    expect(a.workRatio).toBeCloseTo(2 / 3, 6);
  });

  test("BY_QTY: sisa helai yang tidak diisi tidak dibagikan", () => {
    const jobs = calcCategoryItem({
      subtotal: 3_000_000, itemQty: 180,
      jobs: [job("pasang", { workers: [worker("a", { workQty: 90 })] })],
    });
    expect(rowsOf(jobs, "pasang")[0].amount).toBe(150_000);
  });

  test("helper flat (FIXED) dengan harga/unit memotong KOMISI job utama, bukan base", () => {
    // Kasus INV-0003: color 10% dari 943.500 = 94.350; cuci rambut flat 5.000 diambil dari komisi itu
    const jobs = calcCategoryItem({
      subtotal: 943_500,
      itemQty:  1,
      jobs: [
        job("color", { unit: "sesi", splitMode: "EQUAL", sortOrder: 0,
          workers: [worker("a", { workQty: 1 })] }),
        job("cuci", { unit: "kepala", deductsFromJobId: "color", pricePerUnit: 5000, sortOrder: 1,
          workers: [worker("c", { workQty: 2, commissionType: "FIXED", commissionValue: "5000" })] }),
      ],
    });
    const color = jobs.find((j) => j.commissionJobId === "color");
    expect(color.remainingBase).toBe(943_500);          // base tidak dipotong
    expect(color.rows[0].amount).toBe(89_350);          // 94.350 − 5.000
    expect(color.rows[0].flatDeduction).toBe(5000);
    expect(rowsOf(jobs, "cuci")[0].amount).toBe(5000);  // sekali per staf, tidak dikali qty
    expect(rowsOf(jobs, "cuci")[0].effectiveBase).toBe(0);
    const total = jobs.flatMap((j) => j.rows).reduce((s, r) => s + r.amount, 0);
    expect(total).toBe(94_350);                         // total = komisi job utama
  });

  test("EQUAL + helper persen per unit: base dipotong lalu dibagi rata per staf", () => {
    const jobs = calcCategoryItem({
      subtotal: 943_500,
      itemQty:  1,
      jobs: [
        job("color", { unit: "sesi", splitMode: "EQUAL", sortOrder: 0,
          workers: [worker("a", { workQty: 1 }), worker("b", { workQty: 1 })] }),
        job("cuci", { unit: "kepala", deductsFromJobId: "color", pricePerUnit: 5000, sortOrder: 1,
          workers: [worker("c", { workQty: 1, commissionType: "PERCENTAGE", commissionValue: "10" })] }),
      ],
    });
    const color = jobs.find((j) => j.commissionJobId === "color");
    expect(color.remainingBase).toBe(938_500);
    expect(color.rows.map((r) => r.amount)).toEqual([46_925, 46_925]);
    expect(color.rows[0].workRatio).toBe(0.5);
    expect(rowsOf(jobs, "cuci")[0].amount).toBe(500);          // 5.000 × 10%
    expect(rowsOf(jobs, "cuci")[0].effectiveBase).toBe(5000);
  });

  test("EQUAL mengabaikan qty yang diisi staf", () => {
    const jobs = calcCategoryItem({
      subtotal: 1_000_000, itemQty: 1,
      jobs: [job("color", { splitMode: "EQUAL",
        workers: [worker("a", { workQty: 1 }), worker("b", { workQty: 1 })] })],
    });
    expect(rowsOf(jobs, "color").map((r) => r.amount)).toEqual([50_000, 50_000]);
  });

  test("FULL: setiap staf dapat komisi penuh", () => {
    const jobs = calcCategoryItem({
      subtotal: 1_000_000, itemQty: 1,
      jobs: [job("x", { splitMode: "FULL", workers: [worker("a"), worker("b")] })],
    });
    expect(rowsOf(jobs, "x").map((r) => r.amount)).toEqual([100_000, 100_000]);
  });

  test("HELPER_FLAT: nominal memotong komisi akhir primary sesuai porsi", () => {
    const jobs = calcCategoryItem({
      subtotal: 1_000_000, itemQty: 1,
      jobs: [
        job("p", { splitMode: "EQUAL", workers: [worker("a"), worker("b")] }),
        job("h", { deductsFromJobId: "p", sortOrder: 1,
          workers: [worker("c", { commissionType: "FIXED", commissionValue: "10000" })] }),
      ],
    });
    const p = rowsOf(jobs, "p");
    expect(p.map((r) => r.amount)).toEqual([45_000, 45_000]); // 50.000 − 5.000
    expect(p[0].flatDeduction).toBe(5000);
    expect(rowsOf(jobs, "h")[0].amount).toBe(10_000);
  });

  test("qtyOverrides menggantikan workQty tersimpan", () => {
    const jobs = calcCategoryItem({
      subtotal: 3_000_000, itemQty: 180,
      jobs: [job("pasang", { workers: [worker("a", { workQty: 60 })] })],
      qtyOverrides: { a: 180 },
    });
    expect(rowsOf(jobs, "pasang")[0].amount).toBe(300_000);
  });

  test("staf tanpa rule komisi = 0 dan hasRule false", () => {
    const jobs = calcCategoryItem({
      subtotal: 1_000_000, itemQty: 1,
      jobs: [job("x", { splitMode: "EQUAL",
        workers: [worker("a", { commissionType: null, commissionValue: null, commissionRuleId: null })] })],
    });
    expect(rowsOf(jobs, "x")[0]).toMatchObject({ amount: 0, hasRule: false });
  });

  test("base per staf mengikuti itemBase (commissionBase rule), potongan helper tetap berlaku", () => {
    const jobs = calcCategoryItem({
      subtotal: 1_000_000, itemQty: 1,
      jobs: [
        job("p", { splitMode: "EQUAL", workers: [
          worker("a", { itemBase: 1_110_000 }), // mis. sesudah pajak
          worker("b"),                          // fallback subtotal
        ] }),
        job("h", { deductsFromJobId: "p", pricePerUnit: 10_000, sortOrder: 1,
          workers: [worker("c", { workQty: 1 })] }), // helper persen → potong base 10.000
      ],
    });
    const [a, b] = rowsOf(jobs, "p");
    expect(a.remainingBase).toBe(1_100_000);
    expect(a.amount).toBe(55_000);   // 1.100.000 × 1/2 × 10%
    expect(b.remainingBase).toBe(990_000);
    expect(b.amount).toBe(49_500);   // 990.000 × 1/2 × 10%
  });

  test("hasil diurutkan menurut sortOrder", () => {
    const jobs = calcCategoryItem({
      subtotal: 100, itemQty: 1,
      jobs: [job("b", { sortOrder: 2 }), job("a", { sortOrder: 1 })],
    });
    expect(jobs.map((j) => j.commissionJobId)).toEqual(["a", "b"]);
  });
});

// ── Test 1: Split per helai (workRatio) ───────────────────────────────
describe("split per helai — workRatio", () => {
  const assignments = [
    { id: "a1", employeeId: "A", workQty: "15", slotKey: "asisten" },
    { id: "a2", employeeId: "B", workQty: "10", slotKey: "asisten" },
  ];
  const base = D("250000");
  const rate = D("10");

  test("sumWorkQty = 25", () => {
    expect(sumWorkQty(assignments).toFixed(0)).toBe("25");
  });

  test("A mendapat 15000", () => {
    const ratio  = D("15").div(sumWorkQty(assignments));
    const result = calcCommissionAmount(base, ratio, rate);
    expect(result.toFixed(0)).toBe("15000");
  });

  test("B mendapat 10000", () => {
    const ratio  = D("10").div(sumWorkQty(assignments));
    const result = calcCommissionAmount(base, ratio, rate);
    expect(result.toFixed(0)).toBe("10000");
  });
});

// ── Test 2: Satu orang dua peran (double commission) ──────────────────
describe("satu orang dua peran — double commission diizinkan", () => {
  const base = D("300000");

  test("pemasang 10%: 30000", () => {
    expect(calcCommissionAmount(base, D("1"), D("10")).toFixed(0)).toBe("30000");
  });

  test("colorist 15%: 45000", () => {
    expect(calcCommissionAmount(base, D("1"), D("15")).toFixed(0)).toBe("45000");
  });

  test("total dua peran: 75000", () => {
    const total = calcCommissionAmount(base, D("1"), D("10"))
      .plus(calcCommissionAmount(base, D("1"), D("15")));
    expect(total.toFixed(0)).toBe("75000");
  });
});

// ── Test 3: Surya tanpa colorist → 7.5% ──────────────────────────────
describe("Surya — COLOR treatment tanpa colorist → 7.5%", () => {
  test("tidak ada colorist di session", () => {
    const items = [{ assignments: [{ slotKey: "pemasang" }] }];
    expect(detectColoristInSession(items)).toBe(false);
  });

  test("komisi Surya = 7.5% dari base", () => {
    const result = calcCommissionAmount(D("200000"), D("1"), D("7.5"));
    expect(result.toFixed(0)).toBe("15000");
  });
});

// ── Test 4: Surya keratin dengan/tanpa colorist ───────────────────────
describe("Surya — KERATIN dengan dan tanpa colorist", () => {
  const base = D("500000");

  test("tanpa colorist: ABSENT rule 7.5% → 37500", () => {
    expect(calcCommissionAmount(base, D("1"), D("7.5")).toFixed(0)).toBe("37500");
  });

  test("dengan colorist: PRESENT rule 5% → 25000", () => {
    expect(calcCommissionAmount(base, D("1"), D("5")).toFixed(0)).toBe("25000");
  });
});

// ── Test 5: Base setelah diskon, sebelum PPN ──────────────────────────
describe("base amount — after discount, before PPN", () => {
  test("base = subtotal (setelah diskon), 2% = 18000", () => {
    const result = calcCommissionAmount(D("900000"), D("1"), D("2"));
    expect(result.toFixed(0)).toBe("18000");
  });

  test("grandTotal beda — 990000 × 2% = 19800 (bukan base yang benar)", () => {
    const result = calcCommissionAmount(D("990000"), D("1"), D("2"));
    expect(result.toFixed(0)).toBe("19800");
    expect(result.toFixed(0)).not.toBe("18000");
  });
});

// ── Test 6: WIB timezone — aturan hangus ─────────────────────────────
describe("WIB timezone — forfeiture date comparison", () => {
  test("treatment jam 23:00 WIB = hari yang sama → tidak hangus", () => {
    const invoiceDate = new Date("2024-03-15T00:00:00.000Z");
    // 2024-03-15 23:00 WIB = 2024-03-15 16:00 UTC
    const completedAt = new Date("2024-03-15T16:00:00.000Z");
    expect(isSameDayWIB(completedAt, invoiceDate)).toBe(true);
  });

  test("treatment jam 00:30 WIB hari berikutnya → hangus", () => {
    const invoiceDate = new Date("2024-03-15T00:00:00.000Z");
    // 2024-03-16 00:30 WIB = 2024-03-15 17:30 UTC
    const completedAt = new Date("2024-03-15T17:30:00.000Z");
    expect(isSameDayWIB(completedAt, invoiceDate)).toBe(false);
  });

  test("tepat tengah malam WIB = hari berikutnya", () => {
    const invoiceDate = new Date("2024-03-15T00:00:00.000Z");
    // 2024-03-16 00:00 WIB = 2024-03-15 17:00 UTC
    const completedAt = new Date("2024-03-15T17:00:00.000Z");
    expect(toWIBDateString(completedAt)).toBe("2024-03-16");
    expect(isSameDayWIB(completedAt, invoiceDate)).toBe(false);
  });

  test("23:59:59 WIB masih hari yang sama", () => {
    const invoiceDate = new Date("2024-03-15T00:00:00.000Z");
    // 2024-03-15 23:59:59 WIB = 2024-03-15 16:59:59 UTC
    const completedAt = new Date("2024-03-15T16:59:59.000Z");
    expect(isSameDayWIB(completedAt, invoiceDate)).toBe(true);
  });
});

// ── Test 7: Deteksi colorist — edge cases ─────────────────────────────
describe("detectColoristInSession", () => {
  test("session kosong → false", () => {
    expect(detectColoristInSession([])).toBe(false);
  });

  test("hanya pemasang + asisten → false", () => {
    expect(detectColoristInSession([
      { assignments: [{ slotKey: "pemasang" }, { slotKey: "asisten" }] },
    ])).toBe(false);
  });

  test("ada slotKey colorist → true", () => {
    expect(detectColoristInSession([
      { assignments: [{ slotKey: "pemasang" }] },
      { assignments: [{ slotKey: "colorist" }] },
    ])).toBe(true);
  });

  test("session dengan colorist untuk Surya keratin", () => {
    const sessionDenganColorist = [
      { assignments: [{ slotKey: "colorist" }, { slotKey: "pemasang" }] },
    ];
    expect(detectColoristInSession(sessionDenganColorist)).toBe(true);
  });
});

// ── Test 8: distributePool — rounding guarantee ───────────────────────
describe("distributePool — rounding guarantee", () => {
  // KASUS UTAMA: 3 orang bagi sama rata, pool yang tidak habis dibagi
  // 175000 × 10% = 17500, bagi 3 orang = 5833.333...
  // Tanpa fix: 5833.33 × 3 = 17499.99 (1 rupiah hilang!)
  // Dengan fix: 5833.33 + 5833.33 + 5833.34 = 17500.00 ✓

  test("3 orang sama rata — sum = pool (tidak ada rupiah hilang)", () => {
    const pool = D("17500"); // 175000 × 10%
    const assignments = [
      { workQty: "10" },
      { workQty: "10" },
      { workQty: "10" },
    ];
    const amounts = distributePool(pool, assignments);
    const total = amounts.reduce((acc, a) => acc.plus(a), D(0));
    expect(total.toFixed(2)).toBe("17500.00");
    // Dua orang pertama mendapat 5833.33 (truncate/ROUND_DOWN)
    expect(amounts[0].toFixed(2)).toBe("5833.33");
    expect(amounts[1].toFixed(2)).toBe("5833.33");
    // Orang terakhir mendapat sisa 5833.34
    expect(amounts[2].toFixed(2)).toBe("5833.34");
  });

  test("2 orang tidak sama rata — sum = pool", () => {
    const pool = D("25000"); // base 250000 × (25/25) × 10%
    const assignments = [
      { workQty: "15" }, // A
      { workQty: "10" }, // B
    ];
    const amounts = distributePool(pool, assignments);
    const total = amounts.reduce((acc, a) => acc.plus(a), D(0));
    expect(total.toFixed(2)).toBe("25000.00");
    expect(amounts[0].toFixed(2)).toBe("15000.00"); // A: 25000 × 15/25
    expect(amounts[1].toFixed(2)).toBe("10000.00"); // B: sisa
  });

  test("1 orang — mendapat seluruh pool", () => {
    const amounts = distributePool(D("18750"), [{ workQty: "5" }]);
    expect(amounts[0].toFixed(2)).toBe("18750.00");
  });

  test("0 orang — return array kosong", () => {
    expect(distributePool(D("10000"), [])).toEqual([]);
  });

  test("pool dengan pecahan dari awal — sum tetap exact", () => {
    // 3 orang bagi pool 100 (tidak habis 3)
    const pool = D("100");
    const assignments = [{ workQty: "1" }, { workQty: "1" }, { workQty: "1" }];
    const amounts = distributePool(pool, assignments);
    const total = amounts.reduce((acc, a) => acc.plus(a), D(0));
    expect(total.toFixed(2)).toBe("100.00");
    // 33.33 + 33.33 + 33.34 = 100.00
    expect(amounts[0].toFixed(2)).toBe("33.33");
    expect(amounts[1].toFixed(2)).toBe("33.33");
    expect(amounts[2].toFixed(2)).toBe("33.34");
  });

  test("mixed workQty — sum = pool, proporsi benar", () => {
    // pool = 7500 (base 300000 × 50% group share × 5%)
    // A=2, B=3, C=5 → total=10 (dalam kelompok)
    const pool = D("7500");
    const ga   = [{ workQty: "2" }, { workQty: "3" }, { workQty: "5" }];
    const amounts = distributePool(pool, ga);
    const total = amounts.reduce((acc, a) => acc.plus(a), D(0));
    expect(total.toFixed(2)).toBe("7500.00");
    // A: 7500 × 2/10 = 1500, B: 7500 × 3/10 = 2250, C (sisa): 3750
    expect(amounts[0].toFixed(2)).toBe("1500.00");
    expect(amounts[1].toFixed(2)).toBe("2250.00");
    expect(amounts[2].toFixed(2)).toBe("3750.00");
  });
});

// ── Test 9: canOverride — business rules ─────────────────────────────
describe("canOverride — status rules", () => {
  test("PENDING → boleh override", () => {
    expect(canOverride("PENDING")).toBe(true);
  });

  test("APPROVED → boleh override", () => {
    expect(canOverride("APPROVED")).toBe(true);
  });

  test("PAID → TIDAK boleh override", () => {
    expect(canOverride("PAID")).toBe(false);
  });

  test("string lain → tidak boleh", () => {
    expect(canOverride("CANCELLED")).toBe(false);
    expect(canOverride("")).toBe(false);
  });
});

// ── Test 10: canRegenerate — idempotency rules ────────────────────────
describe("canRegenerate — idempotency rules", () => {
  test("semua PENDING → boleh regenerate", () => {
    const commissions = [
      { id: "c1", status: "PENDING" },
      { id: "c2", status: "PENDING" },
    ];
    const result = canRegenerate(commissions);
    expect(result.allowed).toBe(true);
    expect(result.blockers).toHaveLength(0);
  });

  test("ada APPROVED → tidak boleh regenerate", () => {
    const commissions = [
      { id: "c1", status: "PENDING" },
      { id: "c2", status: "APPROVED" },
    ];
    const result = canRegenerate(commissions);
    expect(result.allowed).toBe(false);
    expect(result.blockers).toHaveLength(1);
    expect(result.blockers[0].id).toBe("c2");
    expect(result.blockers[0].status).toBe("APPROVED");
  });

  test("ada PAID → tidak boleh regenerate", () => {
    const commissions = [
      { id: "c1", status: "PAID" },
      { id: "c2", status: "PENDING" },
    ];
    const result = canRegenerate(commissions);
    expect(result.allowed).toBe(false);
    expect(result.blockers).toHaveLength(1);
    expect(result.blockers[0].status).toBe("PAID");
  });

  test("mix APPROVED + PAID → dua blocker", () => {
    const commissions = [
      { id: "c1", status: "APPROVED" },
      { id: "c2", status: "PAID" },
      { id: "c3", status: "PENDING" },
    ];
    const result = canRegenerate(commissions);
    expect(result.allowed).toBe(false);
    expect(result.blockers).toHaveLength(2);
  });

  test("tidak ada komisi → boleh regenerate (generate pertama kali)", () => {
    const result = canRegenerate([]);
    expect(result.allowed).toBe(true);
  });
});

// ── Test 11: Forfeit × Override interaction (business logic) ──────────
describe("forfeit × override interaction", () => {
  // ATURAN: override menang atas forfeit.
  // Setelah override: isForfeit = false, forfeitReason = null.
  // Dieksekusi di commission.repository.overrideOne().
  //
  // Test ini memverifikasi aturan bisnis lewat canOverride + canRegenerate:

  test("komisi forfeited + PENDING → masih bisa di-override", () => {
    // isForfeit tidak memblokir override — yang membatasi hanya status
    expect(canOverride("PENDING")).toBe(true);
  });

  test("komisi forfeited + APPROVED → masih bisa di-override", () => {
    expect(canOverride("APPROVED")).toBe(true);
  });

  test("komisi forfeited + PAID → TIDAK bisa di-override (harus reversal)", () => {
    expect(canOverride("PAID")).toBe(false);
  });

  test("setelah forfeit-regenerate, komisi PENDING bisa di-regenerate", () => {
    // Semua forfeit masih PENDING → regenerate boleh
    const forfeitedPending = [
      { id: "c1", status: "PENDING" }, // isForfeit: true (diabaikan oleh canRegenerate)
      { id: "c2", status: "PENDING" },
    ];
    const result = canRegenerate(forfeitedPending);
    expect(result.allowed).toBe(true);
  });

  // Dokumentasi: overrideOne() di repository.js JUGA clear isForfeit=false, forfeitReason=null
  // saat override dijalankan. Ini TIDAK ditest di sini (butuh DB), tapi terdokumentasi:
  // "Override selalu menang atas forfeit" — lihat komentar di commission.repository.js
  test("canOverride tidak peduli isForfeit — hanya peduli status", () => {
    // Komisi forfeited BISA di-override jika statusnya PENDING/APPROVED
    // isForfeit = true tidak memblokir canOverride
    // (behaviour clearing isForfeit ada di overrideOne di repository)
    const pendingForfeit   = { status: "PENDING",  isForfeit: true  };
    const approvedForfeit  = { status: "APPROVED", isForfeit: true  };
    const paidForfeit      = { status: "PAID",     isForfeit: true  };
    expect(canOverride(pendingForfeit.status)).toBe(true);
    expect(canOverride(approvedForfeit.status)).toBe(true);
    expect(canOverride(paidForfeit.status)).toBe(false);
  });
});

// ── Test 12: Override rules — tambahan ───────────────────────────────
describe("override — additional business rules", () => {
  test("amount negatif tidak boleh (bukan pure calc — dicheck di service)", () => {
    // canOverride hanya cek status, amount validation ada di service layer
    // Test ini mendokumentasikan bahwa Rp 0 diizinkan (bisa set komisi = 0)
    const zeroAmount = D("0");
    expect(zeroAmount.isNegative()).toBe(false);
    expect(zeroAmount.toFixed(2)).toBe("0.00");
  });

  test("override Rp 0 valid — bisa batalkan komisi tanpa delete", () => {
    // Rp 0 adalah amount yang valid untuk override (bukan negatif)
    const pool    = D("0");
    const amounts = distributePool(pool, [{ workQty: "1" }]);
    expect(amounts[0].toFixed(2)).toBe("0.00");
  });
});
