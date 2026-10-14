import { useState } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useDivisions, useSaveDivision } from "./hooks";
import type { Division } from "./api";

// Pengaturan → Divisi (Owner / Super Admin).
// Karyawan & manager divisi diatur di halaman Karyawan (pilih divisi + tanda "Manager Divisi").

export function DivisionTab() {
  const [showInactive, setShowInactive] = useState(false);
  const { data: divisions = [], isLoading } = useDivisions(showInactive);
  const [editing, setEditing] = useState<Division | "new" | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Divisi</h2>
          <p className="text-sm text-muted-foreground">
            Kelompok karyawan. Manager divisi mengatur jadwal &amp; menyetujui pengajuan staf divisinya di cabangnya.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} /> Tampilkan nonaktif
          </label>
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus className="mr-1 h-4 w-4" /> Tambah Divisi
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Kode</th>
              <th className="px-4 py-2 text-left font-medium">Nama</th>
              <th className="px-4 py-2 text-right font-medium">Karyawan</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
              <th className="px-4 py-2 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Memuat...</td></tr>
            )}
            {!isLoading && divisions.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Belum ada divisi.</td></tr>
            )}
            {divisions.map((d) => (
              <tr key={d.id} className="border-t border-border">
                <td className="px-4 py-2 font-mono text-xs">{d.code}</td>
                <td className="px-4 py-2 font-medium">{d.name}</td>
                <td className="px-4 py-2 text-right tabular-nums">{d._count?.employees ?? 0}</td>
                <td className="px-4 py-2">
                  <Badge variant={d.isActive ? "success" : "secondary"}>{d.isActive ? "Aktif" : "Nonaktif"}</Badge>
                </td>
                <td className="px-4 py-2 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(d)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <DivisionDialog division={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function DivisionDialog({ division, onClose }: { division: Division | null; onClose: () => void }) {
  const save = useSaveDivision();
  const [code, setCode]         = useState(division?.code ?? "");
  const [name, setName]         = useState(division?.name ?? "");
  const [isActive, setIsActive] = useState(division?.isActive ?? true);
  const [error, setError]       = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) { setError("Kode dan nama divisi wajib diisi"); return; }
    setError(null);
    await save.mutateAsync({ id: division?.id, input: { code: code.trim(), name: name.trim(), isActive } });
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{division ? "Edit Divisi" : "Tambah Divisi"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="division-code">Kode</Label>
            <Input id="division-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="cth: MARKETING" className="uppercase" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="division-name">Nama</Label>
            <Input id="division-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="cth: Marketing" />
          </div>
          {division && (
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={isActive} onCheckedChange={setIsActive} /> Aktif
            </label>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
