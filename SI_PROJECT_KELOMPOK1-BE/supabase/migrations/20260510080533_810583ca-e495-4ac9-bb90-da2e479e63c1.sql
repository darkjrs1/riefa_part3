
-- Drop order_sources (CRUD removed; daftar sumber pesanan jadi hardcode)
DROP TABLE IF EXISTS public.order_sources CASCADE;

-- ===== USERS APP (login mock + pengrajin) =====
CREATE TABLE public.users_app (
  id text PRIMARY KEY,
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin','pengrajin','owner')),
  specializations text[] NOT NULL DEFAULT '{}',
  avatar text,
  capacity integer NOT NULL DEFAULT 5,
  active boolean NOT NULL DEFAULT true,
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.users_app ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_app_all_select" ON public.users_app FOR SELECT USING (true);
CREATE POLICY "users_app_all_insert" ON public.users_app FOR INSERT WITH CHECK (true);
CREATE POLICY "users_app_all_update" ON public.users_app FOR UPDATE USING (true);
CREATE POLICY "users_app_all_delete" ON public.users_app FOR DELETE USING (true);
CREATE TRIGGER trg_users_app_updated BEFORE UPDATE ON public.users_app FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== PRODUCTS =====
CREATE TABLE public.products (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  type text NOT NULL CHECK (type IN ('simple','complex')),
  image text NOT NULL DEFAULT '📦',
  base_price integer NOT NULL DEFAULT 0,
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  stock integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_all_select" ON public.products FOR SELECT USING (true);
CREATE POLICY "products_all_insert" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "products_all_update" ON public.products FOR UPDATE USING (true);
CREATE POLICY "products_all_delete" ON public.products FOR DELETE USING (true);
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== ORDERS =====
CREATE TABLE public.orders (
  id text PRIMARY KEY,
  code text UNIQUE NOT NULL,
  type text NOT NULL CHECK (type IN ('custom','ready_stock')),
  product_id text NOT NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  address text NOT NULL,
  notes text,
  fast_track boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'Antrean' CHECK (status IN ('Antrean','Sedang Dikerjakan','Penyusunan','Siap Kirim','Selesai')),
  source text,
  deadline timestamptz NOT NULL,
  resi text,
  shipped_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_all_select" ON public.orders FOR SELECT USING (true);
CREATE POLICY "orders_all_insert" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "orders_all_update" ON public.orders FOR UPDATE USING (true);
CREATE POLICY "orders_all_delete" ON public.orders FOR DELETE USING (true);
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_orders_status ON public.orders(status);

-- ===== SUBTASKS =====
CREATE TABLE public.subtasks (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  part_name text NOT NULL,
  point integer NOT NULL DEFAULT 0,
  assigned_to text,
  status text NOT NULL DEFAULT 'Antrean' CHECK (status IN ('Antrean','Sedang Dikerjakan','Selesai')),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subtasks_all_select" ON public.subtasks FOR SELECT USING (true);
CREATE POLICY "subtasks_all_insert" ON public.subtasks FOR INSERT WITH CHECK (true);
CREATE POLICY "subtasks_all_update" ON public.subtasks FOR UPDATE USING (true);
CREATE POLICY "subtasks_all_delete" ON public.subtasks FOR DELETE USING (true);
CREATE TRIGGER trg_subtasks_updated BEFORE UPDATE ON public.subtasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_subtasks_order ON public.subtasks(order_id);
CREATE INDEX idx_subtasks_assigned ON public.subtasks(assigned_to);

-- ===== POINT ENTRIES (upah) =====
CREATE TABLE public.point_entries (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  subtask_id text NOT NULL,
  order_code text NOT NULL,
  product_name text NOT NULL,
  part_name text NOT NULL,
  point integer NOT NULL DEFAULT 0,
  date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.point_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "points_all_select" ON public.point_entries FOR SELECT USING (true);
CREATE POLICY "points_all_insert" ON public.point_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "points_all_delete" ON public.point_entries FOR DELETE USING (true);

-- ===== NOTIFICATIONS =====
CREATE TABLE public.notifications (
  id text PRIMARY KEY,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  date timestamptz NOT NULL DEFAULT now(),
  read boolean NOT NULL DEFAULT false,
  for_role text NOT NULL DEFAULT 'all',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifs_all_select" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "notifs_all_insert" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notifs_all_update" ON public.notifications FOR UPDATE USING (true);
CREATE POLICY "notifs_all_delete" ON public.notifications FOR DELETE USING (true);

-- ===== SEED USERS =====
INSERT INTO public.users_app (id, username, password, name, role, specializations, capacity, joined_at) VALUES
  ('u1','admin','admin123','Rifa Admin','admin','{}',5,'2024-01-15'),
  ('u2','owner','owner123','Bu Rifa','owner','{}',5,'2023-08-01'),
  ('u3','siti','siti123','Siti Aminah','pengrajin','{Kepala,Badan}',5,'2024-02-10'),
  ('u4','ningsih','ning123','Ningsih','pengrajin','{Tangan,Kaki}',5,'2024-03-05'),
  ('u5','wati','wati123','Wati Lestari','pengrajin','{Tas,Aksesoris}',5,'2024-01-20'),
  ('u6','rina','rina123','Rina Sari','pengrajin','{"Gantungan Kunci"}',5,'2024-04-12'),
  ('u7','yuli','yuli123','Yuli','pengrajin','{Kepala,Badan,Tangan,Kaki}',5,'2024-02-28');

-- ===== SEED PRODUCTS =====
INSERT INTO public.products (id, name, category, type, image, base_price, parts, stock, min_stock) VALUES
  ('p1','Boneka Beruang Rajut','Boneka','complex','🧸',85000,
    '[{"name":"Kepala","point":4000},{"name":"Badan","point":5000},{"name":"Tangan","point":3000},{"name":"Kaki","point":3000}]'::jsonb,8,5),
  ('p2','Boneka Kelinci Mini','Boneka','complex','🐰',65000,
    '[{"name":"Kepala","point":3500},{"name":"Badan","point":4000},{"name":"Tangan","point":2500},{"name":"Kaki","point":2500}]'::jsonb,3,5),
  ('p3','Tas Rajut Tote','Tas','simple','👜',120000,
    '[{"name":"Tas","point":25000}]'::jsonb,12,4),
  ('p4','Gantungan Kunci Buah','Gantungan Kunci','simple','🍓',15000,
    '[{"name":"Gantungan Kunci","point":3000}]'::jsonb,2,10),
  ('p5','Boneka Gajah Lucu','Boneka','complex','🐘',95000,
    '[{"name":"Kepala","point":4500},{"name":"Badan","point":5500},{"name":"Tangan","point":3000},{"name":"Kaki","point":3000}]'::jsonb,6,4);

-- ===== SEED ORDERS =====
INSERT INTO public.orders (id, code, type, product_id, product_name, quantity, customer_name, customer_phone, address, notes, fast_track, status, source, deadline, created_at) VALUES
  ('o1','ORD-0001','custom','p1','Boneka Beruang Rajut',1,'Dewi Anggraini','0812-3456-7890','Jl. Melati No. 12, Bandung','Warna coklat muda, mata hitam',true,'Sedang Dikerjakan','Shopee', now() + interval '2 days', now() - interval '3 days'),
  ('o2','ORD-0002','custom','p2','Boneka Kelinci Mini',1,'Pak Hendra','0813-9999-1111','Jl. Kenanga No. 5, Jakarta',NULL,false,'Sedang Dikerjakan','Tokopedia', now() + interval '4 days', now() - interval '5 days'),
  ('o3','ORD-0003','custom','p3','Tas Rajut Tote',1,'Ibu Sri','0856-2222-3333','Jl. Mawar No. 8, Surabaya',NULL,false,'Penyusunan','WhatsApp', now() + interval '1 days', now() - interval '7 days'),
  ('o4','ORD-0004','custom','p1','Boneka Beruang Rajut',1,'Andi Pratama','0878-1234-5678','Jl. Cendana No. 3, Yogyakarta',NULL,false,'Antrean','Instagram', now() + interval '10 days', now() - interval '1 days'),
  ('o5','ORD-0005','ready_stock','p3','Tas Rajut Tote',2,'Maya','0821-7777-8888','Jl. Anggrek No. 9, Semarang',NULL,false,'Siap Kirim','TikTok Shop', now() + interval '3 days', now() - interval '2 days'),
  ('o6','ORD-0006','custom','p5','Boneka Gajah Lucu',1,'Linda','0811-5555-6666','Jl. Pahlawan No. 21, Malang',NULL,true,'Selesai','Owner', now() - interval '2 days', now() - interval '15 days');
UPDATE public.orders SET resi='JNE-1234567890', shipped_at = now() - interval '1 days' WHERE id='o6';

-- ===== SEED SUBTASKS =====
INSERT INTO public.subtasks (id, order_id, product_id, part_name, point, assigned_to, status, started_at, finished_at) VALUES
  ('o1-Kepala','o1','p1','Kepala',4000,'u3','Selesai', now() - interval '2 days', now() - interval '1 days'),
  ('o1-Badan','o1','p1','Badan',5000,'u3','Sedang Dikerjakan', now() - interval '2 days', NULL),
  ('o1-Tangan','o1','p1','Tangan',3000,'u4','Sedang Dikerjakan', now() - interval '2 days', NULL),
  ('o1-Kaki','o1','p1','Kaki',3000,'u4','Antrean', NULL, NULL),
  ('o2-Kepala','o2','p2','Kepala',3500,'u7','Selesai', now() - interval '2 days', now() - interval '1 days'),
  ('o2-Badan','o2','p2','Badan',4000,'u7','Sedang Dikerjakan', now() - interval '2 days', NULL),
  ('o2-Tangan','o2','p2','Tangan',2500,'u4','Antrean', NULL, NULL),
  ('o2-Kaki','o2','p2','Kaki',2500,'u4','Antrean', NULL, NULL),
  ('o3-Tas','o3','p3','Tas',25000,'u5','Selesai', now() - interval '4 days', now() - interval '1 days'),
  ('o4-Kepala','o4','p1','Kepala',4000,NULL,'Antrean',NULL,NULL),
  ('o4-Badan','o4','p1','Badan',5000,NULL,'Antrean',NULL,NULL),
  ('o4-Tangan','o4','p1','Tangan',3000,NULL,'Antrean',NULL,NULL),
  ('o4-Kaki','o4','p1','Kaki',3000,NULL,'Antrean',NULL,NULL),
  ('o6-Kepala','o6','p5','Kepala',4500,'u3','Selesai', now() - interval '5 days', now() - interval '4 days'),
  ('o6-Badan','o6','p5','Badan',5500,'u7','Selesai', now() - interval '5 days', now() - interval '3 days'),
  ('o6-Tangan','o6','p5','Tangan',3000,'u4','Selesai', now() - interval '4 days', now() - interval '3 days'),
  ('o6-Kaki','o6','p5','Kaki',3000,'u4','Selesai', now() - interval '4 days', now() - interval '3 days');

-- ===== SEED POINT ENTRIES =====
INSERT INTO public.point_entries (id, user_id, subtask_id, order_code, product_name, part_name, point, date) VALUES
  ('pt1','u3','o1-Kepala','ORD-0001','Boneka Beruang Rajut','Kepala',4000, now() - interval '1 days'),
  ('pt2','u7','o2-Kepala','ORD-0002','Boneka Kelinci Mini','Kepala',3500, now() - interval '2 days'),
  ('pt3','u5','o3-Tas','ORD-0003','Tas Rajut Tote','Tas',25000, now() - interval '3 days'),
  ('pt4','u3','o6-Kepala','ORD-0006','Boneka Gajah Lucu','Kepala',4500, now() - interval '5 days'),
  ('pt5','u7','o6-Badan','ORD-0006','Boneka Gajah Lucu','Badan',5500, now() - interval '4 days'),
  ('pt6','u4','o6-Tangan','ORD-0006','Boneka Gajah Lucu','Tangan',3000, now() - interval '3 days'),
  ('pt7','u4','o6-Kaki','ORD-0006','Boneka Gajah Lucu','Kaki',3000, now() - interval '3 days');
