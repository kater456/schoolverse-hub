import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Plus, Search, MoreHorizontal } from "lucide-react";

const Products = () => {
  const products = [
    { id: 1, name: "School Uniform Set", category: "Uniforms", price: "$45.00", stock: 150, status: "In Stock" },
    { id: 2, name: "Science Textbook Grade 10", category: "Books", price: "$25.00", stock: 80, status: "In Stock" },
    { id: 3, name: "Lunch Meal Deal", category: "Food", price: "$8.00", stock: 0, status: "Out of Stock" },
    { id: 4, name: "Sports Kit", category: "Sports", price: "$30.00", stock: 45, status: "Low Stock" },
  ];

  return (
    <DashboardLayout userRole="school_admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Products</h1>
            <p className="text-muted-foreground mt-1">Manage your school marketplace products</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products..." className="pl-10" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Products ({products.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{product.name}</div>
                      <div className="text-sm text-muted-foreground">{product.category}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                      <div className="font-medium">{product.price}</div>
                      <div className="text-xs text-muted-foreground">{product.stock} in stock</div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        product.status === "In Stock"
                          ? "bg-success/20 text-success"
                          : product.status === "Low Stock"
                          ? "bg-warning/20 text-warning"
                          : "bg-destructive/20 text-destructive"
                      }`}
                    >
                      {product.status}
                    </span>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Products;
