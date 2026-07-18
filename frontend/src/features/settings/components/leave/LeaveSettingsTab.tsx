import { BookOpen, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeaveTypeTab }  from "../leaveType/LeaveTypeTab";
import { LeaveQuotaTab } from "../leaveQuota/LeaveQuotaTab";

export function LeaveSettingsTab() {
  return (
    <Tabs defaultValue="types" className="space-y-6">
      <TabsList className="h-9">
        <TabsTrigger value="types" className="text-xs gap-1.5">
          <BookOpen className="h-3.5 w-3.5" />
          Tipe Cuti
        </TabsTrigger>
        <TabsTrigger value="quotas" className="text-xs gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          Kuota Cuti
        </TabsTrigger>
      </TabsList>
      <TabsContent value="types" className="mt-0">
        <LeaveTypeTab />
      </TabsContent>
      <TabsContent value="quotas" className="mt-0">
        <LeaveQuotaTab />
      </TabsContent>
    </Tabs>
  );
}
