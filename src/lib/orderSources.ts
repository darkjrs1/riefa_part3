import { Instagram, Store, ShoppingBag, Music2, ShoppingCart, MessageCircle, Crown, type LucideIcon } from "lucide-react";

export interface OrderSourceOption {
  name: string;
  icon: LucideIcon;
}

// Daftar tetap sumber pesanan (sesuai requirement)
export const ORDER_SOURCES: OrderSourceOption[] = [
  { name: "Instagram", icon: Instagram },
  { name: "Offline", icon: Store },
  { name: "Shopee", icon: ShoppingBag },
  { name: "TikTok Shop", icon: Music2 },
  { name: "Tokopedia", icon: ShoppingCart },
  { name: "WhatsApp", icon: MessageCircle },
  { name: "Owner", icon: Crown },
];

export const getSourceIcon = (name?: string): LucideIcon => {
  const found = ORDER_SOURCES.find((s) => s.name === name);
  return found?.icon ?? ShoppingBag;
};
