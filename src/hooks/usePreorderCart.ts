import { useState, useEffect } from "react";
import { safeSessionStorage } from "@/lib/safeStorage";

export interface PreorderCartItem {
  product_id: string;
  product_name: string;
  price?: number;
  image_url?: string;
  quantity: number;
}

export interface PreorderCartState {
  vendorId: string | null;
  vendorName: string | null;
  items: PreorderCartItem[];
}

const STORAGE_KEY = "schoolverse_preorder_cart";

export function usePreorderCart() {
  const [cart, setCart] = useState<PreorderCartState>(() => {
    try {
      const stored = safeSessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback to empty state
    }
    return { vendorId: null, vendorName: null, items: [] };
  });

  useEffect(() => {
    try {
      safeSessionStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage write errors
    }
  }, [cart]);

  const addItem = (
    vendorId: string,
    vendorName: string,
    product: { id: string; name: string; price?: number; image_url?: string },
    quantity: number = 1
  ) => {
    setCart((prev) => {
      // If adding item from a different vendor, reset cart for the new vendor
      const isSameVendor = prev.vendorId === vendorId;
      const currentItems = isSameVendor ? prev.items : [];

      const existingIndex = currentItems.findIndex((item) => item.product_id === product.id);
      let updatedItems: PreorderCartItem[];

      if (existingIndex > -1) {
        updatedItems = [...currentItems];
        const newQty = updatedItems[existingIndex].quantity + quantity;
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          quantity: Math.min(99, Math.max(1, newQty)),
        };
      } else {
        updatedItems = [
          ...currentItems,
          {
            product_id: product.id,
            product_name: product.name,
            price: product.price,
            image_url: product.image_url,
            quantity: Math.min(99, Math.max(1, quantity)),
          },
        ];
      }

      return {
        vendorId,
        vendorName,
        items: updatedItems,
      };
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setCart((prev) => {
      if (quantity <= 0) {
        const remainingItems = prev.items.filter((item) => item.product_id !== productId);
        return {
          ...prev,
          vendorId: remainingItems.length > 0 ? prev.vendorId : null,
          vendorName: remainingItems.length > 0 ? prev.vendorName : null,
          items: remainingItems,
        };
      }

      const updatedItems = prev.items.map((item) =>
        item.product_id === productId
          ? { ...item, quantity: Math.min(99, Math.max(1, quantity)) }
          : item
      );

      return { ...prev, items: updatedItems };
    });
  };

  const removeItem = (productId: string) => {
    updateQuantity(productId, 0);
  };

  const clearCart = () => {
    setCart({ vendorId: null, vendorName: null, items: [] });
  };

  const totalItemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    vendorId: cart.vendorId,
    vendorName: cart.vendorName,
    items: cart.items,
    totalItemCount,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
  };
}
