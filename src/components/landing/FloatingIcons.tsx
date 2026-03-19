import { ShoppingBag, Tag, Store, Sparkles, Package, BadgeDollarSign } from "lucide-react";

const icons = [
  { Icon: ShoppingBag, delay: "0s", x: "10%", y: "20%", size: "h-6 w-6 sm:h-8 sm:w-8" },
  { Icon: Tag, delay: "1.5s", x: "80%", y: "15%", size: "h-5 w-5 sm:h-7 sm:w-7" },
  { Icon: Store, delay: "3s", x: "70%", y: "70%", size: "h-6 w-6 sm:h-8 sm:w-8" },
  { Icon: Sparkles, delay: "0.8s", x: "15%", y: "75%", size: "h-5 w-5 sm:h-6 sm:w-6" },
  { Icon: Package, delay: "2.2s", x: "90%", y: "45%", size: "h-5 w-5 sm:h-7 sm:w-7" },
  { Icon: BadgeDollarSign, delay: "4s", x: "5%", y: "50%", size: "h-5 w-5 sm:h-6 sm:w-6" },
];

const FloatingIcons = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {icons.map(({ Icon, delay, x, y, size }, i) => (
      <div
        key={i}
        className="absolute animate-float opacity-10"
        style={{ left: x, top: y, animationDelay: delay, animationDuration: "6s" }}
      >
        <Icon className={`${size} text-accent`} />
      </div>
    ))}
  </div>
);

export default FloatingIcons;
