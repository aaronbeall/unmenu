import { z } from 'zod';
export declare const MenuItemSchema: z.ZodObject<{
    name: z.ZodString;
    translation: z.ZodString;
    description: z.ZodString;
    possible_allergens: z.ZodArray<z.ZodString, "many">;
    dietary_notes: z.ZodArray<z.ZodString, "many">;
    similar_dishes: z.ZodArray<z.ZodString, "many">;
    confidence: z.ZodNumber;
    price: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    translation: string;
    description: string;
    possible_allergens: string[];
    dietary_notes: string[];
    similar_dishes: string[];
    confidence: number;
    price?: string | undefined;
}, {
    name: string;
    translation: string;
    description: string;
    possible_allergens: string[];
    dietary_notes: string[];
    similar_dishes: string[];
    confidence: number;
    price?: string | undefined;
}>;
export declare const MenuSectionSchema: z.ZodObject<{
    name: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        translation: z.ZodString;
        description: z.ZodString;
        possible_allergens: z.ZodArray<z.ZodString, "many">;
        dietary_notes: z.ZodArray<z.ZodString, "many">;
        similar_dishes: z.ZodArray<z.ZodString, "many">;
        confidence: z.ZodNumber;
        price: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        translation: string;
        description: string;
        possible_allergens: string[];
        dietary_notes: string[];
        similar_dishes: string[];
        confidence: number;
        price?: string | undefined;
    }, {
        name: string;
        translation: string;
        description: string;
        possible_allergens: string[];
        dietary_notes: string[];
        similar_dishes: string[];
        confidence: number;
        price?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    name: string;
    items: {
        name: string;
        translation: string;
        description: string;
        possible_allergens: string[];
        dietary_notes: string[];
        similar_dishes: string[];
        confidence: number;
        price?: string | undefined;
    }[];
}, {
    name: string;
    items: {
        name: string;
        translation: string;
        description: string;
        possible_allergens: string[];
        dietary_notes: string[];
        similar_dishes: string[];
        confidence: number;
        price?: string | undefined;
    }[];
}>;
export declare const ProcessedMenuSchema: z.ZodObject<{
    menu_language: z.ZodString;
    sections: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        items: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            translation: z.ZodString;
            description: z.ZodString;
            possible_allergens: z.ZodArray<z.ZodString, "many">;
            dietary_notes: z.ZodArray<z.ZodString, "many">;
            similar_dishes: z.ZodArray<z.ZodString, "many">;
            confidence: z.ZodNumber;
            price: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            translation: string;
            description: string;
            possible_allergens: string[];
            dietary_notes: string[];
            similar_dishes: string[];
            confidence: number;
            price?: string | undefined;
        }, {
            name: string;
            translation: string;
            description: string;
            possible_allergens: string[];
            dietary_notes: string[];
            similar_dishes: string[];
            confidence: number;
            price?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        name: string;
        items: {
            name: string;
            translation: string;
            description: string;
            possible_allergens: string[];
            dietary_notes: string[];
            similar_dishes: string[];
            confidence: number;
            price?: string | undefined;
        }[];
    }, {
        name: string;
        items: {
            name: string;
            translation: string;
            description: string;
            possible_allergens: string[];
            dietary_notes: string[];
            similar_dishes: string[];
            confidence: number;
            price?: string | undefined;
        }[];
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    menu_language: string;
    sections: {
        name: string;
        items: {
            name: string;
            translation: string;
            description: string;
            possible_allergens: string[];
            dietary_notes: string[];
            similar_dishes: string[];
            confidence: number;
            price?: string | undefined;
        }[];
    }[];
}, {
    menu_language: string;
    sections: {
        name: string;
        items: {
            name: string;
            translation: string;
            description: string;
            possible_allergens: string[];
            dietary_notes: string[];
            similar_dishes: string[];
            confidence: number;
            price?: string | undefined;
        }[];
    }[];
}>;
export type MenuItemType = z.infer<typeof MenuItemSchema>;
export type MenuSectionType = z.infer<typeof MenuSectionSchema>;
export type ProcessedMenuType = z.infer<typeof ProcessedMenuSchema>;
//# sourceMappingURL=schemas.d.ts.map