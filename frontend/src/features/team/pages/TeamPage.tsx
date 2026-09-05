import { useAuthStore } from "@/stores/authStore";
import { useViewOnly } from "@/hooks/useViewOnly";
import { PageContainer } from "@/components/layout/PageContainer";
import { AttendanceTab } from "../components/AttendanceTab";
import { SelfCheckInView } from "../components/SelfCheckInView";

// OFFICE dan FINANCE juga lihat AttendanceTab (bukan SelfCheckIn).
// FINANCE akan read-only di AttendanceTab (via readOnly prop).
const ADMIN_ROLES = ["SUPER_ADMIN", "OWNER", "MANAGER", "OFFICE", "FINANCE"];

export function TeamPage() {
  const roleCode   = useAuthStore((s) => s.user?.roleCode);
  const isViewOnly = useViewOnly();
  const isAdmin    = ADMIN_ROLES.includes(roleCode ?? "");

  return (
    <PageContainer
      title={isAdmin ? "Kehadiran Tim" : "Absensi Saya"}
      subtitle={isAdmin ? "Monitor kehadiran harian seluruh karyawan" : "Catat kehadiran dan lihat riwayat absensi kamu"}
    >
      {isAdmin ? <AttendanceTab readOnly={isViewOnly} /> : <SelfCheckInView />}
    </PageContainer>
  );
}
