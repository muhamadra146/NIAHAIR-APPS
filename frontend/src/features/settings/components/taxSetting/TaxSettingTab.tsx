import { useState } from "react";
import { Plus, Save, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/authStore";
import { isFullAccess } from "@/lib/access";
import { useTaxSettings, useSaveTaxSetting } from "../../hooks";
import type { TaxBracket, TaxSetting, TaxSettingInput } from "../../types";

// Tarif & PTKP PPh 21 per tahun pajak (PAY-037). Payroll memakai tahun terbesar ≤ tahun masa pajak.
// Super Admin & Owner mengubah; Finance hanya melihat (sama dengan Akun Gaji).

type TableKey = "terA" | "terB" | "terC" | "pasal17Brackets";

const TABLES: { key: TableKey; label: string; desc: string; base: string }[] = [
  { key: "terA",            label: "TER A",     desc: "TK/0, TK/1, K/0",          base: "Bruto bulanan" },
  { key: "terB",            label: "TER B",     desc: "TK/2, TK/3, K/1, K/2",     base: "Bruto bulanan" },
  { key: "terC",            label: "TER C",     desc: "K/3",                      base: "Bruto bulanan" },
  { key: "pasal17Brackets", label: "Pasal 17",  desc: "Hitung ulang tahunan (PKP)", base: "PKP setahun" },
];

const fmtNum = (n: number) => new Intl.NumberFormat("id-ID").format(n);

const toInput = (s: TaxSetting): TaxSettingInput => ({
  year:                   s.year,
  ptkpSelf:               Number(s.ptkpSelf),
  ptkpMarried:            Number(s.ptkpMarried),
  ptkpDependent:          Number(s.ptkpDependent),
  maxDependents:          s.maxDependents,
  positionCostPercent:    Number(s.positionCostPercent),
  positionCostMonthlyMax: Number(s.positionCostMonthlyMax),
  pasal17Brackets:        s.pasal17Brackets.map((b) => ({ upTo: b.upTo == null ? null : Number(b.upTo), rate: Number(b.rate) })),
  terA:                   s.terA.map((b) => ({ upTo: b.upTo == null ? null : Number(b.upTo), rate: Number(b.rate) })),
  terB:                   s.terB.map((b) => ({ upTo: b.upTo == null ? null : Number(b.upTo), rate: Number(b.rate) })),
  terC:                   s.terC.map((b) => ({ upTo: b.upTo == null ? null : Number(b.upTo), rate: Number(b.rate) })),
});

function BracketTable({ rows, base, readOnly, onChange }: {
  rows: TaxBracket[]; base: string; readOnly: boolean; onChange: (rows: TaxBracket[]) => void;
}) {
  const setRow = (i: number, patch: Partial<TaxBracket>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  // Baris baru disisipkan sebelum baris terakhir ("di atas …")
  const addRow = () => {
    const prev = rows.length >= 2 ? rows[rows.length - 2] : null;
    const last = rows[rows.length - 1];
    const next: TaxBracket = { upTo: (prev?.upTo ?? 0) + 1, rate: prev?.rate ?? 0 };
    onChange([...rows.slice(0, -1), next, last]);
  };

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left w-12">No</th>
            <th className="px-3 py-2 text-left">{base} sampai dengan (Rp)</th>
            <th className="px-3 py-2 text-left w-32">Tarif (%)</th>
            {!readOnly && <th className="w-10" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => {
            const isLast = i === rows.length - 1;
            const lower  = i === 0 ? null : rows[i - 1].upTo;
            return (
              <tr key={i}>
                <td className="px-3 py-1.5 text-slate-400 tabular-nums">{i + 1}</td>
                <td className="px-3 py-1.5">
                  {isLast ? (
                    <span className="text-slate-600">di atas {lower != null ? fmtNum(lower) : "0"}</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 whitespace-nowrap w-28 text-right tabular-nums">
                        {lower != null ? `> ${fmtNum(lower)}` : "s.d."}
                      </span>
                      <Input
                        type="number" min={0} step={1000} value={r.upTo ?? ""} disabled={readOnly}
                        onChange={(e) => setRow(i, { upTo: e.target.value === "" ? 0 : Number(e.target.value) })}
                        className="h-8 tabular-nums"
                      />
                    </div>
                  )}
                </td>
                <td className="px-3 py-1.5">
                  <Input
                    type="number" min={0} max={100} step={0.01} value={r.rate} disabled={readOnly}
                    onChange={(e) => setRow(i, { rate: e.target.value === "" ? 0 : Number(e.target.value) })}
                    className="h-8 tabular-nums"
                  />
                </td>
                {!readOnly && (
                  <td className="px-2">
                    {!isLast && rows.length > 2 && (
                      <button type="button" onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-red-500" aria-label={`Hapus baris ${i + 1}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {!readOnly && (
        <div className="border-t border-slate-100 px-3 py-2">
          <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={addRow}>
            <Plus className="h-3.5 w-3.5" /> Tambah baris
          </Button>
        </div>
      )}
    </div>
  );
}

function MoneyField({ label, value, readOnly, onChange, hint, step = 1000 }: {
  label: string; value: number; readOnly: boolean; onChange: (v: number) => void; hint?: string; step?: number;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" min={0} step={step} value={value} disabled={readOnly} className="mt-1 tabular-nums"
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} />
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function TaxSettingTab() {
  const user = useAuthStore((s) => s.user);
  const readOnly = !isFullAccess(user);
  const { data: settings = [], isLoading } = useTaxSettings();
  const saveMut = useSaveTaxSetting();

  // undefined = belum memilih (tampilkan tahun terbaru); null = tahun baru yang belum disimpan
  const [selectedId, setSelectedId] = useState<string | null | undefined>(undefined);
  const [edited, setEdited]         = useState<TaxSettingInput | null>(null);
  const [table, setTable]           = useState<TableKey>("terA");

  const currentId = selectedId === undefined ? (settings[0]?.id ?? null) : selectedId;
  const stored    = settings.find((s) => s.id === currentId);
  const draft     = edited ?? (stored ? toInput(stored) : null);

  const selectYear = (id: string) => {
    const s = settings.find((x) => x.id === id);
    if (!s) return;
    setSelectedId(s.id);
    setEdited(toInput(s));
  };

  // Tahun baru disalin dari tahun yang sedang dibuka, lalu disesuaikan (mis. PTKP baru)
  const addYear = () => {
    if (!draft) return;
    const maxYear = Math.max(...settings.map((s) => s.year), draft.year);
    setSelectedId(null);
    setEdited({ ...draft, year: maxYear + 1 });
  };

  const set = <K extends keyof TaxSettingInput>(key: K, value: TaxSettingInput[K]) => {
    if (draft) setEdited({ ...draft, [key]: value });
  };

  const save = async () => {
    if (!draft) return;
    const saved = await saveMut.mutateAsync({ id: currentId, input: draft }).catch(() => null);
    if (saved) setSelectedId(saved.id);
  };

  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (!draft) return <p className="text-sm text-muted-foreground">Belum ada tarif PPh 21.</p>;
  const isNew = currentId === null;

  const active = TABLES.find((t) => t.key === table)!;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold">Tarif PPh 21</h2>
        <p className="text-sm text-muted-foreground">
          PTKP, biaya jabatan, tarif Pasal 17, dan tabel TER per tahun pajak. Payroll memakai tahun terbesar yang tidak melebihi tahun masa pajak.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-blue-800">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Perubahan berlaku untuk payroll yang dibuat atau dihitung ulang sesudahnya. Slip yang sudah disetujui/dibayar tidak berubah.
          Bila aturan berganti di tahun baru (mis. PTKP naik), klik <strong>Tambah Tahun</strong> agar tarif tahun sebelumnya tetap tersimpan.
          {readOnly && " Anda hanya dapat melihat; perubahan oleh Owner atau Super Admin."}
        </p>
      </div>

      {/* Pilih tahun */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs block">Tahun pajak</Label>
          <select
            value={currentId ?? "new"}
            onChange={(e) => selectYear(e.target.value)}
            className="mt-1 h-9 w-48 rounded-md border border-input bg-background px-3 text-sm"
          >
            {isNew && <option value="new">{draft.year} (baru, belum disimpan)</option>}
            {settings.map((s) => <option key={s.id} value={s.id}>Mulai {s.year}</option>)}
          </select>
        </div>
        {!readOnly && !isNew && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={addYear}>
            <Plus className="h-4 w-4" /> Tambah Tahun
          </Button>
        )}
      </div>

      {/* PTKP & biaya jabatan */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Berlaku mulai tahun</Label>
          <Input type="number" min={2024} max={2100} value={draft.year} disabled={readOnly} className="mt-1"
            onChange={(e) => set("year", Number(e.target.value))} />
        </div>
        <MoneyField label="PTKP diri sendiri (setahun)" value={draft.ptkpSelf} readOnly={readOnly} onChange={(v) => set("ptkpSelf", v)} hint={`Rp ${fmtNum(draft.ptkpSelf)}`} />
        <MoneyField label="Tambahan kawin (setahun)" value={draft.ptkpMarried} readOnly={readOnly} onChange={(v) => set("ptkpMarried", v)} hint={`Rp ${fmtNum(draft.ptkpMarried)}`} />
        <MoneyField label="Tambahan per tanggungan (setahun)" value={draft.ptkpDependent} readOnly={readOnly} onChange={(v) => set("ptkpDependent", v)} hint={`Rp ${fmtNum(draft.ptkpDependent)}`} />
        <MoneyField label="Maksimal tanggungan" value={draft.maxDependents} readOnly={readOnly} step={1} onChange={(v) => set("maxDependents", v)} />
        <MoneyField label="Biaya jabatan (%)" value={draft.positionCostPercent} readOnly={readOnly} step={0.1} onChange={(v) => set("positionCostPercent", v)} />
        <MoneyField label="Maks. biaya jabatan per bulan" value={draft.positionCostMonthlyMax} readOnly={readOnly}
          onChange={(v) => set("positionCostMonthlyMax", v)} hint={`Setahun maks Rp ${fmtNum(draft.positionCostMonthlyMax * 12)}`} />
      </div>

      {/* Tabel tarif */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {TABLES.map((t) => (
            <button key={t.key} type="button" onClick={() => setTable(t.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                table === t.key ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:border-primary/50"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{active.label}: {active.desc} · {draft[table].length} baris</p>
        <BracketTable rows={draft[table]} base={active.base} readOnly={readOnly} onChange={(rows) => set(table, rows)} />
      </div>

      {!readOnly && (
        <div className="flex justify-end gap-2">
          {isNew && (
            <Button variant="outline" onClick={() => selectYear(settings[0].id)} disabled={saveMut.isPending}>Batal</Button>
          )}
          <Button onClick={save} disabled={saveMut.isPending} className="gap-1.5">
            <Save className="h-4 w-4" /> {saveMut.isPending ? "Menyimpan…" : "Simpan Tarif"}
          </Button>
        </div>
      )}
    </div>
  );
}
