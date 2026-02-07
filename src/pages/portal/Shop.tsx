import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ShoppingCart, Check } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import CartSheet from "@/components/cart/CartSheet";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const Shop = () => {
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [addedItems, setAddedItems] = useState<Set<number>>(new Set());

  const products = [
    { id: 1, name: "School Uniform Set", category: "Uniforms", price: 45.00, image: "👔" },
    { id: 2, name: "Science Textbook", category: "Books", price: 25.00, image: "📚" },
    { id: 3, name: "Lunch Meal Deal", category: "Food", price: 8.00, image: "🍱" },
    { id: 4, name: "Sports Kit", category: "Sports", price: 30.00, image: "⚽" },
    { id: 5, name: "Art Supplies Set", category: "Supplies", price: 15.00, image: "🎨" },
    { id: 6, name: "Calculator", category: "Electronics", price: 20.00, image: "🔢" },
  ];

  const handleAddToCart = (product: typeof products[0]) => {
    addToCart({
      id: product.id.toString(),
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.category,
    });

    setAddedItems((prev) => new Set([...prev, product.id]));
    setTimeout(() => {
      setAddedItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(product.id);
        return newSet;
      });
    }, 1500);

    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart`,
    });
  };

  return (
    <DashboardLayout userRole="user">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Shop</h1>
            <p className="text-muted-foreground mt-1">Browse and purchase school items</p>
          </div>
          <CartSheet />
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products..." className="pl-10" />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="hover-lift overflow-hidden">
              <div className="h-40 bg-secondary/30 flex items-center justify-center text-6xl">
                {product.image}
              </div>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  {product.category}
                </div>
                <h3 className="font-semibold text-foreground mb-2">{product.name}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-primary">${product.price.toFixed(2)}</span>
                  <Button
                    size="sm"
                    onClick={() => handleAddToCart(product)}
                    className={addedItems.has(product.id) ? "bg-green-600 hover:bg-green-600" : ""}
                  >
                    {addedItems.has(product.id) ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Added
                      </>
                    ) : (
                      "Add to Cart"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Shop;
