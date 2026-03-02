export interface MenuItem {
  name: string;
  translation: string;
  description: string;
  possible_allergens: string[];
  dietary_notes: string[];
  similar_dishes: string[];
  confidence: number;
  price?: string;
}

export interface MenuSection {
  name: string;
  items: MenuItem[];
}

export interface ProcessedMenu {
  id: string;
  menu_language: string;
  sections: MenuSection[];
  created_at: string;
  image_url?: string;
}

export interface ScanRequest {
  image_uri: string;
  user_language?: string;
}

export interface ScanResponse {
  scan_id: string;
  status: 'processing' | 'completed' | 'failed';
  progress?: number;
  menu?: ProcessedMenu;
  error?: string;
}

export interface User {
  id: string;
  email: string;
  subscription_tier: 'free' | 'pro';
  scans_remaining: number;
  created_at: string;
}

export interface SubscriptionTier {
  name: string;
  scans_per_month: number;
  features: string[];
  price_monthly?: number;
}
