import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Globe, CreditCard, Loader2 } from "lucide-react";

interface SchoolData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  subdomain: string | null;
}

const SchoolSettings = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    address: "",
    subdomain: "",
  });

  useEffect(() => {
    const fetchSchool = async () => {
      if (!profile?.school_id) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .eq("id", profile.school_id)
        .single();

      if (data) {
        setSchool(data as SchoolData);
        setFormData({
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          subdomain: data.subdomain || "",
        });
      }
      setIsLoading(false);
    };

    fetchSchool();
  }, [profile?.school_id]);

  const handleSave = async () => {
    if (!school) return;
    setIsSaving(true);

    const { error } = await supabase
      .from("schools")
      .update({
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        subdomain: formData.subdomain,
      })
      .eq("id", school.id);

    setIsSaving(false);

    if (error) {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Settings saved",
        description: "Your changes have been saved successfully.",
      });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout userRole="school_admin">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="school_admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Configure your school portal settings</p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Contact Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Custom Domain
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="domain">Custom Domain / Subdomain</Label>
                <Input
                  id="domain"
                  placeholder="yourschool"
                  value={formData.subdomain}
                  onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Your portal will be available at: {formData.subdomain || "yourschool"}.campusmarket.com
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-secondary/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Payment Account</p>
                    <p className="text-sm text-muted-foreground">Connect a payment processor to accept payments</p>
                  </div>
                  <Button variant="outline" size="sm">Connect Stripe</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Order Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive email for new orders</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Low Stock Alerts</Label>
                  <p className="text-sm text-muted-foreground">Get notified when products are low</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Daily Reports</Label>
                  <p className="text-sm text-muted-foreground">Receive daily sales summary</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => window.history.back()}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SchoolSettings;
