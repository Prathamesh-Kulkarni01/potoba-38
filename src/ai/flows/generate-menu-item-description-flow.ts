'use server';
/**
 * @fileOverview AI flow for generating menu item descriptions.
 *
 * - generateMenuItemDescription - A function that generates a description for a menu item.
 * - GenerateMenuItemDescriptionInput - The input type for the function.
 * - GenerateMenuItemDescriptionOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMenuItemDescriptionInputSchema = z.object({
  itemName: z.string().describe('The name of the menu item.'),
  // Optional: Add itemCategory or other context if needed for better descriptions
  // itemCategory: z.string().optional().describe('The category of the menu item (e.g., Appetizer, Main Course).'), 
});
export type GenerateMenuItemDescriptionInput = z.infer<typeof GenerateMenuItemDescriptionInputSchema>;

const GenerateMenuItemDescriptionOutputSchema = z.object({
  description: z.string().describe('The AI-generated description for the menu item.'),
});
export type GenerateMenuItemDescriptionOutput = z.infer<typeof GenerateMenuItemDescriptionOutputSchema>;

export async function generateMenuItemDescription(input: GenerateMenuItemDescriptionInput): Promise<GenerateMenuItemDescriptionOutput> {
  return generateMenuItemDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMenuItemDescriptionPrompt',
  input: {schema: GenerateMenuItemDescriptionInputSchema},
  output: {schema: GenerateMenuItemDescriptionOutputSchema},
  prompt: `You are a creative culinary writer. Generate a short, appealing, and enticing menu item description for "{{itemName}}". 
  The description should be around 2-3 sentences and highlight its key features or taste profile.
  Focus on making it sound delicious.
  
  Example for "Spicy Mango Tango Salad":
  "A vibrant explosion of flavors! Sweet mangoes, crunchy greens, and a zesty chili-lime dressing come together in this refreshing salad. Perfect for a light yet satisfying meal."
  
  Item Name: {{{itemName}}}
  {{#if itemCategory}}Category: {{{itemCategory}}}{{/if}}
  
  Generated Description:`,
  config: {
    temperature: 0.8, // Slightly more creative
  }
});

const generateMenuItemDescriptionFlow = ai.defineFlow(
  {
    name: 'generateMenuItemDescriptionFlow',
    inputSchema: GenerateMenuItemDescriptionInputSchema,
    outputSchema: GenerateMenuItemDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate menu item description.');
    }
    return output;
  }
);
