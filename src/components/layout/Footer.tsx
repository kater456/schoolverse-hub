import { Link } from "react-router-dom";
import { GraduationCap, Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  const footerLinks = {
    product: [
      { name: "Browse Marketplace", href: "/browse" },
      { name: "Pricing", href: "/#pricing" },
      { name: "Reels", href: "/reels" },
      { name: "Register as Vendor", href: "/register-vendor" },
    ],
    company: [
      { name: "About Us", href: "/help" },
      { name: "Contact", href: "/help" },
      { name: "Help Center", href: "/help" },
    ],
    resources: [
      { name: "Help Center", href: "/help" },
      { name: "Sign Up", href: "/signup" },
      { name: "Login", href: "/login" },
    ],
    legal: [
      { name: "Privacy Policy", href: "/help" },
      { name: "Terms of Service", href: "/help" },
    ],
  };

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent shadow-md">
                <GraduationCap className="h-5 w-5 text-accent-foreground" />
              </div>
              <span className="font-display text-xl font-bold">Campus Market</span>
            </Link>
            <p className="text-primary-foreground/70 mb-6 max-w-xs">
              Empowering schools with modern marketplace solutions. Connect,
              sell, and grow your educational community.
            </p>
            <div className="space-y-3">
              <a href="mailto:contact@campusmarketapp.com" className="flex items-center gap-3 text-sm text-primary-foreground/70 hover:text-accent transition-colors">
                <Mail className="h-4 w-4 text-accent" />
                <span>contact@campusmarketapp.com</span>
              </a>
              <a href="tel:+2349016103308" className="flex items-center gap-3 text-sm text-primary-foreground/70 hover:text-accent transition-colors">
                <Phone className="h-4 w-4 text-accent" />
                <span>+234 9016103308</span>
              </a>
              <a href="https://wa.me/2349016103308" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-primary-foreground/70 hover:text-accent transition-colors">
                <MapPin className="h-4 w-4 text-accent" />
                <span>WhatsApp Contact</span>
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-display font-semibold mb-4">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-primary-foreground/70 hover:text-accent transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-display font-semibold mb-4">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-primary-foreground/70 hover:text-accent transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="font-display font-semibold mb-4">Resources</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-primary-foreground/70 hover:text-accent transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-display font-semibold mb-4">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-primary-foreground/70 hover:text-accent transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-primary-foreground/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-primary-foreground/60">
              © {new Date().getFullYear()} Campus Market. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link
                to="/help"
                className="text-primary-foreground/60 hover:text-accent transition-colors"
              >
                Help Center
              </Link>
              <Link
                to="/browse"
                className="text-primary-foreground/60 hover:text-accent transition-colors"
              >
                Marketplace
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
