import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PlatformSettings {
  id: string;
  platform_name: string;
  support_email: string;
  support_phone: string | null;
  allow_registrations: boolean;
  maintenance_mode: boolean;
  email_notifications: boolean;
  featured_reels_enabled: boolean;
  store_upgrade_enabled: boolean;
  verification_payment_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const usePlatformSettings = () => {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("platform_settings")
      .select("*")
      .single();

    if (error) {
      console.error("Error fetching settings:", error);
    } else {
      setSettings(data as PlatformSettings);
    }
    setIsLoading(false);
  };

  const updateSettings = async (updates: Partial<PlatformSettings>) => {
    if (!settings?.id) return { error: new Error("No settings found") };

    const { data, error } = await supabase
      .from("platform_settings")
      .update(updates)
      .eq("id", settings.id)
      .select()
      .single();

    if (error) {
      toast({
        title: "Error updating settings",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Settings updated",
      description: "Platform settings have been saved.",
    });

    setSettings(data as PlatformSettings);
    return { error: null };
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    isLoading,
    fetchSettings,
    updateSettings,
  };
};
