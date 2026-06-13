import { AttendanceTab } from "../components/AttendanceTab";

export function TeamPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Attendance</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Manage daily staff attendance
        </p>
      </div>

      <AttendanceTab />
    </div>
  );
}
