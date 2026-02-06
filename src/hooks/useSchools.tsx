import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface School {
  id: string;
  name: string;
  subdomain: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  subscription_plan: string;
  subscription_status: string;
  created_at: string;
  updated_at: string;
}

export const useSchools = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchSchools = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("schools")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching schools",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSchools(data as School[]);
    }
    setIsLoading(false);
  };

  const createSchool = async (school: { name: string } & Partial<School>) => {
    const { data, error } = await supabase
      .from("schools")
      .insert([{ name: school.name, ...school }])
      .select()
      .single();

    if (error) {
      toast({
        title: "Error creating school",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }

    toast({
      title: "School created",
      description: `${school.name} has been added successfully.`,
    });

    await fetchSchools();
    return { data: data as School, error: null };
  };

  const updateSchool = async (id: string, updates: Partial<School>) => {
    const { data, error } = await supabase
      .from("schools")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      toast({
        title: "Error updating school",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }

    toast({
      title: "School updated",
      description: "Changes have been saved successfully.",
    });

    await fetchSchools();
    return { data: data as School, error: null };
  };

  const deleteSchool = async (id: string) => {
    const { error } = await supabase.from("schools").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting school",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "School deleted",
      description: "The school has been removed.",
    });

    await fetchSchools();
    return { error: null };
  };

  const assignSchoolAdmin = async (schoolId: string, userId: string) => {
    const { error } = await supabase.from("user_roles").insert({
      user_id: userId,
      role: "school_admin",
      school_id: schoolId,
    });

    if (error) {
      toast({
        title: "Error assigning admin",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    // Also update the profile with the school_id
    await supabase
      .from("profiles")
      .update({ school_id: schoolId })
      .eq("user_id", userId);

    toast({
      title: "Admin assigned",
      description: "The user has been assigned as school admin.",
    });

    return { error: null };
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  return {
    schools,
    isLoading,
    fetchSchools,
    createSchool,
    updateSchool,
    deleteSchool,
    assignSchoolAdmin,
  };
};
