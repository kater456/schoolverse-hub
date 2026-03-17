import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { Loader2 } from "lucide-react";

const Settings = () => {
  const { settings, isLoading, updateSettings } = usePlatformSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    platform_name: settings?.platform_name || "EduMarket",
    support_email: settings?.support_email || "calebworks4@gmail.com",
    support_phone: settings?.support_phone || "",
    allow_registrations: settings?.allow_registrations ?? true,
    maintenance_mode: settings?.maintenance_mode ?? false,
    email_notifications: settings?.email_notifications ?? true,
    featured_reels_enabled: settings?.featured_reels_enabled ?? false,
  });

  // Update form data when settings load
  useState(() => {
    if (settings) {
      setFormData({
        platform_name: settings.platform_name || "EduMarket",
        support_email: settings.support_email || "calebworks4@gmail.com",
        support_phone: settings.support_phone || "",
        allow_registrations: settings.allow_registrations ?? true,
        maintenance_mode: settings.maintenance_mode ?? false,
        email_notifications: settings.email_notifications ?? true,
        featured_reels_enabled: settings.featured_reels_enabled ?? false,
      });
    }
  });

  const handleSave = async () => {
    setIsSaving(true);
    await updateSettings(formData);
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <DashboardLayout userRole="super_admin">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="super_admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Platform Settings</h1>
          <p className="text-muted-foreground mt-1">Configure global platform settings</p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="platform-name">Platform Name</Label>
                <Input
                  id="platform-name"
                  value={formData.platform_name}
                  onChange={(e) => setFormData({ ...formData, platform_name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="support-email">Support Email</Label>
                <Input
                  id="support-email"
                  type="email"
                  value={formData.support_email}
                  onChange={(e) => setFormData({ ...formData, support_email: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="support-phone">Support Phone</Label>
                <Input
                  id="support-phone"
                  value={formData.support_phone}
                  onChange={(e) => setFormData({ ...formData, support_phone: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feature Toggles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow New Registrations</Label>
                  <p className="text-sm text-muted-foreground">Enable schools to register on the platform</p>
                </div>
                <Switch
                  checked={formData.allow_registrations}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, allow_registrations: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">Put the platform in maintenance mode</p>
                </div>
                <Switch
                  checked={formData.maintenance_mode}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, maintenance_mode: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Send email notifications for important events</p>
                </div>
                <Switch
                  checked={formData.email_notifications}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, email_notifications: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Activate Featured Reels Payment</Label>
                  <p className="text-sm text-muted-foreground">When enabled, users can pay to feature their reels</p>
                </div>
                <Switch
                  checked={formData.featured_reels_enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, featured_reels_enabled: checked })
                  }
                />
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

export default Settings;
