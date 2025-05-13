
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, Image as ImageIcon, FileText } from "lucide-react";

interface ImportExportActionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportImage: () => void;
  onImportCsv: () => void;
  onExportMenu: () => void;
}

export default function ImportExportActionsDialog({
  isOpen,
  onClose,
  onImportImage,
  onImportCsv,
  onExportMenu,
}: ImportExportActionsDialogProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Upload className="mr-2 h-5 w-5" />
            Import / Export Menu
          </DialogTitle>
          <DialogDescription>
            Choose an action to manage your menu data.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Button variant="outline" onClick={onImportImage} className="justify-start">
            <ImageIcon className="mr-2 h-4 w-4" />
            Import from Image (Menu Card)
          </Button>
          <Button variant="outline" onClick={onImportCsv} className="justify-start">
            <FileText className="mr-2 h-4 w-4" />
            Import from CSV
          </Button>
          <Button variant="outline" onClick={onExportMenu} className="justify-start">
            <Download className="mr-2 h-4 w-4" />
            Export Menu to CSV
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
