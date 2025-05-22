'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MenuItem, MenuItemVariant, AvailabilityRule, MenuItemVariantOption, TaxConfig, RestaurantProfile } from '@/types';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Sparkles, PlusCircle, Trash2 } from 'lucide-react';
import { generateMenuItemDescription } from '@/ai/flows/generate-menu-item-description-flow';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '../ui/card';
import { MultiSelect } from '@/components/ui/multiselect';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:mm format

const menuItemVariantOptionSchema = z.object({
  name: z.string().min(1, "Option name is required."),
  price: z.coerce.number().min(0, "Price must be non-negative."),
});

const menuItemVariantSchema = z.object({
  name: z.string().min(1, "Variant name is required (e.g., Size)."),
  options: z.array(menuItemVariantOptionSchema).min(1, "At least one option is required for a variant."),
});

const availabilityRuleSchema = z.object({
  dayOfWeek: z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Everyday'], { required_error: "Day is required." }),
  startTime: z.string().regex(timeRegex, "Invalid start time format (HH:mm)."),
  endTime: z.string().regex(timeRegex, "Invalid end time format (HH:mm)."),
}).refine(data => data.startTime < data.endTime, {
  message: "End time must be after start time.",
  path: ["endTime"],
});

const menuItemFormSchema = z.object({
  name: z.string().min(1, { message: 'Item name is required.' }),
  description: z.string().optional(),
  price: z.coerce.number().min(0, { message: 'Price must be a positive number if no variants with price exist or this is base price.' }),
  imageUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  videoUrl: z.string().url({ message: "Please enter a valid video URL." }).optional().or(z.literal('')),
  availability: z.boolean().default(true), // Master switch
  order: z.coerce.number().min(0, { message: 'Order must be a positive number.' }),
  
  dietaryTags: z.string().optional().transform(val => val ? val.split(',').map(s => s.trim()).filter(Boolean) : undefined),
  allergenInfo: z.string().optional().transform(val => val ? val.split(',').map(s => s.trim()).filter(Boolean) : undefined),
  calories: z.coerce.number().optional().nullable(),
  crossSellItems: z.string().optional().transform(val => val ? val.split(',').map(s => s.trim()).filter(Boolean) : undefined),
  upsellItems: z.string().optional().transform(val => val ? val.split(',').map(s => s.trim()).filter(Boolean) : undefined),

  variants: z.array(menuItemVariantSchema).optional(),
  availabilitySchedule: z.array(availabilityRuleSchema).optional(),
});

export type MenuItemFormValues = z.infer<typeof menuItemFormSchema>;

interface MenuItemFormProps {
  restaurantId: string;
  categoryId: string;
  categoryName?: string; 
  subcategoryId?: string | null;
  subcategoryName?: string; 
  menuItem?: MenuItem | null;
  onSubmit: (values: MenuItemFormValues & { taxOverrides?: TaxConfig[] }, itemId?: string) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
  restaurant?: RestaurantProfile | null;
}

export default function MenuItemForm({
  menuItem,
  onSubmit,
  onClose,
  isLoading,
  restaurant,
}: MenuItemFormProps) {
  const { toast } = useToast();
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [taxOverrides, setTaxOverrides] = useState<TaxConfig[]>(menuItem?.taxOverrides || []);

  const form = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      name: menuItem?.name || '',
      description: menuItem?.description || '',
      price: menuItem?.price || 0,
      imageUrl: menuItem?.imageUrl || '',
      videoUrl: menuItem?.videoUrl || '',
      availability: menuItem?.availability === undefined ? true : menuItem.availability,
      order: menuItem?.order || 0,
      dietaryTags: menuItem?.dietaryTags || [],
      allergenInfo: menuItem?.allergenInfo || [],
      calories: menuItem?.calories || null,
      crossSellItems: menuItem?.crossSellItems || [],
      upsellItems: menuItem?.upsellItems || [],
      variants: menuItem?.variants || [],
      availabilitySchedule: menuItem?.availabilitySchedule || [],
    },
  });

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  const { fields: scheduleFields, append: appendSchedule, remove: removeSchedule } = useFieldArray({
    control: form.control,
    name: "availabilitySchedule",
  });


  const handleGenerateDescription = async () => {
    const itemName = form.getValues('name');
    if (!itemName) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter an item name first.' });
      return;
    }
    setIsGeneratingDescription(true);
    try {
      const result = await generateMenuItemDescription({ itemName });
      form.setValue('description', result.description);
      toast({ title: 'Success', description: 'AI-generated description populated.' });
    } catch (error) {
      console.error('AI description generation error:', error);
      toast({ variant: 'destructive', title: 'AI Error', description: 'Could not generate description.' });
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleSubmit = async (values: MenuItemFormValues) => {
    const dataToSubmit: any = { 
      ...values,
      calories: values.calories === null || values.calories === undefined || isNaN(values.calories) ? undefined : Number(values.calories),
      variants: values.variants && values.variants.length > 0 ? values.variants : undefined,
      availabilitySchedule: values.availabilitySchedule && values.availabilitySchedule.length > 0 ? values.availabilitySchedule : undefined,
      taxOverrides,
    };
     if (dataToSubmit.imageUrl === '') dataToSubmit.imageUrl = null;
     if (dataToSubmit.videoUrl === '') dataToSubmit.videoUrl = null;

    await onSubmit(dataToSubmit as MenuItemFormValues, menuItem?.id);
  };
  
  const daysOfWeek: AvailabilityRule['dayOfWeek'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Everyday'];


  return (
    <DialogContent className="sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>{menuItem ? 'Edit Menu Item' : 'Add New Menu Item'}</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-0">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="variants">Variants</TabsTrigger>
              <TabsTrigger value="availability">Availability</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>
            <ScrollArea className="h-[60vh] pr-2 pt-1">
              <TabsContent value="general" className="space-y-4 p-1">
                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Item Name</FormLabel> <FormControl><Input placeholder="e.g., Tomato Soup" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormItem>
                  <div className="flex items-center justify-between"><FormLabel>Description</FormLabel><Button type="button" variant="outline" size="sm" onClick={handleGenerateDescription} disabled={isGeneratingDescription || isLoading}>{isGeneratingDescription ? <LoadingSpinner className="mr-2 h-3 w-3" /> : <Sparkles className="mr-2 h-3 w-3" />}AI</Button></div>
                  <FormControl><Textarea placeholder="A brief description of the item" {...form.register('description')} /></FormControl><FormMessage {...form.getFieldState('description')} />
                </FormItem>
                <FormField control={form.control} name="price" render={({ field }) => ( <FormItem> <FormLabel>Base Price</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="e.g., 5.99" {...field} /></FormControl> <FormDescription>Base price if no variants, or for default variant.</FormDescription> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="imageUrl" render={({ field }) => ( <FormItem> <FormLabel>Image URL</FormLabel> <FormControl><Input placeholder="https://example.com/image.jpg" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="videoUrl" render={({ field }) => ( <FormItem> <FormLabel>Video URL</FormLabel> <FormControl><Input placeholder="https://example.com/video.mp4" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="order" render={({ field }) => ( <FormItem> <FormLabel>Display Order</FormLabel> <FormControl><Input type="number" placeholder="e.g., 1" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              </TabsContent>

              <TabsContent value="variants" className="space-y-4 p-1">
                {variantFields.map((variantField, variantIndex) => (
                  <Card key={variantField.id} className="p-4 space-y-3 bg-muted/50">
                    <div className="flex justify-between items-center">
                      <FormField control={form.control} name={`variants.${variantIndex}.name`} render={({ field }) => ( <FormItem className="flex-grow mr-2"> <FormLabel>Variant Type Name</FormLabel> <FormControl><Input placeholder="e.g., Size" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeVariant(variantIndex)} className="mt-6 text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <FormLabel className="text-sm">Options for {form.watch(`variants.${variantIndex}.name`) || 'this variant'}</FormLabel>
                    <Controller
                        control={form.control}
                        name={`variants.${variantIndex}.options`}
                        render={({ field: { onChange, value = [] } }) => {
                          const optionsArray = Array.isArray(value) ? value : [];
                          const appendOption = () => onChange([...optionsArray, { name: '', price: 0 }]);
                          const removeOption = (optIdx: number) => onChange(optionsArray.filter((_, i) => i !== optIdx));
                          const updateOptionField = (optIdx: number, fieldName: keyof MenuItemVariantOption, fieldValue: string | number) => {
                            const newOptions = [...optionsArray];
                            if (fieldName === 'price') newOptions[optIdx][fieldName] = Number(fieldValue);
                            else newOptions[optIdx][fieldName] = fieldValue as string;
                            onChange(newOptions);
                          };

                          return (
                            <div className="space-y-2 pl-4 border-l-2 border-primary/30">
                              {optionsArray.map((option, optIdx) => (
                                <div key={`${variantField.id}-option-${optIdx}`} className="flex items-end gap-2 p-2 bg-background rounded">
                                  <FormItem className="flex-grow"> <FormLabel htmlFor={`variants[${variantIndex}].options[${optIdx}].name`} className="text-xs">Option Name</FormLabel><Input id={`variants[${variantIndex}].options[${optIdx}].name`} placeholder="e.g., Small" value={option.name} onChange={(e) => updateOptionField(optIdx, 'name', e.target.value)} className="h-8" /> </FormItem>
                                  <FormItem> <FormLabel htmlFor={`variants[${variantIndex}].options[${optIdx}].price`} className="text-xs">Price</FormLabel><Input id={`variants[${variantIndex}].options[${optIdx}].price`} type="number" step="0.01" placeholder="10.00" value={option.price} onChange={(e) => updateOptionField(optIdx, 'price', e.target.value)} className="h-8 w-24" /> </FormItem>
                                  <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(optIdx)} className="h-8 w-8 p-0 text-destructive/70 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                              ))}
                              <Button type="button" variant="outline" size="sm" onClick={appendOption}><PlusCircle className="mr-2 h-4 w-4" /> Add Option</Button>
                            </div>
                          );
                        }}
                      />
                    <FormMessage>{form.formState.errors.variants?.[variantIndex]?.options?.message}</FormMessage>
                  </Card>
                ))}
                <Button type="button" variant="outline" onClick={() => appendVariant({ name: '', options: [{ name: '', price: 0 }] })}><PlusCircle className="mr-2 h-4 w-4" /> Add Variant Type</Button>
              </TabsContent>

              <TabsContent value="availability" className="space-y-4 p-1">
                 <FormField control={form.control} name="availability" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm bg-card"> <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl> <div className="space-y-1 leading-none"><FormLabel>Globally Available</FormLabel><FormDescription>Master switch to make item available/unavailable.</FormDescription></div> </FormItem> )} />
                <h4 className="text-md font-semibold mt-4">Availability Schedule (Optional)</h4>
                {scheduleFields.map((scheduleField, index) => (
                  <Card key={scheduleField.id} className="p-3 space-y-2 bg-muted/50">
                    <div className="flex items-end gap-2">
                      <FormField control={form.control} name={`availabilitySchedule.${index}.dayOfWeek`} render={({ field }) => ( <FormItem className="flex-grow"> <FormLabel>Day</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Select day" /></SelectTrigger></FormControl> <SelectContent>{daysOfWeek.map(day => (<SelectItem key={day} value={day}>{day}</SelectItem>))}</SelectContent> </Select> <FormMessage /> </FormItem> )} />
                      <FormField control={form.control} name={`availabilitySchedule.${index}.startTime`} render={({ field }) => ( <FormItem> <FormLabel>Start Time</FormLabel> <FormControl><Input type="time" {...field} className="h-9" /></FormControl> <FormMessage /> </FormItem> )} />
                      <FormField control={form.control} name={`availabilitySchedule.${index}.endTime`} render={({ field }) => ( <FormItem> <FormLabel>End Time</FormLabel> <FormControl><Input type="time" {...field} className="h-9" /></FormControl> <FormMessage /> </FormItem> )} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeSchedule(index)} className="h-9 w-9 p-0 text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </Card>
                ))}
                <Button type="button" variant="outline" onClick={() => appendSchedule({ dayOfWeek: 'Mon', startTime: '09:00', endTime: '17:00' })}><PlusCircle className="mr-2 h-4 w-4" /> Add Schedule Rule</Button>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4 p-1">
                <FormField control={form.control} name="dietaryTags" render={({ field }) => ( <FormItem> <FormLabel>Dietary Tags</FormLabel> <FormControl><Input placeholder="e.g., vegan, gluten-free (comma-separated)" {...field} /></FormControl><FormDescription>Comma-separated list.</FormDescription><FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="allergenInfo" render={({ field }) => ( <FormItem> <FormLabel>Allergen Info</FormLabel> <FormControl><Input placeholder="e.g., dairy, nuts (comma-separated)" {...field} /></FormControl><FormDescription>Comma-separated list.</FormDescription><FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="calories" render={({ field }) => ( <FormItem> <FormLabel>Calories</FormLabel> <FormControl><Input type="number" placeholder="e.g., 350" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="crossSellItems" render={({ field }) => ( <FormItem> <FormLabel>Cross-Sell Items</FormLabel> <FormControl><Input placeholder="e.g., Fries, Coke (comma-separated)" {...field} /></FormControl><FormDescription>Suggest items that go well with this one.</FormDescription><FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="upsellItems" render={({ field }) => ( <FormItem> <FormLabel>Up-Sell Items</FormLabel> <FormControl><Input placeholder="e.g., Large Fries, Combo Meal (comma-separated)" {...field} /></FormControl><FormDescription>Suggest premium alternatives or additions.</FormDescription><FormMessage /> </FormItem> )} />
                {restaurant?.taxes && (
                  <div className="space-y-2">
                    <FormLabel>Assign Taxes (Overrides)</FormLabel>
                    <MultiSelect
                      options={restaurant.taxes.map(tax => ({ label: `${tax.name} (${tax.type === 'percentage' ? tax.rate + '%' : '₹' + tax.rate})`, value: tax.id, isInclusive: tax.isInclusive }))}
                      value={taxOverrides.map(t => t.id)}
                      onChange={(selectedIds: string[]) => {
                        const selectedTaxes = (restaurant.taxes ?? []).filter(tax => selectedIds.includes(tax.id));
                        setTaxOverrides(selectedTaxes);
                      }}
                    />
                    <div className="text-xs text-muted-foreground">If no override, restaurant default taxes apply.</div>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
          <DialogFooter className="fixed w-[95%] bottom-0 bg-background py-4 border-t mt-0">
            <DialogClose asChild><Button type="button" variant="outline" onClick={onClose} disabled={isLoading || isGeneratingDescription}>Cancel</Button></DialogClose>
            <Button type="submit" disabled={isLoading || isGeneratingDescription} className="bg-primary hover:bg-primary/90 text-primary-foreground">{(isLoading || isGeneratingDescription) ? <LoadingSpinner className="mr-2 h-4 w-4" /> : (menuItem ? 'Save Changes' : 'Add Item')}</Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
