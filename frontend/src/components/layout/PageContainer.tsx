import { cn } from "@/lib/utils";

interface PageContainerProps {
  children:   React.ReactNode;
  className?: string;
  /** Judul halaman — ditampilkan sebagai h1 */
  title?:     string;
  /** Subtitle di bawah title — bisa string atau node (misal: total count) */
  subtitle?:  React.ReactNode;
  /** Tombol aksi utama di kanan header (misal: tombol Tambah) */
  action?:    React.ReactNode;
}

export function PageContainer({
  children,
  className,
  title,
  subtitle,
  action,
}: PageContainerProps) {
  return (
    <div className={cn("mx-auto w-full max-w-screen-xl px-5 py-6 sm:px-8 sm:py-8", className)}>
      <div className="animate-fade-up delay-0 space-y-5 sm:space-y-6">
        {/* Page header — hanya render jika title ada */}
        {title && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
              {subtitle && (
                <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
