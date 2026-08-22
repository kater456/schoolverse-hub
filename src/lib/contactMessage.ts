/**
 * Shared copy for buyer → vendor first contact.
 * Used by in-app DMs and WhatsApp deep links so the wording is identical
 * everywhere a product can be contacted about.
 */
export const buildProductMessage = (storeName?: string | null, productName?: string | null) => {
  const store = (storeName || "").trim();
  if (productName && productName.trim()) {
    return `Hi ${store || "there"}, I found out you have ${productName.trim()} on Campus Market and I am interested in getting one.`;
  }
  return `Hi ${store || "there"}, I found you on Campus Market and I'd like to know more about what you offer.`;
};

export const whatsappLink = (phone?: string | null, message?: string) => {
  const digits = (phone || "").replace(/\D/g, "");
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
};
