import { useMemo, useState } from "react";
import { useStore, MasterSkill } from "@/store/useStore";
import { PageHeader } from "@/components/prodify/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Specialization } from "@/types";
import { Plus, Sparkles, AlertTriangle, MoreVertical, Pencil, Trash2, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export default function AdminSkills() {
  const { users, updateUser, skills, addMasterSkill, updateMasterSkill, deleteMasterSkill } = useStore();
  const [newSkill, setNewSkill] = useState("");

  // State Pengendali Dialog Edit Data Master Skill
  const [editingSkill, setEditingSkill] = useState<MasterSkill | null>(null);
  const [editName, setEditName] = useState("");

  const pengrajin = useMemo(() => users.filter((u) => u.role === "pengrajin"), [users]);

  const usageCount = (skillName: string) =>
    pengrajin.filter((u) => u.specializations?.includes(skillName as Specialization)).length;

  const handleAdd = async () => {
    const t = newSkill.trim();
    if (!t) return;

    if (skills.some((s) => s.name.toLowerCase() === t.toLowerCase())) {
      toast({ title: "Skill sudah ada", variant: "destructive" });
      return;
    }

    const res = await addMasterSkill(t, 0);
    if (res.ok) {
      setNewSkill("");
      toast({ title: "Skill ditambahkan", description: t });
    } else {
      toast({ title: "Gagal menambahkan skill", description: res.message, variant: "destructive" });
    }
  };

  const handleUpdate = async () => {
    if (!editingSkill || !editName.trim()) return;
    
    const res = await updateMasterSkill(editingSkill.id, editName, editingSkill.default_price || 0);
    if (res.ok) {
      toast({ title: "Berhasil", description: "Subtask berhasil diperbarui" });
      setEditingSkill(null);
    } else {
      toast({ title: "Gagal", description: res.message, variant: "destructive" });
    }
  };

  const handleDeleteTrigger = (sk: MasterSkill) => {
    if (usageCount(sk.name) > 0) {
      toast({ 
        title: "Tidak bisa hapus", 
        description: "Skill masih digunakan oleh pengrajin aktif.", 
        variant: "destructive" 
      });
      return;
    }
    setDeleteTarget(sk);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    const res = await deleteMasterSkill(deleteTarget.id);
    if (res.ok) {
      toast({ title: "Skill berhasil dihapus", description: deleteTarget.name });
      setDeleteTarget(null);
    } else {
      toast({ title: "Gagal menghapus skill", description: res.message, variant: "destructive" });
    }
  };

  const toggleAssign = (userId: string, skillName: string) => {
    const u = users.find((x) => x.id === userId);
    if (!u) return;
    const has = u.specializations?.includes(skillName as Specialization);
    const next = has
      ? (u.specializations ?? []).filter((x) => x !== skillName)
      : [...(u.specializations ?? []), skillName as Specialization];
    updateUser(userId, { specializations: next });
  };

  const [assignSkill, setAssignSkill] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MasterSkill | null>(null);

  // Kustomisasi style: scrollbar-gutter mengunci posisi data agar diam, warna thumb disembunyikan secara default
  const scrollContainerStyle = "space-y-2 overflow-y-auto [scrollbar-gutter:stable] pr-1 flex-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 focus-within:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 active:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30";

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader
        title="Manajemen Skill"
        description="Kelola daftar master skill komponen dan tetapkan ke setiap pengrajin aktif."
      />

      <Card className="p-4 flex flex-col sm:flex-row gap-4 sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="newskill">Tambah Skill Baru</Label>
          <Input
            id="newskill"
            placeholder="cth: Kepala, Badan, Kaki"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="focus-visible:ring-primary"
          />
        </div>
        <Button onClick={handleAdd} className="gap-2 h-10 px-5 bg-primary text-primary-foreground font-semibold">
          <Plus className="h-4 w-4 stroke-[3]" /> Tambah
        </Button>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* BAGIAN DAFTAR SKILL */}
        <Card className="p-5 flex flex-col h-full max-h-[500px]">
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <Sparkles className="h-4 w-4 text-secondary" />
            <h2 className="font-bold text-foreground">Daftar Skill</h2>
            <span className="text-xs text-muted-foreground ml-auto">{skills.length} skill</span>
          </div>
          
          {/* List dengan Scrollbar Pintar (Muncul saat di-scroll ATAU di-hover tanpa menggeser layout) */}
          <div className={scrollContainerStyle}>
            {skills.length > 0 ? (
              skills.map((sk) => {
                const used = usageCount(sk.name);
                return (
                  <div key={sk.id} className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border bg-muted/30">
                    <div>
                      <p className="font-semibold text-foreground text-sm">{sk.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {used} pengrajin punya skill ini
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        size="sm" 
                        onClick={() => setAssignSkill(sk.name)} 
                        className="gap-1.5 h-8 px-3 bg-[#F5C451] hover:bg-[#E0B242] text-neutral-900 text-xs rounded-lg border-none transition-all shadow-sm"
                      >
                        <UserCheck className="h-3.5 w-3.5 text-neutral-900 stroke-[1.8]" /> Assign
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground rounded-md border border-border">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-lg">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingSkill(sk);
                              setEditName(sk.name);
                            }}
                            className="gap-2 cursor-pointer text-sm"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteTrigger(sk)}
                            className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 text-sm"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground italic text-center py-4">Belum ada data skill.</p>
            )}
          </div>
        </Card>

        {/* BAGIAN PENGRAJIN & SKILL */}
        <Card className="p-5 flex flex-col h-full max-h-[500px]">
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <UserCheck className="h-4 w-4 text-secondary" />
            <h2 className="font-bold text-foreground">Pengrajin & Skill</h2>
          </div>
          
          {/* List dengan Scrollbar Pintar */}
          <div className={cn(scrollContainerStyle, "space-y-3")}>
            {pengrajin.map((u) => (
              <div key={u.id} className="p-3 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground text-sm">{u.name}</p>
                  <span className="text-[11px] text-muted-foreground">{u.specializations?.length ?? 0} skill</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {u.specializations?.length ? u.specializations.map((sp) => (
                    <span key={sp} className="text-[11px] px-2 py-0.5 rounded-full bg-secondary/15 text-secondary font-medium">
                      {sp}
                    </span>
                  )) : <span className="text-[11px] text-muted-foreground italic">Belum ada</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* POP-UP EDIT DATA SKILL */}
      <Dialog open={!!editingSkill} onOpenChange={(o) => { if (!o) setEditingSkill(null); }}>
        <DialogContent className="w-[calc(100%-32px)] sm:w-full max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Edit Subtask / Skill</DialogTitle>
            <DialogDescription>Sesuaikan nama bagian pengerjaan untuk master skill ini.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Nama Skill</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-11 rounded-xl" />
            </div>
          </div>
          <DialogFooter className="flex-row justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditingSkill(null)} className="rounded-xl">Batal</Button>
            <Button onClick={handleUpdate} className="bg-primary text-primary-foreground font-semibold rounded-xl px-5">
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* POP-UP ASSIGN SKILL */}
      <Dialog open={!!assignSkill} onOpenChange={(o) => !o && setAssignSkill(null)}>
        <DialogContent className="w-[calc(100%-32px)] sm:w-full max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Assign skill: {assignSkill}</DialogTitle>
            <DialogDescription>
              Klik nama untuk menambah / melepas skill ini dari pengrajin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto py-2 my-1 pr-1">
            {pengrajin.map((u) => {
              const has = u.specializations?.includes(assignSkill as Specialization);
              return (
                <button 
                  key={u.id} 
                  onClick={() => assignSkill && toggleAssign(u.id, assignSkill)} 
                  className={cn( 
                    "w-full flex items-center justify-between p-3 rounded-xl border text-sm transition-colors", 
                    has ? "bg-primary/10 border-primary/40" : "bg-background border-border hover:bg-accent" 
                  )} 
                >
                  <span className="font-medium text-foreground">{u.name}</span>
                  <span className={cn("text-[11px] font-semibold", has ? "text-primary-foreground bg-primary px-2.5 py-0.5 rounded-full" : "text-muted-foreground")}>
                    {has ? "Punya" : "Tambah"}
                  </span>
                </button>
              );
            })}
          </div>
          <DialogFooter className="mt-2">
            <Button onClick={() => setAssignSkill(null)} className="w-full sm:w-auto bg-[#F5C451] hover:bg-[#E0B242] text-neutral-900 font-bold px-6 rounded-xl">
              Selesai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* POP-UP PERINGATAN HAPUS SKILL */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="w-[calc(100%-32px)] sm:w-full max-w-sm rounded-3xl p-6">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">Hapus Master Skill?</DialogTitle>
            <DialogDescription className="text-center text-sm">
              Anda akan menghapus skill <span className="font-bold text-foreground">"{deleteTarget?.name}"</span> dari sistem. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2 sm:flex-row flex-col">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1 rounded-xl h-10 mt-0">
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmDelete} className="flex-1 rounded-xl h-10 shadow-sm font-semibold">
              Ya, Hapus Skill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}