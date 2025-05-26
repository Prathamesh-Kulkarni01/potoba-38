
'use server';
/**
 * @fileOverview A Genkit flow to parse spoken food orders into structured data.
 *
 * - parseVoiceOrder - A function that takes transcribed text and menu items,
 *   and returns a list of parsed order items.
 * - ParseVoiceOrderInput - The input type for the parseVoiceOrder function.
 * - ParsedOrderItemOutput - The schema for a single parsed item.
 * - ParseVoiceOrderOutput - The return type for the parseVoiceOrder function.
 */

import {ai} from '@/ai/genkit';
import type { MenuItem } from '@/lib/types'; // Assuming MenuItem type is defined here
import {z} from 'genkit';

// Define the schema for individual menu items passed for context
const MenuContextItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  category: z.string(),
});
// Do not export Zod schema constants from 'use server' files. Only types.
// export type MenuContextItem = z.infer<typeof MenuContextItemSchema>;


const ParseVoiceOrderInputSchema = z.object({
  transcribedText: z.string().describe('The text transcribed from the user\'s voice input.'),
  menuItems: z.array(MenuContextItemSchema).describe('A list of available menu items with their names and categories for context.'),
});
export type ParseVoiceOrderInput = z.infer<typeof ParseVoiceOrderInputSchema>;

const ParsedOrderItemOutputSchema = z.object({
  menuItemName: z.string().describe('The name of the menu item identified. This should exactly match a name from the provided menu context.'),
  quantity: z.number().int().min(1).describe('The quantity of the item.'),
  instructions: z.string().optional().describe('Any special instructions for this item (e.g., "extra spicy", "no onions").'),
});
export type ParsedOrderItemOutput = z.infer<typeof ParsedOrderItemOutputSchema>;

const ParseVoiceOrderOutputSchema = z.object({
  parsedItems: z.array(ParsedOrderItemOutputSchema).describe('A list of order items parsed from the transcribed text.'),
  originalTranscript: z.string().describe('The original transcribed text that was processed.'),
  error: z.string().optional().describe('Any error message if parsing failed or items were ambiguous.'),
});
export type ParseVoiceOrderOutput = z.infer<typeof ParseVoiceOrderOutputSchema>;


export async function parseVoiceOrder(input: ParseVoiceOrderInput): Promise<ParseVoiceOrderOutput> {
  // If the transcript is very short or seems invalid, return early.
  if (input.transcribedText.trim().length < 3) {
    return { parsedItems: [], originalTranscript: input.transcribedText, error: "Transcript too short or invalid." };
  }
  try {
    return await parseVoiceOrderFlow(input);
  } catch (e) {
    console.error("Error in parseVoiceOrderFlow:", e);
    return { parsedItems: [], originalTranscript: input.transcribedText, error: "Failed to process voice order due to an internal error." };
  }
}

const prompt = ai.definePrompt({
  name: 'parseVoiceOrderPrompt',
  input: { schema: ParseVoiceOrderInputSchema },
  output: { schema: ParseVoiceOrderOutputSchema }, // LLM now outputs the full object
  prompt: `You are an expert order-taking AI for a restaurant. Your task is to understand a waiter's spoken food order and convert it into a structured JSON object.
The order might be in English or common Indian languages like Hindi, Tamil, or Kannada (often transliterated into English characters, e.g., 'ek plate chole bhature' or 'oru paneer butter masala').

Here is the menu. You MUST match the 'menuItemName' in your output to one of the 'name' fields from this menu EXACTLY:
{{{json menuItems}}}

The spoken order transcript is:
"{{{transcribedText}}}"

Please extract the food items, their quantities, and any special instructions (like 'no onion', 'extra spicy', 'kam चीनी').
- Your output MUST be a JSON object conforming to the ParseVoiceOrderOutput schema.
- The main property in your output object is 'parsedItems', which is an array of objects.
- Each object in 'parsedItems' should have 'menuItemName' (string, from the menu), 'quantity' (number), and 'instructions' (string, optional).
- The output object must also include the 'originalTranscript' field, which should be the same as the input 'transcribedText'.
- If you cannot identify any valid menu items from the transcript, the 'parsedItems' array should be empty [].
- If there's an issue understanding the order, you can set an 'error' message string in the output object.
- If quantity is not specified, assume 1. Interpret quantities spoken as words (e.g., 'one', 'two', 'teen' for Hindi 'three') as numbers. If multiple quantities are mentioned for the same item (e.g. "two coke and one coke"), sum them up for that item.
- Match items to the provided menu. The 'menuItemName' in your output MUST EXACTLY match a 'name' from the menu items provided above.
- If an item mentioned is not on the menu, DO NOT include it in the 'parsedItems' array.
- Focus on food and drink items. Ignore conversational filler or questions not related to ordering items.
- For instructions, try to be concise. Example: "less sugar", "make it spicy".

Example for an input transcript "ek plate Chole Bhature aur do Coca-Cola no ice":
(Assuming "Chole Bhature" and "Coca-Cola" are in the menuItems list)
{
  "parsedItems": [
    { "menuItemName": "Chole Bhature", "quantity": 1 },
    { "menuItemName": "Coca-Cola", "quantity": 2, "instructions": "no ice" }
  ],
  "originalTranscript": "ek plate Chole Bhature aur do Coca-Cola no ice"
}

Another example for "paneer tikka masala one and two butter naan":
(Assuming "Paneer Tikka Masala" and "Butter Naan" are in the menuItems list)
{
  "parsedItems": [
    { "menuItemName": "Paneer Tikka Masala", "quantity": 1 },
    { "menuItemName": "Butter Naan", "quantity": 2 }
  ],
  "originalTranscript": "paneer tikka masala one and two butter naan"
}

Transcript: "{{{transcribedText}}}"
Your JSON output (ensure it matches the full structure including 'parsedItems' and 'originalTranscript'):
`,
});


const parseVoiceOrderFlow = ai.defineFlow(
  {
    name: 'parseVoiceOrderFlow',
    inputSchema: ParseVoiceOrderInputSchema,
    outputSchema: ParseVoiceOrderOutputSchema,
  },
  async (input) => {
    const {output: fullOutputObject, usage} = await prompt(input);

    if (!fullOutputObject || !fullOutputObject.parsedItems || !Array.isArray(fullOutputObject.parsedItems)) {
      console.warn('LLM did not return a valid ParseVoiceOrderOutput structure. Input:', input.transcribedText, 'Output:', fullOutputObject);
      return {
        parsedItems: [],
        originalTranscript: input.transcribedText, // Fallback to input transcript
        error: fullOutputObject?.error || 'AI could not understand the order items. Please try again or enter manually.',
      };
    }
    
    // Ensure originalTranscript is part of the output, or use the input as fallback
    return {
      parsedItems: fullOutputObject.parsedItems,
      originalTranscript: fullOutputObject.originalTranscript || input.transcribedText,
      error: fullOutputObject.error, // Pass along any error message from the LLM
    };
  }
);
