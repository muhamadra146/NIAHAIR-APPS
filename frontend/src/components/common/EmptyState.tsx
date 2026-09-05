import { Inbox } from "lucide-react";

interface EmptyStateProps {
  /** Icon Lucide — default: Inbox */
  icon?:        React.ReactNode;
  /** Teks utama, misal: "Belum ada kasbon" */
  title:        string;
  /** Teks penjelasan opsional */
  description?: string;
  /** Tombol aksi opsional, misal: <Button>Tambah</Button> */
  action?:      React.ReactNode;
}

/**
 * Komponen empty state standar — dipakai di semua halaman list ketika data kosong.
 * Selalu render icon + title. description dan action opsional.
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center px-4">
      <div className="mb-3 rounded-full bg-muted p-3 text-muted-foreground">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
