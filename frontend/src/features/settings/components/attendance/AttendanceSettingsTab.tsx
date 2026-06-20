import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { fetchAppSetting, updateAppSetting } from "../../api/appSetting.api";
import { fetchEmployeeRoles } from "../../api/employeeRole.api";

const EXEMPT_KEY = "attendance_geofence_exempt_roles";

export function AttendanceSettingsTab() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[] | null>(null);

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ["employee-roles", { limit: 100 }],
    queryFn: () => fetchEmployeeRoles({ limit: 100 }),
  });
  const roles = rolesData?.data ?? [];

  const { data: settingData, isLoading: settingLoading } = useQuery({
    queryKey: ["app-setting", EXEMPT_KEY],
    queryFn: () => fetchAppSetting(EXEMPT_KEY),
  });

  const currentExempt: string[] = (() => {
    try { return settingData?.value ? JSON.parse(settingData.value) : []; }
    catch { return []; }
  })();

  const exemptCodes = selected ?? currentExempt;

  const toggle = (code: string) => {
    const base = selected ?? currentExempt;
    setSelected(base.includes(code) ? base.filter((c) => c !== code) : [...base, code]);
  };

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      await updateAppSetting(EXEMPT_KEY, JSON.stringify(exemptCodes));
      qc.invalidateQueries({ queryKey: ["app-setting", EXEMPT_KEY] });
      setSelected(null);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  const isLoading = rolesLoading || settingLoading;

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-base font-semibold">Pengaturan Absensi</h2>
        <p className="text-sm text-muted-foreground">Konfigurasi geofencing untuk check-in karyawan</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Tim yang Boleh Absen di Luar Radius</CardTitle>
          <p className="text-xs text-muted-foreground">
            Aktifkan jabatan yang diizinkan check-in meski berada di luar radius cabang
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : roles.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada jabatan</p>
          ) : (
            roles.map((role) => (
              <div key={role.id} className="flex items-center justify-between gap-3">
                <Label htmlFor={`role-${role.code}`} className="cursor-pointer font-normal leading-tight">
                  {role.name}
                  <span className="ml-1.5 text-xs text-muted-foreground">({role.code})</span>
                </Label>
                <Switch
                  id={`role-${role.code}`}
                  checked={exemptCodes.includes(role.code)}
                  onCheckedChange={() => toggle(role.code)}
                />
              </div>
            ))
          )}

          {saveError && (
            <p className="text-xs text-destructive">{saveError}</p>
          )}

          <div className="pt-1">
            <Button size="sm" onClick={handleSave} disabled={saving || isLoading}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
