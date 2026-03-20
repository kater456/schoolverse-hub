import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import {
  GraduationCap, HelpCircle, Book, MessageCircle, Phone,
  Mail, ArrowLeft, UserCog, Loader2,
} from "lucide-react";

const Help = () => {
  const [subAdmins, setSubAdmins] = useState<any[]>([]);
  const [loadingSA, setLoadingSA] = useState(true);

  useEffect(() => {
    const fetchSubAdmins = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("*, profiles:user_id(first_name, last_name, phone), schools:assigned_school_id(name)")
        .in("role", ["sub_admin", "admin"] as any[]);
      setSubAdmins(data || []);
      setLoadingSA(false);
    };
    fetchSubAdmins();
  }, []);

  const faqs = [
    { question: "How do I reset my password?", answer: "Click on 'Forgot Password' on the login page and follow the instructions sent to your email." },
    { question: "How do I add products to my store?", answer: "Go to your Vendor Dashboard and click on the 'Products' tab to manage your listings and add new products." },
    { question: "How do payments work?", answer: "Vendor registration requires a one-time payment of ₦1,200 (Nigeria) or GH₵15 (Ghana). Payment is verified before your account is activated." },
    { question: "Can I customize my listing?", answer: "Yes! Add photos, descriptions, pricing, and contact info. You can update your profile anytime from the vendor dashboard." },
    { question: "How do I contact my campus admin?", answer: "Scroll down on this page to find your campus sub-admin contacts. You can reach them via phone or email for any compliance or support issues." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-md">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">Campus Market</span>
          </Link>
          <Link to="/">
            <Button variant="ghost"><ArrowLeft className="h-4 w-4 mr-2" />Back to Home</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <HelpCircle className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-4xl font-bold text-foreground mb-4">How can we help you?</h1>
            <p className="text-lg text-muted-foreground">Find answers to common questions or get in touch with our support team</p>
          </div>

          {/* Quick Links */}
          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="hover-lift cursor-pointer">
              <CardContent className="p-6 text-center">
                <Book className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-1">Documentation</h3>
                <p className="text-sm text-muted-foreground">Browse our guides</p>
              </CardContent>
            </Card>
            <a href="https://wa.me/2349016103308" target="_blank" rel="noopener noreferrer">
              <Card className="hover-lift cursor-pointer">
                <CardContent className="p-6 text-center">
                  <MessageCircle className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">WhatsApp Chat</h3>
                  <p className="text-sm text-muted-foreground">Chat with support</p>
                </CardContent>
              </Card>
            </a>
            <a href="tel:+2349016103308">
              <Card className="hover-lift cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Phone className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">Call Us</h3>
                  <p className="text-sm text-muted-foreground">+234 9016103308</p>
                </CardContent>
              </Card>
            </a>
          </div>

          {/* Sub-Admin Contacts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                Campus Admin Contacts
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                For compliance issues or campus-specific questions, contact your campus admin directly.
              </p>
            </CardHeader>
            <CardContent>
              {loadingSA ? (
                <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : subAdmins.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No campus admins listed yet.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {subAdmins.map((sa) => {
                    const firstName = (sa.profiles as any)?.first_name || "—";
                    const lastName = (sa.profiles as any)?.last_name || "";
                    const phone = (sa.profiles as any)?.phone;
                    const schoolName = (sa.schools as any)?.name || "All campuses";
                    // Get email from user metadata if available
                    return (
                      <div key={sa.id} className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                        <p className="font-medium text-foreground">{firstName} {lastName}</p>
                        <p className="text-sm text-muted-foreground mt-1">📍 {schoolName}</p>
                        {phone && (
                          <a href={`tel:${phone}`} className="text-sm text-primary hover:underline mt-1 block">
                            📞 {phone}
                          </a>
                        )}
                        <a href="mailto:campusmarket24@gmail.com" className="text-sm text-primary hover:underline mt-1 block">
                          ✉️ campusmarket24@gmail.com
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* FAQs - Interactive Accordion */}
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="space-y-2">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`faq-${index}`} className="border border-border/50 rounded-lg px-4">
                    <AccordionTrigger className="text-sm font-medium hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" />Contact Support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Your name" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="your@email.com" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" placeholder="How can we help?" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" placeholder="Describe your issue or question..." rows={5} />
              </div>
              <Button className="w-full sm:w-auto">Send Message</Button>
            </CardContent>
          </Card>

          {/* Support Contact */}
          <div className="text-center p-8 bg-secondary/30 rounded-xl">
            <h3 className="font-semibold text-lg mb-2">Need immediate assistance?</h3>
            <p className="text-muted-foreground mb-4">Our support team is available Monday–Friday, 9am–6pm WAT</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="tel:+2349016103308" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
                <Phone className="h-4 w-4 text-primary" /><span>+234 9016103308</span>
              </a>
              <a href="mailto:campusmarket24@gmail.com" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
                <Mail className="h-4 w-4 text-primary" /><span>campusmarket24@gmail.com</span>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Help;
