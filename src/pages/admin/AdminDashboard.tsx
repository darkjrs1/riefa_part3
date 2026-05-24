import { useStore, daysUntil } from "@/store/useStore";
import { StatCard } from "@/components/prodify/StatCard";
import { PageHeader } from "@/components/prodify/PageHeader";
import { ClipboardList, Zap, Users, AlertTriangle, Bell, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { buildAutoNotifications, filterByRole } from "@/lib/autoNotifications";
import { getWaitingList, countActiveTasks, getCraftsmanStatus } from "@/lib/waitingList";
import { StatusBadge } from "@/components/prodify/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderStatus } from "@/types";

export default function AdminDashboard() {
  const { orders, products, users, notifications } = useStore();
  const navigate = useNavigate();

  const activeOrders = orders.filter((o) => o.status !== "Selesai");
  const fastTrackActive = activeOrders.filter((o) => o.fastTrack);
  const pengrajin = users.filter((u) => u.role === "pengrajin");
  const activeTaskMap = countActiveTasks(orders);
  const busyCount = pengrajin.filter((p) => getCraftsmanStatus(p, activeTaskMap.get(p.id) ?? 0) === "busy").length;
  const lowStock = products.filter((p) => p.stock <= p.minStock);
  const recent = [...activeOrders]
    .sort((a, b) => Number(b.fastTrack) - Number(a.fastTrack) || new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 6);
  const allNotifs = filterByRole(
    [...buildAutoNotifications(orders, products), ...notifications],
    "admin"
  ).slice(0, 5);
  const waitingCount = getWaitingList(orders).length;
  const overload = waitingCount > 10;

  // Status chart distribution
  const statusList: OrderStatus[] = ["Antrean", "Sedang Dikerjakan", "Penyusunan", "Siap Kirim", "Selesai"];
  const statusColor: Record<OrderStatus, string> = {
    Antrean: "bg-muted-foreground",
    "Sedang Dikerjakan": "bg-primary",
    Penyusunan: "bg-warning",
    "Siap Kirim": "bg-secondary",
    Selesai: "bg-success",
  };
  const statusCounts = statusList.map((s) => ({
    status: s,
    count: orders.filter((o) => o.status === s).length,
  }));
  const maxCount = Math.max(1, ...statusCounts.map((s) => s.count));

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader title="Dashboard Admin" description="Ringkasan aktivitas produksi RieFa Collection hari ini." />

      {(overload || lowStock.length > 0) && (
        <Card className="p-4 border-l-4 border-l-warning bg-warning/5 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-sm">
            {overload && <p><strong>Overload:</strong> Waiting list {waitingCount} subtask (batas 10).</p>}
            {lowStock.length > 0 && <p><strong>Stok menipis:</strong> {lowStock.length} produk perlu produksi.</p>}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <button onClick={() => navigate("/admin/orders")} className="text-left">
          <StatCard label="Total Order Aktif" value={activeOrders.length} icon={ClipboardList} variant="primary" />
        </button>
        <button onClick={() => navigate("/admin/orders")} className="text-left">
          <StatCard label="Fast Track Aktif" value={`${fastTrackActive.length}/10`} icon={Zap} variant="destructive" />
        </button>
        <button onClick={() => navigate("/admin/pengrajin")} className="text-left">
          <StatCard label="Pengrajin Sibuk" value={`${busyCount}/${pengrajin.length}`} icon={Users} variant="secondary" />
        </button>
        <button onClick={() => navigate("/admin/waiting-list")} className="text-left">
          <StatCard label="Daftar Tunggu" value={waitingCount} icon={Clock} variant={overload ? "destructive" : "secondary"} />
        </button>
        <button onClick={() => navigate("/admin/products")} className="text-left">
          <StatCard label="Stok Menipis" value={lowStock.length} icon={AlertTriangle} variant="warning" />
        </button>
      </div>

      <Card className="p-5">
        <h2 className="font-bold text-foreground mb-4">Distribusi Status Order</h2>
        <div className="space-y-3">
          {statusCounts.map(({ status, count }) => (
            <div key={status}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-foreground">{status}</span>
                <span className="text-muted-foreground">{count} order</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full transition-all", statusColor[status])}
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Recent Orders</h2>
            <button onClick={() => navigate("/admin/orders")} className="text-sm font-medium text-secondary hover:text-secondary/80">Lihat semua →</button>
          </div>
          <Card className="p-0 overflow-hidden">
            {/* PERBAIKAN UTAMA: Dibungkus div dengan overflow-x-auto agar tabel responsif di layar HP */}
            <div className="w-full overflow-x-auto">
              <Table className="text-[11px] min-w-[600px] lg:min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center px-2 py-3">Kode</TableHead>
                    <TableHead className="text-center px-2 py-3">Produk</TableHead>
                    <TableHead className="text-center px-2 py-3">Customer</TableHead>
                    <TableHead className="text-center px-2 py-3">Sumber Pesanan</TableHead>
                    <TableHead className="text-center px-2 py-3">Qty</TableHead>
                    <TableHead className="text-center px-2 py-3">Tipe</TableHead>
                    <TableHead className="text-center px-2 py-3">Status</TableHead>
                    <TableHead className="text-center px-2 py-3">Deadline</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8 text-xs">
                        Belum ada order aktif.
                      </TableCell>
                    </TableRow>
                  )}
                  {recent.map((o) => {
                    const days = daysUntil(o.deadline);
                    return (
                      <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate(`/admin/orders/${o.id}`)}>
                        <TableCell className="text-center px-2 py-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-mono text-[11px] font-semibold text-secondary">{o.code}</span>
                            {o.fastTrack && <Zap className="h-3 w-3 text-destructive shrink-0" />}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-center px-2 py-2.5 truncate max-w-[120px]">{o.productName}</TableCell>
                        <TableCell className="text-muted-foreground text-center px-2 py-2.5 truncate max-w-[100px]">{o.customerName}</TableCell>
                        <TableCell className="text-muted-foreground text-center font-medium px-2 py-2.5">
                          {o.source || "-"}
                        </TableCell>
                        <TableCell className="text-center px-2 py-2.5 font-medium">{o.quantity}</TableCell>
                        
                        <TableCell className="text-center px-2 py-2.5">
                          {o.type === "ready_stock" ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-200 text-black">
                              Ready Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-300 text-neutral-900 border border-neutral-400/30">
                              Custom
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="text-center px-2 py-2.5">
                          <div className="flex justify-center scale-90 origin-center">
                            <StatusBadge status={o.status} />
                          </div>
                        </TableCell>
                        <TableCell className={cn("text-center px-2 py-2.5 font-medium", days <= 5 && (o.fastTrack ? "text-destructive font-semibold" : "text-warning font-semibold"))}>
                          H-{days}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-secondary" />
              <h2 className="font-bold text-foreground">Status Pengrajin</h2>
            </div>
            <div className="space-y-2.5">
              {pengrajin.map((p) => {
                const active = activeTaskMap.get(p.id) ?? 0;
                const cap = p.capacity ?? 5;
                const status = getCraftsmanStatus(p, active);
                return (
                  <div key={p.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{active}/{cap} task</p>
                    </div>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold",
                      status === "busy" ? "bg-destructive/15 text-destructive" :
                      status === "inactive" ? "bg-muted text-muted-foreground" : "bg-success/15 text-success"
                    )}>
                      <span className={cn("h-1.5 w-1.5 rounded-full",
                        status === "busy" ? "bg-destructive" :
                        status === "inactive" ? "bg-muted-foreground" : "bg-success"
                      )} />
                      {status === "busy" ? "Sibuk" : status === "inactive" ? "Nonaktif" : "Available"}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-secondary" />
              <h2 className="font-bold text-foreground">Notifikasi Terbaru</h2>
            </div>
            <div className="space-y-2">
              {allNotifs.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada notifikasi.</p>}
              {allNotifs.map((n) => (
                <div key={n.id} className={cn("p-2.5 rounded-lg text-xs", n.read ? "bg-muted/50" : "bg-primary/10 border border-primary/30")}>
                  <p className="font-semibold text-foreground">{n.title}</p>
                  <p className="text-muted-foreground mt-0.5">{n.message}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}