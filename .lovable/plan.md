## Ringkasan Perubahan

Migrasi besar: koneksi penuh ke Supabase (orders/products/users), terjemahan status produksi, hardcode sumber pesanan, dan refaktor logika kapasitas.

---

## 1. Database (Supabase Migration)

Buat tabel baru di Supabase + RLS publik (sesuai pola `order_sources`):

```text
products       (id, name, category, type, image, base_price, parts jsonb, stock, min_stock)
users_app      (id, username, password, name, role, specializations text[], avatar, capacity, active, joined_at)
orders         (id, code, type, product_id, product_name, quantity, customer_name,
                customer_phone, address, notes, fast_track, status, deadline,
                source text, resi, shipped_at, created_at, updated_at)
subtasks       (id, order_id, product_id, part_name, point, assigned_to, status,
                started_at, finished_at)
point_entries  (id, user_id, subtask_id, order_code, product_name, part_name, point, date)
notifications  (id, type, title, message, date, read, for_role)
```

- Tambahkan kolom `source text` pada `orders` (enum-like nilai: Instagram, Offline, Shopee, TikTok Shop, Tokopedia, WhatsApp, Owner).
- **Hapus** tabel `order_sources` + halaman CRUD-nya.
- Seed data dari `mockData.ts` agar app langsung berisi.
- Status disimpan dalam Bahasa Indonesia: `Antrean | Sedang Dikerjakan | Penyusunan | Siap Kirim | Selesai`.

## 2. Type & Status Mapping

Update `src/types/index.ts`:
```ts
type OrderStatus = "Antrean" | "Sedang Dikerjakan" | "Penyusunan" | "Siap Kirim" | "Selesai";
type SubTaskStatus = "Antrean" | "Sedang Dikerjakan" | "Selesai";
```
Sinkronkan di seluruh komponen: `StatusBadge`, `OrderCard`, `AdminDashboard` (chart), `PengrajinTasks`, `AdminOrders`, dll.

## 3. Sumber Pesanan (Hardcode)

- Hapus: `src/hooks/useOrderSources.ts`, `src/pages/admin/AdminOrderSources.tsx`, route, sidebar item, migrasi `order_sources` (drop table).
- Buat constant `src/lib/orderSources.ts`:
```ts
export const ORDER_SOURCES = [
  { name: "Instagram",   icon: "Instagram" },
  { name: "Offline",     icon: "Store" },
  { name: "Shopee",      icon: "ShoppingBag" },
  { name: "TikTok Shop", icon: "Music2" },
  { name: "Tokopedia",   icon: "ShoppingCart" },
  { name: "WhatsApp",    icon: "MessageCircle" },
  { name: "Owner",       icon: "Crown" },
];
```
- `NewOrderDialog` dropdown pakai list ini; simpan ke kolom `orders.source`.

## 4. Data Layer

Refactor `src/store/useStore.ts` → ganti dari Zustand-localStorage menjadi tipis (hanya state user login). CRUD langsung ke Supabase via hooks baru:
- `useOrders()` — list, create, update status, assign subtask
- `useProducts()`
- `useUsersApp()` (pengrajin)
- `useNotifications()`

Realtime: subscribe `postgres_changes` per tabel.

`addOrder`:
1. Insert order → dapat `id`.
2. Jika produk `complex` & `type=custom`: insert N subtasks (Kepala/Badan/Tangan/Kaki sesuai `parts`).
3. Jika produk `simple` & `type=custom`: insert 1 subtask.
4. `ready_stock`: tidak ada subtask, status = `Siap Kirim`.

## 5. Kapasitas Pengrajin

`src/lib/waitingList.ts`:
- `MAX_CAPACITY = 5` (default jika `capacity` user tidak diset).
- Saat assign subtask: cek `count(subtasks where assigned_to=user AND status IN ('Antrean','Sedang Dikerjakan')) < capacity`. Jika full → subtask tetap `assigned_to=null` & `status='Antrean'` masuk waiting list.
- `getRecommendations()` & `AdminSmartAssign` ikut pakai status baru.

## 6. UI/Mobile

- Audit string English tersisa → terjemahkan (tombol, header, toast, empty state).
- `StatusBadge` map warna untuk label baru.
- Verifikasi viewport 889px (mobile) — pastikan tabel & dialog scrollable.

## 7. Hapus / Bersihkan

- `src/data/mockData.ts` → hanya dipakai sebagai sumber seed (atau dihapus setelah seed).
- Halaman `AdminOrderSources` + route `/admin/order-sources` + nav item.
- Hook `useOrderSources` dan referensinya di `NewOrderDialog`, `OrderCard`, `AdminOrderDetail`.

---

## Catatan Teknis

- Karena belum ada Supabase Auth, RLS dibuat **permissive (USING true)** sementara — sama seperti pola `order_sources` saat ini. Akan diperketat saat auth penuh ditambahkan.
- Login mock (Zustand) tetap, tapi list user diambil dari `users_app` (bukan hardcoded `mockUsers`).
- Password disimpan plaintext sementara (sesuai pola sekarang) — tandai sebagai utang teknis.
- Migrasi akan di-seed dengan data dari `mockData.ts` agar UI tidak kosong setelah cutover.

---

## Urutan Eksekusi

1. Buat migrasi Supabase (tabel + drop `order_sources` + seed).
2. Update `types/index.ts` (status & Order.source).
3. Buat hooks data baru, hapus mock store.
4. Update form Tambah Pesanan + StatusBadge + halaman yang menampilkan status.
5. Refactor logika kapasitas + waiting list.
6. Hapus halaman/route Sumber Pesanan.
7. Audit terjemahan & responsive mobile.
