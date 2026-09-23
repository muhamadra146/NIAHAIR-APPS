import { useState, useEffect } from "react";
import { Save, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

  // GL account options grouped by category
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
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-6">Tipe</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Komponen</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Akun GL Accurate</th>
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
                      <select
                        value={selected}
                        onChange={(e) => onChangeRow(row.category, e.target.value)}
                        className={`w-full max-w-xs rounded-md border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring
                          ${hasValue
                            ? "border-input bg-background text-foreground"
                            : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                          }`}
                      >
                        <option value="">— Belum dipilih —</option>
                        {glOptions.map((gl) => (
                          <option key={gl.id} value={gl.id}>
                            {gl.number ? `${gl.number} — ` : ""}{gl.name}
                          </option>
                        ))}
                      </select>
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
