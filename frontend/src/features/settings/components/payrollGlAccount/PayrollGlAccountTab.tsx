import { useState, useEffect } from "react";
import { Save, BookOpen, ChevronDown, Search, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePayrollGlAccounts, useSavePayrollGlAccounts, useAllGlAccounts } from "../../hooks";
import type { PayrollGlCategory } from "../../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_BADGE: Record<string, string> = {
  DEBIT:  "bg-blue-100 text-blue-700",
  CREDIT: "bg-amber-100 text-amber-700",
};

const TYPE_LABEL: Record<string, string> = {
  DEBIT:  "Debit",
  CREDIT: "Kredit",
};

// ── GlAccountSelect ───────────────────────────────────────────────────────────

function GlAccountSelect({
  value,
  options,
  onChange,
  hasValue,
}: {
  value:    string;
  options:  Array<{ id: string; number: string | null; name: string }>;
  onChange: (id: string) => void;
  hasValue: boolean;
}) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");

  const selected = options.find((o) => o.id === value);
  const triggerLabel = selected
    ? (selected.number ? `${selected.number} — ${selected.name}` : selected.name)
    : "— Belum dipilih —";

  const q        = search.toLowerCase();
  const filtered = options.filter(
    (o) =>
      o.name.toLowerCase().includes(q) ||
      (o.number ?? "").toLowerCase().includes(q),
  );

  function pick(id: string) {
    onChange(id);
    setOpen(false);
    setSearch("");
  }

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (!v) setSearch("");
  }

  return (
    <>
      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full max-w-xs flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm text-left
          focus:outline-none focus:ring-1 focus:ring-ring transition-colors
          ${hasValue
            ? "border-input bg-background text-foreground hover:bg-muted/40"
            : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
          }`}
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
      </button>

      {/* ── Dialog ── */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md p-0 gap-0">
          <DialogHeader className="px-4 pt-4 pb-0">
            <DialogTitle className="text-base">Pilih Akun GL Accurate</DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div className="px-4 py-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                autoFocus
                type="text"
                placeholder="Cari nomor atau nama akun…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-sm
                  focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {filtered.length} akun ditemukan
            </p>
          </div>

          {/* List */}
          <ul className="max-h-72 overflow-y-auto divide-y divide-border/50">
            {/* Clear option */}
            <li>
              <button
                type="button"
                onClick={() => pick("")}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors
                  ${!value ? "bg-muted/30 font-medium" : "text-muted-foreground italic"}`}
              >
                {!value && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                <span className={!value ? "ml-[22px]" : ""}>— Belum dipilih —</span>
              </button>
            </li>

            {filtered.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                Tidak ada akun yang cocok
              </li>
            )}

            {filtered.map((o) => {
              const isSelected = o.id === value;
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => pick(o.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors
                      ${isSelected ? "bg-primary/5 font-medium" : ""}`}
                  >
                    {isSelected
                      ? <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                      : <span className="w-3.5 shrink-0" />
                    }
                    <span>
                      {o.number && (
                        <span className="mr-1.5 font-mono text-xs text-muted-foreground">
                          {o.number}
                        </span>
                      )}
                      {o.name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PayrollGlAccountTab() {
  const { data: mappings = [], isLoading }  = usePayrollGlAccounts();
  const { data: glAccounts = [] }           = useAllGlAccounts();
  const saveMut                             = useSavePayrollGlAccounts();

  // Local draft state — { category → glAccountId | "" }
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  // Seed draft when data loads
  useEffect(() => {
    if (mappings.length === 0) return;
    const init: Record<string, string> = {};
    mappings.forEach((m) => { init[m.category] = m.glAccountId ?? ""; });
    setDraft(init);
    setDirty(false);
  }, [mappings]);

  function handleChange(category: string, glAccountId: string) {
    setDraft((prev) => ({ ...prev, [category]: glAccountId }));
    setDirty(true);
  }

  async function handleSave() {
    const mapped = mappings.map((m) => ({
      category:    m.category as PayrollGlCategory,
      glAccountId: draft[m.category] || null,
    }));
    await saveMut.mutateAsync({ mappings: mapped });
    setDirty(false);
  }

  const debitRows  = mappings.filter((m) => m.type === "DEBIT");
  const creditRows = mappings.filter((m) => m.type === "CREDIT");

  const glOptions = glAccounts
    .slice()
    .sort((a, b) => (a.number ?? "").localeCompare(b.number ?? ""));

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Akun Perkiraan Gaji</h2>
          <p className="text-sm text-muted-foreground">
            Mapping komponen gaji ke akun GL Accurate untuk Jurnal Umum penggajian
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!dirty || saveMut.isPending}
        >
          {saveMut.isPending ? (
            <span className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" />
          ) : (
            <Save className="mr-2 h-3.5 w-3.5" />
          )}
          Simpan Mapping
        </Button>
      </div>

      {/* Journal preview info */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
        <p className="font-medium mb-1 flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5" /> Format Jurnal Umum Penggajian
        </p>
        <p className="text-xs text-blue-700 dark:text-blue-400">
          <strong>Debit</strong> = beban/biaya yang dicatat perusahaan ·{" "}
          <strong>Kredit</strong> = kewajiban atau pengurangan aset (kas, hutang, piutang kasbon)
        </p>
      </div>

      {/* Debit section */}
      <MappingSection
        title="Debit — Akun Beban"
        rows={debitRows}
        draft={draft}
        glOptions={glOptions}
        onChangeRow={handleChange}
      />

      {/* Credit section */}
      <MappingSection
        title="Kredit — Akun Kewajiban / Aset"
        rows={creditRows}
        draft={draft}
        glOptions={glOptions}
        onChangeRow={handleChange}
      />
    </div>
  );
}

// ── MappingSection ────────────────────────────────────────────────────────────

function MappingSection({
  title, rows, draft, glOptions, onChangeRow,
}: {
  title:       string;
  rows:        Array<{ id: string; category: string; label: string; type: string }>;
  draft:       Record<string, string>;
  glOptions:   Array<{ id: string; number: string | null; name: string }>;
  onChangeRow: (category: string, glAccountId: string) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-20">Tipe</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Komponen</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-80">Akun GL Accurate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((row) => {
                const selected = draft[row.category] ?? "";
                const hasValue = !!selected;
                return (
                  <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${TYPE_BADGE[row.type] ?? ""}`}>
                        {TYPE_LABEL[row.type] ?? row.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{row.label}</td>
                    <td className="px-4 py-3">
                      <GlAccountSelect
                        value={selected}
                        options={glOptions}
                        onChange={(id) => onChangeRow(row.category, id)}
                        hasValue={hasValue}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
