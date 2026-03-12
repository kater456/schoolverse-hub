import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSchools } from "@/hooks/useSchools";
import { useCampusLocations } from "@/hooks/useCampusLocations";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CATEGORIES } from "@/lib/constants";
import { Loader2, Upload } from "lucide-react";

const vendorSchema = z.object({
  business_name: z.string().min(2, "Business name is required").max(100),
  category: z.string().min(1, "Category is required"),
  description: z.string().max(500).optional(),
  contact_number: z.string().min(5, "Contact number is required").max(20),
  school_id: z.string().min(1, "School is required"),
  campus_location_id: z.string().optional(),
  // Private info
  full_name: z.string().min(2, "Full name is required").max(100),
  residential_location: z.string().min(2, "Residential location is required").max(200),
  personal_contact: z.string().min(5, "Personal contact is required").max(20),
});

type VendorFormData = z.infer<typeof vendorSchema>;

const VendorRegistration = () => {
  const { user } = useAuth();
  const { schools } = useSchools();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const { locations } = useCampusLocations(selectedSchoolId || undefined);
  const [productImages, setProductImages] = useState<File[]>([]);
  const [vendorPhoto, setVendorPhoto] = useState<File | null>(null);

  const form = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      business_name: "",
      category: "",
      description: "",
      contact_number: "",
      school_id: "",
      campus_location_id: "",
      full_name: "",
      residential_location: "",
      personal_contact: "",
    },
  });

  const watchSchool = form.watch("school_id");
  useEffect(() => {
    setSelectedSchoolId(watchSchool);
  }, [watchSchool]);

  const uploadFile = async (file: File, path: string) => {
    const { data, error } = await supabase.storage
      .from("vendor-media")
      .upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage
      .from("vendor-media")
      .getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const onSubmit = async (data: VendorFormData) => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      // 1. Create vendor listing
      const { data: vendor, error: vendorError } = await supabase
        .from("vendors")
        .insert({
          user_id: user.id,
          business_name: data.business_name,
          category: data.category,
          description: data.description || null,
          contact_number: data.contact_number,
          school_id: data.school_id,
          campus_location_id: data.campus_location_id || null,
        })
        .select()
        .single();

      if (vendorError) throw vendorError;

      // 2. Upload vendor photo & create private details
      let vendorPhotoUrl = null;
      if (vendorPhoto) {
        vendorPhotoUrl = await uploadFile(vendorPhoto, `${user.id}/vendor-photo-${Date.now()}`);
      }

      const { error: privateError } = await supabase
        .from("vendor_private_details")
        .insert({
          vendor_id: vendor.id,
          full_name: data.full_name,
          vendor_photo_url: vendorPhotoUrl,
          residential_location: data.residential_location,
          personal_contact: data.personal_contact,
        });

      if (privateError) throw privateError;

      // 3. Upload product images
      for (let i = 0; i < productImages.length; i++) {
        const url = await uploadFile(productImages[i], `${user.id}/product-${Date.now()}-${i}`);
        await supabase.from("vendor_images").insert({
          vendor_id: vendor.id,
          image_url: url,
          is_primary: i === 0,
          display_order: i,
        });
      }

      // 4. Assign vendor role
      await supabase.from("user_roles").upsert({
        user_id: user.id,
        role: "vendor" as any,
        school_id: data.school_id,
      });

      toast({
        title: "Registration submitted!",
        description: "Your listing is pending admin approval. We'll notify you once it's live.",
      });

      navigate("/browse");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16 px-4">
        <div className="container mx-auto max-w-2xl">
          <h1 className="text-3xl font-bold mb-2">Register Your Business</h1>
          <p className="text-muted-foreground mb-8">List your products or services for free on your campus marketplace.</p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Public Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Business Information</CardTitle>
                  <CardDescription>This info will be visible to all users.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="business_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name</FormLabel>
                      <FormControl><Input placeholder="e.g. Jane's Smoothies" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl><Textarea placeholder="Describe your products or services..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="contact_number" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Number (for customers)</FormLabel>
                      <FormControl><Input placeholder="e.g. 08012345678" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="school_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>School</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {schools.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {locations.length > 0 && (
                    <FormField control={form.control} name="campus_location_id" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campus Location</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {locations.map((loc) => (
                              <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  {/* Product Images */}
                  <div>
                    <Label>Product Photos</Label>
                    <div className="mt-2">
                      <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-accent transition-colors">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {productImages.length > 0 ? `${productImages.length} photo(s) selected` : "Upload product photos"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => setProductImages(Array.from(e.target.files || []))}
                        />
                      </label>
                    </div>
                    {productImages.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {productImages.map((file, i) => (
                          <div key={i} className="w-16 h-16 rounded-lg overflow-hidden bg-muted">
                            <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Private Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Private Information</CardTitle>
                  <CardDescription>This info is only visible to the admin. Not shown publicly.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="full_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input placeholder="Your full legal name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div>
                    <Label>Your Photo</Label>
                    <div className="mt-2">
                      <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-accent transition-colors">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {vendorPhoto ? vendorPhoto.name : "Upload your photo"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => setVendorPhoto(e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                  </div>

                  <FormField control={form.control} name="residential_location" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Where You Stay</FormLabel>
                      <FormControl><Input placeholder="e.g. Hilltop Hostel, Room 24" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="personal_contact" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Personal Contact (admin only)</FormLabel>
                      <FormControl><Input placeholder="Personal phone number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              <Button type="submit" size="lg" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit Registration
              </Button>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
};

export default VendorRegistration;
