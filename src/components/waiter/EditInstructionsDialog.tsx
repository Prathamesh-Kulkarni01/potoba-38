
"use client";

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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";

interface EditInstructionsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  itemName: string;
  initialInstructions?: string;
  onSave: (instructions: string) => void;
}

export function EditInstructionsDialog({
  isOpen,
  onOpenChange,
  itemName,
  initialInstructions = "",
  onSave,
}: EditInstructionsDialogProps) {
  const [instructions, setInstructions] = useState(initialInstructions);

  useEffect(() => {
    if (isOpen) {
      setInstructions(initialInstructions);
    }
  }, [isOpen, initialInstructions]);

  const handleSave = () => {
    onSave(instructions);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Special Instructions</DialogTitle>
          <DialogDescription>
            Add or edit special instructions for {itemName}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g., extra spicy, no onions"
              className="min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave}>
            Save Instructions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
