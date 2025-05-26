
"use client";

import type { MenuItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface MenuItemInfoDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  menuItem: MenuItem | null;
}

export function MenuItemInfoDialog({
  isOpen,
  onOpenChange,
  menuItem,
}: MenuItemInfoDialogProps) {
  if (!menuItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">{menuItem.name}</DialogTitle>
          {menuItem.description && (
            <DialogDescription className="text-base pt-1">
              {menuItem.description}
            </DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-2">
            <div className="space-y-4 py-4">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Price:</span>
                    <span className="text-lg font-semibold text-foreground">₹{menuItem.price.toFixed(2)}</span>
                </div>

                {menuItem.category && (
                     <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Category:</span>
                        <Badge variant="outline">{menuItem.category}</Badge>
                    </div>
                )}

                {menuItem.tags && menuItem.tags.length > 0 && (
                    <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1.5">Tags:</h4>
                        <div className="flex flex-wrap gap-2">
                        {menuItem.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="capitalize">
                            {tag}
                            </Badge>
                        ))}
                        </div>
                    </div>
                )}

                {menuItem.allergens && menuItem.allergens.length > 0 && (
                <>
                    <Separator />
                    <div>
                        <h4 className="text-sm font-medium text-destructive mb-1.5">Allergens:</h4>
                        <ul className="list-disc list-inside text-sm text-destructive/90 space-y-0.5">
                        {menuItem.allergens.map((allergen) => (
                            <li key={allergen} className="capitalize">{allergen}</li>
                        ))}
                        </ul>
                    </div>
                </>
                )}

                <div className="flex flex-wrap gap-2 mt-2">
                    {menuItem.isVegetarian && <Badge className="bg-green-600 hover:bg-green-700 text-white">Veg</Badge>}
                    {menuItem.isSpicy && <Badge className="bg-red-600 hover:bg-red-700 text-white">Spicy</Badge>}
                    {menuItem.isGlutenFree && <Badge className="bg-blue-600 hover:bg-blue-700 text-white">Gluten-Free</Badge>}
                </div>
            </div>
        </ScrollArea>

        <DialogFooter className="sm:justify-end">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="rounded-full">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
