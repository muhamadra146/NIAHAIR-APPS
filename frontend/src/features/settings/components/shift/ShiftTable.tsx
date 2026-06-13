import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import type { ShiftMaster } from "../../types";

interface Props {
  shifts:    ShiftMaster[];
  isLoading: boolean;
  onEdit:    (shift: ShiftMaster) => void;
}

function ColorSwatch({ color }: { color: string | null }) {
  if (!color) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span
      className="inline-block h-4 w-4 rounded-full border border-border"
      style={{ backgroundColor: color }}
    />
  );
}

export function ShiftTable({ shifts, isLoading, onEdit }: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (shifts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm font-medium text-muted-foreground">Belum ada shift</p>
        <p className="mt-1 text-xs text-muted-foreground">Buat shift baru dengan tombol di atas.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead>
            <tr className="bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kode</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nama</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Jam Kerja</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Warna</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipe</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pemakaian</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shifts.map((shift) => (
              <tr key={shift.id} className="hover:bg-muted/10 transition-colors">
                <td className="px-4 py-3 font-mono font-semibold text-xs">{shift.code}</td>
                <td className="px-4 py-3 font-medium">{shift.name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {shift.startTime && shift.endTime
                    ? `${shift.startTime} – ${shift.endTime}`
                    : "—"}
                </td>
                <td className="px-4 py-3"><ColorSwatch color={shift.color} /></td>
                <td className="px-4 py-3">
                  {shift.isWorking
                    ? <Badge variant="default" className="text-xs">Kerja</Badge>
                    : <Badge variant="secondary" className="text-xs">Libur</Badge>}
                </td>
                <td className="px-4 py-3">
                  {shift.isUsed
                    ? <Badge variant="outline" className="text-xs text-blue-700 border-blue-300 bg-blue-50">Terpakai</Badge>
                    : <Badge variant="outline" className="text-xs text-muted-foreground">Belum dipakai</Badge>}
                </td>
                <td className="px-4 py-3">
                  {shift.isActive
                    ? <Badge variant="outline" className="text-xs text-green-700 border-green-300 bg-green-50">Aktif</Badge>
                    : <Badge variant="outline" className="text-xs text-gray-400 border-gray-200">Nonaktif</Badge>}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(shift)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden divide-y divide-border">
        {shifts.map((shift) => (
          <div key={shift.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold">{shift.code}</span>
                <span className="font-medium text-sm">{shift.name}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                {shift.startTime && shift.endTime ? `${shift.startTime} – ${shift.endTime}` : "Jam tidak diset"}
                {shift.color && (
                  <span className="inline-block h-3 w-3 rounded-full border border-border" style={{ backgroundColor: shift.color }} />
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!shift.isActive && <Badge variant="outline" className="text-xs text-gray-400">Nonaktif</Badge>}
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(shift)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
