import { useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Badge }  from "@/components/ui/badge";
import { Pagination } from "@/components/common/Pagination";
import { useSchedules, useCreateSchedule, useUpdateSchedule, useDeleteSchedule } from "../hooks";
import { ScheduleForm } from "./ScheduleForm";
import type { EmployeeSchedule } from "../types";
import type { ScheduleFormValues } from "../schemas/schedule.schema";

const SCHEDULE_BADGE: Record<string, "default" | "warning" | "error"> = {
  WORK:  "default",
  OFF:   "warning",
  LEAVE: "error",
};

const SCHEDULE_LABEL: Record<string, string> = {
  WORK:  "Work",
  OFF:   "Day Off",
  LEAVE: "Leave",
};

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function ScheduleTab() {
  const [page,       setPage]       = useState(1);
  const [dateFilter, setDateFilter] = useState("");
  const [formOpen,   setFormOpen]   = useState(false);
  const [editing,    setEditing]    = useState<EmployeeSchedule | null>(null);
  const [formError,  setFormError]  = useState<string | null>(null);

  const { data, isLoading } = useSchedules({
    page, limit: 10,
    ...(dateFilter ? { date: dateFilter } : {}),
  });

  const createMut = useCreateSchedule();
  const updateMut = useUpdateSchedule();
  const deleteMut = useDeleteSchedule();

  const schedules   = data?.data      ?? [];
  const meta        = data?.meta      ?? { total: 0, page: 1, limit: 10, totalPages: 1 };

  function openCreate() {
    setEditing(null);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(s: EmployeeSchedule) {
    setEditing(s);
    setFormError(null);
    setFormOpen(true);
  }

  const handleSubmit = useCallback(async (values: ScheduleFormValues) => {
    setFormError(null);
    try {
      if (editing) {
        await updateMut.mutateAsync({
          id: editing.id,
          input: {
            scheduleType: values.scheduleType,
            startTime:    values.startTime || undefined,
            endTime:      values.endTime   || undefined,
            notes:        values.notes     || undefined,
          },
        });
      } else {
        await createMut.mutateAsync({
          employeeId:   values.employeeId,
          scheduleDate: values.scheduleDate,
          scheduleType: values.scheduleType,
          startTime:    values.startTime || undefined,
          endTime:      values.endTime   || undefined,
          notes:        values.notes     || undefined,
        });
      }
      setFormOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      setFormError(msg);
    }
  }, [editing, createMut, updateMut]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this schedule?")) return;
    await deleteMut.mutateAsync(id);
  }

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-4">
      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
            className="w-auto"
          />
          {dateFilter && (
            <Button variant="ghost" size="sm" onClick={() => { setDateFilter(""); setPage(1); }}>
              Clear
            </Button>
          )}
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Shift
        </Button>
      </div>

      {/* ── Desktop Table ─────────────────────────────────────────── */}
      <div className="hidden md:block rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Employee</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Start</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">End</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Notes</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading…</td>
              </tr>
            ) : schedules.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No schedules found.</td>
              </tr>
            ) : schedules.map((s) => (
              <tr key={s.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <p className="font-medium">{s.employee.name}</p>
                  <p className="text-xs text-muted-foreground">{s.employee.role.name}</p>
                </td>
                <td className="px-4 py-3">{formatDate(s.scheduleDate)}</td>
                <td className="px-4 py-3">
                  <Badge variant={SCHEDULE_BADGE[s.scheduleType] ?? "default"}>
                    {SCHEDULE_LABEL[s.scheduleType] ?? s.scheduleType}
                  </Badge>
                </td>
                <td className="px-4 py-3">{formatTime(s.startTime)}</td>
                <td className="px-4 py-3">{formatTime(s.endTime)}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.notes ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(s.id)}
                      disabled={deleteMut.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile Cards ──────────────────────────────────────────── */}
      <div className="space-y-3 md:hidden">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : schedules.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No schedules found.</p>
        ) : schedules.map((s) => (
          <div key={s.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold truncate">{s.employee.name}</p>
                <p className="text-xs text-muted-foreground">{s.employee.role.name}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(s.id)}
                  disabled={deleteMut.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <span className="text-muted-foreground">{formatDate(s.scheduleDate)}</span>
              <Badge variant={SCHEDULE_BADGE[s.scheduleType] ?? "default"} className="text-xs">
                {SCHEDULE_LABEL[s.scheduleType] ?? s.scheduleType}
              </Badge>
              {s.scheduleType === "WORK" && (
                <span className="text-muted-foreground">
                  {formatTime(s.startTime)} – {formatTime(s.endTime)}
                </span>
              )}
            </div>
            {s.notes && <p className="mt-1 text-xs text-muted-foreground">{s.notes}</p>}
          </div>
        ))}
      </div>

      {/* ── Pagination ────────────────────────────────────────────── */}
      {meta.totalPages > 1 && (
        <Pagination
          page={meta.page}
          limit={meta.limit}
          total={meta.total}
          totalPages={meta.totalPages}
          onPageChange={setPage}
        />
      )}

      <ScheduleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        isPending={isPending}
        defaultValues={editing}
        error={formError}
      />
    </div>
  );
}
