import { useState } from "react";
import { Download, Info, FlaskConical } from "lucide-react";
import { PageContainer }  from "@/components/layout/PageContainer";
import { Button }         from "@/components/ui/button";
import { Input }          from "@/components/ui/input";
import { useAllBranches } from "@/features/settings/hooks";
import { useAuthStore }   from "@/stores/authStore";
import { exportCSV }      from "@/lib/export";
import { toWibDateStr }   from "@/lib/utils";
import { usePph21Monthly, usePph21Annual } from "../hooks";
import type { Pph21MonthlyResult, Pph21AnnualResult } from "../types";
import { fmtTaxPeriod } from "../types";

// Laporan PPh 21 (PAY-037) — bahan bukti potong e-Bupot di Coretax.
//   Bulanan : BPMP (pegawai tetap, masa Jan–Nov) / BP21 (tidak tetap)
//   Tahunan : A1 (masa terakhir: Desember / resign)
//   Masa sebelum Januari 2027 = simulasi uji coba (dihitung tanpa disimpan)
// Pelaporan tetap dilakukan manual di Coretax; CSV disalin ke template impor Coretax.

const PPH21_START_PERIOD = "2027-01";
const TKU_STORAGE_KEY    = "niahair-pph21-id-tku";

const fmtRp = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const fmtDate = (ymd: string) => {
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
};
const pct = (n: number | null) => (n == null ? "—" : `${String(n).replace(".", ",")}%`);
// NIK diawali tanda kutip agar Excel tidak mengubah 16 digit jadi notasi ilmiah
const nikCell = (nik: string | null) => (nik ? `'${nik}` : "");

const filterCls =
  "h-9 rounded-xl border border-slate-200 bg-white shadow-sm text-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring/30";
const thCls = "px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap";
const tdCls = "px-3 py-3 whitespace-nowrap";

const readTku = () => {
  try { return localStorage.getItem(TKU_STORAGE_KEY) ?? ""; } catch { return ""; }
};
const writeTku = (v: string) => {
  try { localStorage.setItem(TKU_STORAGE_KEY, v); } catch { /* penyimpanan browser tidak tersedia */ }
};

// ── Export ────────────────────────────────────────────────────────────────────

/** Kolom mengikuti template impor bukti potong bulanan Coretax (nama field Coretax di dalam kurung) */
function exportMonthly(data: Pph21MonthlyResult, document: "BPMP" | "BP21", idTku: string) {
  const [year, month] = data.taxPeriod.split("-");
  const rows = data.data.filter((r) => r.document === document).map((r) => ({
    month:    Number(month),
    year,
    opt:      "Resident",
    tin:      nikCell(r.employee.nikKtp),
    name:     r.employee.name,
    ptkp:     r.ptkpLabel ?? "",
    position: r.employee.position ?? "",
    facility: "N/A",
    code:     r.taxObjectCode,
    gross:    Math.round(r.gross),
    rate:     r.terRate ?? "",
    pph21:    Math.round(r.pph21),
    tku:      idTku,
    date:     r.withholdingDate,
  }));
  exportCSV(rows, `ebupot-${document.toLowerCase()}-${data.taxPeriod}`, {
    month:    "Masa Pajak (TaxPeriodMonth)",
    year:     "Tahun Pajak (TaxPeriodYear)",
    opt:      "Status Penerima (CounterpartOpt)",
    tin:      "NIK/NPWP (CounterpartTin)",
    name:     "Nama",
    ptkp:     "Status PTKP (StatusTaxExemption)",
    position: "Jabatan (Position)",
    facility: "Fasilitas (TaxCertificate)",
    code:     "Kode Objek Pajak (TaxObjectCode)",
    gross:    "Penghasilan Bruto (Gross)",
    rate:     "Tarif TER % (Rate)",
    pph21:    "PPh 21 Dipotong",
    tku:      "ID TKU Pemotong (IDPlaceOfBusinessActivity)",
    date:     "Tanggal Pemotongan (WithholdingDate)",
  });
}

/** Lembar uji coba: hitungan aplikasi berdampingan dengan kolom hitungan manual konsultan */
function exportSimulation(data: Pph21MonthlyResult) {
  const rows = data.data.map((r) => ({
    name:   r.employee.name,
    nik:    nikCell(r.employee.nikKtp),
    ptkp:   r.ptkpLabel ?? "BELUM DIISI",
    gross:  Math.round(r.gross),
    rate:   r.terRate ?? "",
    pph21:  Math.round(r.pph21),
    manual: "",
    diff:   "",
  }));
  exportCSV(rows, `uji-coba-pph21-${data.taxPeriod}`, {
    name: "Karyawan", nik: "NIK", ptkp: "Status PTKP", gross: "Bruto (aplikasi)", rate: "TER % (aplikasi)",
    pph21: "PPh 21 (aplikasi)", manual: "PPh 21 (hitung manual)", diff: "Selisih",
  });
}

function exportA1(data: Pph21AnnualResult, idTku: string) {
  const rows = data.data.map((r) => ({
    tin:      nikCell(r.employee.nikKtp),
    name:     r.employee.name,
    ptkp:     r.ptkpLabel ?? "",
    position: r.employee.position ?? "",
    code:     r.taxObjectCode,
    from:     Number(r.periodFrom.slice(5)),
    to:       Number(r.periodTo.slice(5)),
    salary:   Math.round(r.lines.salary),
    other:    Math.round(r.lines.otherAllowance),
    premium:  Math.round(r.lines.insurancePremium),
    bonus:    Math.round(r.lines.bonus),
    gross:    Math.round(r.gross),
    posCost:  Math.round(r.positionCost),
    pension:  Math.round(r.pension),
    neto:     Math.round(r.neto),
    ptkpAmt:  r.ptkp,
    pkp:      r.pkp,
    annual:   r.annualTax,
    before:   Math.round(r.withheldBefore),
    final:    Math.round(r.finalPeriodTax),
    tku:      idTku,
  }));
  exportCSV(rows, `ebupot-a1-${data.year}`, {
    tin: "NIK/NPWP", name: "Nama", ptkp: "Status PTKP", position: "Jabatan", code: "Kode Objek Pajak",
    from: "Masa Awal", to: "Masa Akhir",
    salary: "1. Gaji", other: "3. Tunjangan Lainnya, Lembur, dsb.", premium: "5. Premi Asuransi dibayar Pemberi Kerja",
    bonus: "7. Tantiem, Bonus, THR", gross: "8. Jumlah Penghasilan Bruto",
    posCost: "9. Biaya Jabatan", pension: "10. Iuran Pensiun/JHT", neto: "14. Penghasilan Neto Setahun",
    ptkpAmt: "PTKP", pkp: "PKP Setahun", annual: "PPh 21 Terutang Setahun",
    before: "PPh 21 Dipotong Masa Sebelumnya", final: "PPh 21 Masa Terakhir", tku: "ID TKU Pemotong",
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = "monthly" | "annual";

export function Pph21ReportPage() {
  const { branchId: sessionBranchId } = useAuthStore();
  const { data: branches = [] }       = useAllBranches();

  const today       = toWibDateStr();
  const currentYear = Number(today.slice(0, 4));
  const yearOptions = Array.from({ length: 4 }, (_, i) => String(Math.max(currentYear, 2027) - i)).filter((y) => Number(y) >= 2027);

  const [tab,       setTab]       = useState<Tab>("monthly");
  const [taxPeriod, setTaxPeriod] = useState(today.slice(0, 7));
  const [year,      setYear]      = useState(yearOptions[0] ?? "2027");
  const [branchId,  setBranchId]  = useState(sessionBranchId ?? "");
  const [idTku,     setIdTku]     = useState(readTku);

  const monthly = usePph21Monthly({ taxPeriod, branchId: branchId || undefined }, tab === "monthly");
  const annual  = usePph21Annual({ year, branchId: branchId || undefined }, tab === "annual");

  const isSimulation = taxPeriod < PPH21_START_PERIOD;
  const mData = monthly.data;
  const aData = annual.data;
  const bpmpCount = mData?.data.filter((r) => r.document === "BPMP").length ?? 0;
  const bp21Count = mData?.data.filter((r) => r.document === "BP21").length ?? 0;
  const a1InMonth = mData?.data.filter((r) => r.document === "A1").length ?? 0;
  const missingNik  = (tab === "monthly" ? mData?.data : aData?.data)?.filter((r) => !r.employee.nikKtp).length ?? 0;
  const missingPtkp = mData?.data.filter((r) => r.missingPtkp).length ?? 0;

  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Laporan PPh 21</h1>
          <p className="text-sm text-muted-foreground">Bahan bukti potong e-Bupot di Coretax — bulanan (BPMP / BP21) dan tahunan (A1)</p>
        </div>

        {/* Tabs */}
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
          {([["monthly", "Bulanan (BPMP)"], ["annual", "Tahunan (A1)"]] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setTab(value)}
              className={`h-8 rounded-lg px-3 text-sm font-medium transition-colors ${
                tab === value ? "bg-primary text-primary-foreground" : "text-slate-500 hover:text-slate-700"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">{tab === "monthly" ? "Masa Pajak" : "Tahun Pajak"}</p>
            {tab === "monthly" ? (
              <input type="month" value={taxPeriod} onChange={(e) => setTaxPeriod(e.target.value)} className={`${filterCls} px-3 w-auto`} />
            ) : (
              <select value={year} onChange={(e) => setYear(e.target.value)} className={`${filterCls} px-3 w-28`}>
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">Cabang</p>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={`${filterCls} px-3 w-44`}>
              <option value="">Semua Cabang</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">ID TKU Pemotong</p>
            <Input
              value={idTku} placeholder="NPWP perusahaan + 000000 (22 digit)" inputMode="numeric" maxLength={22}
              onChange={(e) => { setIdTku(e.target.value); writeTku(e.target.value); }}
              className="h-9 w-64 rounded-xl"
            />
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            {tab === "monthly" && mData && isSimulation && (
              <Button variant="outline" size="sm" className="gap-1.5" disabled={mData.data.length === 0} onClick={() => exportSimulation(mData)}>
                <Download className="h-4 w-4" /> Lembar Uji Coba
              </Button>
            )}
            {tab === "monthly" && mData && !isSimulation && (
              <>
                <Button variant="outline" size="sm" className="gap-1.5" disabled={bpmpCount === 0} onClick={() => exportMonthly(mData, "BPMP", idTku)}>
                  <Download className="h-4 w-4" /> Export BPMP
                </Button>
                {bp21Count > 0 && (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportMonthly(mData, "BP21", idTku)}>
                    <Download className="h-4 w-4" /> Export BP21
                  </Button>
                )}
              </>
            )}
            {tab === "annual" && aData && (
              <Button variant="outline" size="sm" className="gap-1.5" disabled={aData.data.length === 0} onClick={() => exportA1(aData, idTku)}>
                <Download className="h-4 w-4" /> Export A1
              </Button>
            )}
          </div>
        </div>

        {/* Info */}
        {tab === "monthly" && isSimulation ? (
          <div className="flex items-start gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs text-violet-800">
            <FlaskConical className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p><strong>Mode uji coba.</strong> PPh 21 baru berlaku untuk gaji yang dibayar mulai Januari 2027. Angka di bawah dihitung saat ini dari slip yang tanggal gajiannya di {fmtTaxPeriod(taxPeriod)} (semua status), memakai status PTKP karyawan sekarang — <strong>tidak disimpan dan tidak dipotong dari gaji</strong>.</p>
              <p>Unduh <strong>Lembar Uji Coba</strong>, isi kolom hitungan manual konsultan, lalu bandingkan selisihnya. Hitung ulang tahunan Desember tidak disimulasikan.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-blue-800">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>Dari slip yang sudah <strong>disetujui/dibayar</strong>. CSV disalin ke template impor bukti potong di Coretax (nama field Coretax tertera di judul kolom) — cocokkan dengan template terbaru dari Coretax sebelum diunggah. Pelaporan tetap dilakukan di Coretax.</p>
              {tab === "monthly"
                ? <p>Masa Januari–November: bukti potong bulanan (BPMP pegawai tetap, BP21 tidak tetap). Masa terakhir (Desember / resign) dilaporkan lewat bukti potong A1 — lihat tab Tahunan.</p>
                : <p>A1 dibuat untuk karyawan tetap yang sudah punya slip masa terakhir (Desember atau resign) di tahun ini.</p>}
              {missingNik > 0 && <p className="font-medium text-amber-700">{missingNik} karyawan belum punya NIK — lengkapi di data karyawan.</p>}
              {!idTku && <p className="font-medium text-amber-700">Isi ID TKU pemotong (NPWP perusahaan 16 digit + 000000) agar kolomnya terisi di CSV.</p>}
            </div>
          </div>
        )}

        {tab === "monthly" && missingPtkp > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {missingPtkp} karyawan belum punya status PTKP — PPh 21-nya belum bisa dihitung. Lengkapi di data karyawan.
          </div>
        )}

        {tab === "monthly" && a1InMonth > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {a1InMonth} karyawan berada di masa terakhir (hitung ulang tahunan) — dilaporkan lewat A1, tidak ikut Export BPMP.
          </div>
        )}

        {/* Summary */}
        {tab === "monthly" && mData && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: "Karyawan",          value: String(mData.data.length) },
              { label: "Total Bruto",       value: fmtRp(mData.totals.gross) },
              { label: isSimulation ? "PPh 21 (simulasi)" : "PPh 21 Dipotong", value: fmtRp(mData.totals.pph21) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className="mt-1 text-base font-bold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            {tab === "monthly" ? (
              <table className="w-full text-sm min-w-[1100px]">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className={`${thCls} text-left`}>Karyawan</th>
                    <th className={`${thCls} text-left`}>NIK</th>
                    <th className={`${thCls} text-left`}>PTKP</th>
                    <th className={`${thCls} text-left`}>Dokumen</th>
                    <th className={`${thCls} text-left`}>Kode Objek</th>
                    <th className={`${thCls} text-right`}>Bruto</th>
                    <th className={`${thCls} text-right`}>Tarif</th>
                    <th className={`${thCls} text-right`}>PPh 21</th>
                    <th className={`${thCls} text-left`}>Tgl Potong</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthly.isLoading ? (
                    <tr><td colSpan={9} className="py-12 text-center text-sm text-muted-foreground">Memuat data...</td></tr>
                  ) : !mData || mData.data.length === 0 ? (
                    <tr><td colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                      {isSimulation ? "Tidak ada slip dengan tanggal gajian di bulan ini" : "Tidak ada slip disetujui/dibayar di masa pajak ini"}
                    </td></tr>
                  ) : (
                    <>
                      {mData.data.map((r) => (
                        <tr key={r.employee.id} className="hover:bg-slate-50/60">
                          <td className={tdCls}>
                            <p className="font-medium">{r.employee.name}</p>
                            <p className="text-xs text-muted-foreground">{r.employee.position}</p>
                          </td>
                          <td className={`${tdCls} text-xs tabular-nums`}>{r.employee.nikKtp ?? <span className="text-amber-600">Belum diisi</span>}</td>
                          <td className={tdCls}>{r.ptkpLabel ?? <span className="text-amber-600">Belum diisi</span>}</td>
                          <td className={tdCls}>
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{r.document}</span>
                          </td>
                          <td className={`${tdCls} text-xs tabular-nums`}>{r.taxObjectCode}</td>
                          <td className={`${tdCls} text-right tabular-nums`}>{fmtRp(r.gross)}</td>
                          <td className={`${tdCls} text-right tabular-nums`}>{r.method === "ANNUAL" ? "Tahunan" : pct(r.terRate)}</td>
                          <td className={`${tdCls} text-right tabular-nums font-semibold`}>{fmtRp(r.pph21)}</td>
                          <td className={`${tdCls} text-xs`}>{fmtDate(r.withholdingDate)}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-slate-200 bg-slate-50/80 font-semibold">
                        <td className={tdCls} colSpan={5}>Total</td>
                        <td className={`${tdCls} text-right tabular-nums`}>{fmtRp(mData.totals.gross)}</td>
                        <td />
                        <td className={`${tdCls} text-right tabular-nums`}>{fmtRp(mData.totals.pph21)}</td>
                        <td />
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm min-w-[1500px]">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className={`${thCls} text-left`}>Karyawan</th>
                    <th className={`${thCls} text-left`}>NIK</th>
                    <th className={`${thCls} text-left`}>PTKP</th>
                    <th className={`${thCls} text-left`}>Masa</th>
                    <th className={`${thCls} text-right`}>Bruto</th>
                    <th className={`${thCls} text-right`}>Biaya Jabatan</th>
                    <th className={`${thCls} text-right`}>Iuran JHT/JP</th>
                    <th className={`${thCls} text-right`}>Neto</th>
                    <th className={`${thCls} text-right`}>PTKP</th>
                    <th className={`${thCls} text-right`}>PKP</th>
                    <th className={`${thCls} text-right`}>PPh Setahun</th>
                    <th className={`${thCls} text-right`}>Dipotong Sebelumnya</th>
                    <th className={`${thCls} text-right`}>Masa Terakhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {annual.isLoading ? (
                    <tr><td colSpan={13} className="py-12 text-center text-sm text-muted-foreground">Memuat data...</td></tr>
                  ) : !aData || aData.data.length === 0 ? (
                    <tr><td colSpan={13} className="py-12 text-center text-sm text-muted-foreground">Belum ada karyawan dengan slip masa terakhir di tahun {year}</td></tr>
                  ) : (
                    aData.data.map((r) => (
                      <tr key={r.employee.id} className="hover:bg-slate-50/60">
                        <td className={tdCls}>
                          <p className="font-medium">{r.employee.name}</p>
                          <p className="text-xs text-muted-foreground">{r.employee.position}</p>
                        </td>
                        <td className={`${tdCls} text-xs tabular-nums`}>{r.employee.nikKtp ?? <span className="text-amber-600">Belum diisi</span>}</td>
                        <td className={tdCls}>{r.ptkpLabel}</td>
                        <td className={`${tdCls} text-xs`}>{r.periodFrom.slice(5)}–{r.periodTo.slice(5)}</td>
                        <td className={`${tdCls} text-right tabular-nums`}>{fmtRp(r.gross)}</td>
                        <td className={`${tdCls} text-right tabular-nums`}>{fmtRp(r.positionCost)}</td>
                        <td className={`${tdCls} text-right tabular-nums`}>{fmtRp(r.pension)}</td>
                        <td className={`${tdCls} text-right tabular-nums`}>{fmtRp(r.neto)}</td>
                        <td className={`${tdCls} text-right tabular-nums`}>{fmtRp(r.ptkp)}</td>
                        <td className={`${tdCls} text-right tabular-nums`}>{fmtRp(r.pkp)}</td>
                        <td className={`${tdCls} text-right tabular-nums font-semibold`}>{fmtRp(r.annualTax)}</td>
                        <td className={`${tdCls} text-right tabular-nums`}>{fmtRp(r.withheldBefore)}</td>
                        <td className={`${tdCls} text-right tabular-nums font-semibold ${r.finalPeriodTax < 0 ? "text-emerald-700" : ""}`}>
                          {fmtRp(r.finalPeriodTax)}{r.finalPeriodTax < 0 && <span className="block text-[11px] font-normal">lebih potong dikembalikan</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
