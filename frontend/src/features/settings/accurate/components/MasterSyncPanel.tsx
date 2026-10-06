import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSyncMaster } from "../hooks/useMasterSync";
import type { MasterSyncEntity, SyncResult } from "../types";

interface SyncCardDef {
  entity:      MasterSyncEntity;
  title:       string;
  description: string;
}

const SYNC_CARDS: SyncCardDef[] = [
  {
    entity:      "CUSTOMER",
    title:       "Sync Customer",
    description: "Tarik semua customer aktif dari Accurate Online ke aplikasi.",
  },
  {
    entity:      "ITEM_CATEGORY",
    title:       "Sync Kategori Item",
    description: "Tarik kategori item dari Accurate Online. Jalankan sebelum Sync Item.",
  },
  {
    entity:      "ITEM",
    title:       "Sync Item",
    description: "Sync produk dan jasa dari Accurate Online.",
  },
  {
    entity:      "UNIT",
    title:       "Sync Satuan",
    description: "Sync satuan dari Accurate Online.",
  },
  {
    entity:      "WAREHOUSE",
    title:       "Sync Gudang",
    description: "Tarik daftar gudang dari Accurate Online.",
  },
  {
    entity:      "INVENTORY",
    title:       "Sync Stok",
    description: "Tarik saldo stok terkini dari Accurate Online.",
  },
];

function formatResult(result: SyncResult) {
  return Object.entries(result)
    .filter(([, v]) => typeof v === "number")
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
}

function SyncCard({ entity, title, description }: SyncCardDef) {
  const { state, result, error, lastSyncAt, sync } = useSyncMaster(entity);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {state === "success" && (
            <Badge variant="success" className="shrink-0">Berhasil</Badge>
          )}
          {state === "error" && (
            <Badge variant="error" className="shrink-0">Gagal</Badge>
          )}
        </div>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-between gap-3">
        <div className="min-h-[36px] space-y-1">
          {lastSyncAt && (
            <p className="text-xs text-muted-foreground">
              Last sync: <span className="font-medium text-foreground">{lastSyncAt}</span>
            </p>
          )}
          {state === "success" && result && (
            <p className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="h-3 w-3 shrink-0" />
              {formatResult(result)}
            </p>
          )}
          {state === "error" && error && (
            <p className="flex items-start gap-1 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <Button
          size="sm"
          variant={state === "error" ? "destructive" : "outline"}
          className="w-full"
          onClick={sync}
          disabled={state === "loading"}
        >
          <RefreshCw
            className={`mr-2 h-3.5 w-3.5 ${state === "loading" ? "animate-spin" : ""}`}
          />
          {state === "loading" ? "Menyinkronkan…"
            : state === "error"   ? "Coba Lagi"
            : "Sync Sekarang"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function MasterSyncPanel() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Sync Master</h2>
        <p className="text-sm text-muted-foreground">
          Tarik data dari Accurate Online ke aplikasi secara manual.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SYNC_CARDS.map((card) => (
          <SyncCard key={card.entity} {...card} />
        ))}
      </div>
    </div>
  );
}
