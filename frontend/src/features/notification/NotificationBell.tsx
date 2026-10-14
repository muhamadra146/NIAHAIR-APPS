import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationSummary, useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "./hooks";
import type { AppNotification } from "./api";

/** "5 menit lalu", "2 jam lalu", "3 hari lalu" */
function timeAgo(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1)  return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.round(hours / 24)} hari lalu`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref             = useRef<HTMLDivElement>(null);
  const navigate        = useNavigate();

  const { data: summary }                 = useNotificationSummary();
  const { data: items = [], isLoading }   = useNotifications(open);
  const markRead                          = useMarkNotificationRead();
  const markAll                           = useMarkAllNotificationsRead();
  const unread                            = summary?.unread ?? 0;

  // Tutup saat klik di luar
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function openItem(n: AppNotification) {
    if (!n.isRead) markRead.mutate(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  return (
    <div ref={ref} className="relative mr-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
        aria-label={unread > 0 ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <span className="text-sm font-semibold">Notifikasi</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Tandai semua dibaca
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat...
              </div>
            )}
            {!isLoading && items.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Belum ada notifikasi.</p>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => openItem(n)}
                className={cn(
                  "flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-50",
                  !n.isRead && "bg-primary/5",
                )}
              >
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.isRead ? "bg-transparent" : "bg-primary")} />
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm leading-snug", !n.isRead && "font-semibold")}>{n.title}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{n.message}</span>
                  <span className="mt-1 block text-[11px] text-slate-400">{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
