import { useState, useEffect, useCallback, useRef } from "react";
import { X, Loader2, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateConsultationNote, useConsultationNotes } from "@/features/consultation/hooks";
import {
  PROFESSION_OPTIONS,
  AGE_RANGE_OPTIONS,
  DAILY_STYLING_OPTIONS,
  DISCOVERY_OPTIONS,
  REASON_SERVICE_OPTIONS,
  HESITATION_OPTIONS,
  PREV_EXP_OPTIONS,
} from "@/features/consultation/constants";

// ── Props ─────────────────────────────────────────────────────────────

interface Props {
  invoiceId:    string;
  invoiceNo:    string;
  customerName: string;
  customerId:   string;   // untuk pre-fill dari kunjungan sebelumnya
  onClose:      () => void;
  onSuccess:    () => void;
}

// ── Helper sub-components ─────────────────────────────────────────────

const inputCls =
  "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring";

const textareaCls =
  "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-foreground mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function RadioGroup({
  options,
  value,
  onChange,
}: {
  options:  { value: string; label: string }[];
  value:    string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {options.map((opt) => (
        <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="h-3.5 w-3.5 accent-primary"
          />
          <span className="text-sm">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

function CheckboxGroup({
  options,
  values,
  onChange,
}: {
  options:  { value: string; label: string }[];
  values:   string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {options.map((opt) => (
        <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            value={opt.value}
            checked={values.includes(opt.value)}
            onChange={() => onChange(opt.value)}
            className="h-3.5 w-3.5 accent-primary rounded"
          />
          <span className="text-sm">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────

export function ConsultationNoteModal({ invoiceId, invoiceNo, customerName, customerId, onClose, onSuccess }: Props) {
  // ── Form state ────────────────────────────────────────────────────

  const [profession,             setProfession]             = useState("");
  const [professionOther,        setProfessionOther]        = useState("");
  const [ageRange,               setAgeRange]               = useState("");
  const [dailyStyling,           setDailyStyling]           = useState<string[]>([]);
  const [dailyStylingOther,      setDailyStylingOther]      = useState("");
  const [discoveryChannel,       setDiscoveryChannel]       = useState("");
  const [discoveryChannelDetail, setDiscoveryChannelDetail] = useState("");
  const [reasonForService,       setReasonForService]       = useState<string[]>([]);
  const [reasonForServiceOther,  setReasonForServiceOther]  = useState("");
  const [hesitation,             setHesitation]             = useState<string[]>([]);
  const [hesitationOther,        setHesitationOther]        = useState("");
  const [previousExpType,        setPreviousExpType]        = useState("");
  const [previousSalonName,      setPreviousSalonName]      = useState("");
  const [reasonSwitchToNia,      setReasonSwitchToNia]      = useState("");
  const [issuesDuringUse,        setIssuesDuringUse]        = useState("");
  const [changesAfterUse,        setChangesAfterUse]        = useState("");
  const [interestingNote,        setInterestingNote]        = useState("");
  const [additionalNotes,        setAdditionalNotes]        = useState("");

  const createMut = useCreateConsultationNote();

  // ── Auto-fill dari kunjungan sebelumnya ───────────────────────────
  // Hanya pre-fill profession + ageRange (field immutable).
  // discoveryChannel, previousExpType, dailyStyling TIDAK di-pre-fill
  // karena analitik penting yang bisa berubah tiap kunjungan.

  const { data: prevNotesData } = useConsultationNotes({ customerId, limit: 1 });
  // Hook me-wrap hasil di { data: [...], meta: {} }, sehingga butuh .data?.[0]
  const prevNote = prevNotesData?.data?.[0];

  // Set<string> untuk render badge "dari kunjungan sebelumnya" per field
  const [prefilledFields, setPrefilledFields] = useState<Set<string>>(new Set());
  // Ref guard: satu kali saja, mencegah re-run saat query refetch setelah submit
  const hasPrefilled = useRef(false);

  useEffect(() => {
    if (hasPrefilled.current) return;
    if (!prevNote) return;
    hasPrefilled.current = true;

    const filled = new Set<string>();
    // Guard string | null → string sebelum set state
    if (prevNote.ageRange)   { setAgeRange(prevNote.ageRange);      filled.add("ageRange"); }
    if (prevNote.profession) { setProfession(prevNote.profession);  filled.add("profession"); }
    // Isi sub-field ketika profession === "OTHER"
    if (prevNote.profession === "OTHER" && prevNote.professionOther) {
      setProfessionOther(prevNote.professionOther);
    }
    setPrefilledFields(filled);
  }, [prevNote]);

  // Helper: badge kecil untuk field yang sudah di-pre-fill
  const prefillBadge = (field: string) =>
    prefilledFields.has(field) ? (
      <span className="ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 align-middle">
        dari kunjungan sebelumnya
      </span>
    ) : null;

  // ── Keyboard + scroll lock ────────────────────────────────────────

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose],
  );
  useEffect(() => {
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [handleEscape]);

  // ── Multi-select toggle ───────────────────────────────────────────

  function toggleMulti(arr: string[], setArr: (v: string[]) => void, value: string) {
    setArr(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
  }

  // ── Submit ────────────────────────────────────────────────────────

  function handleSave() {
    if (!interestingNote.trim()) return;
    createMut.mutate(
      {
        invoiceId,
        profession:              profession || undefined,
        professionOther:         professionOther || undefined,
        ageRange:                ageRange || undefined,
        dailyStyling:            dailyStyling.length ? dailyStyling : undefined,
        dailyStylingOther:       dailyStylingOther || undefined,
        discoveryChannel:        discoveryChannel || undefined,
        discoveryChannelDetail:  discoveryChannelDetail || undefined,
        reasonForService:        reasonForService.length ? reasonForService : undefined,
        reasonForServiceOther:   reasonForServiceOther || undefined,
        hesitation:              hesitation.length ? hesitation : undefined,
        hesitationOther:         hesitationOther || undefined,
        previousExpType:         previousExpType || undefined,
        previousSalonName:       previousSalonName || undefined,
        reasonSwitchToNia:       reasonSwitchToNia || undefined,
        issuesDuringUse:         issuesDuringUse || undefined,
        changesAfterUse:         changesAfterUse || undefined,
        interestingNote:         interestingNote.trim(),
        additionalNotes:         additionalNotes || undefined,
      },
      {
        onSuccess: () => {
          onSuccess();
          onClose();
        },
      },
    );
  }

  const canSave = interestingNote.trim().length > 0;

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg bg-background rounded-2xl shadow-2xl border border-border max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <NotebookPen className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">Catatan Klien</h2>
              <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 px-2 py-0.5 text-xs font-medium">
                Wajib Diisi
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {invoiceNo} · {customerName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 p-5 space-y-6">

          {/* Info banner */}
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2.5">
            <NotebookPen className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Pengerjaan sudah disimpan. Lengkapi catatan klien di bawah untuk melanjutkan.
              Catatan ini membantu tim memahami kebutuhan klien lebih baik.
            </p>
          </div>

          {/* ── Section 1: Tentang Klien ─────────────────────────── */}
          <Section title="Tentang Klien">
            <Field label={<span>Profesi {prefillBadge("profession")}</span>}>
              <RadioGroup
                options={PROFESSION_OPTIONS}
                value={profession}
                onChange={setProfession}
              />
              {profession === "OTHER" && (
                <input
                  className={inputCls}
                  placeholder="Profesi lainnya..."
                  value={professionOther}
                  onChange={(e) => setProfessionOther(e.target.value)}
                />
              )}
            </Field>

            <Field label={<span>Rentang Usia {prefillBadge("ageRange")}</span>}>
              <RadioGroup
                options={AGE_RANGE_OPTIONS}
                value={ageRange}
                onChange={setAgeRange}
              />
            </Field>

            <Field label="Styling Harian">
              <CheckboxGroup
                options={DAILY_STYLING_OPTIONS}
                values={dailyStyling}
                onChange={(v) => toggleMulti(dailyStyling, setDailyStyling, v)}
              />
              {dailyStyling.includes("OTHER") && (
                <input
                  className={inputCls}
                  placeholder="Styling harian lainnya..."
                  value={dailyStylingOther}
                  onChange={(e) => setDailyStylingOther(e.target.value)}
                />
              )}
            </Field>
          </Section>

          {/* ── Section 2: Penemuan & Alasan ────────────────────── */}
          <Section title="Penemuan & Alasan">
            <Field label="Dari mana tahu Nia Hair?">
              <RadioGroup
                options={DISCOVERY_OPTIONS}
                value={discoveryChannel}
                onChange={setDiscoveryChannel}
              />
              {(discoveryChannel === "REKOMENDASI" ||
                discoveryChannel === "KOL" ||
                discoveryChannel === "OTHER") && (
                <input
                  className={inputCls}
                  placeholder="Siapa atau detail lainnya..."
                  value={discoveryChannelDetail}
                  onChange={(e) => setDiscoveryChannelDetail(e.target.value)}
                />
              )}
            </Field>

            <Field label="Alasan menggunakan layanan ini">
              <CheckboxGroup
                options={REASON_SERVICE_OPTIONS}
                values={reasonForService}
                onChange={(v) => toggleMulti(reasonForService, setReasonForService, v)}
              />
              {reasonForService.includes("OTHER") && (
                <input
                  className={inputCls}
                  placeholder="Alasan lainnya..."
                  value={reasonForServiceOther}
                  onChange={(e) => setReasonForServiceOther(e.target.value)}
                />
              )}
            </Field>

            <Field label="Keraguan sebelum datang">
              <CheckboxGroup
                options={HESITATION_OPTIONS}
                values={hesitation}
                onChange={(v) => toggleMulti(hesitation, setHesitation, v)}
              />
              {hesitation.includes("OTHER") && (
                <input
                  className={inputCls}
                  placeholder="Keraguan lainnya..."
                  value={hesitationOther}
                  onChange={(e) => setHesitationOther(e.target.value)}
                />
              )}
            </Field>
          </Section>

          {/* ── Section 3: Pengalaman Sebelumnya ────────────────── */}
          <Section title="Pengalaman Sebelumnya">
            <Field label="Pernah pasang sebelumnya?">
              <RadioGroup
                options={PREV_EXP_OPTIONS}
                value={previousExpType}
                onChange={setPreviousExpType}
              />
            </Field>

            {previousExpType === "PERNAH_LAIN" && (
              <>
                <Field label="Nama salon sebelumnya">
                  <input
                    className={inputCls}
                    placeholder="Nama salon..."
                    value={previousSalonName}
                    onChange={(e) => setPreviousSalonName(e.target.value)}
                  />
                </Field>
                <Field label="Alasan pindah ke Nia Hair">
                  <textarea
                    className={textareaCls}
                    placeholder="Alasan pindah..."
                    rows={2}
                    value={reasonSwitchToNia}
                    onChange={(e) => setReasonSwitchToNia(e.target.value)}
                  />
                </Field>
              </>
            )}
          </Section>

          {/* ── Section 4: Catatan Penting ───────────────────────── */}
          <Section title="Catatan Penting">
            <Field
              label={
                <span>
                  Catatan menarik{" "}
                  <span className="text-red-500 font-semibold">*</span>
                </span>
              }
            >
              <textarea
                className={`${textareaCls} ${
                  !canSave ? "border-red-300 dark:border-red-700 focus:ring-red-400" : ""
                }`}
                placeholder="Tuliskan hal menarik atau penting tentang klien ini — reaksi, cerita, keunikan..."
                rows={3}
                value={interestingNote}
                onChange={(e) => setInterestingNote(e.target.value)}
              />
            </Field>

            <Field label="Perubahan setelah pakai (opsional)">
              <textarea
                className={textareaCls}
                placeholder="Perubahan yang dirasakan klien setelah pakai..."
                rows={2}
                value={changesAfterUse}
                onChange={(e) => setChangesAfterUse(e.target.value)}
              />
            </Field>

            <Field label="Masalah selama pemakaian (opsional)">
              <textarea
                className={textareaCls}
                placeholder="Masalah yang dialami klien selama pemakaian..."
                rows={2}
                value={issuesDuringUse}
                onChange={(e) => setIssuesDuringUse(e.target.value)}
              />
            </Field>

            <Field label="Catatan tambahan (opsional)">
              <textarea
                className={textareaCls}
                placeholder="Catatan lain yang relevan..."
                rows={2}
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
              />
            </Field>
          </Section>
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div className="border-t border-border px-5 py-4 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {!canSave ? (
              <span className="text-red-500">Catatan menarik wajib diisi</span>
            ) : (
              "Catatan akan disimpan ke profil klien"
            )}
          </p>
          <Button
            size="sm"
            disabled={!canSave || createMut.isPending}
            onClick={handleSave}
          >
            {createMut.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Menyimpan...
              </>
            ) : (
              "Simpan Catatan"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
