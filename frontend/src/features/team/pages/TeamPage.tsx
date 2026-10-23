import { useAuthStore } from "@/stores/authStore";
import { useViewOnly } from "@/hooks/useViewOnly";
import { isDivisionManager } from "@/lib/access";
import { PageContainer } from "@/components/layout/PageContainer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AttendanceTab } from "../components/AttendanceTab";
import { SelfCheckInView } from "../components/SelfCheckInView";

// SUPER_ADMIN & OWNER tidak absen — hanya monitor kehadiran tim.
const TEAM_ONLY_ROLES = ["SUPER_ADMIN", "OWNER"];
// MANAGER, OFFICE, FINANCE: absen sendiri + monitor tim.
// FINANCE read-only di AttendanceTab (via readOnly prop).
const TEAM_AND_SELF_ROLES = ["MANAGER", "OFFICE", "FINANCE"];

export function TeamPage() {
  const user       = useAuthStore((s) => s.user);
  const roleCode   = user?.roleCode ?? "";
  const isViewOnly = useViewOnly();

  if (TEAM_ONLY_ROLES.includes(roleCode)) {
    return (
      <PageContainer title="Kehadiran Tim" subtitle="Monitor kehadiran harian seluruh karyawan">
        <AttendanceTab readOnly={isViewOnly} />
      </PageContainer>
    );
  }

  // Manager divisi role apa pun ikut memantau timnya (EMP-033; data dibatasi backend)
  if (TEAM_AND_SELF_ROLES.includes(roleCode) || isDivisionManager(user)) {
    return (
      <PageContainer title="Absensi"subtitle="Catat kehadiran kamu dan monitor kehadiran tim">
        <Tabs defaultValue="self" className="space-y-4">
          <TabsList>
            <TabsTrigger value="self">Absensi Saya</TabsTrigger>
            <TabsTrigger value="team">Kehadiran Tim</TabsTrigger>
          </TabsList>
          <TabsContent value="self" className="mt-0">
            <SelfCheckInView />
          </TabsContent>
          <TabsContent value="team" className="mt-0">
            <AttendanceTab readOnly={isViewOnly} />
          </TabsContent>
        </Tabs>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Absensi Saya" subtitle="Catat kehadiran dan lihat riwayat absensi kamu">
      <SelfCheckInView />
    </PageContainer>
  );
}
