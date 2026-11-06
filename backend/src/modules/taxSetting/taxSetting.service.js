const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const repo = require("./taxSetting.repository");

// ── Tarif & PTKP PPh 21 per tahun pajak (PAY-037) ─────────────────────
// Payroll memakai baris dengan tahun terbesar ≤ tahun masa pajak. Perubahan hanya
// berlaku untuk payroll yang dihitung/dihitung ulang sesudahnya; slip lama tidak berubah.

const TABLE_LABEL = {
  pasal17Brackets: "Tarif Pasal 17",
  terA:            "TER kategori A",
  terB:            "TER kategori B",
  terC:            "TER kategori C",
};

/**
 * Tabel tarif harus urut: batas atas naik, hanya baris terakhir tanpa batas (null),
 * dan tarif tidak turun — agar setiap penghasilan jatuh ke tepat satu baris.
 */
const assertValidBrackets = (rows, label) => {
  rows.forEach((row, i) => {
    const isLast = i === rows.length - 1;
    const no = i + 1;
    if (isLast && row.upTo != null) {
      throw new AppError(`${label}: baris terakhir harus tanpa batas atas ("di atas")`, StatusCodes.UNPROCESSABLE_ENTITY);
    }
    if (!isLast && row.upTo == null) {
      throw new AppError(`${label} baris ${no}: batas atas wajib diisi (hanya baris terakhir yang boleh kosong)`, StatusCodes.UNPROCESSABLE_ENTITY);
    }
    if (i > 0) {
      const prev = rows[i - 1];
      if (row.upTo != null && row.upTo <= prev.upTo) {
        throw new AppError(`${label} baris ${no}: batas atas harus lebih besar dari baris sebelumnya`, StatusCodes.UNPROCESSABLE_ENTITY);
      }
      if (row.rate < prev.rate) {
        throw new AppError(`${label} baris ${no}: tarif tidak boleh lebih kecil dari baris sebelumnya`, StatusCodes.UNPROCESSABLE_ENTITY);
      }
    }
  });
};

const toData = (body) => {
  for (const [key, label] of Object.entries(TABLE_LABEL)) assertValidBrackets(body[key], label);
  const clean = (rows) => rows.map((r) => ({ upTo: r.upTo, rate: r.rate }));
  return {
    year:                   body.year,
    ptkpSelf:               body.ptkpSelf,
    ptkpMarried:            body.ptkpMarried,
    ptkpDependent:          body.ptkpDependent,
    maxDependents:          body.maxDependents,
    positionCostPercent:    body.positionCostPercent,
    positionCostMonthlyMax: body.positionCostMonthlyMax,
    pasal17Brackets:        clean(body.pasal17Brackets),
    terA:                   clean(body.terA),
    terB:                   clean(body.terB),
    terC:                   clean(body.terC),
  };
};

const getAll = () => repo.findAll();

const create = async (body) => {
  const data = toData(body);
  if (await repo.findByYear(data.year)) {
    throw new AppError(`Tarif tahun pajak ${data.year} sudah ada — ubah baris yang ada`, StatusCodes.CONFLICT);
  }
  return repo.create(data);
};

const update = async (id, body) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError("Tarif PPh 21 tidak ditemukan", StatusCodes.NOT_FOUND);
  const data = toData(body);
  if (data.year !== existing.year) {
    const other = await repo.findByYear(data.year);
    if (other) throw new AppError(`Tarif tahun pajak ${data.year} sudah ada`, StatusCodes.CONFLICT);
  }
  return repo.update(id, data);
};

module.exports = { getAll, create, update, assertValidBrackets };
