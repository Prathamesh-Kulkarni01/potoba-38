
'use server';
/**
 * @fileOverview AI flow for recognizing menu items from an image.
 *
 * - recognizeMenuFromImage - Parses a menu image and extracts items.
 * - RecognizeMenuInput - Input schema for the flow.
 * - RecognizeMenuOutput - Output schema for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RecognizeMenuInputSchema = z.object({
  imageDataUri: z.string().describe("A data URI of the menu image (e.g., 'data:image/jpeg;base64,...'). This is required."),
});
export type RecognizeMenuInput = z.infer<typeof RecognizeMenuInputSchema>;

const RecognizedMenuItemSchema = z.object({
  itemName: z.string().describe("The name of the menu item."),
  itemPrice: z.string().optional().describe("The price of the item as a string (e.g., '$5.99', '12.50')."),
  itemDescription: z.string().optional().describe("A short description of the menu item if available."),
});

const RecognizedCategorySchema = z.object({
  categoryName: z.string().optional().describe("The name of the menu category (e.g., 'Appetizers', 'Main Courses'). If items are not under a clear category, this can be omitted for those items."),
  items: z.array(RecognizedMenuItemSchema).describe("A list of menu items found within this category or as standalone items if no category is detected for them."),
});

export const RecognizeMenuOutputSchema = z.object({
  rawText: z.string().optional().describe("The full raw text transcribed from the menu image. This can be useful for debugging or if structured parsing fails."),
  structuredItems: z.array(RecognizedCategorySchema).optional().describe("An array of recognized categories, each containing its items. Items without a clear category might be grouped under an 'Uncategorized' category or listed directly."),
});
export type RecognizeMenuOutput = z.infer<typeof RecognizeMenuOutputSchema>;

export async function recognizeMenuFromImage(input: RecognizeMenuInput): Promise<RecognizeMenuOutput> {
  if (!input.imageDataUri) {
    throw new Error("Image data URI is required for menu recognition.");
  }
  return recognizeMenuFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recognizeMenuPrompt',
  input: { schema: RecognizeMenuInputSchema },
  output: { schema: RecognizeMenuOutputSchema },
  prompt: `You are an expert Optical Character Recognition (OCR) and menu parsing AI.
Your task is to analyze the provided image of a restaurant menu.

Instructions:
1.  First, transcribe ALL visible text from the image. Store this as 'rawText'.
2.  Then, attempt to structure the transcribed text into a list of menu categories and their respective items.
    - Each category should have a 'categoryName'. If some items don't clearly fall under a category, you can group them under a category named "Miscellaneous" or "Other Items".
    - Each item within a category (or a standalone item) must have an 'itemName'.
    - Try to extract 'itemPrice' as a string (e.g., "12.99", "$5", "Market Price").
    - Try to extract 'itemDescription' if available.
3.  If you cannot reliably structure parts of the menu, prioritize providing the complete 'rawText'.
4.  The output for 'structuredItems' should be an array of categories, where each category object contains an array of its items.

Menu Image:
{{media url=imageDataUri}}

Please provide the output in the specified JSON format.
`,
  config: {
    temperature: 0.2, // Lower temperature for more factual extraction
    // Ensure the model used supports multimodal input (image and text)
    // model: 'googleai/gemini-pro-vision' or 'googleai/gemini-1.5-flash-latest' if suitable
  }
});

const recognizeMenuFlow = ai.defineFlow(
  {
    name: 'recognizeMenuFromImageFlow',
    inputSchema: RecognizeMenuInputSchema,
    outputSchema: RecognizeMenuOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      // Fallback if AI completely fails, though schema validation might catch this earlier
      // depending on how the Genkit SDK handles null/undefined outputs against a schema.
      return { rawText: "AI model failed to produce any output." };
    }
    // If structuredItems is missing or empty but rawText is present, it's still a valid partial success.
    return output;
  }
);
