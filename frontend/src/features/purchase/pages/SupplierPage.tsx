import { useState } from "react";
import { Truck, Search, RefreshCw, Loader2, Phone, Mail, MapPin, Globe, MessageCircle } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSuppliers, useSyncSuppliers } from "../hooks";
import type { Supplier } from "../types";

export function SupplierPage() {
  const roleCode = useAuthStore((s) => s.user?.roleCode);
  // B3 fix: OWNER punya akses yang sama dengan SUPER_ADMIN
  const isSuperAdmin = roleCode === "SUPER_ADMIN" || roleCode === "OWNER";

  const [search, setSearch] = useState("");
  const { data: all = [], isLoading, isError, refetch } = useSuppliers();
  const syncMut = useSyncSuppliers();

  const filtered = all.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.code?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.phone?.includes(q)
    );
  });

  const handleSync = async () => {
    try {
      await syncMut.mutateAsync();
    } catch {
      // toast already shown by hook
    }
  };

  return (
    <PageContainer
      title="Supplier"
      subtitle="Daftar supplier yang tersinkronisasi dari Accurate"
    >
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama, kode, email, telepon..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {isSuperAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleSync}
              disabled={syncMut.isPending}
            >
              {syncMut.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <RefreshCw className="h-4 w-4" />}
              Sync Accurate
            </Button>
          )}
        </div>

        {/* Stats */}
        {/* B4 fix: hapus teks noisy "hanya SUPER_ADMIN yang bisa sync" */}
        {!isLoading && !isError && (
          <p className="text-sm text-muted-foreground">
            Menampilkan <strong>{filtered.length}</strong> dari <strong>{all.length}</strong> supplier
          </p>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-6 text-center">
            <p className="text-sm font-medium text-destructive">Gagal memuat data supplier</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" /> Coba lagi
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-2 text-muted-foreground">
            <Truck className="h-10 w-10 opacity-20" />
            <p className="text-sm">
              {search ? "Tidak ada supplier yang cocok dengan pencarian" : "Belum ada supplier. Klik Sync Accurate untuk memuat data."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <Card className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Supplier</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kontak</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Term Bayar</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Diskon</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Terakhir Sync</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((s) => (
                      <SupplierRow key={s.id} supplier={s} />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Mobile cards */}
            <div className="grid gap-3 md:hidden">
              {filtered.map((s) => (
                <SupplierCard key={s.id} supplier={s} />
              ))}
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

// Format nomor WA: hilangkan karakter non-digit, ganti 0 prefix → 62
function formatWaNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return "62" + digits;
}

function SupplierRow({ supplier: s }: { supplier: Supplier }) {
  const hasContact = s.phone || s.businessPhone || s.whatsapp || s.email || s.address || s.website;
  return (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3">
        <p className="font-semibold">{s.name}</p>
        {s.code && <p className="text-xs text-muted-foreground font-mono">{s.code}</p>}
        {s.accurateVendorId && (
          <p className="text-xs text-blue-600">Accurate #{s.accurateVendorId}</p>
        )}
      </td>
      <td className="px-4 py-3 space-y-0.5">
        {s.phone && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="h-3 w-3 shrink-0" />
            <a href={`tel:${s.phone}`} className="hover:underline">{s.phone}</a>
          </div>
        )}
        {s.businessPhone && s.businessPhone !== s.phone && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="h-3 w-3 shrink-0 opacity-50" />
            <a href={`tel:${s.businessPhone}`} className="hover:underline">{s.businessPhone}</a>
          </div>
        )}
        {s.whatsapp && (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <MessageCircle className="h-3 w-3 shrink-0" />
            <a href={`https://wa.me/${formatWaNumber(s.whatsapp)}`} target="_blank" rel="noreferrer"
              className="hover:underline font-medium">WA {s.whatsapp}</a>
          </div>
        )}
        {s.email && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Mail className="h-3 w-3 shrink-0" />
            <a href={`mailto:${s.email}`} className="hover:underline truncate max-w-[180px]">{s.email}</a>
          </div>
        )}
        {s.website && (
          <div className="flex items-center gap-1 text-xs text-blue-600">
            <Globe className="h-3 w-3 shrink-0" />
            <a href={s.website.startsWith("http") ? s.website : `https://${s.website}`}
              target="_blank" rel="noreferrer" className="hover:underline truncate max-w-[180px]">
              {s.website}
            </a>
          </div>
        )}
        {s.address && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
            <span className="truncate max-w-[200px]">{s.address}</span>
          </div>
        )}
        {!hasContact && <span className="text-xs text-muted-foreground/50">—</span>}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{s.paymentTerms ?? "—"}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {s.purchaseDiscount != null && Number(s.purchaseDiscount) > 0
          ? <span className="font-mono">{Number(s.purchaseDiscount).toFixed(2)}%</span>
          : "—"}
      </td>
      <td className="px-4 py-3">
        <Badge variant={s.isActive ? "default" : "secondary"}>
          {s.isActive ? "Aktif" : "Non-aktif"}
        </Badge>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {s.lastSyncAt
          ? new Date(s.lastSyncAt).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
          : "—"}
      </td>
    </tr>
  );
}

// ── Mobile Card ───────────────────────────────────────────────────────────────

function SupplierCard({ supplier: s }: { supplier: Supplier }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="font-semibold">{s.name}</p>
            {s.code && <p className="text-xs text-muted-foreground font-mono">{s.code}</p>}
          </div>
          <Badge variant={s.isActive ? "default" : "secondary"} className="shrink-0">
            {s.isActive ? "Aktif" : "Non-aktif"}
          </Badge>
        </div>
        <div className="space-y-1">
          {s.phone && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              <a href={`tel:${s.phone}`} className="hover:underline">{s.phone}</a>
            </div>
          )}
          {s.whatsapp && (
            <div className="flex items-center gap-1.5 text-xs text-green-600">
              <MessageCircle className="h-3 w-3" />
              <a href={`https://wa.me/${formatWaNumber(s.whatsapp)}`} target="_blank" rel="noreferrer"
                className="hover:underline font-medium">WA {s.whatsapp}</a>
            </div>
          )}
          {s.email && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              <a href={`mailto:${s.email}`} className="hover:underline">{s.email}</a>
            </div>
          )}
          {s.website && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600">
              <Globe className="h-3 w-3" />
              <a href={s.website.startsWith("http") ? s.website : `https://${s.website}`}
                target="_blank" rel="noreferrer" className="hover:underline">{s.website}</a>
            </div>
          )}
          {s.paymentTerms && (
            <p className="text-xs text-muted-foreground">Term: {s.paymentTerms}</p>
          )}
          {s.purchaseDiscount != null && Number(s.purchaseDiscount) > 0 && (
            <p className="text-xs text-muted-foreground">
              Diskon: <span className="font-mono">{Number(s.purchaseDiscount).toFixed(2)}%</span>
            </p>
          )}
          {s.lastSyncAt && (
            <p className="text-xs text-muted-foreground">
              Sync: {new Date(s.lastSyncAt).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
