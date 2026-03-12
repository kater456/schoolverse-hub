import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone, MessageCircle, Star, Loader2 } from "lucide-react";

const VendorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [vendor, setVendor] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchVendor = async () => {
      if (!id) return;
      const { data } = await supabase
        .from("vendors")
        .select(`*, schools(name), campus_locations(name), vendor_images(*)`)
        .eq("id", id)
        .single();

      if (data) {
        setVendor(data);
        setImages(data.vendor_images || []);
        const primary = data.vendor_images?.find((img: any) => img.is_primary);
        setSelectedImage(primary?.image_url || data.vendor_images?.[0]?.image_url || null);
      }
      setIsLoading(false);
    };
    fetchVendor();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center items-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="text-center pt-32">
          <h2 className="text-xl font-semibold">Vendor not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Image Gallery */}
            <div>
              <div className="aspect-square bg-muted rounded-xl overflow-hidden mb-4">
                {selectedImage ? (
                  <img src={selectedImage} alt={vendor.business_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">🏪</div>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {images.map((img: any) => (
                    <button
                      key={img.id}
                      onClick={() => setSelectedImage(img.image_url)}
                      className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 ${
                        selectedImage === img.image_url ? "border-accent" : "border-transparent"
                      }`}
                    >
                      <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div>
              <div className="flex items-start gap-2 mb-2">
                <h1 className="text-2xl font-bold text-foreground">{vendor.business_name}</h1>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="secondary">{vendor.category}</Badge>
                {vendor.schools?.name && (
                  <Badge variant="outline">🎓 {vendor.schools.name}</Badge>
                )}
                {vendor.campus_locations?.name && (
                  <Badge variant="outline">
                    <MapPin className="h-3 w-3 mr-1" />
                    {vendor.campus_locations.name}
                  </Badge>
                )}
              </div>

              {vendor.description && (
                <p className="text-muted-foreground mb-6">{vendor.description}</p>
              )}

              <Card className="border-border/50">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold text-sm">Contact</h3>
                  {vendor.contact_number && (
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <a href={`tel:${vendor.contact_number}`}>
                        <Phone className="h-4 w-4 mr-2" />
                        {vendor.contact_number}
                      </a>
                    </Button>
                  )}
                  {vendor.messaging_enabled && vendor.contact_number && (
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <a href={`https://wa.me/${vendor.contact_number.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Message on WhatsApp
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default VendorProfile;
