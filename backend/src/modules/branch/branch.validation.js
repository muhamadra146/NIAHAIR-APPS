const { object, string, pipe, optional, boolean, minLength, number, integer, minValue, maxValue, trim } = require("valibot");

// Titik lokasi absen: lintang −90..90, bujur −180..180 (G5-05/06)
const latitude  = pipe(number("Latitude harus angka"),  minValue(-90,  "Latitude harus antara -90 dan 90"),   maxValue(90,  "Latitude harus antara -90 dan 90"));
const longitude = pipe(number("Longitude harus angka"), minValue(-180, "Longitude harus antara -180 dan 180"), maxValue(180, "Longitude harus antara -180 dan 180"));

// Nama/kode di-trim; hanya spasi = kosong (G5-17)
const createBranchSchema = object({
  code:         pipe(string(), trim(), minLength(1, "Kode wajib diisi")),
  name:         pipe(string(), trim(), minLength(1, "Nama wajib diisi")),
  address:      optional(string()),
  city:         optional(string()),
  province:     optional(string()),
  phone:        optional(string()),
  latitude:     optional(latitude),
  longitude:    optional(longitude),
  radiusMeters: optional(pipe(number(), integer(), minValue(1))),
});

const updateBranchSchema = object({
  code:         optional(pipe(string(), trim(), minLength(1, "Kode tidak boleh kosong"))),
  name:         optional(pipe(string(), trim(), minLength(1, "Nama tidak boleh kosong"))),
  address:      optional(string()),
  city:         optional(string()),
  province:     optional(string()),
  phone:        optional(string()),
  isActive:     optional(boolean()),
  latitude:     optional(latitude),
  longitude:    optional(longitude),
  radiusMeters: optional(pipe(number(), integer(), minValue(1))),
});

// ID cabang Accurate: bilangan bulat positif dalam batas INT (G5-07/08)
const mapAccurateSchema = object({
  accurateBranchId: pipe(
    number("ID cabang Accurate harus angka"),
    integer("ID cabang Accurate harus bilangan bulat"),
    minValue(1, "ID cabang Accurate harus lebih dari 0"),
    maxValue(2147483647, "ID cabang Accurate terlalu besar"),
  ),
});

module.exports = { createBranchSchema, updateBranchSchema, mapAccurateSchema };
