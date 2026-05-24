import { useState, useEffect, useMemo } from "react";
import { useStore } from "@/store/useStore";
import { PageHeader } from "@/components/prodify/PageHeader";
import { OrderCard } from "@/components/prodify/OrderCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ClipboardList, MoreVertical, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OrderStatus } from "@/types";
import { EmptyState } from "@/components/prodify/EmptyState";
import { NewOrderDialog } from "@/components/prodify/NewOrderDialog";
import { EditOrderDialog } from "@/components/prodify/EditOrderDialog";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statuses: (OrderStatus | "Semua")[] = ["Semua", "Antrean", "Sedang Dikerjakan", "Penyusunan", "Siap Kirim", "Selesai"];

export default function AdminOrders() {
  const store = useStore();
  const orders = store.orders;
  const bootstrap = store.bootstrap;
  const deleteOrder = (store as any).deleteOrder || (store as any).removeOrder;

  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<string>("Semua");
  const [openNew, setOpenNew] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderToDelete, setOrderToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchOrders = async () => {
    try {
      await bootstrap();
    } catch (error) {
      console.error("Gagal memuat data pesanan:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [openNew, openEdit]);

  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    try {
      if (typeof deleteOrder === "function") {
        await deleteOrder(orderToDelete.id);
        toast.success("Pesanan berhasil dihapus");
        setOrderToDelete(null);
        await fetchOrders();
      } else {
        toast.error("Fungsi hapus tidak ditemukan di store");
      }
    } catch (error) {
      toast.error("Gagal menghapus pesanan");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = (order: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrder(order); 
    setOpenEdit(true);
  };

  const filtered = useMemo(() => {
    return (orders || [])
      .filter((o) => (tab === "Semua" ? true : o.status === tab))
      .filter((o) =>
        [o.code, o.productName, o.customerName].join(" ").toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => Number(b.fastTrack) - Number(a.fastTrack));
  }, [orders, tab, search]);

  return (
    <div className="space-y-3 max-w-7xl">
      <PageHeader
        title="Manajemen Pesanan"
        description="Input pesanan custom & ready stock, pecah subtask, assign ke pengrajin."
        actions={
          <Button onClick={() => setOpenNew(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Pesanan Baru
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari kode, produk, atau pelanggan..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 sm:grid-cols-6 gap-1 bg-muted p-1 rounded-xl h-auto select-none">
          {statuses.map((s) => (
            <TabsTrigger 
              key={s} 
              value={s} 
              className="w-full px-2 py-2 text-[11px] sm:text-xs md:text-sm font-semibold transition-all rounded-lg text-center data-[state=active]:bg-background data-[state=active]:shadow-sm text-muted-foreground data-[state=active]:text-foreground"
            >
              {s}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value={tab} className="mt-4">
          {filtered.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Belum ada pesanan"
              description={tab === "Semua" ? "Tambah pesanan baru untuk mulai." : `Tidak ada pesanan dengan status ${tab}`}
            />
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-fr">
              {filtered.map((o) => (
                <div key={o.id} className="relative custom-order-wrapper h-full flex flex-col">
                  
                  <OrderCard
                    order={o}
                    onClick={() => navigate(`/admin/orders/${o.id}`)}
                  />

                  {/* TOMBOL TITIK TIGA */}
                  <div className="absolute top-3.5 right-1 z-30">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="link"
                          size="icon"
                          className="h-5 w-5 p-0 bg-transparent hover:bg-transparent text-gray-400 hover:text-gray-700 shadow-none border-none outline-none focus:ring-0 focus:bg-transparent active:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36 bg-white">
                        <DropdownMenuItem
                          onClick={(e) => handleEditClick(o, e)}
                          className="gap-2 text-sm cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5 text-black-500" /> Edit Pesanan
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setOrderToDelete(o); 
                          }}
                          className="gap-2 text-sm text-destructive focus:text-destructive cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <NewOrderDialog open={openNew} onOpenChange={setOpenNew} />
      <EditOrderDialog open={openEdit} onOpenChange={setOpenEdit} order={selectedOrder} />

      {/* POP UP HAPUS */}
      <AlertDialog open={orderToDelete !== null} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent className="max-w-[340px] sm:max-w-[360px] w-[calc(100%-2.5rem)] mx-auto my-auto rounded-xl border border-border p-5 shadow-lg backdrop-blur-sm">
          <AlertDialogHeader className="flex flex-col items-center text-center space-y-3">
            <div className="p-2.5 rounded-full bg-destructive/10 text-destructive w-max mx-auto">
              <Trash2 className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-base font-bold text-foreground w-full text-center tracking-tight">
              Hapus Pesanan?
            </AlertDialogTitle>
            <AlertDialogTitle className="hidden">Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed w-full text-center pt-0.5 px-1">
              Apakah Anda yakin ingin menghapus pesanan{" "}
              <span className="font-mono font-bold text-secondary">{orderToDelete?.code}</span>?
              Tindakan ini permanen dan subtask didalamnya akan ikut terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-5 flex flex-row items-center justify-center w-full">
            <AlertDialogCancel className="h-8.5 text-xs rounded-lg border-border hover:bg-muted px-3 flex-1 m-0">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
              disabled={isDeleting}
              className="h-8.5 text-xs rounded-lg bg-destructive text-white hover:bg-destructive/90 disabled:opacity-50 px-3 flex-1 flex items-center justify-center m-0 font-medium"
            >
              {isDeleting ? "Menghapus..." : "Ya, Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}