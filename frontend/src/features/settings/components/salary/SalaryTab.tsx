import { useState } from "react";
import { Plus, ChevronLeft } from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useEmployees, useSalarySettings, useCreateSalarySetting, useUpdateSalarySetting } from "../../hooks";
import { SalaryForm }        from "./SalaryForm";
import { SalaryHistoryTable } from "./SalaryHistoryTable";
import { toast } from "@/lib/toast";
import type { SalarySetting, Employee } from "../../types";
import type { SalaryFormValues } from "./SalaryForm";

export function SalaryTab() {
  const [search,           setSearch]          = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [dialogOpen,       setDialogOpen]       = useState(false);
  const [editing,          setEditing]          = useState<SalarySetting | null>(null);

  const { data: employeesData } = useEmployees({ isActive: true, limit: 200 });
  const employees = employeesData?.data ?? [];

  const filtered = employees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.employeeCode ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const { data: settings = [], isLoading } = useSalarySettings(selectedEmployee?.id ?? "");
  const createMut  = useCreateSalarySetting();
  const updateMut  = useUpdateSalarySetting(editing?.id ?? "", selectedEmployee?.id ?? "");

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit   = (s: SalarySetting) => { setEditing(s); setDialogOpen(true); };

  const handleSubmit = async (values: SalaryFormValues) => {
    if (!selectedEmployee) return;
    try {
      if (editing) {
        await updateMut.mutateAsync(values);
        toast.success("Setting gaji diperbarui");
      } else {
        await createMut.mutateAsync({ ...values, employeeId: selectedEmployee.id });
        toast.success("Setting gaji disimpan");
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Gagal menyimpan");
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  // ── Employee list view ────────────────────────────────────────────────
  if (!selectedEmployee) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Setting Gaji Karyawan</h3>
            <p className="text-xs text-muted-foreground">Pilih karyawan untuk lihat atau atur komponen gaji</p>
          </div>
        </div>

        <Input
          placeholder="Cari nama atau kode karyawan…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((emp) => (
            <button
              key={emp.id}
              type="button"
              onClick={() => setSelectedEmployee(emp)}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm transition-shadow hover:shadow-md hover:border-primary/30"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {emp.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{emp.name}</p>
                <p className="text-xs text-muted-foreground">{emp.role.name}</p>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground py-6 text-center">
              Tidak ada karyawan ditemukan
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Detail view (selected employee) ──────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedEmployee(null)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h3 className="text-sm font-semibold">{selectedEmployee.name}</h3>
            <p className="text-xs text-muted-foreground">{selectedEmployee.role.name} · {selectedEmployee.employeeCode}</p>
          </div>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Tambah Setting
        </Button>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Memuat…</div>
      ) : (
        <SalaryHistoryTable settings={settings} onEdit={openEdit} />
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) setDialogOpen(false); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Setting Gaji" : "Tambah Setting Gaji"}</DialogTitle>
          </DialogHeader>
          <SalaryForm
            employee={selectedEmployee}
            editing={editing}
            isPending={isPending}
            onSubmit={handleSubmit}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
