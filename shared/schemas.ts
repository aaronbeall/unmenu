import { z } from 'zod';

export const MenuItemSchema = z.object({
  name: z.string(),
  translation: z.string(),
  description: z.string(),
  possible_allergens: z.array(z.string()),
  dietary_notes: z.array(z.string()),
  similar_dishes: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  price: z.string().optional(),
});

export const MenuSectionSchema = z.object({
  name: z.string(),
  items: z.array(MenuItemSchema),
});

export const ProcessedMenuSchema = z.object({
  menu_language: z.string(),
  sections: z.array(MenuSectionSchema),
});

export type MenuItemType = z.infer<typeof MenuItemSchema>;
export type MenuSectionType = z.infer<typeof MenuSectionSchema>;
export type ProcessedMenuType = z.infer<typeof ProcessedMenuSchema>;
