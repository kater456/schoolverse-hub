export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export const STOCK_OPTIONS: { value: StockStatus; label: string; emoji: string }[] = [
  { value: "in_stock",     label: "In stock",     emoji: "🟢" },
  { value: "low_stock",    label: "Low stock",    emoji: "🟡" },
  { value: "out_of_stock", label: "Out of stock", emoji: "🔴" },
];

const META: Record<StockStatus, { label: string; className: string }> = {
  in_stock: {
    label: "In stock",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30",
  },
  low_stock: {
    label: "Low stock",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30",
  },
  out_of_stock: {
    label: "Out of stock",
    className: "bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30",
  },
};

export const normalizeStock = (value?: string | null): StockStatus =>
  value === "low_stock" || value === "out_of_stock" ? value : "in_stock";

export const stockMeta = (value?: string | null) => META[normalizeStock(value)];
