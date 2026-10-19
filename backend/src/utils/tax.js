const { Prisma } = require("@prisma/client");

const D = (v) => new Prisma.Decimal(String(v));

// PPN 11% satu kali per dokumen dari dasar Σ(harga × qty − diskon) baris kena PPN,
// dibulatkan ke rupiah penuh (setengah ke atas) — sama dengan Accurate (tax1Amount header),
// sehingga total ERP == total Accurate (keputusan user 2026-10-17).
// Dipakai faktur penjualan dan faktur pembelian.
//   • exclusive : PPN = bulat(dasar × 11%)
//   • inclusive : PPN = bulat(dasar × 11/111)  (dasar sudah termasuk PPN)
const computeDocumentTax = (taxBase, inclusiveTax) => {
  const base = D(taxBase);
  if (base.lte(D("0"))) return D("0");
  const raw = inclusiveTax ? base.mul(D("11")).div(D("111")) : base.mul(D("0.11"));
  return raw.toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
};

module.exports = { computeDocumentTax };
