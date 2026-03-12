import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CampusLocation {
  id: string;
  school_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export const useCampusLocations = (schoolId?: string) => {
  const [locations, setLocations] = useState<CampusLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchLocations = async () => {
    setIsLoading(true);
    let query = supabase.from("campus_locations").select("*").order("name");
    if (schoolId) {
      query = query.eq("school_id", schoolId);
    }
    const { data, error } = await query;
    if (!error && data) {
      setLocations(data as CampusLocation[]);
    }
    setIsLoading(false);
  };

  const createLocation = async (schoolId: string, name: string) => {
    const { error } = await supabase
      .from("campus_locations")
      .insert({ school_id: schoolId, name });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return { error };
    }
    toast({ title: "Location added", description: `${name} has been added.` });
    await fetchLocations();
    return { error: null };
  };

  const updateLocation = async (id: string, name: string) => {
    const { error } = await supabase
      .from("campus_locations")
      .update({ name })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return { error };
    }
    toast({ title: "Location updated" });
    await fetchLocations();
    return { error: null };
  };

  const deleteLocation = async (id: string) => {
    const { error } = await supabase.from("campus_locations").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return { error };
    }
    toast({ title: "Location deleted" });
    await fetchLocations();
    return { error: null };
  };

  useEffect(() => {
    fetchLocations();
  }, [schoolId]);

  return { locations, isLoading, createLocation, updateLocation, deleteLocation, refetch: fetchLocations };
};
