
'use server';
/**
 * @fileOverview AI flow for generating order ETA.
 *
 * - generateOrderEta - A function that estimates the ETA for an order.
 * - GenerateOrderEtaInput - The input type for the function.
 * - GenerateOrderEtaOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { OrderItem } from '@/types'; // Assuming OrderItem is defined in your types

const OrderItemSchema = z.object({
  menuItemId: z.string(),
  menuItemName: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number(),
  totalPrice: z.number(),
  // variantChoices and notes can be added if relevant for ETA calculation
});

const GenerateOrderEtaInputSchema = z.object({
  orderId: z.string().describe('The ID of the order.'),
  items: z.array(OrderItemSchema).describe('List of items in the order.'),
  currentRestaurantLoad: z.enum(['low', 'medium', 'high']).describe('Current perceived load of the restaurant.'),
});
export type GenerateOrderEtaInput = z.infer<typeof GenerateOrderEtaInputSchema>;

const GenerateOrderEtaOutputSchema = z.object({
  eta: z.string().describe('The estimated time of arrival or readiness for the order (e.g., "15-20 minutes", "Approximately 30 minutes").'),
});
export type GenerateOrderEtaOutput = z.infer<typeof GenerateOrderEtaOutputSchema>;

export async function generateOrderEta(input: GenerateOrderEtaInput): Promise<GenerateOrderEtaOutput> {
  return generateOrderEtaFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateOrderEtaPrompt',
  input: { schema: GenerateOrderEtaInputSchema },
  output: { schema: GenerateOrderEtaOutputSchema },
  prompt: `You are an expert restaurant order fulfillment estimator.
Given the order items and the current restaurant load, provide a realistic estimated time for when the order will be ready.
Consider that more items or complex items might take longer. Higher restaurant load will also increase wait times.

Order Items:
{{#each items}}
- {{quantity}}x {{menuItemName}}
{{/each}}

Current Restaurant Load: {{{currentRestaurantLoad}}}

Estimated Time of Arrival/Readiness:
Generate a concise ETA string like "10-15 minutes", "Around 25 minutes", or "Within 45 minutes".
Be slightly optimistic but realistic.
For low load and 1-2 simple items, estimate 5-10 minutes.
For medium load and 3-4 items, estimate 15-25 minutes.
For high load and 5+ items, estimate 30-45 minutes or more.
Adjust based on item quantity and load.
`,
  config: {
    temperature: 0.5, // More deterministic for ETA
  }
});

const generateOrderEtaFlow = ai.defineFlow(
  {
    name: 'generateOrderEtaFlow',
    inputSchema: GenerateOrderEtaInputSchema,
    outputSchema: GenerateOrderEtaOutputSchema,
  },
  async (input) => {
    // For a real system, you might fetch actual average prep times for items,
    // or have a more sophisticated load calculation.
    
    // Simplified mock logic if AI fails or for very simple cases
    if (input.items.length === 0) {
      return { eta: "N/A - No items" };
    }

    const { output } = await prompt(input);
    if (!output) {
      // Fallback simple ETA if AI fails
      let baseEta = 10; // minutes
      baseEta += input.items.length * 3; // 3 mins per item type
      if (input.currentRestaurantLoad === 'medium') baseEta += 10;
      if (input.currentRestaurantLoad === 'high') baseEta += 20;
      const minEta = Math.max(5, baseEta - 5);
      const maxEta = baseEta + 5;
      return { eta: `${minEta}-${maxEta} minutes (Fallback)` };
    }
    return output;
  }
);

