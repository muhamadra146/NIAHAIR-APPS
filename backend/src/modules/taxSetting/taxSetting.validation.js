const { object, number, array, nullable, pipe, integer, minValue, maxValue, minLength } = require("valibot");

const money = (label) => pipe(number(`${label} harus angka`), minValue(0, `${label} tidak boleh negatif`));
const percent = (label) => pipe(number(`${label} harus angka`), minValue(0, `${label} tidak boleh negatif`), maxValue(100, `${label} maksimal 100`));

// Satu baris tarif: batas atas (null = di atas batas terakhir) & tarif %
const bracket = object({
  upTo: nullable(money("Batas atas")),
  rate: percent("Tarif"),
});
const brackets = (label) => pipe(array(bracket, `${label} harus berupa daftar`), minLength(1, `${label} minimal 1 baris`));

const taxSettingSchema = object({
  year:                   pipe(number("Tahun pajak harus angka"), integer("Tahun pajak harus bilangan bulat"), minValue(2024, "Tahun pajak minimal 2024"), maxValue(2100, "Tahun pajak tidak valid")),
  ptkpSelf:               money("PTKP diri sendiri"),
  ptkpMarried:            money("PTKP tambahan kawin"),
  ptkpDependent:          money("PTKP per tanggungan"),
  maxDependents:          pipe(number("Maksimal tanggungan harus angka"), integer("Maksimal tanggungan harus bilangan bulat"), minValue(0, "Maksimal tanggungan tidak boleh negatif"), maxValue(10, "Maksimal tanggungan terlalu besar")),
  positionCostPercent:    percent("Biaya jabatan"),
  positionCostMonthlyMax: money("Maksimal biaya jabatan per bulan"),
  pasal17Brackets:        brackets("Tarif Pasal 17"),
  terA:                   brackets("TER kategori A"),
  terB:                   brackets("TER kategori B"),
  terC:                   brackets("TER kategori C"),
});

module.exports = { taxSettingSchema };
