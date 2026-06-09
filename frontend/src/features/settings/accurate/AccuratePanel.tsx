import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MasterSyncPanel } from "./components/MasterSyncPanel";
import { SyncQueuePanel }  from "./components/SyncQueuePanel";

export function AccuratePanel() {
  return (
    <Tabs defaultValue="master-sync">
      <TabsList>
        <TabsTrigger value="master-sync">Master Sync</TabsTrigger>
        <TabsTrigger value="sync-queue">Sync Queue</TabsTrigger>
      </TabsList>

      <TabsContent value="master-sync" className="mt-6">
        <MasterSyncPanel />
      </TabsContent>
      <TabsContent value="sync-queue" className="mt-6">
        <SyncQueuePanel />
      </TabsContent>
    </Tabs>
  );
}
