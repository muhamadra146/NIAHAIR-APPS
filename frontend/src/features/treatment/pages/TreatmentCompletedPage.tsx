import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Calendar, Eye } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useTreatments } from "../hooks";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function durationLabel(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt || !completedAt) return "—";
  const mins = Math.round(
    (new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 60000,
  );
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}j ${mins % 60}m`;
}

export function TreatmentCompletedPage() {
  const { branchId } = useAuthStore();
  const [search,    setSearch]    = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate,   setEndDate]   = useState(todayISO());
  const [page,      setPage]      = useState(1);
  const limit = 30;

  const { data, isLoading } = useTreatments({
    branchId:  branchId || undefined,
    startDate: startDate || undefined,
    endDate:   endDate   || undefined,
    page,
    limit,
  });

  const allSessions = data?.data ?? [];
  const meta        = data?.meta;

  const completedSessions = allSessions
    .filter((s) => !!s.completedAt)
    .filter((s) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        s.customer?.name?.toLowerCase().includes(q) ||
        s.appointment?.bookingNo?.toLowerCase().includes(q) ||
        s.branch?.name?.toLowerCase().includes(q)
      );
    });

  const totalPages = meta ? Math.ceil(meta.total / limit) : 1;

  return (
    <PageContainer>
      <div className="space-y-4">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Link to="/treatments" className="text-sm text-muted-foreground hover:text-foreground">
                Treatment
              </Link>
              <span className="text-muted-foreground">/</span>
              <h1 className="text-xl font-bold tracking-tight">Selesai</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Memuat…" : `${completedSessions.length} treatment selesai`}
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3 pt-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari customer / no. booking…"
                  className="pl-8"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Dari</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="h-9 w-36"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Sampai</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="h-9 w-36"
                />
              </div>
              {(startDate !== todayISO() || endDate !== todayISO()) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => { setStartDate(todayISO()); setEndDate(todayISO()); setPage(1); }}
                >
                  Reset
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : completedSessions.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Tidak ada treatment selesai untuk filter ini.
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="divide-y divide-border md:hidden">
                  {completedSessions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.customer?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.appointment?.bookingNo
                            ? `#${s.appointment.bookingNo} · `
                            : ""}
                          {s.branch?.name ?? ""}
                          {s.completedAt
                            ? ` · ${new Date(s.completedAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}`
                            : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Durasi: {durationLabel(s.startedAt, s.completedAt)}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="h-7 px-2 text-xs shrink-0" asChild>
                        <Link to={`/treatments/${s.id}`}>
                          <Eye className="mr-1 h-3 w-3" />
                          Detail
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Booking</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cabang</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Mulai</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Selesai</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Durasi</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedSessions.map((s) => (
                        <tr
                          key={s.id}
                          className="border-b border-border transition-colors hover:bg-muted/30"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium">{s.customer?.name ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">
                              {s.customer?.mobilePhone ?? ""}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {s.appointment?.bookingNo ? `#${s.appointment.bookingNo}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {s.branch?.name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {s.startedAt
                              ? new Date(s.startedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {s.completedAt
                              ? new Date(s.completedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={cn("text-xs")}>
                              {durationLabel(s.startedAt, s.completedAt)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Button variant="ghost" size="icon" asChild>
                              <Link to={`/treatments/${s.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Halaman {page} dari {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        )}

      </div>
    </PageContainer>
  );
}
