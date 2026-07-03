import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Users, Search, Calendar,
  MessageSquare, Edit3, Save, X, Loader2, User
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Customer {
  id: string;
  vendor_id: string;
  buyer_id: string | null;
  visitor_id: string | null;
  first_seen: string;
  last_seen: string;
  inquiry_count: number;
  has_inquired?: boolean;
  notes: string | null;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export const VendorCustomerList = ({ vendorId }: { vendorId: string }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vendor_customers")
      .select(`
        *,
        profiles:buyer_id (
          first_name,
          last_name,
          email
        )
      `)
      .eq("vendor_id", vendorId)
      .order("last_seen", { ascending: false });

    if (error) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to load customers");
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (vendorId) fetchCustomers();
  }, [vendorId]);

  const handleSaveNote = async (id: string) => {
    setSavingNote(true);
    const { error } = await supabase
      .from("vendor_customers")
      .update({ notes: editNote })
      .eq("id", id);

    if (error) {
      toast.error("Failed to save note");
    } else {
      toast.success("Note updated");
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, notes: editNote } : c));
      setEditingId(null);
    }
    setSavingNote(false);
  };

  const filteredCustomers = customers.filter(c => {
    const fullName = `${c.profiles?.first_name || ""} ${c.profiles?.last_name || ""}`.toLowerCase();
    const email = (c.profiles?.email || "").toLowerCase();
    const notes = (c.notes || "").toLowerCase();
    const visitorId = (c.visitor_id || "").toLowerCase();
    const s = search.toLowerCase();
    return fullName.includes(s) || email.includes(s) || notes.includes(s) || visitorId.includes(s);
  });

  const getBadge = (c: Customer) => {
    if (c.inquiry_count >= 2) return <Badge className="bg-primary/20 text-primary border-primary/30">Frequent Inquirer</Badge>;
    return <Badge variant="secondary">New</Badge>;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your customers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or notes..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="text-center py-12 bg-secondary/20 rounded-xl border border-dashed border-border">
          <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No customers found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredCustomers.map((c) => (
            <Card key={c.id} className="overflow-hidden border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-0">
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      {c.buyer_id ? (
                        <span className="text-lg font-bold text-primary">
                          {c.profiles?.first_name?.[0] || <User className="h-6 w-6" />}
                        </span>
                      ) : (
                        <User className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-foreground">
                          {c.buyer_id
                            ? `${c.profiles?.first_name || ""} ${c.profiles?.last_name || ""}`.trim() || "User"
                            : "Anonymous visitor"}
                        </h4>
                        {getBadge(c)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        First seen {formatDistanceToNow(new Date(c.first_seen))} ago
                      </p>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-semibold">{c.inquiry_count} {c.inquiry_count === 1 ? 'inquiry' : 'inquiries'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md">
                      <Calendar className="h-3 w-3" />
                      Last seen {formatDistanceToNow(new Date(c.last_seen))} ago
                    </div>
                    {c.profiles?.email && (
                       <p className="text-xs text-muted-foreground">{c.profiles.email}</p>
                    )}
                  </div>
                </div>

                <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                  <div className="bg-secondary/30 rounded-lg p-3 relative group min-h-[60px]">
                    {editingId === c.id ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          placeholder="Add a note about this customer..."
                          className="text-sm min-h-[80px]"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} disabled={savingNote}>
                            <X className="h-4 w-4 mr-1" /> Cancel
                          </Button>
                          <Button size="sm" onClick={() => handleSaveNote(c.id)} disabled={savingNote}>
                            {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                            Save Note
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1">
                            <MessageSquare className="h-3 w-3" /> Vendor Note
                          </div>
                          <button
                            onClick={() => { setEditingId(c.id); setEditNote(c.notes || ""); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-secondary rounded text-muted-foreground"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-sm text-foreground/80 italic">
                          {c.notes || "No notes yet. Add one to remember customer preferences."}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default VendorCustomerList;
