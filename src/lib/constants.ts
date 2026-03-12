export const CATEGORIES = [
  "Food & Snacks",
  "Fashion & Clothing",
  "Hair & Beauty",
  "Tech & Gadgets",
  "Stationery & Printing",
  "Tutoring Services",
  "Transportation",
  "Other Services",
] as const;

export type Category = typeof CATEGORIES[number];
