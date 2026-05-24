import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Notification, Order, PointEntry, Product, Specialization, SubTask, User } from "@/types";
import { supabase } from "@/integrations/supabase/client";

// ===== Mappers DB <-> App =====
const mapUser = (r: any): User => ({
  id: r.id,
  username: r.username,
  password: r.password,
  name: r.name,
  role: r.role,
  specializations: r.specializations ?? [],
  avatar: r.avatar ?? undefined,
  capacity: r.capacity ?? 5,
  active: r.active,
  joinedAt: r.joined_at ?? r.created_at,
});

const mapProduct = (r: any): Product => ({
  id: r.id,
  name: r.name,
  category: r.category,
  type: r.type,
  image: r.image,
  basePrice: r.base_price,
  parts: r.parts ?? [],
  stock: r.stock,
  minStock: r.min_stock,
});

const mapSubtask = (r: any): SubTask => ({
  id: r.id,
  orderId: r.order_id,
  productId: r.product_id,
  partName: r.part_name,
  point: r.point ?? 0,
  assignedTo: r.assigned_to ?? undefined,
  status: r.status,
  startedAt: r.started_at ?? undefined,
  finishedAt: r.finished_at ?? undefined,
});

const mapOrder = (r: any, subs: SubTask[]): Order => ({
  id: r.id,
  code: r.code,
  type: r.type,
  productId: r.product_id,
  productName: r.product_name,
  quantity: r.quantity,
  customerName: r.customer_name,
  customerPhone: r.customer_phone,
  address: r.address,
  notes: r.notes ?? undefined,
  fastTrack: r.fast_track,
  status: r.status,
  createdAt: r.created_at,
  deadline: r.deadline,
  resi: r.resi ?? undefined,
  shippedAt: r.shipped_at ?? undefined,
  source: r.source ?? undefined,
  subtasks: subs.filter((s) => s.orderId === r.id),
});

const mapPoint = (r: any): PointEntry => ({
  id: r.id,
  userId: r.user_id,
  subtaskId: r.subtask_id,
  orderCode: r.order_code,
  productName: r.product_name,
  partName: r.part_name,
  point: r.point,
  date: r.date,
});

const mapNotif = (r: any): Notification => ({
  id: r.id,
  type: r.type,
  title: r.title,
  message: r.message,
  date: r.date,
  read: r.read,
  forRole: r.for_role,
});

const code = (n: number) => {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2); 
  const month = String(now.getMonth() + 1).padStart(2, "0"); 
  const orderNum = String(n).padStart(4, "0"); 
  
  return `ORD-${year}${month}-${orderNum}`;
};

const newId = (prefix: string) => `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;

export interface MasterSkill {
  id: string;
  name: string;
  default_price: number;
}

export type OrderFormInput = Omit<Order, "id" | "code" | "createdAt" | "subtasks" | "status" | "productName"> & { 
  status?: Order["status"]; 
  productName?: string; // Kita buat opsional (?) agar NewOrderDialog tidak error merah lagi
};

interface State {
  currentUser: User | null;
  users: User[];
  products: Product[];
  orders: Order[];
  points: PointEntry[];
  notifications: Notification[];
  skills: MasterSkill[];
  loading: boolean;

  bootstrap: () => Promise<void>;
  setProducts: (products: Product[]) => void;

  login: (username: string, password: string) => Promise<User | null>;
  logout: () => void;
  
  addOrder: (o: OrderFormInput) => Promise<void>;
  updateOrder: (id: string, updates: OrderFormInput) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  
  assignSubtask: (orderId: string, subtaskId: string, userId: string) => Promise<void>;
  unassignSubtask: (orderId: string, subtaskId: string) => Promise<void>;
  startSubtask: (subtaskId: string) => Promise<void>;
  finishSubtask: (subtaskId: string) => Promise<void>;
  finishAssembly: (orderId: string) => Promise<void>;
  setResi: (orderId: string, resi: string) => Promise<void>;

  addProduct: (p: Omit<Product, "id">) => Promise<void>;
  updateProduct: (id: string, patch: Partial<Omit<Product, "id text">>) => Promise<void>;
  addStock: (productId: string, qty: number) => Promise<void>;
  updateProductStock: (productId: string, delta: number) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (role?: User["role"]) => void;

  addUser: (u: Omit<User, "id" | "joinedAt">) => Promise<{ ok: boolean; message?: string }>;
  updateUser: (id: string, patch: Partial<Omit<User, "id" | "role" | "joinedAt">>) => Promise<{ ok: boolean; message?: string }>;
  toggleUserActive: (id: string) => Promise<{ ok: boolean; message?: string }>;
  deleteUser: (id: string) => Promise<{ ok: boolean; message?: string }>;
  addMasterSkill: (name: string, defaultPrice: number) => Promise<{ ok: boolean; message?: string }>;
  updateMasterSkill: (id: string, name: string, defaultPrice: number) => Promise<{ ok: boolean; message?: string }>;
  deleteMasterSkill: (id: string) => Promise<{ ok: boolean; message?: string }>;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: [],
      products: [],
      orders: [],
      points: [],
      notifications: [],
      skills: [],
      loading: false,

      bootstrap: async () => {
        set({ loading: true });
        try {
          const [usersRes, prodRes, orderRes, subRes, ptRes, notifRes, skillRes] = await Promise.all([
            supabase.from("users_app").select("*"),
            supabase.from("products").select("*"),
            supabase.from("orders").select("*").order("created_at", { ascending: true }),
            supabase.from("subtasks").select("*"),
            supabase.from("point_entries").select("*").order("date", { ascending: false }),
            supabase.from("notifications").select("*").order("date", { ascending: false }),
            supabase.from("master_skills").select("id, name, default_price").order("name", { ascending: true }),
          ]);
          const subs = (subRes.data ?? []).map(mapSubtask);
          const loadedSkills = skillRes.data ? (skillRes.data as MasterSkill[]) : [];
          set({
            users: (usersRes.data ?? []).map(mapUser),
            products: (prodRes.data ?? []).map(mapProduct),
            orders: (orderRes.data ?? []).map((r) => mapOrder(r, subs)),
            points: (ptRes.data ?? []).map(mapPoint),
            notifications: (notifRes.data ?? []).map(mapNotif),
            skills: loadedSkills,
            loading: false,
          });

          const refreshOrders = async () => {
            const [orderRes, subRes] = await Promise.all([
              supabase.from("orders").select("*").order("created_at", { ascending: true }),
              supabase.from("subtasks").select("*"),
            ]);
            const subs = (subRes.data ?? []).map(mapSubtask);
            set({ orders: (orderRes.data ?? []).map((r) => mapOrder(r, subs)) });
          };

          supabase.channel("knitflow")
            .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, refreshOrders)
            .on("postgres_changes", { event: "*", schema: "public", table: "subtasks" }, refreshOrders)
            .on("postgres_changes", { event: "*", schema: "public", table: "products" }, async () => {
              const r = await supabase.from("products").select("*");
              set({ products: (r.data ?? []).map(mapProduct) });
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "users_app" }, async () => {
              const r = await supabase.from("users_app").select("*");
              set({ users: (r.data ?? []).map(mapUser) });
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "master_skills" }, async () => {
              const r = await supabase.from("master_skills").select("id, name, default_price").order("name", { ascending: true });
              if (r.data) set({ skills: r.data as MasterSkill[] });
            })
            .subscribe();
        } catch (error) {
          console.error("Bootstrap error:", error);
          set({ loading: false });
        }
      },

      setProducts: (products) => set({ products }),

      login: async (username, password) => {
        if (get().users.length === 0) await get().bootstrap();
        const u = get().users.find((x) => x.username === username && x.password === password);
        if (u && u.active === false) return null;
        if (u) set({ currentUser: u });
        return u ?? null;
      },
      logout: () => set({ currentUser: null }),

      addOrder: async (o) => {
        const product = get().products.find((p) => p.id === o.productId);
        if (!product) return;
        let effType = o.type;
        if (effType === "ready_stock" && product.stock < o.quantity) {
          effType = "custom";
        }
        
        const effFastTrack = effType === "ready_stock" ? false : o.fastTrack;

        const now = new Date();
        const currentYearMonthPrefix = `ORD-${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}-`;

        let nextNum = 1;
        const currentMonthOrders = get().orders.filter((order) => 
          order.code.startsWith(currentYearMonthPrefix)
        );
        if (currentMonthOrders.length > 0) {
          const codes = currentMonthOrders.map((order) => {
            const numPart = order.code.replace(currentYearMonthPrefix, "");
            const num = parseInt(numPart, 10);
            return isNaN(num) ? 0 : num;
          });
          nextNum = Math.max(...codes) + 1;
        }
        
        const orderCode = code(nextNum);
        const id = newId("o");
        const status: Order["status"] = effType === "ready_stock" ? "Siap Kirim" : "Antrean";
        const formattedDeadline = o.deadline ? new Date(o.deadline).toISOString() : new Date().toISOString();
        const nowTimestamp = new Date().toISOString();
        const dbData = {
          id, 
          code: orderCode, 
          type: effType,
          product_id: product.id, 
          product_name: product.name,
          quantity: o.quantity,
          customer_name: o.customerName, 
          customer_phone: o.customerPhone, 
          address: o.address,
          notes: o.notes ?? "", 
          fast_track: effFastTrack, 
          status,
          source: o.source ?? null,
          deadline: formattedDeadline,
          resi: null,
          shipped_at: null,
          created_at: nowTimestamp,
          updated_at: nowTimestamp
        };
        const { error: oErr } = await supabase.from("orders").insert(dbData);
        
        if (oErr) { 
          console.error("Supabase Error saat simpan data order:", oErr);
          throw oErr; 
        }

        let tempSubtasks: SubTask[] = [];
        if (effType !== "ready_stock") {
          const subs = product.parts.map((part) => ({
            id: `${id}-${part.name}`,
            order_id: id,
            product_id: product.id,
            part_name: part.name,
            point: part.point ?? 0,
            status: "Antrean" as const,
          }));
          if (subs.length) {
            const { error: subErr } = await supabase.from("subtasks").insert(subs);
            if (!subErr) {
              tempSubtasks = subs.map(s => ({
                id: s.id,
                orderId: s.order_id,
                productId: s.product_id,
                partName: s.part_name,
                point: s.point ?? 0,
                status: s.status,
              }));
            }
          }
        } else {
          await get().updateProductStock(product.id, -o.quantity);
        }

        const newOrderObj = mapOrder(dbData, tempSubtasks);
        set((state) => ({
          orders: [...state.orders, newOrderObj]
        }));
      },

      updateOrder: async (id, updates) => {
        const oldOrder = get().orders.find((o) => o.id === id);
        const product = get().products.find((p) => p.id === updates.productId);
        const productName = product ? product.name : undefined;
        const nowTimestamp = new Date().toISOString();

        const finalFastTrack = updates.type === "ready_stock" ? false : updates.fastTrack;

        let nextStatus = oldOrder?.status ?? "Antrean";
        if (oldOrder && oldOrder.type !== "ready_stock" && updates.type === "ready_stock") {
          nextStatus = "Siap Kirim";
        } else if (oldOrder && oldOrder.type === "ready_stock" && updates.type !== "ready_stock") {
          nextStatus = "Antrean";
        }

        const { error } = await supabase
          .from("orders")
          .update({
            product_id: updates.productId,
            product_name: productName, 
            quantity: updates.quantity,
            customer_name: updates.customerName,
            customer_phone: updates.customerPhone,
            address: updates.address,
            notes: updates.notes ?? "",
            type: updates.type,
            fast_track: finalFastTrack, 
            deadline: updates.deadline,
            source: updates.source ?? null,
            status: nextStatus,
            updated_at: nowTimestamp
          })
          .eq("id", id);

        if (error) throw error;

        let updatedSubtasks: SubTask[] = oldOrder ? [...oldOrder.subtasks] : [];

        if (oldOrder && oldOrder.type !== "ready_stock" && updates.type === "ready_stock") {
          await supabase.from("subtasks").delete().eq("order_id", id);
          updatedSubtasks = [];
        } 
        else if (oldOrder && oldOrder.type === "ready_stock" && updates.type !== "ready_stock" && product) {
          const newSubs = product.parts.map((part) => ({
            id: `${id}-${part.name}`,
            order_id: id,
            product_id: product.id,
            part_name: part.name,
            point: part.point ?? 0,
            status: "Antrean" as const,
          }));

          if (newSubs.length) {
            await supabase.from("subtasks").delete().eq("order_id", id);
            const { error: insErr } = await supabase.from("subtasks").insert(newSubs);
            if (!insErr) {
              updatedSubtasks = newSubs.map((s) => ({
                id: s.id,
                orderId: s.order_id,
                productId: s.product_id,
                partName: s.part_name,
                point: s.point,
                status: s.status,
              }));
            }
          }
        }

        if (oldOrder) {
          if (oldOrder.type !== "ready_stock" && updates.type === "ready_stock") {
            await get().updateProductStock(updates.productId, -updates.quantity);
          }
          else if (oldOrder.type === "ready_stock" && updates.type !== "ready_stock") {
            if (oldOrder.status !== "Selesai") {
              await get().updateProductStock(oldOrder.productId, oldOrder.quantity);
            }
          }
          else if (oldOrder.type === "ready_stock" && updates.type === "ready_stock") {
            if (oldOrder.productId === updates.productId) {
              const delta = oldOrder.quantity - updates.quantity;
              if (delta !== 0) {
                await get().updateProductStock(updates.productId, delta);
              }
            } else {
              if (oldOrder.status !== "Selesai") {
                await get().updateProductStock(oldOrder.productId, oldOrder.quantity);
              }
              await get().updateProductStock(updates.productId, -updates.quantity);
            }
          }
        }

        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === id
              ? {
                  ...order,
                  productId: updates.productId,
                  productName: productName ?? order.productName,
                  quantity: Number(updates.quantity),
                  customerName: updates.customerName,
                  customerPhone: updates.customerPhone,
                  address: updates.address,
                  notes: updates.notes,
                  type: updates.type,
                  fastTrack: finalFastTrack, 
                  deadline: updates.deadline,
                  source: updates.source,
                  status: nextStatus,
                  subtasks: updatedSubtasks
                }
              : order
          ),
        }));
      },

      deleteOrder: async (id) => {
        const orderToDelete = get().orders.find((o) => o.id === id);

        const { error: subtasksError } = await supabase
          .from("subtasks")
          .delete()
          .eq("order_id", id);
        if (subtasksError) throw subtasksError;

        const { error: orderError } = await supabase
          .from("orders")
          .delete()
          .eq("id", id);
        if (orderError) throw orderError;

        if (orderToDelete && orderToDelete.type === "ready_stock") {
          if (orderToDelete.status !== "Selesai") {
            await get().updateProductStock(orderToDelete.productId, orderToDelete.quantity);
          }
        }

        set((state) => ({
          orders: state.orders.filter((order) => order.id !== id),
        }));
      },

      assignSubtask: async (orderId, subtaskId, userId) => {
        const { error } = await supabase
          .from("subtasks")
          .update({ assigned_to: userId, status: "Antrean", started_at: null })
          .eq("id", subtaskId);
        if (error) throw error;

        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  subtasks: o.subtasks.map((s) =>
                    s.id === subtaskId ? { ...s, assignedTo: userId, status: "Antrean", startedAt: undefined } : s
                  ),
                }
              : o
          ),
        }));
      },

      unassignSubtask: async (orderId, subtaskId) => {
        const { error } = await supabase
          .from("subtasks")
          .update({ assigned_to: null, status: "Antrean", started_at: null })
          .eq("id", subtaskId);
        if (error) throw error;

        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  subtasks: o.subtasks.map((s) =>
                    s.id === subtaskId ? { ...s, assignedTo: undefined, status: "Antrean", startedAt: undefined } : s
                  ),
                }
              : o
          ),
        }));
      },

      startSubtask: async (subtaskId) => {
        const now = new Date().toISOString();
        const { error } = await supabase
          .from("subtasks")
          .update({ status: "Sedang Dikerjakan", started_at: now })
          .eq("id", subtaskId);
        if (error) throw error;

        const order = get().orders.find((o) => o.subtasks.some((s) => s.id === subtaskId));
        let nextOrderStatus = order ? order.status : "Antrean";
        
        if (order && order.status === "Antrean") {
          nextOrderStatus = "Sedang Dikerjakan";
          await supabase.from("orders").update({ status: "Sedang Dikerjakan", updated_at: now }).eq("id", order.id);
        }

        set((state) => ({
          orders: state.orders.map((o) =>
            order && o.id === order.id
              ? {
                  ...o,
                  status: nextOrderStatus,
                  subtasks: o.subtasks.map((s) =>
                    s.id === subtaskId ? { ...s, status: "Sedang Dikerjakan", startedAt: now } : s
                  ),
                }
              : o
          ),
        }));
      },

      finishSubtask: async (subtaskId) => {
        const now = new Date().toISOString();
        const order = get().orders.find((o) => o.subtasks.some((s) => s.id === subtaskId));
        const sub = order?.subtasks.find((s) => s.id === subtaskId);
        if (!order || !sub) return;

        const { error } = await supabase
          .from("subtasks")
          .update({ status: "Selesai", finished_at: now })
          .eq("id", subtaskId);
        if (error) throw error;

        if (sub.assignedTo) {
          const ptId = newId("pt");
          const newPt = {
            id: ptId, user_id: sub.assignedTo, subtask_id: sub.id, order_code: order.code,
            product_name: order.productName, part_name: sub.partName, point: sub.point, date: now,
          };
          await supabase.from("point_entries").insert(newPt);
          set((state) => ({ points: [mapPoint(newPt), ...state.points] }));
        }

        const updatedSubtasks = order.subtasks.map((s) =>
          s.id === subtaskId ? { ...s, status: "Selesai" as const, finishedAt: now } : s
        );

        const allDone = updatedSubtasks.every((s) => s.status === "Selesai");
        let nextOrderStatus = order.status;

        if (allDone) {
          nextOrderStatus = "Penyusunan";
          await supabase.from("orders").update({ status: "Penyusunan", updated_at: now }).eq("id", order.id);
        }

        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === order.id
              ? {
                  ...o,
                  status: nextOrderStatus,
                  subtasks: updatedSubtasks,
                }
              : o
          ),
        }));
      },

      finishAssembly: async (orderId) => {
        const now = new Date().toISOString();
        const { error } = await supabase
          .from("orders")
          .update({ status: "Siap Kirim", updated_at: now })
          .eq("id", orderId);
        if (error) throw error;

        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, status: "Siap Kirim" } : o
          ),
        }));
      },

      setResi: async (orderId, resi) => {
        const now = new Date().toISOString();
        const { error } = await supabase
          .from("orders")
          .update({
            resi, 
            status: "Selesai", 
            shipped_at: now, 
            updated_at: now
          })
          .eq("id", orderId);
        if (error) throw error;

        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  resi,
                  status: "Selesai",
                  shippedAt: now,
                }
              : order
          ),
        }));
      },

      addProduct: async (p) => {
        const id = newId("p");
        const dbData = {
          id, name: p.name, category: p.category, type: p.type, image: p.image,
          base_price: p.basePrice, parts: p.parts as any, stock: p.stock, min_stock: p.minStock,
        };
        const { error } = await supabase.from("products").insert(dbData);
        if (error) throw error;
        set((state) => ({ products: [...state.products, mapProduct(dbData)] }));
      },

      updateProduct: async (id, patch) => {
        const cur = get().products.find((x) => x.id === id);
        const newType = patch.parts !== undefined ? (patch.parts.length > 1 ? "complex" : "simple") : cur?.type;
        const dbPatch: any = {};
        if (patch.name !== undefined) dbPatch.name = patch.name;
        if (patch.category !== undefined) dbPatch.category = patch.category;
        if (patch.image !== undefined) dbPatch.image = patch.image;
        if (patch.basePrice !== undefined) dbPatch.base_price = patch.basePrice;
        if (patch.parts !== undefined) { dbPatch.parts = patch.parts; dbPatch.type = newType; }
        if (patch.stock !== undefined) dbPatch.stock = patch.stock;
        if (patch.minStock !== undefined) dbPatch.min_stock = patch.minStock;

        const { error } = await supabase.from("products").update(dbPatch).eq("id", id);
        if (error) throw error;
        set((state) => ({
          products: state.products.map((p) => p.id === id ? { ...p, ...patch, type: newType } : p)
        }));
      },

      addStock: async (productId, qty) => {
        if (qty <= 0) return;
        await get().updateProductStock(productId, qty);
      },

      updateProductStock: async (productId, delta) => {
        const p = get().products.find((x) => x.id === productId);
        if (!p) return;
        const newStock = Math.max(0, p.stock + delta);
        const { error } = await supabase.from("products").update({ stock: newStock }).eq("id", productId);
        if (!error) {
          set((state) => ({
            products: state.products.map((prod) => prod.id === productId ? { ...prod, stock: newStock } : prod)
          }));
        }
      },

      deleteProduct: async (id) => {
        const { error } = await supabase.from("products").delete().eq("id", id);
        if (error) throw error;
        set((state) => ({ products: state.products.filter((p) => p.id !== id) }));
      },

      markNotificationRead: (id) =>
        set({ notifications: get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }),

      markAllNotificationsRead: (role) =>
        set({
          notifications: get().notifications.map((n) => !role || n.forRole === role || n.forRole === "all" ? { ...n, read: true } : n),
        }),

      addUser: async (u) => {
        const username = u.username.trim().toLowerCase();
        if (!username || !u.name.trim() || !u.password) {
          return { ok: false, message: "Nama, username, dan password wajib diisi." };
        }
        if (get().users.some((x) => x.username.toLowerCase() === username)) {
          return { ok: false, message: "Username sudah dipakai." };
        }
        const id = newId("u");
        const joined_at = new Date().toISOString();
        const newUserObj = {
          id, username, password: u.password, name: u.name.trim(), role: u.role,
          specializations: (u.specializations ?? []) as any, capacity: u.capacity ?? 5,
          active: true, joined_at,
        };
        const { error } = await supabase.from("users_app").insert(newUserObj);
        if (error) return { ok: false, message: error.message };
        set((state) => ({ users: [...state.users, mapUser(newUserObj)] }));
        return { ok: true };
      },

      updateUser: async (id, patch) => {
        const exists = get().users.find((x) => x.id === id);
        if (!exists) return { ok: false, message: "Pengrajin tidak ditemukan." };
        const dbPatch: any = {};
        if (patch.username) {
          const uname = patch.username.trim().toLowerCase();
          if (get().users.some((x) => x.id !== id && x.username.toLowerCase() === uname)) {
            return { ok: false, message: "Username sudah dipakai." };
          }
          dbPatch.username = uname;
        }
        if (patch.name !== undefined) dbPatch.name = patch.name.trim();
        if (patch.password !== undefined) dbPatch.password = patch.password;
        if (patch.specializations !== undefined) dbPatch.specializations = patch.specializations;
        if (patch.capacity !== undefined) dbPatch.capacity = patch.capacity;
        if (patch.avatar !== undefined) dbPatch.avatar = patch.avatar;
        if (patch.active !== undefined) dbPatch.active = patch.active;

        const { error } = await supabase.from("users_app").update(dbPatch).eq("id", id);
        if (error) return { ok: false, message: error.message };

        set((state) => ({ users: state.users.map((u) => u.id === id ? { ...u, ...patch } : u) }));
        return { ok: true };
      },

      toggleUserActive: async (id) => {
        const u = get().users.find((x) => x.id === id);
        if (!u) return { ok: false, message: "Pengrajin tidak ditemukan." };
        const willDeactivate = u.active !== false;
        if (willDeactivate) {
          const hasActive = get().orders.some((o) => o.subtasks.some((s) => s.assignedTo === id && s.status !== "Selesai") );
          if (hasActive) {
            return { ok: false, message: "Tidak bisa menonaktifkan: pengrajin masih punya task aktif." };
          }
        }
        const nextStatus = !willDeactivate;
        const { error } = await supabase.from("users_app").update({ active: nextStatus }).eq("id", id);
        if (error) return { ok: false, message: error.message };
        set((state) => ({ users: state.users.map((user) => user.id === id ? { ...user, active: nextStatus } : user ) }));
        return { ok: true };
      },

      deleteUser: async (id) => {
        const user = get().users.find((x) => x.id === id);
        if (!user) return { ok: false, message: "Pengrajin tidak ditemukan." };
        const hasActive = get().orders.some((o) => o.subtasks.some((s) => s.assignedTo === id && s.status !== "Selesai") );
        if (hasActive) {
          return { ok: false, message: "Tidak bisa menghapus: pengrajin masih punya task aktif." };
        }
        const { error } = await supabase.from("users_app").delete().eq("id", id);
        if (error) return { ok: false, message: error.message };

        set((state) => ({ users: state.users.filter((u) => u.id !== id) }));
        return { ok: true };
      },

      addMasterSkill: async (name, defaultPrice) => {
        const cleaned = name.trim();
        if (!cleaned) return { ok: false, message: "Nama tidak boleh kosong" };
        const { data, error } = await supabase
          .from("master_skills")
          .insert([{ name: cleaned, default_price: defaultPrice }])
          .select();
        if (error) return { ok: false, message: "Gagal menyimpan ke database" };
        if (data) {
          set((state) => ({ 
            skills: [...state.skills, data[0] as MasterSkill].sort((a, b) => a.name.localeCompare(b.name)) 
          }));
        }
        return { ok: true };
      },

      updateMasterSkill: async (id, newName, newPrice) => {
        const cleaned = newName.trim();
        if (!cleaned) return { ok: false, message: "Nama tidak boleh kosong" };
        const { error } = await supabase
          .from("master_skills")
          .update({ name: cleaned, default_price: newPrice })
          .eq("id", id);
        if (error) return { ok: false, message: "Gagal memperbarui ke database" };
        set((state) => ({
          skills: state.skills
            .map((s) => s.id === id ? { ...s, name: cleaned, default_price: newPrice } : s)
            .sort((a, b) => a.name.localeCompare(b.name))
        }));
        return { ok: true };
      },

      deleteMasterSkill: async (id) => {
        const { error } = await supabase.from("master_skills").delete().eq("id", id);
        if (error) return { ok: false, message: "Gagal menghapus dari database" };
        set((state) => ({ skills: state.skills.filter((s) => s.id !== id) }));
        return { ok: true };
      },
    }),
    {
      name: "knitflow-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ currentUser: s.currentUser }),
    }
  )
);

export const daysUntil = (iso: string) => {
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

export const formatRupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);