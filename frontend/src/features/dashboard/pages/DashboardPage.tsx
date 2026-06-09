import { useAuthStore } from "@/stores/authStore";

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Selamat datang, {user?.name}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Dashboard modules coming soon.
        </p>
      </div>
    </div>
  );
}
