export interface ProductFlavor {
  id: string;
  name: string;
  color: string;
  accentHex: string;
  badge?: string;
}

export interface ProductSize {
  id: string;
  name: string;
  weight: string;
  servings: number;
  price: number;
  originalPrice: number;
}

export interface NutritionFact {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface Product {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  description: string;
  longDescription: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  rating: number;
  image: string;
  flavors?: ProductFlavor[];
  sizes?: ProductSize[];
  features: string[];
  nutritionFacts?: NutritionFact[];
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  comment: string;
  rating: number;
  verified: boolean;
  avatar: string;
  productPurchased: string;
}

export interface FAQItem {
  question: string;
  answer: string;
  category?: string;
}
