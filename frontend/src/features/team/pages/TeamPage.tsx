import { useAuthStore } from "@/stores/authStore";
import { AttendanceTab } from "../components/AttendanceTab";
import { SelfCheckInView } from "../components/SelfCheckInView";

const ADMIN_ROLES = ["SUPER_ADMIN", "OWNER", "MANAGER"];

export function TeamPage() {
  const roleCode = useAuthStore((s) => s.user?.roleCode);
  const isAdmin  = ADMIN_ROLES.includes(roleCode ?? "");

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          {isAdmin ? "Attendance" : "Absensi Saya"}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {isAdmin
            ? "Monitor kehadiran harian seluruh karyawan"
            : "Catat kehadiran dan lihat riwayat absensi kamu"}
        </p>
      </div>

      {isAdmin ? <AttendanceTab /> : <SelfCheckInView />}
    </div>
  );
}
