import { z } from 'zod';

export const MenuItemSchema = z.object({
  name: z.string(),
  name_translation: z.string(),
  original_description: z.string().optional(),
  description_translation: z.string().optional(),
  characteristics: z.array(z.string()),
  possible_allergens: z.array(z.string()),
  similar_dishes: z.array(z.string()),
  price: z.string().optional(),
  raw_text: z.string().optional(),
});

export const MenuSectionSchema = z.object({
  name: z.string(),
  name_translation: z.string().optional(),
  items: z.array(MenuItemSchema),
});

export const ProcessedMenuSchema = z.object({
  restaurant_name: z.string().optional(),
  restaurant_name_translation: z.string().optional(),
  menu_language: z.string(),
  sections: z.array(MenuSectionSchema),
});

export type MenuItemType = z.infer<typeof MenuItemSchema>;
export type MenuSectionType = z.infer<typeof MenuSectionSchema>;
export type ProcessedMenuType = z.infer<typeof ProcessedMenuSchema>;
