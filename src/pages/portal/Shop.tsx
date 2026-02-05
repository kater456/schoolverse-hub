import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ShoppingCart } from "lucide-react";

const Shop = () => {
  const products = [
    { id: 1, name: "School Uniform Set", category: "Uniforms", price: "$45.00", image: "👔" },
    { id: 2, name: "Science Textbook", category: "Books", price: "$25.00", image: "📚" },
    { id: 3, name: "Lunch Meal Deal", category: "Food", price: "$8.00", image: "🍱" },
    { id: 4, name: "Sports Kit", category: "Sports", price: "$30.00", image: "⚽" },
    { id: 5, name: "Art Supplies Set", category: "Supplies", price: "$15.00", image: "🎨" },
    { id: 6, name: "Calculator", category: "Electronics", price: "$20.00", image: "🔢" },
  ];

  return (
    <DashboardLayout userRole="user">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Shop</h1>
            <p className="text-muted-foreground mt-1">Browse and purchase school items</p>
          </div>
          <Button>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Cart (0)
          </Button>
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
                  <span className="text-lg font-bold text-primary">{product.price}</span>
                  <Button size="sm">Add to Cart</Button>
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
