import { useState } from "react";
import { Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import type { ShiftMaster } from "../../types";

interface Props {
  shifts:    ShiftMaster[];
  isLoading: boolean;
  onEdit:    (shift: ShiftMaster) => void;
  onDelete:  (shift: ShiftMaster) => void;
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

export function ShiftTable({ shifts, isLoading, onEdit, onDelete }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

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
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shifts.map((shift) => (
              <tr key={shift.id} className="hover:bg-muted/10 transition-colors">
                <td className="px-4 py-3 font-mono font-semibold text-xs">{shift.code}</td>
                <td className="px-4 py-3 font-medium">{shift.name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {shift.startTime && shift.endTime ? `${shift.startTime} – ${shift.endTime}` : "—"}
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
                  {confirmId === shift.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs text-red-600 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {shift.isUsed ? "Nonaktifkan?" : "Hapus?"}
                      </span>
                      <Button variant="destructive" size="sm" className="h-7 text-xs"
                        onClick={() => { onDelete(shift); setConfirmId(null); }}>
                        Ya
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs"
                        onClick={() => setConfirmId(null)}>
                        Batal
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(shift)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setConfirmId(shift.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden divide-y divide-border">
        {shifts.map((shift) => (
          <div key={shift.id} className="px-4 py-3">
            <div className="flex items-center gap-3">
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
              <div className="flex items-center gap-1 shrink-0">
                {confirmId === shift.id ? (
                  <>
                    <Button variant="destructive" size="sm" className="h-7 text-xs px-2"
                      onClick={() => { onDelete(shift); setConfirmId(null); }}>
                      Ya
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs px-2"
                      onClick={() => setConfirmId(null)}>
                      Batal
                    </Button>
                  </>
                ) : (
                  <>
                    {!shift.isActive && <Badge variant="outline" className="text-xs text-gray-400">Nonaktif</Badge>}
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(shift)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setConfirmId(shift.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
            {confirmId === shift.id && (
              <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {shift.isUsed ? "Shift terpakai, akan dinonaktifkan." : "Shift akan dihapus permanen."} Konfirmasi?
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
