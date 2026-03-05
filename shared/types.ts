export interface MenuItem {
  name: string;
  name_translation: string;
  original_description?: string;
  description_translation?: string;
  characteristics: string[];
  possible_allergens: string[];
  similar_dishes: string[];
  price?: string;
  raw_text?: string;
}

export interface MenuSection {
  name: string;
  name_translation?: string;
  items: MenuItem[];
}

export interface ProcessedMenu {
  id: string;
  restaurant_name?: string;
  restaurant_name_translation?: string;
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
