"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessedMenuSchema = exports.MenuSectionSchema = exports.MenuItemSchema = void 0;
const zod_1 = require("zod");
exports.MenuItemSchema = zod_1.z.object({
    name: zod_1.z.string(),
    translation: zod_1.z.string(),
    description: zod_1.z.string(),
    possible_allergens: zod_1.z.array(zod_1.z.string()),
    dietary_notes: zod_1.z.array(zod_1.z.string()),
    similar_dishes: zod_1.z.array(zod_1.z.string()),
    confidence: zod_1.z.number().min(0).max(1),
    price: zod_1.z.string().optional(),
});
exports.MenuSectionSchema = zod_1.z.object({
    name: zod_1.z.string(),
    items: zod_1.z.array(exports.MenuItemSchema),
});
exports.ProcessedMenuSchema = zod_1.z.object({
    menu_language: zod_1.z.string(),
    sections: zod_1.z.array(exports.MenuSectionSchema),
});
//# sourceMappingURL=schemas.js.map