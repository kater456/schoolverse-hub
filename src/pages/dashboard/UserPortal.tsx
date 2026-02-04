import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Search, Star, Plus } from "lucide-react";

const UserPortal = () => {
  const featuredProducts = [
    {
      id: 1,
      name: "School Uniform Set",
      price: "$45.00",
      image: "",
      rating: 4.8,
      category: "Clothing",
    },
    {
      id: 2,
      name: "Science Textbook",
      price: "$25.00",
      image: "",
      rating: 4.5,
      category: "Books",
    },
    {
      id: 3,
      name: "Lunch Meal Deal",
      price: "$8.00",
      image: "",
      rating: 4.9,
      category: "Food",
    },
    {
      id: 4,
      name: "Sports Kit",
      price: "$30.00",
      image: "",
      rating: 4.7,
      category: "Sports",
    },
  ];

  const categories = ["All", "Books", "Clothing", "Food", "Sports", "Supplies"];

  const recentOrders = [
    { id: "#2847", items: 3, total: "$45.99", status: "Delivered", date: "Today" },
    { id: "#2840", items: 2, total: "$25.00", status: "In Transit", date: "Yesterday" },
  ];

  return (
    <DashboardLayout userRole="user">
      <div className="space-y-8">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-hero p-8 text-primary-foreground">
          <div className="relative z-10">
            <h1 className="font-display text-3xl font-bold mb-2">
              Welcome back, Student!
            </h1>
            <p className="text-primary-foreground/80 max-w-xl">
              Browse your school's marketplace and order everything you need.
            </p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
        </div>

        {/* Search and Categories */}
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="pl-10 h-12"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category, index) => (
              <Button
                key={category}
                variant={index === 0 ? "default" : "outline"}
                size="sm"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Featured Products */}
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-6">
            Featured Products
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <Card key={product.id} className="group hover-lift overflow-hidden">
                <div className="aspect-square bg-secondary/50 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-md">
                      {product.category}
                    </span>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-1 mb-3">
                    <Star className="h-4 w-4 text-accent fill-accent" />
                    <span className="text-sm text-muted-foreground">{product.rating}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xl font-bold text-foreground">
                      {product.price}
                    </span>
                    <Button size="sm" variant="accent">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Your Recent Orders</CardTitle>
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div>
                    <div className="font-medium text-foreground">Order {order.id}</div>
                    <div className="text-sm text-muted-foreground">
                      {order.items} items • {order.date}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-foreground">{order.total}</div>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        order.status === "Delivered"
                          ? "bg-success/20 text-success"
                          : "bg-primary/20 text-primary"
                      }`}
                    >
                      {order.status}
                    </span>
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

export default UserPortal;