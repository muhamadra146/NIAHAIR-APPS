import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/common/Pagination";
import { useSyncQueues, useRetrySyncQueue } from "../hooks/useSyncQueue";
import type { SyncQueue, SyncStatus } from "../types";

// ── Status badge ──────────────────────────────────────────────────────────
type BadgeVariant = "success" | "error" | "warning" | "default" | "secondary";

function statusVariant(status: SyncStatus): BadgeVariant {
  switch (status) {
    case "SUCCESS":    return "success";
    case "FAILED":     return "error";
    case "PENDING":    return "warning";
    case "PROCESSING": return "default";
  }
}

function SyncStatusBadge({ status }: { status: SyncStatus }) {
  return <Badge variant={statusVariant(status)}>{status}</Badge>;
}

// ── Helpers ───────────────────────────────────────────────────────────────
function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function shortDirection(dir: string) {
  return dir === "APP_TO_ACCURATE" ? "→ Accurate" : "← App";
}

// ── Filter tabs ───────────────────────────────────────────────────────────
const STATUS_FILTERS = ["ALL", "PENDING", "PROCESSING", "SUCCESS", "FAILED"] as const;
type FilterStatus = typeof STATUS_FILTERS[number];

// ── Loading state ─────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-14 text-center text-sm text-muted-foreground">
      No sync jobs found.
    </div>
  );
}

// ── Mobile card ───────────────────────────────────────────────────────────
function MobileCardList({ items, retryId, onRetry }: {
  items:   SyncQueue[];
  retryId: string | null;
  onRetry: (id: string) => void;
}) {
  return (
    <div className="divide-y divide-border md:hidden">
      {items.map((item) => (
        <div key={item.id} className="px-4 py-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-semibold">{item.entityType}</span>
                <Badge variant="outline" className="text-xs">{shortDirection(item.direction)}</Badge>
              </div>
              {item.entityId && (
                <p className="font-mono text-xs text-muted-foreground">{item.entityId}</p>
              )}
            </div>
            <SyncStatusBadge status={item.status} />
          </div>

          {item.errorMessage && (
            <p className="rounded bg-destructive/10 px-2 py-1 text-xs text-destructive line-clamp-2">
              {item.errorMessage}
            </p>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
            {item.status === "FAILED" && (
              <Button
                variant="outline" size="sm"
                disabled={retryId === item.id}
                onClick={() => onRetry(item.id)}
                className="h-7 text-xs"
              >
                <RefreshCw className={`mr-1 h-3 w-3 ${retryId === item.id ? "animate-spin" : ""}`} />
                Retry
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Desktop table ─────────────────────────────────────────────────────────
function DesktopTable({ items, retryId, onRetry }: {
  items:   SyncQueue[];
  retryId: string | null;
  onRetry: (id: string) => void;
}) {
  return (
    <div className="hidden md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Entity</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Entity ID</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Direction</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Error</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created At</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-border transition-colors hover:bg-muted/30">
              <td className="px-4 py-3 font-medium">{item.entityType}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-[120px] truncate">
                {item.entityId ?? "—"}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                {shortDirection(item.direction)}
              </td>
              <td className="px-4 py-3">
                <SyncStatusBadge status={item.status} />
              </td>
              <td className="px-4 py-3 max-w-[220px]">
                {item.errorMessage
                  ? <span className="text-xs text-destructive line-clamp-2">{item.errorMessage}</span>
                  : <span className="text-muted-foreground">—</span>
                }
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(item.createdAt)}
              </td>
              <td className="px-4 py-3">
                {item.status === "FAILED" && (
                  <Button
                    variant="outline" size="sm"
                    disabled={retryId === item.id}
                    onClick={() => onRetry(item.id)}
                    className="h-7 text-xs"
                  >
                    <RefreshCw className={`mr-1 h-3 w-3 ${retryId === item.id ? "animate-spin" : ""}`} />
                    Retry
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────
export function SyncQueuePanel() {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");
  const [page, setPage]                 = useState(1);
  const [retryId, setRetryId]           = useState<string | null>(null);

  const params: { page: number; limit: number; status?: string } = {
    page,
    limit: 20,
    ...(statusFilter !== "ALL" && { status: statusFilter }),
  };

  const { data, isLoading } = useSyncQueues(params);
  const retryMut            = useRetrySyncQueue();

  const items = data?.data ?? [];
  const meta  = data?.meta;

  async function handleRetry(id: string) {
    setRetryId(id);
    try {
      await retryMut.mutateAsync(id);
    } finally {
      setRetryId(null);
    }
  }

  function handleFilterChange(f: FilterStatus) {
    setStatusFilter(f);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Sync Queue</h2>
        <p className="text-sm text-muted-foreground">
          {meta ? `${meta.total} total jobs` : "Background sync jobs and their status"}
        </p>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === f
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingState />
          ) : items.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <MobileCardList items={items} retryId={retryId} onRetry={handleRetry} />
              <DesktopTable   items={items} retryId={retryId} onRetry={handleRetry} />
            </>
          )}
        </CardContent>
      </Card>

      {meta && (
        <Pagination
          page={meta.page}
          limit={meta.limit}
          total={meta.total}
          totalPages={meta.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
