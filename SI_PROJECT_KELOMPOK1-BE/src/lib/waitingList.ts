import { Order, SubTask, User } from "@/types";

export interface WaitingItem {
  order: Order;
  subtask: SubTask;
  daysToDeadline: number;
}

/**
 * Sub-task yang masuk Waiting List (FR-21):
 * - Belum di-assign ke pengrajin
 * - Order belum selesai
 * Diurutkan: Fast Track dulu, lalu deadline terdekat (FR-22)
 */
export const getWaitingList = (orders: Order[]): WaitingItem[] => {
  const items: WaitingItem[] = [];
  orders.forEach((o) => {
    if (o.status === "Selesai" || o.status === "Siap Kirim") return;
    o.subtasks.forEach((s) => {
      if (!s.assignedTo && s.status === "Antrean") {
        const days = Math.ceil((new Date(o.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        items.push({ order: o, subtask: s, daysToDeadline: days });
      }
    });
  });
  return items.sort((a, b) => {
    if (a.order.fastTrack !== b.order.fastTrack) return a.order.fastTrack ? -1 : 1;
    return a.daysToDeadline - b.daysToDeadline;
  });
};

/** Pengrajin yang bisa dipilih untuk subtask (Available + spesialisasi cocok + aktif) */
export const getAvailablePengrajin = (
  users: User[],
  orders: Order[],
  partName: string
) => {
  const counts = countActiveTasks(orders);
  return users.filter(
    (u) =>
      u.role === "pengrajin" &&
      u.active !== false &&
      u.specializations?.includes(partName as never) &&
      (counts.get(u.id) ?? 0) < (u.capacity ?? 5)
  );
};

/** Jumlah custom order aktif (untuk overload alert FR-44, max 10) */
export const countActiveCustomOrders = (orders: Order[]) =>
  orders.filter((o) => o.type === "custom" && o.status !== "Selesai").length;

/** Hitung jumlah subtask aktif (assigned & belum selesai) per pengrajin */
export const countActiveTasks = (orders: Order[]): Map<string, number> => {
  const m = new Map<string, number>();
  orders.forEach((o) =>
    o.subtasks.forEach((s) => {
      if (s.assignedTo && s.status !== "Selesai") {
        m.set(s.assignedTo, (m.get(s.assignedTo) ?? 0) + 1);
      }
    })
  );
  return m;
};

export type CraftsmanStatus = "available" | "busy" | "inactive";

export const getCraftsmanStatus = (
  user: User,
  activeCount: number
): CraftsmanStatus => {
  if (user.active === false) return "inactive";
  const cap = user.capacity ?? 5;
  if (cap <= 0) return "busy";
  return activeCount >= cap ? "busy" : "available";
};

/**
 * Smart Assignment: rank pengrajin untuk subtask tertentu.
 * Score = skill match (2 exact / 1 partial) + capacity headroom bonus.
 */
export interface Recommendation {
  user: User;
  score: number;
  skillMatch: "high" | "low" | "none";
  capacityOk: boolean;
  active: number;
  capacity: number;
}

export const getRecommendations = (
  users: User[],
  orders: Order[],
  partName: string
): Recommendation[] => {
  const counts = countActiveTasks(orders);
  return users
    .filter((u) => u.role === "pengrajin" && u.active !== false)
    .map<Recommendation>((u) => {
      const cap = u.capacity ?? 5;
      const active = counts.get(u.id) ?? 0;
      const exact = u.specializations?.includes(partName as never);
      const partial = !exact && (u.specializations?.length ?? 0) > 0;
      const skillScore = exact ? 6 : partial ? 3 : 0;
      const capScore = cap > 0 ? Math.max(0, cap - active) : -5;
      return {
        user: u,
        score: skillScore + capScore,
        skillMatch: exact ? "high" : partial ? "low" : "none",
        capacityOk: active < cap,
        active,
        capacity: cap,
      };
    })
    .sort((a, b) => b.score - a.score);
};