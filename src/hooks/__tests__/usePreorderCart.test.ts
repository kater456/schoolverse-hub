import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePreorderCart } from "../usePreorderCart";

describe("usePreorderCart hook", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should initialize with empty cart", () => {
    const { result } = renderHook(() => usePreorderCart());
    expect(result.current.items).toEqual([]);
    expect(result.current.totalItemCount).toBe(0);
  });

  it("should add items to cart and calculate total item count", () => {
    const { result } = renderHook(() => usePreorderCart());

    act(() => {
      result.current.addItem(
        "vendor-123",
        "Test Vendor",
        { id: "prod-1", name: "Notebook", price: 1500, image_url: "" },
        2
      );
    });

    expect(result.current.items.length).toBe(1);
    expect(result.current.items[0].quantity).toBe(2);
    expect(result.current.totalItemCount).toBe(2);
  });

  it("should update item quantities and remove items when quantity is 0", () => {
    const { result } = renderHook(() => usePreorderCart());

    act(() => {
      result.current.addItem(
        "vendor-123",
        "Test Vendor",
        { id: "prod-1", name: "Notebook", price: 1500, image_url: "" },
        2
      );
    });

    act(() => {
      result.current.updateQuantity("prod-1", 5);
    });
    expect(result.current.totalItemCount).toBe(5);

    act(() => {
      result.current.updateQuantity("prod-1", 0);
    });
    expect(result.current.items.length).toBe(0);
    expect(result.current.totalItemCount).toBe(0);
  });

  it("should clear cart", () => {
    const { result } = renderHook(() => usePreorderCart());

    act(() => {
      result.current.addItem(
        "vendor-123",
        "Test Vendor",
        { id: "prod-1", name: "Notebook", price: 1500, image_url: "" },
        3
      );
    });

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.items.length).toBe(0);
    expect(result.current.totalItemCount).toBe(0);
  });
});
