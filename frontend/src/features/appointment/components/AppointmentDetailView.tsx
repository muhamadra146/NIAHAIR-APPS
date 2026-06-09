import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import { AppointmentStatusBadge } from "./AppointmentStatusBadge";
import type { Appointment } from "../types";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <span className="w-36 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm">{value ?? "—"}</span>
    </div>
  );
}

function DetailsTab({ a }: { a: Appointment }) {
  const startTime = new Date(a.startTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const endTime   = new Date(a.endTime).toLocaleTimeString("id-ID",   { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-3 py-4">
      <InfoRow label="Booking No"      value={<span className="font-mono text-xs">{a.bookingNo}</span>} />
      <InfoRow label="Customer"        value={`${a.customer.name}${a.customer.customerNo ? ` (${a.customer.customerNo})` : ""}`} />
      <InfoRow label="Phone"           value={a.customer.mobilePhone} />
      <InfoRow label="Branch"          value={`${a.branch.name} (${a.branch.code})`} />
      <InfoRow label="Visit Date"      value={formatDate(a.visitDate)} />
      <InfoRow label="Time"            value={`${startTime} – ${endTime}`} />
      <InfoRow label="Estimated Total" value={a.estimatedTotal ? formatCurrency(a.estimatedTotal) : null} />
      <InfoRow label="Notes"           value={a.notes} />
      <InfoRow label="Booked On"       value={formatDate(a.bookingDate)} />
      {a.createdByEmployee && (
        <InfoRow label="Created By" value={`${a.createdByEmployee.name} (${a.createdByEmployee.employeeCode})`} />
      )}
    </div>
  );
}

function ServicesTab({ a }: { a: Appointment }) {
  if (a.services.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No services added.</p>;
  }
  return (
    <div className="divide-y divide-border py-2">
      {a.services.map((s) => (
        <div key={s.id} className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium">{s.serviceItem.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{s.serviceItem.itemCode}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function StaffTab({ a }: { a: Appointment }) {
  if (a.staffs.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No staff assigned.</p>;
  }
  return (
    <div className="divide-y divide-border py-2">
      {a.staffs.map((s) => (
        <div key={s.id} className="py-3">
          <p className="text-sm font-medium">{s.employee.name}</p>
          <p className="text-xs text-muted-foreground">{s.employee.employeeCode}</p>
        </div>
      ))}
    </div>
  );
}

function HistoryTab({ a }: { a: Appointment }) {
  if (a.statusHistories.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No history.</p>;
  }
  return (
    <div className="py-2">
      <ol className="relative border-l border-border ml-3 space-y-4">
        {a.statusHistories.map((h) => (
          <li key={h.id} className="ml-4">
            <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-background bg-muted-foreground" />
            <div className="flex flex-wrap items-center gap-2">
              {h.oldStatus
                ? <><AppointmentStatusBadge status={h.oldStatus} /><span className="text-xs text-muted-foreground">→</span></>
                : null}
              <AppointmentStatusBadge status={h.newStatus} />
            </div>
            {h.notes && <p className="mt-1 text-xs text-muted-foreground">{h.notes}</p>}
            <time className="mt-0.5 block text-xs text-muted-foreground">
              {new Date(h.createdAt).toLocaleString("id-ID")}
            </time>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TreatmentsTab({ a }: { a: Appointment }) {
  if (a.treatmentSessions.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No treatment sessions.</p>;
  }
  return (
    <div className="divide-y divide-border py-2">
      {a.treatmentSessions.map((t) => (
        <div key={t.id} className="py-3 space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant={t.completedAt ? "success" : "warning"}>
              {t.completedAt ? "Completed" : "In Progress"}
            </Badge>
          </div>
          {t.startedAt && (
            <p className="text-xs text-muted-foreground">
              Started: {new Date(t.startedAt).toLocaleString("id-ID")}
            </p>
          )}
          {t.completedAt && (
            <p className="text-xs text-muted-foreground">
              Completed: {new Date(t.completedAt).toLocaleString("id-ID")}
            </p>
          )}
          {t.notes && <p className="text-xs">{t.notes}</p>}
        </div>
      ))}
    </div>
  );
}

export function AppointmentDetailView({ appointment }: { appointment: Appointment }) {
  return (
    <Tabs defaultValue="details">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="services">
          Services{appointment.services.length > 0 && ` (${appointment.services.length})`}
        </TabsTrigger>
        <TabsTrigger value="staff">
          Staff{appointment.staffs.length > 0 && ` (${appointment.staffs.length})`}
        </TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
        <TabsTrigger value="treatments">
          Treatments{appointment.treatmentSessions.length > 0 && ` (${appointment.treatmentSessions.length})`}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="details">   <DetailsTab a={appointment} /></TabsContent>
      <TabsContent value="services">  <ServicesTab a={appointment} /></TabsContent>
      <TabsContent value="staff">     <StaffTab a={appointment} /></TabsContent>
      <TabsContent value="history">   <HistoryTab a={appointment} /></TabsContent>
      <TabsContent value="treatments"><TreatmentsTab a={appointment} /></TabsContent>
    </Tabs>
  );
}
