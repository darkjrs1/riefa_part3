import { Notification, Order, Product, Role } from "@/types";
import { countActiveCustomOrders } from "./waitingList";

const daysUntil = (iso: string) =>
  Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

/**
 * Auto-derived notifications:
 * - FR-43: Deadline H-5 (kuning Regular / merah Fast Track)
 * - FR-44: Waiting List overload (>10 custom aktif)
 * - FR-45: Stok menipis / habis (max 3 — lihat FR-10)
 */
export const buildAutoNotifications = (orders: Order[], products: Product[]): Notification[] => {
  const out: Notification[] = [];

  // Deadline H-5 (FR-43)
  orders.forEach((o) => {
    if (o.status === "Selesai" || o.status === "Siap Kirim") return;
    const d = daysUntil(o.deadline);
    if (d <= 5 && d >= -7) {
      out.push({
        id: `auto-deadline-${o.id}`,
        type: "deadline",
        title: o.fastTrack ? `🚨 Deadline H-${Math.max(d, 0)} (Fast Track)` : `Deadline H-${Math.max(d, 0)}`,
        message: `${o.code} — ${o.productName} • ${d < 0 ? `Telat ${Math.abs(d)} hari` : `${d} hari lagi`} (${o.customerName})`,
        date: new Date().toISOString(),
        read: false,
        forRole: "all",
      });
    }
  });

  // Stok menipis / habis (FR-45) — max 3 yang ditampilkan
  const low = products
    .filter((p) => p.stock <= p.minStock)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 3);
  low.forEach((p) => {
    out.push({
      id: `auto-stock-${p.id}`,
      type: "stock_low",
      title: p.stock === 0 ? `Stok Habis: ${p.name}` : `Stok Menipis: ${p.name}`,
      message: `Tersisa ${p.stock} pcs (min. ${p.minStock}). Segera produksi ulang.`,
      date: new Date().toISOString(),
      read: false,
      forRole: "all",
    });
  });

  // Waiting list overload (FR-44)
  const customActive = countActiveCustomOrders(orders);
  if (customActive > 10) {
    out.push({
      id: "auto-overload",
      type: "info",
      title: "⚠️ Daftar Tunggu Penuh",
      message: `${customActive} custom order aktif (batas 10). Tambahkan pengrajin atau jeda menerima order baru.`,
      date: new Date().toISOString(),
      read: false,
      forRole: "all",
    });
  }

  return out;
};

export const filterByRole = (n: Notification[], role: Role) =>
  n.filter((x) => x.forRole === role || x.forRole === "all");