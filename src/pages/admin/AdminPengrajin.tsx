import { useMemo, useState, useEffect } from "react";
import { useStore, formatRupiah, MasterSkill } from "@/store/useStore";
import { PageHeader } from "@/components/prodify/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Award, Plus, Pencil, Trash2, Search, UserPlus, Power, PowerOff, Gauge, MoreVertical, Eye, EyeOff, Settings2, Sparkles, AlertTriangle } from "lucide-react";
import { User, Specialization } from "@/types";
import { toast } from "@/hooks/use-toast";
import { countActiveTasks } from "@/lib/waitingList";

const DEFAULT_SKILLS = ["Kepala", "Badan", "Tangan", "Kaki", "Tas", "Gantungan Kunci", "Aksesoris", "Perakitan"];

type FormState = {
  name: string;
  username: string;
  password: string;
  specializations: string[];
  capacity: number;
};

const emptyForm: FormState = { name: "", username: "", password: "", specializations: [], capacity: 5 };

export default function AdminPengrajin() {
  const { users, orders, points, skills, bootstrap, addUser, updateUser, deleteUser, toggleUserActive, addMasterSkill, updateMasterSkill, deleteMasterSkill } = useStore();

  const [search, setSearch] = useState("");
  const [specFilter, setSpecFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "busy">("all");

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<User | null>(null);

  const [showPassword, setShowPassword] = useState(false);

  // --- STATE KHUSUS CRUD MASTER SKILL ---
  const [openSkillsModal, setOpenSkillsModal] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [editingMasterSkill, setEditingMasterSkill] = useState<MasterSkill | null>(null);
  const [editMasterSkillName, setEditMasterSkillName] = useState("");
  const [deleteMasterSkillTarget, setDeleteMasterSkillTarget] = useState<MasterSkill | null>(null);

  useEffect(() => {
    if (bootstrap) {
      bootstrap();
    }
  }, []);

  const availableSkills = useMemo(() => {
    if (skills && skills.length > 0) {
      return skills.map((s: any) => s.name || s);
    }
    return DEFAULT_SKILLS;
  }, [skills]);

  const busyMap = useMemo(() => countActiveTasks(orders), [orders]);

  const pengrajin = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => u.role === "pengrajin")
      .filter((u) => {
        if (!q) return true;
        return u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
      })
      .filter((u) => {
        if (specFilter === "all") return true;
        // FIX ERROR: Menyambung return gantung agar tidak mengembalikan undefined
        return u.specializations?.includes(specFilter as any);
      })
      .filter((u) => {
        if (statusFilter === "all") return true;
        const cap = u.capacity ?? 5;
        const isBusy = (busyMap.get(u.id) ?? 0) >= cap;
        return statusFilter === "busy" ? isBusy : !isBusy;
      });
  }, [users, search, specFilter, statusFilter, busyMap]);

  // Hitung jumlah pengrajin yang memakai master skill tertentu
  const getSkillUsageCount = (skillName: string) => {
    return users.filter((u) => u.role === "pengrajin" && u.specializations?.includes(skillName as Specialization)).length;
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowPassword(false);
    setOpenForm(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({
      name: u.name,
      username: u.username,
      password: u.password,
      specializations: u.specializations ?? [],
      capacity: u.capacity ?? 5,
    });
    setShowPassword(false);
    setOpenForm(true);
  };

  const toggleSpec = (s: string) => {
    setForm((f) => ({
      ...f,
      specializations: f.specializations.includes(s)
        ? f.specializations.filter((x) => x !== s)
        : [...f.specializations, s],
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) {
      toast({ title: "Lengkapi form", description: "Nama, username, dan password wajib diisi.", variant: "destructive" });
      return;
    }
    if (editing) {
      const res = await updateUser(editing.id, {
        name: form.name,
        username: form.username,
        password: form.password,
        specializations: form.specializations as any,
        capacity: form.capacity,
      });
      if (!res.ok) {
        toast({ title: "Gagal menyimpan", description: res.message, variant: "destructive" });
        return;
      }
      toast({ title: "Tersimpan", description: `Data ${form.name} diperbarui.` });
    } else {
      const res = await addUser({
        name: form.name,
        username: form.username,
        password: form.password,
        role: "pengrajin",
        specializations: form.specializations as any,
        capacity: form.capacity,
      });
      if (!res.ok) {
        toast({ title: "Gagal menambah", description: res.message, variant: "destructive" });
        return;
      }
      toast({ title: "Pengrajin ditambahkan", description: `${form.name} berhasil dibuat.` });
    }
    setOpenForm(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const res = await deleteUser(confirmDelete.id);
    if (!res.ok) {
      toast({ title: "Tidak bisa menghapus", description: res.message, variant: "destructive" });
    } else {
      toast({ title: "Dihapus", description: `${confirmDelete.name} telah dihapus.` });
    }
    setConfirmDelete(null);
  };

  const handleToggle = async () => {
    if (!confirmToggle) return;
    const res = await toggleUserActive(confirmToggle.id);
    if (!res.ok) {
      toast({ title: "Gagal", description: res.message, variant: "destructive" });
    } else {
      const nowActive = confirmToggle.active === false;
      toast({
        title: nowActive ? "Diaktifkan" : "Dinonaktifkan",
        description: `Akun ${confirmToggle.name} ${nowActive ? "kembali aktif" : "telah dinonaktifkan"}.`,
      });
    }
    setConfirmToggle(null);
  };

  // --- HANDLER INTEGRASI DATABASE CRUD MASTER SKILL ---
  const handleAddMasterSkill = async () => {
    const t = newSkillName.trim();
    if (!t) return;

    if (skills.some((s: any) => (s.name || s).toLowerCase() === t.toLowerCase())) {
      toast({ title: "Skill sudah ada", variant: "destructive" });
      return;
    }

    const res = await addMasterSkill(t, 0);
    if (res.ok) {
      setNewSkillName("");
      toast({ title: "Skill ditambahkan", description: t });
    } else {
      toast({ title: "Gagal menambahkan skill", description: res.message, variant: "destructive" });
    }
  };

  const handleUpdateMasterSkill = async () => {
    if (!editingMasterSkill || !editMasterSkillName.trim()) return;

    const res = await updateMasterSkill(editingMasterSkill.id, editMasterSkillName, editingMasterSkill.default_price || 0);
    if (res.ok) {
      toast({ title: "Berhasil", description: "Nama master skill berhasil diperbarui" });
      setEditingMasterSkill(null);
    } else {
      toast({ title: "Gagal", description: res.message, variant: "destructive" });
    }
  };

  const handleDeleteMasterSkillTrigger = (sk: MasterSkill) => {
    const nameString = sk.name || (sk as any);
    if (getSkillUsageCount(nameString) > 0) {
      toast({
        title: "Tidak bisa hapus",
        description: "Skill masih digunakan oleh pengrajin aktif.",
        variant: "destructive"
      });
      return;
    }
    setDeleteMasterSkillTarget(sk);
  };

  const confirmDeleteMasterSkill = async () => {
    if (!deleteMasterSkillTarget) return;

    const res = await deleteMasterSkill(deleteMasterSkillTarget.id);
    if (res.ok) {
      toast({ title: "Skill berhasil dihapus", description: deleteMasterSkillTarget.name || (deleteMasterSkillTarget as any) });
      setDeleteMasterSkillTarget(null);
    } else {
      toast({ title: "Gagal menghapus skill", description: res.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        title="Daftar Pengrajin"
        description="Spesialisasi, status, dan total upah masing-masing pengrajin."
      />

      {/* BOX CONTAINER CONTROLLER SEARCH BAR, FILTER, & TOMBOL TAMBAH */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl border border-border bg-muted/40 shadow-sm">
        {/* Sisi Kiri: Input Text Search Bar */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Cari nama atau username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9 rounded-xl border border-border bg-white focus-visible:ring-yellow-500 w-full text-sm"
          />
        </div>

        {/* Sisi Kanan: Barisan Dropdown Filter & Tombol Aksi */}
        <div className="flex flex-wrap items-center gap-2 justify-end w-full md:w-auto shrink-0">
          <Select value={specFilter} onValueChange={setSpecFilter}>
            <SelectTrigger className="h-10 w-full sm:w-44 rounded-xl border border-border bg-white text-xs font-semibold">
              <SelectValue placeholder="Spesialisasi" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="text-xs">Semua Spesialisasi</SelectItem>
              {availableSkills.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="h-10 w-full sm:w-36 rounded-xl border border-border bg-white text-xs font-semibold">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="text-xs">Semua Status</SelectItem>
              <SelectItem value="available" className="text-xs">Available</SelectItem>
              <SelectItem value="busy" className="text-xs">Sibuk</SelectItem>
            </SelectContent>
          </Select>

          {/* TOMBOL KELOLA MASTER SKILL */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpenSkillsModal(true)}
            className="h-10 w-full sm:w-auto gap-1.5 rounded-xl border-border bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
          >
            <Settings2 className="h-4 w-4 text-slate-500" /> Kelola Master Skill
          </Button>

          {/* TOMBOL TAMBAH PENGRAJIN */}
          <Button 
            onClick={openAdd} 
            className="h-10 w-full sm:w-auto gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-xl text-xs px-4 shadow-sm shrink-0"
          >
            <UserPlus className="h-4 w-4" /> Tambah Pengrajin
          </Button>
        </div>
      </div>

      {/* Grid pengrajin */}
      {pengrajin.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground border border-border/60 rounded-2xl shadow-sm italic bg-slate-50/50">
          Tidak ada pengrajin yang cocok dengan filter pencarian saat ini.
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pengrajin.map((u) => {
            const active = busyMap.get(u.id) ?? 0;
            const cap = u.capacity ?? 5;
            const busy = active >= cap;
            const earnings = points.filter((p) => p.userId === u.id).reduce((sum, p) => sum + p.point, 0);
            const completed = points.filter((p) => p.userId === u.id).length;
            const inactive = u.active === false;
            return (
              <Card key={u.id} className={cn("p-5 hover:shadow-[var(--shadow-card)] transition-shadow relative flex flex-col justify-between rounded-2xl border border-border/60 bg-white shadow-sm", inactive && "opacity-60")}>
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center font-bold text-black text-lg shrink-0 shadow-sm">
                        {u.name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {inactive ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted text-muted-foreground text-[11px] font-semibold whitespace-nowrap">
                          <PowerOff className="h-3 w-3" /> Nonaktif
                        </span>
                      ) : (
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap",
                          busy ? "bg-red-50 text-red-600 border border-red-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        )}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", busy ? "bg-red-500" : "bg-emerald-500")} />
                          {busy ? "Sibuk" : "Available"}
                        </span>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border transition-all">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36 rounded-xl shadow-lg border-border">
                          <DropdownMenuItem onClick={() => openEdit(u)} className="gap-2 text-xs font-medium cursor-pointer rounded-lg">
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" /> Edit Detail
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setConfirmToggle(u)} 
                            className={cn("gap-2 text-xs font-medium cursor-pointer rounded-lg", inactive ? "text-emerald-600 focus:text-emerald-600" : "text-amber-600 focus:text-amber-600")}
                          >
                            {inactive ? <><Power className="h-3.5 w-3.5" /> Aktifkan</> : <><PowerOff className="h-3.5 w-3.5" /> Nonaktifkan</>}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setConfirmDelete(u)} 
                            className="gap-2 text-xs font-medium text-destructive focus:text-destructive focus:bg-destructive/5 cursor-pointer rounded-lg"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Hapus Account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1 min-h-[22px]">
                    {u.specializations?.length ? u.specializations.map((s) => (
                      <span key={s} className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200/40">{s}</span>
                    )) : <span className="text-[11px] text-muted-foreground italic">Belum ada spesialisasi</span>}
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                      <span className="flex items-center gap-1 font-medium"><Gauge className="h-3 w-3 text-slate-400" /> Kapasitas Kerja</span>
                      <span className="font-bold text-slate-800">{active} / {cap} Task</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200/30">
                      <div
                        className={cn(
                          "h-full transition-all rounded-full",
                          busy ? "bg-red-500" : active / Math.max(cap, 1) > 0.6 ? "bg-amber-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${cap > 0 ? Math.min(100, (active / cap) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-muted-foreground flex items-center gap-1 font-medium"><Award className="h-3 w-3 text-amber-500" /> Total Upah</p>
                    <p className="font-bold text-slate-900 mt-0.5 text-sm">{formatRupiah(earnings)}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-muted-foreground font-medium">Task Selesai</p>
                    <p className="font-bold text-slate-900 mt-0.5 text-sm">{completed} unit</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ================= MODAL DIALOG POP-UP: KELOLA MASTER SKILL (DENGAN AKSI TITIK TIGA) ================= */}
      <Dialog open={openSkillsModal} onOpenChange={setOpenSkillsModal}>
        <DialogContent className="w-[calc(100%-32px)] sm:w-full max-w-md rounded-3xl p-6 flex flex-col max-h-[85vh]">
          <DialogHeader className="shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              <DialogTitle className="text-xl font-bold">Manajemen Master Skill</DialogTitle>
            </div>
            <DialogDescription>
              Tambah, edit, atau hapus item keahlian kerja dari sistem di bawah ini.
            </DialogDescription>
          </DialogHeader>

          {/* Form Tambah Skill Baru */}
          <div className="mt-4 p-3 rounded-xl border border-border bg-slate-50/50 flex items-center gap-2 shrink-0">
            <div className="flex-1">
              <Input
                placeholder="Ketik nama skill baru... (cth: Sayap)"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddMasterSkill()}
                className="h-10 rounded-xl bg-white border-border text-sm focus-visible:ring-yellow-500"
              />
            </div>
            <Button onClick={handleAddMasterSkill} className="h-10 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-xl px-4 text-xs gap-1">
              <Plus className="h-4 w-4 stroke-[2.5]" /> Tambah
            </Button>
          </div>

          {/* List Daftar Master Skill Terdaftar */}
          <div className="mt-4 space-y-2 overflow-y-auto [scrollbar-gutter:stable] pr-1 flex-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 min-h-[150px]">
            {skills && skills.length > 0 ? (
              skills.map((sk: any) => {
                const nameString = sk.name || sk;
                const usedCount = getSkillUsageCount(nameString);
                return (
                  <div key={sk.id || nameString} className="flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-100 bg-white shadow-sm">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{nameString}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Digunakan oleh {usedCount} pengrajin
                      </p>
                    </div>
                    
                    {/* IMPLEMENTASI FITUR TITIK TIGA DI DALAM MANAGEMENT SKILL */}
                    <div className="shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 border border-transparent hover:border-slate-200">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-28 rounded-xl shadow-md border-border">
                          <DropdownMenuItem 
                            onClick={() => {
                              setEditingMasterSkill(sk);
                              setEditMasterSkillName(nameString);
                            }} 
                            className="gap-2 text-xs font-medium cursor-pointer rounded-lg"
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" /> Edit Skill
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteMasterSkillTrigger(sk)} 
                            className="gap-2 text-xs font-medium text-destructive focus:text-destructive focus:bg-destructive/5 cursor-pointer rounded-lg"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Hapus Skill
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground italic text-center py-6">Belum ada data master skill.</p>
            )}
          </div>
<DialogFooter className="mt-4 border-t pt-3 shrink-0">
  <Button 
    onClick={() => setOpenSkillsModal(false)} 
    className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-6 rounded-xl h-10 shadow-sm transition-all"
  >
    Selesai
  </Button>
</DialogFooter>
        </DialogContent>
      </Dialog>

      {/* POP-UP SUB-DIALOG: EDIT NAMA SKILL */}
      <Dialog open={!!editingMasterSkill} onOpenChange={(o) => !o && setEditingMasterSkill(null)}>
        <DialogContent className="w-[calc(100%-32px)] sm:w-full max-w-md rounded-3xl p-6 z-[60]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Edit Master Skill</DialogTitle>
            <DialogDescription>Ubah nama bagian pengerjaan untuk master skill ini.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Nama Skill</Label>
              <Input value={editMasterSkillName} onChange={(e) => setEditMasterSkillName(e.target.value)} className="h-11 rounded-xl" />
            </div>
          </div>
          <DialogFooter className="flex-row justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditingMasterSkill(null)} className="rounded-xl">Batal</Button>
            <Button onClick={handleUpdateMasterSkill} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-xl px-5">
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* POP-UP SUB-DIALOG: PERINGATAN HAPUS SKILL */}
      <Dialog open={!!deleteMasterSkillTarget} onOpenChange={(o) => !o && setDeleteMasterSkillTarget(null)}>
        <DialogContent className="w-[calc(100%-32px)] sm:w-full max-w-sm rounded-3xl p-6 z-[60]">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">Hapus Master Skill?</DialogTitle>
            <DialogDescription className="text-center text-sm">
              Anda akan menghapus skill <span className="font-bold text-foreground">"{deleteMasterSkillTarget?.name || (deleteMasterSkillTarget as any)}"</span> dari sistem. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2 sm:flex-row flex-col">
            <Button variant="outline" onClick={() => setDeleteMasterSkillTarget(null)} className="flex-1 rounded-xl h-10 mt-0">
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmDeleteMasterSkill} className="flex-1 rounded-xl h-10 shadow-sm font-semibold">
              Ya, Hapus Skill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Form dialog Tambah / Edit Pengrajin */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="w-[calc(100%-32px)] sm:w-full max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{editing ? "Edit Pengrajin" : "Tambah Pengrajin"}</DialogTitle>
            <DialogDescription>
              {editing ? "Perbarui data pengrajin di bawah ini." : "Buat akun pengrajin baru."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-bold">Nama Lengkap</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="cth: Siti Aminah" className="h-11 rounded-xl bg-muted/5 border-muted-foreground/20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs font-bold">Username</Label>
                <Input id="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="cth: siti" className="h-11 rounded-xl bg-muted/5 border-muted-foreground/20" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-bold">Password</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    value={form.password} 
                    onChange={(e) => setForm({ ...form, password: e.target.value })} 
                    placeholder="Min. 6 karakter"
                    className="pr-10 h-11 rounded-xl bg-muted/5 border-muted-foreground/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="capacity" className="text-xs font-bold">Kapasitas (jumlah subtask aktif maksimal)</Label>
              <Input
                id="capacity"
                type="number"
                min={0}
                max={20}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: Math.max(0, Number(e.target.value) || 0) })}
                className="h-11 rounded-xl bg-muted/5 border-muted-foreground/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold">Spesialisasi</Label>
              <div className="flex flex-wrap gap-1.5">
                {availableSkills.map((s) => {
                  const active = form.specializations.includes(s);
                  return (
                    <button
                      type="button"
                      key={s}
                      onClick={() => toggleSpec(s)}
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-full border transition-colors font-medium",
                        active
                          ? "bg-yellow-500 text-black border-yellow-500 font-bold shadow-sm"
                          : "bg-background text-foreground/70 border-muted-foreground/20 hover:border-yellow-500/50"
                      )}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-row justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setOpenForm(false)} className="rounded-xl">Batal</Button>
            <Button onClick={handleSubmit} className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-8 rounded-xl h-10">
              {editing ? <><Pencil className="h-4 w-4" /> Simpan</> : <><Plus className="h-4 w-4" /> Tambah</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog Delete */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent className="w-[calc(100%-32px)] sm:w-full max-w-sm rounded-3xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">Hapus pengrajin?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Akun <strong>{confirmDelete?.name}</strong> akan dihapus secara permanen. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex flex-row gap-2">
            <AlertDialogCancel className="flex-1 rounded-xl h-10 font-medium mt-0">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl h-10 font-medium"
            >
              Ya, hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog Toggle / Nonaktifkan */}
      <AlertDialog open={!!confirmToggle} onOpenChange={(o) => !o && setConfirmToggle(null)}>
        <AlertDialogContent className="w-[calc(100%-32px)] sm:w-full max-w-sm rounded-3xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">
              {confirmToggle?.active === false ? "Aktifkan akun?" : "Nonaktifkan akun?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {confirmToggle?.active === false
                ? `Akun ${confirmToggle?.name} akan kembali bisa login dan menerima task.`
                : `Akun ${confirmToggle?.name} tidak akan bisa login dan tidak muncul di daftar assign.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex flex-row gap-2">
            <AlertDialogCancel className="flex-1 rounded-xl h-10 font-medium mt-0">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggle} className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black rounded-xl h-10 font-bold">
              {confirmToggle?.active === false ? "Ya, aktifkan" : "Ya, nonaktif"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}