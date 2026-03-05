import OpenAI from 'openai';
import { ProcessedMenuSchema } from '../../../shared/schemas';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function processMenuWithAI(
  base64Image: string,
  mimeType: string,
  userLanguage: string,
  subscriptionTier: string
): Promise<any> {
  const includeAllergens = subscriptionTier === 'pro';
  const includeSimilarDishes = subscriptionTier === 'pro';

  const systemPrompt = `You are an expert menu analysis system. Extract and analyze all menu information from the provided image, then output structured JSON.

CRITICAL RULES:
1. NEVER invent dishes that aren't visible on the menu
2. Accuracy over completeness - if uncertain, omit the field
3. Use the exact text from the menu where possible
4. Translate to ${userLanguage} accurately and naturally
5. For allergens: ONLY list POSSIBLE allergens based on typical ingredients - NEVER claim safety
6. Be concise and factual in all descriptions

OUTPUT STRUCTURE (must be valid JSON):
{
  "restaurant_name": "exact name if visible on menu",
  "restaurant_name_translation": "translation to ${userLanguage} if applicable",
  "menu_language": "detected ISO language code (e.g., 'ja', 'es', 'zh', 'en')",
  "sections": [
    {
      "name": "section name in original language (e.g., 'Appetizers', '前菜', 'Entrées')",
      "name_translation": "translation to ${userLanguage} if different from original",
      "items": [
        {
          "name": "exact dish name from menu in original language",
          "name_translation": "natural translation to ${userLanguage}",
          "original_description": "any description text from menu in original language",
          "description_translation": "translation of description to ${userLanguage}",
          "characteristics": ["array of typical characteristics like: spicy, sweet, savory, cold, hot, crispy, creamy, etc."],
          "possible_allergens": ${includeAllergens ? '["common allergens: dairy, eggs, wheat, soy, nuts, peanuts, fish, shellfish, sesame"]' : '[]'},
          "similar_dishes": ${includeSimilarDishes ? '["1-2 culturally recognizable similar dishes for context"]' : '[]'},
          "price": "exact price as shown (with currency symbol if present)",
          "raw_text": "exact raw text from menu for this item (for debugging)"
        }
      ]
    }
  ]
}

CHARACTERISTICS EXAMPLES:
- Taste: spicy, sweet, savory, sour, bitter, umami, salty
- Temperature: hot, cold, warm, room temperature
- Texture: crispy, crunchy, soft, creamy, chewy, tender, flaky
- Preparation: grilled, fried, steamed, baked, raw, fermented
- Portion: small plate, large sharing, individual serving

${includeAllergens ? '\nALLERGEN GUIDELINES:\n- List POSSIBLE allergens based on typical preparation\n- Common allergens: wheat/gluten, dairy, eggs, soy, tree nuts, peanuts, fish, shellfish, sesame\n- If uncertain, include it - safety first\n- NEVER claim a dish is "allergen-free" or "safe"' : ''}

${includeSimilarDishes ? '\nSIMILAR DISHES GUIDELINES:\n- Provide 1-2 familiar dishes for cultural context\n- Examples: "Pad Thai → similar to lo mein", "Tonkotsu Ramen → similar to pork noodle soup"\n- Keep it simple and recognizable' : ''}`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this menu image and extract all information into the structured JSON format. Translate all content to ${userLanguage}.`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64Image}` },
            },
          ],
        },
      ],
      max_tokens: 4000,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const parsed = JSON.parse(content);
    const validated = ProcessedMenuSchema.parse(parsed);

    return validated;
  } catch (error) {
    console.error('AI processing error:', error);
    throw new Error('Failed to process menu with AI');
  }
}
