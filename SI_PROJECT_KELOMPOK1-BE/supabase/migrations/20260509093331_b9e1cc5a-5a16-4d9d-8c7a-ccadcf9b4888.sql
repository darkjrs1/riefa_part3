-- Tabel sumber pesanan
CREATE TABLE public.order_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT 'ShoppingBag',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.order_sources ENABLE ROW LEVEL SECURITY;

-- RLS permisif sementara (akan diperketat saat auth asli dipasang)
CREATE POLICY "order_sources_select_all" ON public.order_sources FOR SELECT USING (true);
CREATE POLICY "order_sources_insert_all" ON public.order_sources FOR INSERT WITH CHECK (true);
CREATE POLICY "order_sources_update_all" ON public.order_sources FOR UPDATE USING (true);
CREATE POLICY "order_sources_delete_all" ON public.order_sources FOR DELETE USING (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_order_sources_updated_at
BEFORE UPDATE ON public.order_sources
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed default
INSERT INTO public.order_sources (name, icon) VALUES
  ('Shopee', 'ShoppingBag'),
  ('Tokopedia', 'Store'),
  ('TikTok Shop', 'Music2'),
  ('WhatsApp', 'MessageCircle'),
  ('Instagram', 'Instagram'),
  ('Offline', 'Building2');