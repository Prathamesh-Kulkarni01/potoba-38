
import type { SpecialOffer } from '@/lib/types';

export const SPECIAL_OFFERS_DATA: SpecialOffer[] = [
  {
    id: 'special-001',
    title: 'Pasta Combo',
    description: 'Any Pasta + Coca-Cola for a special price!',
    specialPrice: 17.50,
    applicableItems: ['Spaghetti Carbonara', 'Fettuccine Alfredo', 'Arrabiata Penne', 'Coca-Cola'],
    imageUrl: 'https://placehold.co/300x200.png',
    tags: ['Combo Deal', 'Lunch Special'],
    dataAiHint: 'pasta coke',
  },
  {
    id: 'special-002',
    title: 'Pizza Delight - 15% OFF',
    description: 'Get 15% off on all our signature pizzas.',
    discountPercentage: 15,
    applicableItems: ['Margherita Pizza', 'Pepperoni Pizza', 'Spicy Veggie Pizza'],
    imageUrl: 'https://placehold.co/300x200.png',
    tags: ['Limited Time Offer'],
    dataAiHint: 'pizza offer',
  },
  {
    id: 'special-003',
    title: 'Healthy Start Salad',
    description: 'Fresh Greek Salad with a complimentary Mineral Water.',
    specialPrice: 9.00,
    applicableItems: ['Greek Salad', 'Mineral Water'],
    imageUrl: 'https://placehold.co/300x200.png',
    tags: ['Healthy Choice', 'Value Meal'],
    dataAiHint: 'salad water',
  },
];
