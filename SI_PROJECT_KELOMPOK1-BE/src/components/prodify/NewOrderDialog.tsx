import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/store/useStore";
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderType } from "@/types";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ORDER_SOURCES } from "@/lib/orderSources";
import { supabase } from "@/integrations/supabase/client";

export const NewOrderDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) => {
  const { products, orders, addOrder } = useStore();
  const [type, setType] = useState<OrderType>("custom");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [fastTrack, setFastTrack] = useState(false);
  const [source, setSource] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });

  // Proteksi data products
  const safeProducts = products || [];
  const safeOrders = orders || [];

  const product = safeProducts.find((p) => p.id === productId);
  
  const fastTrackCount = useMemo(
    () => safeOrders.filter((o) => o.fastTrack && o.status !== "Selesai").length,
    [safeOrders]
  );
  const fastTrackFull = fastTrackCount >= 10;

  const eligibleProducts = type === "ready_stock" 
    ? safeProducts.filter((p) => p.stock > 0) 
    : safeProducts;

  const reset = () => {
    setType("custom"); setProductId(""); setQuantity(1); setCustomerName("");
    setCustomerPhone(""); setAddress(""); setNotes(""); setFastTrack(false); setSource("");
  };

  const handleSubmit = async () => {
    if (!productId || !customerName || !customerPhone || !address) {
      toast.error("Lengkapi semua field wajib");
      return;
    }
    
    if (type === "ready_stock" && product && quantity > product.stock) {
      toast.error(`Stok tidak cukup. Tersisa ${product.stock}`);
      return;
    }

    setLoading(true);

    try {
      // Menghapus 'productName' dari payload karena sudah ditangani otomatis oleh useStore.ts
      await addOrder({
        productId,
        quantity,
        customerName,
        customerPhone,
        address,
        notes,
        type,
        fastTrack: fastTrack && !fastTrackFull,
        deadline: new Date(deadline).toISOString(),
        source: source || undefined,
      });

      toast.success("Pesanan berhasil dibuat!");
      reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Gagal simpan pesanan:", error);
      toast.error(error.message || "Gagal menyimpan pesanan. Cek koneksi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* FIXED CLASSNAME: Ditambahkan kalkulasi width gap dan margin auto agar seimbang di semua sisi mobile */}
      <DialogContent className="max-w-lg w-[calc(100%-2rem)] mx-auto my-auto max-h-[85vh] overflow-y-auto bg-white rounded-xl p-5 md:p-6">
        <DialogHeader>
          <DialogTitle>Pesanan Baru</DialogTitle>
          <DialogDescription>Pilih jenis pesanan dan lengkapi data pelanggan.</DialogDescription>
        </DialogHeader>

        <Tabs value={type} onValueChange={(v) => { setType(v as OrderType); setProductId(""); }}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="custom">Custom (Make to Order)</TabsTrigger>
            <TabsTrigger value="ready_stock">Ready Stock</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Produk *</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger><SelectValue placeholder="Pilih produk" /></SelectTrigger>
              <SelectContent className="bg-white">
                {eligibleProducts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {type === "ready_stock" && `(stok: ${p.stock})`}
                    {type === "custom" && p.type === "complex" && " — kompleks"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Sumber Pesanan</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih channel asal pesanan" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {(ORDER_SOURCES || []).map((s) => {
                  const Ic = s.icon;
                  return (
                    <SelectItem key={s.name} value={s.name}>
                      <span className="inline-flex items-center gap-2">
                        <Ic className="h-4 w-4" />
                        {s.name}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>       

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Jumlah</Label>
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, +e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Deadline</Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nama Pelanggan *</Label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>No. HP *</Label>
            <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Alamat *</Label>
            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
          </div>

          {type === "custom" && (
            <div className="space-y-2">
              <Label>Catatan custom</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Warna, ukuran, dll." />
            </div>
          )}

          {type === "custom" && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <div>
                <Label className="text-sm font-semibold">Fast Track</Label>
                <p className="text-xs text-muted-foreground">{fastTrackCount}/10 aktif {fastTrackFull && "— penuh"}</p>
              </div>
              <Switch checked={fastTrack} onCheckedChange={setFastTrack} disabled={fastTrackFull} />
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="m-0">Batal</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold m-0">
            {loading ? "Menyimpan..." : "Simpan Pesanan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};