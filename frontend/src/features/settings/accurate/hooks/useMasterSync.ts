import { useState } from "react";
import { syncMasterEntity } from "../api/masterSync.api";
import type { MasterSyncEntity, SyncState, SyncResult } from "../types";

interface UseSyncMasterResult {
  state:      SyncState;
  result:     SyncResult | null;
  error:      string | null;
  lastSyncAt: string | null;
  sync:       () => Promise<void>;
}

export function useSyncMaster(entity: MasterSyncEntity): UseSyncMasterResult {
  const [state, setState]         = useState<SyncState>("idle");
  const [result, setResult]       = useState<SyncResult | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [lastSyncAt, setLastSync] = useState<string | null>(null);

  async function sync() {
    setState("loading");
    setError(null);
    setResult(null);
    try {
      const res = await syncMasterEntity(entity);
      setResult(res);
      setLastSync(new Date().toLocaleString("id-ID"));
      setState("success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sync failed");
      setState("error");
    }
  }

  return { state, result, error, lastSyncAt, sync };
}
