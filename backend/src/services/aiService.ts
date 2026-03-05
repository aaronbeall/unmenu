import OpenAI from 'openai';
import { ProcessedMenuSchema } from '../../../shared/schemas';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function processMenuWithAI(
  base64Image: string,
  mimeType: string,
  ocrText: string,
  userLanguage: string,
  subscriptionTier: string
): Promise<any> {
  const includeAllergens = subscriptionTier === 'pro';
  const includeSimilarDishes = subscriptionTier === 'pro';

  const systemPrompt = `You are a menu analysis expert. Analyze the provided menu image and OCR text to create a structured, enriched menu.

CRITICAL RULES:
1. NEVER invent dishes that aren't on the menu
2. Prefer uncertainty over hallucination
3. Include confidence scores (0-1)
4. Use concise, neutral language
5. NEVER claim allergen safety - always say "possible allergens"
6. If you cannot read or understand something, mark confidence as low

Output MUST be valid JSON matching this schema:
{
  "menu_language": "detected language code (e.g., 'ja', 'es', 'en')",
  "sections": [
    {
      "name": "section name in original language",
      "items": [
        {
          "name": "dish name in original language",
          "translation": "translation to ${userLanguage}",
          "description": "brief, accurate description",
          "possible_allergens": ${includeAllergens ? '["allergen1", "allergen2"]' : '[]'},
          "dietary_notes": ["vegetarian", "spicy", etc.],
          "similar_dishes": ${includeSimilarDishes ? '["similar dish 1", "similar dish 2"]' : '[]'},
          "confidence": 0.0-1.0,
          "price": "price if visible"
        }
      ]
    }
  ]
}

${includeAllergens ? '\nFor allergens: List POSSIBLE allergens based on typical ingredients. Common allergens: wheat, dairy, eggs, soy, nuts, peanuts, fish, shellfish, sesame.' : ''}
${includeSimilarDishes ? '\nFor similar dishes: Provide 1-3 culturally similar or equivalent dishes for context.' : ''}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
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
              text: `OCR Text:\n${ocrText}\n\nAnalyze this menu and provide structured output in JSON format.`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64Image}` },
            },
          ],
        },
      ],
      max_tokens: 4000,
      temperature: 0.3,
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
