import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { cn }     from "@/lib/utils";
import { scheduleSchema, type ScheduleFormValues } from "../schemas/schedule.schema";
import { fetchEmployees } from "@/features/settings/api/employee.api";
import type { Employee } from "@/features/settings/types";
import type { EmployeeSchedule } from "../types";

interface Props {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  onSubmit:      (values: ScheduleFormValues) => void;
  isPending:     boolean;
  defaultValues?: EmployeeSchedule | null;
  error?:        string | null;
}

const SCHEDULE_TYPES = [
  { value: "WORK",  label: "Work"  },
  { value: "OFF",   label: "Day Off" },
  { value: "LEAVE", label: "Leave"  },
] as const;

export function ScheduleForm({
  open, onOpenChange, onSubmit, isPending, defaultValues, error,
}: Props) {
  const isEdit = Boolean(defaultValues);

  const [empSearch,   setEmpSearch]   = useState("");
  const [empResults,  setEmpResults]  = useState<Employee[]>([]);
  const [empSelected, setEmpSelected] = useState<Employee | null>(null);
  const [empDropOpen, setEmpDropOpen] = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } =
    useForm<ScheduleFormValues>({
      resolver: zodResolver(scheduleSchema),
      defaultValues: {
        employeeId:   defaultValues?.employeeId   ?? "",
        scheduleDate: defaultValues?.scheduleDate?.split("T")[0] ?? "",
        scheduleType: defaultValues?.scheduleType ?? "WORK",
        startTime:    defaultValues?.startTime    ? new Date(defaultValues.startTime).toISOString().substring(11, 16) : "",
        endTime:      defaultValues?.endTime      ? new Date(defaultValues.endTime).toISOString().substring(11, 16)   : "",
        notes:        defaultValues?.notes        ?? "",
      },
    });

  const scheduleType = watch("scheduleType");

  useEffect(() => {
    if (open) {
      if (isEdit && defaultValues) {
        setEmpSearch(defaultValues.employee?.name ?? "");
        setEmpSelected(null);
        reset({
          employeeId:   defaultValues.employeeId,
          scheduleDate: defaultValues.scheduleDate.split("T")[0],
          scheduleType: defaultValues.scheduleType,
          startTime:    defaultValues.startTime ? new Date(defaultValues.startTime).toISOString().substring(11, 16) : "",
          endTime:      defaultValues.endTime   ? new Date(defaultValues.endTime).toISOString().substring(11, 16)   : "",
          notes:        defaultValues.notes ?? "",
        });
      } else {
        setEmpSearch(""); setEmpSelected(null); setEmpResults([]);
        reset({ employeeId: "", scheduleDate: "", scheduleType: "WORK", startTime: "", endTime: "", notes: "" });
      }
    }
  }, [open, isEdit, defaultValues, reset]);

  function handleEmpSearch(value: string) {
    setEmpSearch(value);
    setEmpDropOpen(true);
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(async () => {
      if (!value.trim()) { setEmpResults([]); return; }
      const result = await fetchEmployees({ search: value, limit: 20 });
      setEmpResults(result.data ?? []);
    }, 300);
  }

  function selectEmployee(emp: Employee) {
    setEmpSelected(emp);
    setEmpSearch(emp.name);
    setEmpDropOpen(false);
    setValue("employeeId", emp.id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col gap-0 p-0",
          "top-0 translate-y-0 rounded-none h-[100dvh] max-w-full",
          "sm:top-[50%] sm:translate-y-[-50%] sm:rounded-lg sm:h-auto sm:max-w-md sm:max-h-[90dvh]",
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <DialogTitle>{isEdit ? "Edit Schedule" : "Add Shift"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
            )}

            {/* Employee — create mode */}
            {!isEdit && (
              <div className="relative space-y-1.5">
                <Label>Employee <span className="text-destructive">*</span></Label>
                <Input
                  value={empSearch}
                  onChange={(e) => handleEmpSearch(e.target.value)}
                  onFocus={() => empSearch && setEmpDropOpen(true)}
                  placeholder="Search employee…"
                  autoComplete="off"
                />
                {empDropOpen && empSearch.trim() && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-md max-h-48 overflow-y-auto">
                    {empResults.length > 0 ? (
                      empResults.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50"
                          onClick={() => selectEmployee(emp)}
                        >
                          <span className="font-medium">{emp.name}</span>
                          {emp.employeeCode && (
                            <span className="ml-2 text-xs text-muted-foreground">{emp.employeeCode}</span>
                          )}
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-sm text-muted-foreground">No employees found.</p>
                    )}
                  </div>
                )}
                <input type="hidden" {...register("employeeId")} />
                {errors.employeeId && (
                  <p className="text-xs text-destructive">{errors.employeeId.message}</p>
                )}
                {empSelected && (
                  <p className="text-xs text-muted-foreground">Selected: {empSelected.name}</p>
                )}
              </div>
            )}

            {/* Edit mode — show employee name read-only */}
            {isEdit && (
              <div className="space-y-1.5">
                <Label>Employee</Label>
                <Input value={defaultValues?.employee?.name ?? ""} readOnly disabled className="bg-muted" />
              </div>
            )}

            {/* Date */}
            <div className="space-y-1.5">
              <Label>Date <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                {...register("scheduleDate")}
                readOnly={isEdit}
                disabled={isEdit}
                className={isEdit ? "bg-muted" : ""}
              />
              {errors.scheduleDate && (
                <p className="text-xs text-destructive">{errors.scheduleDate.message}</p>
              )}
            </div>

            {/* Schedule Type */}
            <div className="space-y-1.5">
              <Label>Type <span className="text-destructive">*</span></Label>
              <select
                {...register("scheduleType")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {SCHEDULE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Start / End time — only shown for WORK */}
            {scheduleType === "WORK" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Start Time</Label>
                  <Input type="time" {...register("startTime")} />
                </div>
                <div className="space-y-1.5">
                  <Label>End Time</Label>
                  <Input type="time" {...register("endTime")} />
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input {...register("notes")} placeholder="Optional notes" />
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-border px-4 py-4 sm:px-6">
            <Button type="button" variant="outline" className="flex-1 sm:flex-none"
              onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
