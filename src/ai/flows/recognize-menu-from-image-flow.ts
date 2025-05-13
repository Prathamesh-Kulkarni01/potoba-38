'use server';
/**
 * @fileOverview AI flow for recognizing menu items from an image, extracting detailed structured data.
 *
 * - recognizeMenuFromImage - Parses a menu image and extracts items with details.
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
  itemPrice: z.string().optional().describe("The price of the item as a string (e.g., '₹150', '$5.99', '12.50', 'Market Price')."),
  itemDescription: z.string().optional().describe("A short description of the menu item if available or AI-generated if not."),
  isVegetarian: z.boolean().optional().describe("True if the item is vegetarian, false if non-vegetarian, undefined if not clear. Check for text like 'veg', 'non-veg', 'bhej' or symbols like green/red dots next to items."),
  currency: z.string().optional().describe("The detected currency symbol (e.g., ₹, $). Default to ₹ if not specified."),
  portionSize: z.string().optional().describe("Detected portion size (e.g., Full, Half, Medium, Regular, Large)."),
  // Detected variants could be a future enhancement. For now, focus on description and core fields.
  // detectedVariants: z.array(z.object({ name: z.string(), options: z.array(z.object({ name: z.string(), price: z.string().optional() })) })).optional().describe("Variants like size or spice level if explicitly mentioned with distinct pricing or options.")
});

const RecognizedCategorySchema = z.object({
  categoryName: z.string().optional().describe("The name of the menu category (e.g., 'Appetizers', 'Main Courses', 'North Indian'). If items are not under a clear category, this can be 'Uncategorized'."),
  subcategoryName: z.string().optional().describe("The name of the subcategory if applicable (e.g., 'Vegetarian Starters', 'Chicken Curries')."),
  items: z.array(RecognizedMenuItemSchema).describe("A list of menu items found within this category/subcategory."),
});

const RecognizeMenuOutputSchema = z.object({
  rawText: z.string().optional().describe("The full raw text transcribed from the menu image. This can be useful for debugging or if structured parsing fails."),
  detectedCurrency: z.string().optional().describe("The most common currency symbol detected on the menu (e.g., ₹, $)."),
  structuredItems: z.array(RecognizedCategorySchema).optional().describe("An array of recognized categories, each containing its items and optional subcategories."),
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
  prompt: `You are an expert Optical Character Recognition (OCR) and intelligent menu parsing AI.
Your task is to analyze the provided image of a restaurant menu and extract detailed, structured information.

Instructions:
1.  First, transcribe ALL visible text from the image. Store this as 'rawText'.
2.  Identify the primary currency symbol used on the menu (e.g., ₹, $, €). Store this as 'detectedCurrency'. If multiple are present, choose the most frequent or default to ₹.
3.  Structure the transcribed text into a list of menu categories. Each category can have subcategories, and each category/subcategory will contain items.
    - Categories and Subcategories: Identify main sections like 'Appetizers', 'Main Course', 'Desserts', 'Beverages'. Within these, look for sub-sections like 'Vegetarian', 'Chicken', 'North Indian', 'Hot Drinks'. If an item doesn't clearly fall under a subcategory but is under a main category, omit 'subcategoryName'. If no category is clear, use "Uncategorized" for 'categoryName'.
    - For each Menu Item:
        - Extract 'itemName': The name of the dish.
        - Extract 'itemPrice': The price as a string (e.g., "150", "₹12.99", "$7.50", "Market Price"). Include the currency symbol if it's next to the price.
        - Extract 'itemDescription': If a description is provided on the menu, use it. If not, generate a short, appealing, and accurate culinary description (1-2 sentences) based on the item name, its category, and common ingredients/preparation for such a dish.
        - Determine 'isVegetarian': Set to true if explicitly marked as vegetarian (e.g., "veg", "vegetarian", green dot/symbol description). Set to false if marked non-vegetarian (e.g., "non-veg", "chicken", "lamb", red dot/symbol description). If unclear, leave as undefined. Keywords like "bhej" (for veg) and "murgh" (for chicken) are common in Indian menus.
        - Extract 'portionSize': If mentioned (e.g., "Full", "Half", "Medium", "Regular", "Large", "Family Pack"), extract it.
        - Ensure the 'currency' for the item uses the 'detectedCurrency' if not specified with the price.
4.  Prioritize accuracy. If you cannot reliably structure parts of the menu, ensure the 'rawText' is complete.
5.  Format the output for 'structuredItems' as an array of categories. Each category object should have 'categoryName', optional 'subcategoryName', and an array 'items' of menu item objects.

Menu Image:
{{media url=imageDataUri}}

Example of a structured item within a category:
{
  "categoryName": "Main Courses",
  "subcategoryName": "Chicken Delights",
  "items": [
    {
      "itemName": "Butter Chicken",
      "itemPrice": "₹450",
      "itemDescription": "Tender chicken pieces simmered in a rich, creamy tomato and butter gravy, flavored with traditional Indian spices. A classic favorite!",
      "isVegetarian": false,
      "currency": "₹",
      "portionSize": "Regular"
    },
    {
      "itemName": "Paneer Tikka Masala (Full)",
      "itemPrice": "350", // Assuming currency is detected globally
      "itemDescription": "Grilled paneer cubes cooked in a spicy, aromatic tomato-based sauce with onions and bell peppers.",
      "isVegetarian": true,
      "currency": "₹", // or inherit from global
      "portionSize": "Full"
    }
  ]
}

Please provide the output in the specified JSON format.
`,
  config: {
    temperature: 0.3, // Slightly higher for description generation but still factual for parsing
    // Ensure the model used supports multimodal input (image and text)
    // model: 'googleai/gemini-1.5-flash-latest' is recommended for this task.
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
      return { rawText: "AI model failed to produce any output." };
    }
    return output;
  }
);