import { stockMeta } from "@/lib/stock";

interface Props {
  status?: string | null;
  className?: string;
  /** Hide the badge entirely when the item is simply in stock. */
  hideWhenInStock?: boolean;
}

const StockBadge = ({ status, className = "", hideWhenInStock = false }: Props) => {
  const meta = stockMeta(status);
  if (hideWhenInStock && meta.label === "In stock") return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ${meta.className} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
};

export default StockBadge;
