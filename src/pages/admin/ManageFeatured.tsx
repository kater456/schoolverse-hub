import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/layout/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, Loader2 } from "lucide-react";

const ManageFeatured = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchListings = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("featured_listings")
      .select(`*, vendors(business_name, category)`)
      .order("created_at", { ascending: false });

    if (data) setListings(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const confirmPayment = async (id: string) => {
    const { error } = await supabase
      .from("featured_listings")
      .update({ payment_status: "confirmed", confirmed_by: user?.id })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Payment confirmed", description: "Vendor listing is now featured." });
      fetchListings();
    }
  };

  const rejectPayment = async (id: string) => {
    const { error } = await supabase
      .from("featured_listings")
      .update({ payment_status: "rejected" })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Payment rejected" });
      fetchListings();
    }
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Featured Listings</h1>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listings.map((fl) => (
                  <TableRow key={fl.id}>
                    <TableCell className="font-medium">{fl.vendors?.business_name || "—"}</TableCell>
                    <TableCell>₦{Number(fl.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">{fl.payment_reference || "—"}</TableCell>
                    <TableCell>
                      {fl.payment_status === "confirmed" ? (
                        <Badge className="bg-success text-success-foreground">Confirmed</Badge>
                      ) : fl.payment_status === "rejected" ? (
                        <Badge variant="destructive">Rejected</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(fl.ends_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {fl.payment_status === "pending" && (
                        <>
                          <Button size="icon" variant="ghost" className="text-success" onClick={() => confirmPayment(fl.id)}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => rejectPayment(fl.id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {listings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No featured listing requests yet</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
};

export default ManageFeatured;
