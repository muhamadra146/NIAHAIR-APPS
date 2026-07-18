import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Pencil, X, Check, AlertCircle, Plus, Trash2, Search, Users } from "lucide-react";
import { fetchAppSetting, updateAppSetting } from "../../api/appSetting.api";
import { useBranches, useUpdateBranch, useEmployees } from "../../hooks";
import type { Branch, Employee } from "../../types";

const EXEMPT_KEY = "attendance_geofence_exempt_employees";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExemptEntry {
  employeeId: string;
  branchId:   string | null; // null = all branches
  // display-only (resolved from data)
  employeeName?: string;
  branchName?:   string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function apiErr(err: unknown): string {
  if (err && typeof err === "object" && "response" in err) {
    const r = (err as { response?: { data?: { message?: string } } }).response;
    if (r?.data?.message) return r.data.message;
  }
  return err instanceof Error ? err.message : "Gagal menyimpan";
}

// ── Geofence per Branch ───────────────────────────────────────────────────────

interface GeofenceRowProps {
  branch: Branch;
}

function GeofenceRow({ branch }: GeofenceRowProps) {
  const [editing, setEditing]     = useState(false);
  const [lat, setLat]             = useState(branch.latitude != null ? String(branch.latitude) : "");
  const [lng, setLng]             = useState(branch.longitude != null ? String(branch.longitude) : "");
  const [radius, setRadius]       = useState(String(branch.radiusMeters ?? 100));
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateMut = useUpdateBranch(branch.id);

  function startEdit() {
    setLat(branch.latitude != null ? String(branch.latitude) : "");
    setLng(branch.longitude != null ? String(branch.longitude) : "");
    setRadius(String(branch.radiusMeters ?? 100));
    setSaveError(null);
    setEditing(true);
  }

  async function handleSave() {
    setSaveError(null);
    const latN = lat ? parseFloat(lat) : NaN;
    const lngN = lng ? parseFloat(lng) : NaN;
    const radN = radius ? parseInt(radius, 10) : NaN;
    try {
      await updateMut.mutateAsync({
        latitude:     isNaN(latN) ? undefined : latN,
        longitude:    isNaN(lngN) ? undefined : lngN,
        radiusMeters: isNaN(radN) ? undefined : radN,
      });
      setEditing(false);
    } catch (err) {
      setSaveError(apiErr(err));
    }
  }

  const hasCoords = branch.latitude != null && branch.longitude != null;

  return (
    <div className="py-3.5 border-b border-slate-100 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${hasCoords ? "bg-emerald-50" : "bg-slate-100"}`}>
            <MapPin className={`h-4 w-4 ${hasCoords ? "text-emerald-600" : "text-slate-400"}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-slate-800">{branch.name}</p>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-500">{branch.code}</span>
              {!hasCoords && !editing && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  Belum dikonfigurasi
                </span>
              )}
            </div>
            {!editing && (
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0">
                <span className="text-xs text-slate-400">
                  Lat: <span className="font-mono text-slate-600">{branch.latitude ?? "—"}</span>
                </span>
                <span className="text-xs text-slate-400">
                  Lng: <span className="font-mono text-slate-600">{branch.longitude ?? "—"}</span>
                </span>
                <span className="text-xs text-slate-400">
                  Radius: <span className="font-medium text-slate-600">{branch.radiusMeters ?? 100}m</span>
                </span>
              </div>
            )}
          </div>
        </div>
        {!editing && (
          <button
            onClick={startEdit}
            className="shrink-0 flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <Pencil className="h-3 w-3" />Edit
          </button>
        )}
      </div>

      {editing && (
        <div className="mt-3 ml-11 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Latitude</Label>
              <Input
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="-6.2234"
                inputMode="decimal"
                className="h-8 text-sm font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Longitude</Label>
              <Input
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="106.8132"
                inputMode="decimal"
                className="h-8 text-sm font-mono"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Radius (meter)</Label>
            <Input
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              placeholder="100"
              inputMode="numeric"
              className="h-8 text-sm w-32"
            />
            <p className="text-[10px] text-slate-400">Karyawan harus absen dalam radius ini dari koordinat cabang</p>
          </div>
          {saveError && (
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {saveError}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={updateMut.isPending} className="h-7 text-xs px-3">
              <Check className="h-3 w-3 mr-1" />
              {updateMut.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={updateMut.isPending} className="h-7 text-xs px-3">
              <X className="h-3 w-3 mr-1" />Batal
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function GeofenceBranchCard() {
  const { data, isLoading } = useBranches({ limit: 100 });
  const branches = (data?.data ?? []).filter((b) => b.isActive);

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50/70 px-5 py-4">
        <MapPin className="h-4 w-4 text-slate-500" />
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Cabang Aktif</h3>
          <p className="text-xs text-slate-400">{branches.length} cabang terdaftar</p>
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-100 px-5">
        {isLoading ? (
          <p className="py-6 text-sm text-slate-400">Memuat cabang...</p>
        ) : branches.length === 0 ? (
          <p className="py-6 text-sm text-slate-400">Tidak ada cabang aktif</p>
        ) : (
          branches.map((branch) => <GeofenceRow key={branch.id} branch={branch} />)
        )}
      </div>
    </div>
  );
}

// ── Employee Exemption Card ───────────────────────────────────────────────────

function useExemptSetting() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["app-setting", EXEMPT_KEY],
    queryFn:  () => fetchAppSetting(EXEMPT_KEY),
  });

  const entries: ExemptEntry[] = (() => {
    try { return data?.value ? JSON.parse(data.value) : []; }
    catch { return []; }
  })();

  async function save(list: ExemptEntry[]) {
    // Persist employeeName alongside so the list can render without extra fetches
    const payload = list.map(({ employeeId, branchId, employeeName }) => ({ employeeId, branchId, employeeName }));
    await updateAppSetting(EXEMPT_KEY, JSON.stringify(payload));
    qc.invalidateQueries({ queryKey: ["app-setting", EXEMPT_KEY] });
  }

  return { entries, isLoading, save };
}

function EmployeeSearchDropdown({
  value,
  onSelect,
  exclude,
}: {
  value: Employee | null;
  onSelect: (emp: Employee | null) => void;
  exclude: string[];
}) {
  const [search, setSearch]   = useState(value?.name ?? "");
  const [open, setOpen]       = useState(false);
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data } = useEmployees({ search: debounced || undefined, limit: 15, isActive: true });
  const results  = (data?.data ?? []).filter((e) => !exclude.includes(e.id));

  function pick(emp: Employee) {
    onSelect(emp);
    setSearch(emp.name);
    setOpen(false);
  }

  function clear() {
    onSelect(null);
    setSearch("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); if (value) onSelect(null); }}
          onFocus={() => setOpen(true)}
          placeholder="Cari karyawan..."
          className="h-9 pl-8 pr-8 text-sm"
        />
        {(search || value) && (
          <button onClick={clear} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
          {results.map((emp) => (
            <button
              key={emp.id}
              onMouseDown={(e) => { e.preventDefault(); pick(emp); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {emp.name[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{emp.name}</p>
                <p className="text-[10px] text-slate-400">{emp.role.name}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && debounced && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg px-3 py-3 text-xs text-slate-400">
          Tidak ditemukan
        </div>
      )}
    </div>
  );
}

function EmployeeExemptionCard() {
  const { entries, isLoading, save } = useExemptSetting();
  const { data: branchData }         = useBranches({ limit: 100 });
  const branches = (branchData?.data ?? []).filter((b) => b.isActive);

  const [filterBranch, setFilterBranch]     = useState<string>("");
  const [showForm, setShowForm]             = useState(false);
  const [selectedEmp, setSelectedEmp]       = useState<Employee | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [saving, setSaving]                 = useState(false);
  const [addError, setAddError]             = useState<string | null>(null);

  function enrichedEntries(): ExemptEntry[] {
    return entries.map((e) => {
      const branch = branches.find((b) => b.id === e.branchId);
      return { ...e, branchName: e.branchId ? (branch?.name ?? e.branchId) : "Semua Cabang" };
    });
  }

  async function handleAdd() {
    if (!selectedEmp) { setAddError("Pilih karyawan terlebih dahulu"); return; }
    const isDupe = entries.some(
      (e) => e.employeeId === selectedEmp.id && e.branchId === (selectedBranch || null)
    );
    if (isDupe) { setAddError("Karyawan ini sudah ada di daftar untuk cabang yang sama"); return; }
    setAddError(null);
    setSaving(true);
    try {
      await save([...entries, {
        employeeId:   selectedEmp.id,
        branchId:     selectedBranch || null,
        employeeName: selectedEmp.name,
      }]);
      setSelectedEmp(null);
      setSelectedBranch("");
      setShowForm(false);
    } catch (err) {
      setAddError(apiErr(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(idx: number) {
    setSaving(true);
    try { await save(entries.filter((_, i) => i !== idx)); }
    finally { setSaving(false); }
  }

  const rich = enrichedEntries();
  const filtered = filterBranch
    ? rich.filter((e) => e.branchId === filterBranch || e.branchId === null)
    : rich;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Users className="h-4 w-4 text-slate-500" />
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Pengecualian Lokasi per Karyawan</h3>
            <p className="text-xs text-slate-400">Karyawan ini boleh absen di luar radius geofence.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {branches.length > 1 && (
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring h-8"
            >
              <option value="">Semua Cabang</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
          {!showForm && (
            <Button size="sm" onClick={() => { setShowForm(true); setAddError(null); }}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Tambah
            </Button>
          )}
        </div>
      </div>

      {/* Add form — collapsible */}
      {showForm && (
        <div className="border-b border-slate-100 bg-slate-50/40 px-5 py-4 space-y-3">
          {addError && (
            <div className="flex items-start gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {addError}
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label className="text-xs font-medium text-slate-600">Karyawan</Label>
              <EmployeeSearchDropdown value={selectedEmp} onSelect={setSelectedEmp} exclude={[]} />
            </div>
            <div className="space-y-1 w-48">
              <Label className="text-xs font-medium text-slate-600">Berlaku di Cabang</Label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring h-9"
              >
                <option value="">Semua Cabang</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={saving || !selectedEmp}>
              {saving ? "Menyimpan..." : <><Check className="h-3.5 w-3.5 mr-1" />Simpan</>}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setAddError(null); setSelectedEmp(null); }}>
              <X className="h-3.5 w-3.5 mr-1" />Batal
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/40">
            <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Karyawan</th>
            <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Cabang</th>
            <th className="px-5 py-2.5 w-10" />
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={3} className="px-5 py-8 text-center text-sm text-slate-400">Memuat...</td>
            </tr>
          ) : filtered.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-5 py-10 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                    <Users className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-400">
                    {filterBranch ? "Tidak ada pengecualian untuk cabang ini" : "Belum ada pengecualian"}
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            filtered.map((entry, idx) => {
              const realIdx = entries.findIndex(
                (e) => e.employeeId === entry.employeeId && e.branchId === entry.branchId
              );
              return (
                <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {(entry.employeeName ?? entry.employeeId)[0]?.toUpperCase() ?? "?"}
                      </div>
                      <span className="font-medium text-slate-800">
                        {entry.employeeName ?? entry.employeeId}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      entry.branchId === null ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"
                    }`}>
                      {entry.branchId === null && <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />}
                      {entry.branchName}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleRemove(realIdx)}
                      disabled={saving}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors ml-auto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export function AttendanceSettingsTab() {
  return (
    <Tabs defaultValue="geofence" className="space-y-6">
      <TabsList className="h-9">
        <TabsTrigger value="geofence" className="text-xs gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          Geofence Cabang
        </TabsTrigger>
        <TabsTrigger value="exemption" className="text-xs gap-1.5">
          <Users className="h-3.5 w-3.5" />
          Pengecualian Karyawan
        </TabsTrigger>
      </TabsList>

      <TabsContent value="geofence" className="mt-0">
        <GeofenceBranchCard />
      </TabsContent>

      <TabsContent value="exemption" className="mt-0">
        <EmployeeExemptionCard />
      </TabsContent>
    </Tabs>
  );
}
