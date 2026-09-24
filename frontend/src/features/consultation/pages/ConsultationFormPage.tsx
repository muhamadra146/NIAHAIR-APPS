import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Search, User, Calendar, Receipt, Scissors,
  ChevronLeft, Save, Sparkles, Heart, MessageSquareQuote,
  Users, UserPlus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge }    from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/authStore";
import { formatDate }   from "@/lib/utils";
import { api }          from "@/lib/axios";
import { useConsultationNoteByInvoice, useCreateConsultationNote, useUpdateConsultationNote } from "../hooks";
import {
  PROFESSION_OPTIONS, AGE_RANGE_OPTIONS, DAILY_STYLING_OPTIONS,
  DISCOVERY_OPTIONS, REASON_SERVICE_OPTIONS, HESITATION_OPTIONS,
  PREV_EXP_OPTIONS,
} from "../constants";
import type { CreateConsultationNoteInput, UnfilledInvoice } from "../types";

// ── Question ───────────────────────────────────────────────────────────────────

function Q({ num, label, hint, required, children }: {
  num: number; label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 pb-4">
      <div>
        <p className="text-sm font-medium text-foreground">
          <span className="text-muted-foreground mr-1.5">{num}.</span>
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5 ml-5">{hint}</p>}
      </div>
      <div className="ml-5">{children}</div>
    </div>
  );
}

// ── Pills ──────────────────────────────────────────────────────────────────────

function Pills({ options, value, onChange, multi = false }: {
  options: { value: string; label: string }[];
  value: string | string[];
  onChange: (v: any) => void;
  multi?: boolean;
}) {
  const isActive = (v: string) => multi ? (value as string[]).includes(v) : value === v;
  const toggle = (v: string) => {
    if (multi) {
      const arr = value as string[];
      onChange(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
    } else {
      onChange((value as string) === v ? "" : v);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = isActive(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              active
                ? "bg-primary border-primary text-white"
                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function TextExtra({ placeholder, value, onChange }: {
  placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <Input
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm mt-1.5"
    />
  );
}

// ── Section divider ────────────────────────────────────────────────────────────

function Section({ icon, letter, title, gradient, children }: {
  icon: React.ReactNode; letter: string; title: string; gradient: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl overflow-hidden border shadow-sm">
      <div className={`${gradient} px-4 py-3 flex items-center gap-2`}>
        <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
          {icon}
        </div>
        <span className="text-sm font-semibold text-white">{letter}. {title}</span>
      </div>
      <div className="p-4 space-y-1">
        {children}
      </div>
    </div>
  );
}

// ── Invoice picker ─────────────────────────────────────────────────────────────

function InvoiceCard({ inv, onSelect }: { inv: UnfilledInvoice; onSelect: (inv: UnfilledInvoice) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(inv)}
      className="w-full text-left rounded-xl border-2 border-border/60 p-4 hover:border-primary hover:bg-primary/5 transition-all group"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-sm font-mono group-hover:text-primary transition-colors">
          {inv.invoiceNo}
        </span>
        <div className="flex items-center gap-2">
          {inv.isNewClient ? (
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Klien Baru</span>
          ) : (
            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">Klien Lama</span>
          )}
          <Badge variant="outline" className="text-xs">{formatDate(inv.invoiceDate)}</Badge>
        </div>
      </div>
      <p className="text-sm font-semibold">{inv.customer?.name}</p>
      {inv.customer?.mobilePhone && (
        <p className="text-xs text-muted-foreground">{inv.customer.mobilePhone}</p>
      )}
      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
        {inv.items?.map((i) => i.item.name).join(", ")}
      </p>
    </button>
  );
}

function InvoicePicker({ onSelect }: { onSelect: (inv: UnfilledInvoice) => void }) {
  const { branchId } = useAuthStore();
  const [search,        setSearch]        = useState("");
  const [unfilledList,  setUnfilledList]  = useState<UnfilledInvoice[]>([]);
  const [searchResults, setSearchResults] = useState<UnfilledInvoice[]>([]);
  const [loadingInit,   setLoadingInit]   = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Load unfilled invoices on mount via API
  useEffect(() => {
    api.get("/consultation-notes/unfilled-invoices", {
      params: { limit: 50, branchId: branchId || undefined },
    }).then(({ data }: any) => {
      setUnfilledList(data.data?.data ?? []);
    }).catch(() => {}).finally(() => setLoadingInit(false));
  }, [branchId]);

  const handleSearch = async (q: string) => {
    setSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setLoadingSearch(true);
    try {
      const { data } = await api.get("/consultation-notes/unfilled-invoices", {
        params: { limit: 50, branchId: branchId || undefined, search: q },
      }) as any;
      setSearchResults(data.data?.data ?? []);
    } finally {
      setLoadingSearch(false);
    }
  };

  const isSearching   = search.length >= 2;
  const displayList   = isSearching ? searchResults : unfilledList;
  const loadingList   = isSearching ? loadingSearch : loadingInit;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <div className="max-w-xl mx-auto px-4 py-10 space-y-5">
        <div className="text-center space-y-2 pb-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-2">
            <MessageSquareQuote className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Catatan Klien</h1>
          <p className="text-sm text-muted-foreground">Pilih invoice atau cari nama klien</p>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari nomor invoice atau nama klien..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-11 bg-white shadow-sm"
          />
        </div>

        {/* Invoice list */}
        <Card className="shadow-md border-0 ring-1 ring-border/50">
          <CardContent className="pt-4 pb-3 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">
                {isSearching ? "Hasil Pencarian" : "Invoice Belum Diisi"}
              </span>
              {!loadingList && (
                <span className="ml-auto text-xs text-muted-foreground">{displayList.length} invoice</span>
              )}
            </div>
            {loadingList && [1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            {!loadingList && displayList.length === 0 && (
              <p className="text-sm text-center text-muted-foreground py-4">
                {isSearching ? "Invoice tidak ditemukan" : "Tidak ada invoice yang belum diisi"}
              </p>
            )}
            {!loadingList && displayList.map((inv) => (
              <InvoiceCard key={inv.id} inv={inv} onSelect={onSelect} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Form state ─────────────────────────────────────────────────────────────────

type FormState = Omit<CreateConsultationNoteInput, "invoiceId">;

const EMPTY: FormState = {
  profession: "", professionOther: "",
  ageRange: "",
  dailyStyling: [], dailyStylingOther: "",
  discoveryChannel: "", discoveryChannelDetail: "",
  reasonForService: [], reasonForServiceOther: "",
  hesitation: [], hesitationOther: "",
  previousExpType: "", previousSalonName: "",
  reasonSwitchToNia: "",
  issuesDuringUse: "",
  changesAfterUse: "",
  interestingNote: "",
  additionalNotes: "",
};

// Invoice info used in form header
interface InvoiceInfo {
  id:          string;
  invoiceNo:   string;
  invoiceDate: string;
  customer:    { name: string; mobilePhone: string | null };
  items:       Array<{ item: { name: string } }>;
  isNewClient: boolean;
}

// ── Main form page ─────────────────────────────────────────────────────────────

export function ConsultationFormPage() {
  const { id }            = useParams<{ id: string }>();
  const [searchParams]    = useSearchParams();
  const navigate          = useNavigate();
  const isEdit            = !!id;

  const [invoiceId,    setInvoiceId]    = useState(searchParams.get("invoiceId") ?? "");
  const [invoiceInfo,  setInvoiceInfo]  = useState<InvoiceInfo | null>(null);
  const [isNewClient,  setIsNewClient]  = useState<boolean>(
    // Dari URL param saat klik "Isi Sekarang" di list — default true (tampil full form)
    searchParams.get("newClient") !== "false"
  );
  const [form, setForm]                = useState<FormState>(EMPTY);
  const [editNote, setEditNote]        = useState<any>(null);
  const [noteError, setNoteError]      = useState(false);

  const { data: existingNote } = useConsultationNoteByInvoice(isEdit ? "" : invoiceId);

  // Fetch invoice info when invoiceId comes from URL params
  useEffect(() => {
    if (isEdit || !invoiceId || invoiceInfo) return;
    api.get(`/invoices/${invoiceId}`).then(({ data }: any) => {
      const inv = data.data;
      if (!inv) return;
      setInvoiceInfo({
        id:          inv.id,
        invoiceNo:   inv.invoiceNo,
        invoiceDate: inv.invoiceDate,
        customer:    inv.customer,
        items:       inv.items ?? [],
        isNewClient, // dari URL param
      });
    }).catch(() => {});
  }, [invoiceId, isEdit, invoiceInfo, isNewClient]);

  // Load existing note for edit mode
  useEffect(() => {
    if (!isEdit || !id) return;
    api.get(`/consultation-notes/${id}`).then(({ data }: any) => {
      const note = data.data;
      setEditNote(note);
      setInvoiceId(note.invoiceId);
      // Untuk edit: pakai isNewClient dari note (computed backend)
      if (note.isNewClient !== undefined) setIsNewClient(note.isNewClient);
      setForm({
        profession:             note.profession ?? "",
        professionOther:        note.professionOther ?? "",
        ageRange:               note.ageRange ?? "",
        dailyStyling:           note.dailyStyling ?? [],
        dailyStylingOther:      note.dailyStylingOther ?? "",
        discoveryChannel:       note.discoveryChannel ?? "",
        discoveryChannelDetail: note.discoveryChannelDetail ?? "",
        reasonForService:       note.reasonForService ?? [],
        reasonForServiceOther:  note.reasonForServiceOther ?? "",
        hesitation:             note.hesitation ?? [],
        hesitationOther:        note.hesitationOther ?? "",
        previousExpType:        note.previousExpType ?? "",
        previousSalonName:      note.previousSalonName ?? "",
        reasonSwitchToNia:      note.reasonSwitchToNia ?? "",
        issuesDuringUse:        note.issuesDuringUse ?? "",
        changesAfterUse:        note.changesAfterUse ?? "",
        interestingNote:        note.interestingNote ?? "",
        additionalNotes:        note.additionalNotes ?? "",
      });
      if (note.invoice) {
        setInvoiceInfo({
          id:          note.invoice.id,
          invoiceNo:   note.invoice.invoiceNo,
          invoiceDate: note.invoice.invoiceDate,
          customer:    note.customer,
          items:       note.invoice.items,
          isNewClient: note.isNewClient ?? true,
        });
      }
    });
  }, [isEdit, id]);

  // Load existing note data into form (new mode, note already exists for invoice)
  useEffect(() => {
    if (isEdit || !invoiceId || !existingNote) return;
    if (existingNote.isNewClient !== undefined) setIsNewClient(existingNote.isNewClient);
    setForm({
      profession:             existingNote.profession ?? "",
      professionOther:        existingNote.professionOther ?? "",
      ageRange:               existingNote.ageRange ?? "",
      dailyStyling:           existingNote.dailyStyling ?? [],
      dailyStylingOther:      existingNote.dailyStylingOther ?? "",
      discoveryChannel:       existingNote.discoveryChannel ?? "",
      discoveryChannelDetail: existingNote.discoveryChannelDetail ?? "",
      reasonForService:       existingNote.reasonForService ?? [],
      reasonForServiceOther:  existingNote.reasonForServiceOther ?? "",
      hesitation:             existingNote.hesitation ?? [],
      hesitationOther:        existingNote.hesitationOther ?? "",
      previousExpType:        existingNote.previousExpType ?? "",
      previousSalonName:      existingNote.previousSalonName ?? "",
      reasonSwitchToNia:      existingNote.reasonSwitchToNia ?? "",
      issuesDuringUse:        existingNote.issuesDuringUse ?? "",
      changesAfterUse:        existingNote.changesAfterUse ?? "",
      interestingNote:        existingNote.interestingNote ?? "",
      additionalNotes:        existingNote.additionalNotes ?? "",
    });
  }, [existingNote, isEdit, invoiceId]);

  const createMutation = useCreateConsultationNote();
  const updateMutation = useUpdateConsultationNote(isEdit ? id! : (existingNote?.id ?? ""));

  const set = (key: keyof FormState, val: unknown) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!form.interestingNote?.trim()) {
      setNoteError(true);
      document.getElementById("interesting-note")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setNoteError(false);
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === "" ? undefined : v])
    ) as FormState;

    if (isEdit || existingNote) {
      await updateMutation.mutateAsync({ ...payload, interestingNote: form.interestingNote });
    } else {
      await createMutation.mutateAsync({ invoiceId, ...payload, interestingNote: form.interestingNote });
    }
    navigate("/consultation-notes");
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Nomor soal: klien baru mulai dari 1 (A+B+C), klien lama mulai dari 1 (C saja)
  const qOffset = isNewClient ? 0 : 7; // A=3 soal, B=4 soal = 7 soal yang dilewati

  if (!invoiceId && !isEdit) {
    return (
      <InvoicePicker
        onSelect={(inv) => {
          setInvoiceId(inv.id);
          setInvoiceInfo(inv);
          setIsNewClient(inv.isNewClient);
        }}
      />
    );
  }

  if (isEdit && !editNote) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
      </div>
    );
  }

  const displayNote  = isEdit ? editNote : existingNote;
  const customerName = displayNote?.customer?.name  ?? invoiceInfo?.customer?.name  ?? "—";
  const phone        = displayNote?.customer?.mobilePhone ?? invoiceInfo?.customer?.mobilePhone ?? "";
  const invoiceNo    = displayNote?.invoice?.invoiceNo ?? invoiceInfo?.invoiceNo ?? "—";
  const invoiceDate  = displayNote?.invoice?.invoiceDate ?? invoiceInfo?.invoiceDate ?? "";
  const services     = (displayNote?.invoice?.items ?? invoiceInfo?.items ?? []).map((i: any) => i.item.name).join(", ");
  const stylists     = (displayNote?.invoice?.treatmentSessions ?? [])
    .flatMap((s: any) => s.treatmentItems.flatMap((ti: any) => ti.assignments.map((a: any) => a.employee.name)))
    .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i).join(", ");

  const initials = customerName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-muted/30 pb-10">

      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b shadow-sm px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/consultation-notes")}
          className="p-2 rounded-xl hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-sm leading-tight">
            {isEdit || existingNote ? "Edit Catatan Klien" : "Isi Catatan Klien"}
          </h1>
          <p className="text-xs text-muted-foreground truncate">{customerName} · {invoiceNo}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline" size="sm"
            onClick={() => navigate("/consultation-notes")}
            disabled={isPending}
          >
            Batal
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isPending} className="gap-1.5">
            <Save className="w-4 h-4" />
            {isPending ? "Menyimpan..." : isEdit || existingNote ? "Perbarui" : "Simpan"}
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">

        {/* ── Client header card ── */}
        <div className="rounded-2xl overflow-hidden shadow-sm border">
          <div className="bg-gradient-to-r from-primary to-primary/80 px-5 py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-base">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-white text-base leading-tight">{customerName}</p>
                {isNewClient ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">
                    <UserPlus className="w-2.5 h-2.5" /> Klien Baru
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-100 bg-sky-500/30 rounded-full px-2 py-0.5">
                    <Users className="w-2.5 h-2.5" /> Klien Lama
                  </span>
                )}
              </div>
              {phone && <p className="text-white/70 text-xs mt-0.5">{phone}</p>}
            </div>
            {invoiceDate && (
              <div className="text-right shrink-0">
                <p className="text-white/60 text-xs">Tanggal</p>
                <p className="text-white font-semibold text-sm">{formatDate(invoiceDate)}</p>
              </div>
            )}
          </div>
          <div className="bg-background px-5 py-3 flex flex-wrap gap-x-5 gap-y-1.5">
            {invoiceNo !== "—" && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Receipt className="w-3 h-3" />
                <span className="font-mono font-medium text-foreground">{invoiceNo}</span>
              </div>
            )}
            {services && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Scissors className="w-3 h-3" />
                <span className="truncate max-w-[200px]">{services}</span>
              </div>
            )}
            {stylists && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="w-3 h-3" />
                <span>{stylists}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Banner klien lama (jika klien lama) ── */}
        {!isNewClient && (
          <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 flex items-start gap-2">
            <Users className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800">Klien Lama</p>
              <p className="text-xs text-blue-600 mt-0.5">
                Form ringkas — hanya catatan sesi ini yang perlu diisi.
              </p>
            </div>
          </div>
        )}

        {/* ── Section A: Profil Klien (hanya klien baru) ── */}
        {isNewClient && (
          <Section
            icon={<User className="w-4 h-4" />}
            letter="A" title="Profil Klien"
            gradient="bg-gradient-to-r from-blue-600 to-blue-500"
          >
            <Q num={1} label="Apa profesi atau aktivitas utama klien?">
              <Pills
                options={PROFESSION_OPTIONS}
                value={form.profession ?? ""}
                onChange={(v) => set("profession", v)}
              />
              {form.profession === "OTHER" && (
                <TextExtra
                  placeholder="Tulis profesi..."
                  value={form.professionOther ?? ""}
                  onChange={(v) => set("professionOther", v)}
                />
              )}
            </Q>

            <Q num={2} label="Perkiraan usia klien?">
              <Pills
                options={AGE_RANGE_OPTIONS}
                value={form.ageRange ?? ""}
                onChange={(v) => set("ageRange", v)}
              />
            </Q>

            <Q num={3} label="Styling yang sering dipakai sehari-hari?" hint="Bisa pilih lebih dari satu">
              <Pills
                options={DAILY_STYLING_OPTIONS}
                value={form.dailyStyling ?? []}
                onChange={(v) => set("dailyStyling", v)}
                multi
              />
              {(form.dailyStyling ?? []).includes("OTHER") && (
                <TextExtra
                  placeholder="Tulis styling lainnya..."
                  value={form.dailyStylingOther ?? ""}
                  onChange={(v) => set("dailyStylingOther", v)}
                />
              )}
            </Q>
          </Section>
        )}

        {/* ── Section B: Motivasi (hanya klien baru) ── */}
        {isNewClient && (
          <Section
            icon={<Heart className="w-4 h-4" />}
            letter="B" title="Motivasi & Perjalanan Klien"
            gradient="bg-gradient-to-r from-rose-500 to-pink-500"
          >
            <Q num={4} label="Tau Nia Hair dari mana?">
              <Pills
                options={DISCOVERY_OPTIONS}
                value={form.discoveryChannel ?? ""}
                onChange={(v) => set("discoveryChannel", v)}
              />
              {(form.discoveryChannel === "KOL" || form.discoveryChannel === "OTHER") && (
                <TextExtra
                  placeholder={form.discoveryChannel === "KOL" ? "Nama KOL / artis..." : "Tulis sumber..."}
                  value={form.discoveryChannelDetail ?? ""}
                  onChange={(v) => set("discoveryChannelDetail", v)}
                />
              )}
            </Q>

            <Q num={5} label="Kenapa mau extension atau service ini?" hint="Bisa pilih lebih dari satu">
              <Pills
                options={REASON_SERVICE_OPTIONS}
                value={form.reasonForService ?? []}
                onChange={(v) => set("reasonForService", v)}
                multi
              />
              {((form.reasonForService ?? []).includes("ACARA_KHUSUS") || (form.reasonForService ?? []).includes("OTHER")) && (
                <TextExtra
                  placeholder={(form.reasonForService ?? []).includes("ACARA_KHUSUS") ? "Acara apa?" : "Tulis alasan lain..."}
                  value={form.reasonForServiceOther ?? ""}
                  onChange={(v) => set("reasonForServiceOther", v)}
                />
              )}
            </Q>

            <Q num={6} label="Sebelum booking, apa yang bikin ragu?" hint="Bisa pilih lebih dari satu">
              <Pills
                options={HESITATION_OPTIONS}
                value={form.hesitation ?? []}
                onChange={(v) => set("hesitation", v)}
                multi
              />
              {(form.hesitation ?? []).includes("OTHER") && (
                <TextExtra
                  placeholder="Tulis keraguannya..."
                  value={form.hesitationOther ?? ""}
                  onChange={(v) => set("hesitationOther", v)}
                />
              )}
            </Q>

            <Q num={7} label="Pernah pakai extensions di tempat lain sebelumnya?">
              <Pills
                options={PREV_EXP_OPTIONS}
                value={form.previousExpType ?? ""}
                onChange={(v) => set("previousExpType", v)}
              />
              {form.previousExpType === "PERNAH_LAIN" && (
                <TextExtra
                  placeholder="Nama salon / tempat sebelumnya..."
                  value={form.previousSalonName ?? ""}
                  onChange={(v) => set("previousSalonName", v)}
                />
              )}
              {(form.previousExpType === "PERNAH_LAIN" || form.previousExpType === "OTHER") && (
                <div className="space-y-1.5 mt-1">
                  <Label className="text-xs text-muted-foreground">Kenapa pindah ke Nia Hair?</Label>
                  <Textarea
                    placeholder="Kalau tidak ada alasan khusus, ketik 'tidak ada'"
                    value={form.reasonSwitchToNia ?? ""}
                    onChange={(e) => set("reasonSwitchToNia", e.target.value)}
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>
              )}
            </Q>
          </Section>
        )}

        {/* ── Section C: Catatan Sesi (semua klien) ── */}
        <Section
          icon={<Sparkles className="w-4 h-4" />}
          letter={isNewClient ? "C" : ""}
          title="Catatan Sesi Ini"
          gradient="bg-gradient-to-r from-violet-600 to-purple-500"
        >
          <Q num={isNewClient ? 8 : 1} label="Ada kendala selama pemakaian extensions?">
            <div className="flex flex-wrap gap-2 mb-2">
              {["Tidak ada", "Sering nyangkut", "Ada yang lepas", "Gatal"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set("issuesDuringUse", s === "Tidak ada" ? "Tidak ada" : (form.issuesDuringUse ? `${form.issuesDuringUse}, ${s}` : s))}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border/70 bg-muted/40 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all"
                >
                  {s === "Tidak ada" ? "✓ Tidak ada" : `+ ${s}`}
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Atau tulis langsung di sini..."
              value={form.issuesDuringUse ?? ""}
              onChange={(e) => set("issuesDuringUse", e.target.value)}
              rows={2}
              className="text-sm resize-none"
            />
          </Q>

          <Q num={isNewClient ? 9 : 2} label="Ada perubahan kebiasaan atau perasaan setelah pakai extensions?">
            <div className="flex flex-wrap gap-2 mb-2">
              {["Baru pasang", "Tidak ada", "Lebih percaya diri", "Lebih mudah styling"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set("changesAfterUse", s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    form.changesAfterUse === s
                      ? "bg-primary/10 border-primary/60 text-primary"
                      : "border-border/70 bg-muted/40 hover:bg-primary/10 hover:border-primary/50 hover:text-primary"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Atau tulis langsung di sini..."
              value={form.changesAfterUse ?? ""}
              onChange={(e) => set("changesAfterUse", e.target.value)}
              rows={2}
              className="text-sm resize-none"
            />
          </Q>

          <Q
            num={isNewClient ? 10 : 3}
            label="Satu hal menarik yang klien bilang hari ini"
            hint="Cerita, perasaan, reaksi, atau momen berkesan dari sesi ini"
            required
          >
            <Textarea
              id="interesting-note"
              placeholder="Tulis di sini — ini yang paling penting, jangan dikosongkan ya!"
              value={form.interestingNote ?? ""}
              onChange={(e) => { set("interestingNote", e.target.value); if (noteError) setNoteError(false); }}
              rows={4}
              className={`text-sm resize-none transition-colors ${
                noteError
                  ? "border-rose-400 focus-visible:ring-rose-400 bg-rose-50/50"
                  : "border-primary/40"
              }`}
            />
            {noteError && (
              <p className="text-xs text-rose-500 mt-1">Field ini wajib diisi sebelum menyimpan.</p>
            )}
          </Q>

          <Q num={isNewClient ? 11 : 4} label="Catatan tambahan lainnya" hint="Opsional">
            <Textarea
              placeholder="Hal lain yang perlu dicatat..."
              value={form.additionalNotes ?? ""}
              onChange={(e) => set("additionalNotes", e.target.value)}
              rows={2}
              className="text-sm resize-none"
            />
          </Q>
        </Section>

      </div>
    </div>
  );
}
