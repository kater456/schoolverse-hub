import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => {
  const mockFrom = vi.fn();
  return {
    supabase: {
      from: mockFrom,
    },
    mockFrom,
  };
});

import { withFeatured } from "../useVendors";
import { supabase } from "@/integrations/supabase/client";

describe("withFeatured", () => {
  it("should return empty array when rows are empty or undefined", async () => {
    expect(await withFeatured([])).toEqual([]);
    expect(await withFeatured(null as any)).toEqual([]);
  });

  it("should batch check featured_listings using in operator", async () => {
    const mockGt = vi.fn().mockResolvedValue({
      data: [{ vendor_id: "vendor-1" }],
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ gt: mockGt });
    const mockIn = vi.fn().mockReturnValue({ eq: mockEq });
    const mockSelect = vi.fn().mockReturnValue({ in: mockIn });

    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

    const rows = [
      { id: "vendor-1", business_name: "Vendor One" },
      { id: "vendor-2", business_name: "Vendor Two" },
    ];

    const result = await withFeatured(rows);

    expect(supabase.from).toHaveBeenCalledWith("featured_listings");
    expect(mockSelect).toHaveBeenCalledWith("vendor_id");
    expect(mockIn).toHaveBeenCalledWith("vendor_id", ["vendor-1", "vendor-2"]);
    expect(mockEq).toHaveBeenCalledWith("payment_status", "confirmed");
    expect(mockGt).toHaveBeenCalled();

    expect(result).toEqual([
      { id: "vendor-1", business_name: "Vendor One", is_featured: true },
      { id: "vendor-2", business_name: "Vendor Two", is_featured: false },
    ]);
  });
});
