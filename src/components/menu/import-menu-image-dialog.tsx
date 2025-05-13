
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, UploadCloud, FileImage, Wand2, CheckCircle, XCircle, RefreshCw, AlertCircle } from 'lucide-react'; // Added AlertCircle
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { recognizeMenuFromImage, type RecognizeMenuOutput } from '@/ai/flows/recognize-menu-from-image-flow';
import { addMenuCategory, addMenuItem } from '@/lib/firebase/menu'; // Assuming these exist
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ImportMenuImageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  onImportSuccess: () => void; // Callback to refresh menu data on parent
}

export default function ImportMenuImageDialog({
  isOpen,
  onClose,
  restaurantId,
  onImportSuccess,
}: ImportMenuImageDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'select' | 'preview' | 'recognize' | 'confirm'>('select');
  const [imageSrc, setImageSrc] = useState<string | null>(null); // Data URI
  const [recognitionResult, setRecognitionResult] = useState<RecognizeMenuOutput | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isCameraMode, setIsCameraMode] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);


  const resetState = useCallback(() => {
    setStep('select');
    setImageSrc(null);
    setRecognitionResult(null);
    setIsRecognizing(false);
    setIsImporting(false);
    setIsCameraMode(false);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setHasCameraPermission(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
  }, [stream]);

  useEffect(() => {
    // Clean up stream when dialog is closed or component unmounts
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageSrc(e.target?.result as string);
        setStep('preview');
      };
      reader.readAsDataURL(file);
    }
  };

  const getCameraPermission = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setStream(mediaStream);
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions in your browser settings.',
      });
      setIsCameraMode(false); // Revert to upload mode
    }
  };

  useEffect(() => {
    if (isCameraMode && hasCameraPermission === null) { // Only request if not already determined
        getCameraPermission();
    }
  }, [isCameraMode, hasCameraPermission]);

  const handleCapturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/jpeg');
        setImageSrc(dataUri);
        setStep('preview');
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }
        setIsCameraMode(false); // Exit camera mode after capture
      }
    }
  };

  const handleRecognizeMenu = async () => {
    if (!imageSrc) {
      toast({ variant: 'destructive', title: 'No Image', description: 'Please select or capture an image first.' });
      return;
    }
    setIsRecognizing(true);
    setStep('recognize');
    try {
      const result = await recognizeMenuFromImage({ imageDataUri: imageSrc });
      setRecognitionResult(result);
      setStep('confirm');
    } catch (error: any) {
      console.error('Error recognizing menu:', error);
      toast({ variant: 'destructive', title: 'Recognition Failed', description: error.message || 'Could not process the menu image.' });
      setStep('preview'); // Go back to preview if recognition fails
    } finally {
      setIsRecognizing(false);
    }
  };

  const handleConfirmAndImport = async () => {
    if (!recognitionResult?.structuredItems || recognitionResult.structuredItems.length === 0) {
      toast({ variant: 'destructive', title: 'No Items', description: 'No structured menu items were recognized to import.' });
      return;
    }
    setIsImporting(true);
    try {
      let itemsImportedCount = 0;
      for (const categoryData of recognitionResult.structuredItems) {
        let categoryId = '';
        // Check if category exists or create it (simplified: assuming names are unique for now)
        // In a real app, you might want to match existing categories or allow user to map
        const newCategory = await addMenuCategory(restaurantId, { 
            name: categoryData.categoryName || 'Uncategorized', 
            order: 0 // Default order, can be improved
        });
        categoryId = newCategory.id;

        for (const itemData of categoryData.items) {
          // Basic price parsing attempt
          let price = 0;
          if (itemData.itemPrice) {
            const parsedPrice = parseFloat(itemData.itemPrice.replace(/[^0-9.-]+/g,""));
            if (!isNaN(parsedPrice)) {
              price = parsedPrice;
            }
          }
          
          await addMenuItem(restaurantId, categoryId, null, {
            name: itemData.itemName,
            description: itemData.itemDescription || '',
            price: price,
            availability: true, // Default
            order: 0, // Default
            // other fields can be defaulted or left empty
          });
          itemsImportedCount++;
        }
      }
      toast({ title: 'Import Successful', description: `${itemsImportedCount} items imported into your menu.` });
      onImportSuccess(); // Call parent callback
      onClose(); // Close the dialog
    } catch (error: any) {
      console.error('Error importing menu items:', error);
      toast({ variant: 'destructive', title: 'Import Failed', description: error.message || 'Could not add items to the menu.' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDialogClose = () => {
    resetState();
    onClose();
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileImage className="mr-2 h-5 w-5 text-primary" />
            Import Menu from Image
          </DialogTitle>
          <DialogDescription>
            Upload or capture an image of your menu card. Our AI will try to recognize the items.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto p-1 space-y-4">
          {step === 'select' && (
            <div className="space-y-4 p-4 rounded-lg border border-dashed">
                {!isCameraMode && (
                    <>
                        <Label htmlFor="menu-image-upload" className="text-base font-medium">Upload Menu Image</Label>
                        <Input id="menu-image-upload" type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="file:text-primary file:font-semibold"/>
                        <p className="text-xs text-muted-foreground">Or</p>
                        <Button variant="outline" onClick={() => setIsCameraMode(true)} className="w-full">
                        <Camera className="mr-2 h-4 w-4" /> Use Camera
                        </Button>
                    </>
                )}

              {isCameraMode && (
                <div className="space-y-2">
                  <Label className="text-base font-medium">Camera Preview</Label>
                  {hasCameraPermission === false && (
                     <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertTitle>Camera Access Denied</AlertTitle>
                        <AlertDescription>Please grant camera permission to use this feature. You might need to change browser settings.</AlertDescription>
                    </Alert>
                  )}
                  <div className="bg-muted rounded-md overflow-hidden aspect-video relative">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    {hasCameraPermission === null && <div className="absolute inset-0 flex items-center justify-center bg-black/50"><LoadingSpinner className="text-white"/></div>}
                  </div>
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  <div className="flex gap-2">
                    <Button onClick={handleCapturePhoto} disabled={!hasCameraPermission || !stream} className="flex-1 bg-primary hover:bg-primary/90">
                      <Camera className="mr-2 h-4 w-4" /> Capture Photo
                    </Button>
                    <Button variant="outline" onClick={() => { setIsCameraMode(false); if (stream) stream.getTracks().forEach(track => track.stop()); setStream(null); setHasCameraPermission(null);}} className="flex-1">
                      <UploadCloud className="mr-2 h-4 w-4"/> Switch to Upload
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'preview' && imageSrc && (
            <div className="space-y-3 text-center">
              <h3 className="text-lg font-semibold">Image Preview</h3>
              <Image src={imageSrc} alt="Menu preview" width={400} height={300} className="rounded-md mx-auto object-contain max-h-80 shadow-md" />
              <div className="flex justify-center gap-2 pt-2">
                <Button variant="outline" onClick={() => { setImageSrc(null); setStep('select'); if(fileInputRef.current) fileInputRef.current.value = ""; }}>
                  <RefreshCw className="mr-2 h-4 w-4"/> Change Image
                </Button>
                <Button onClick={handleRecognizeMenu} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Wand2 className="mr-2 h-4 w-4" /> Recognize Menu
                </Button>
              </div>
            </div>
          )}

          {step === 'recognize' && isRecognizing && (
            <div className="flex flex-col items-center justify-center space-y-3 p-8">
              <LoadingSpinner className="h-10 w-10 text-primary" />
              <p className="text-lg text-muted-foreground">AI is analyzing your menu... This may take a moment.</p>
              <p className="text-xs text-muted-foreground">(Please ensure the image is clear and well-lit for best results)</p>
            </div>
          )}

          {step === 'confirm' && recognitionResult && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Review Recognized Items</h3>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Beta Feature</AlertTitle>
                <AlertDescription>
                  Menu recognition is experimental. Please review items carefully before importing. Editing capabilities will be added soon.
                </AlertDescription>
              </Alert>
              <div className="max-h-80 overflow-y-auto space-y-2 border rounded-md p-3 bg-muted/30">
                {recognitionResult.structuredItems && recognitionResult.structuredItems.length > 0 ? (
                  recognitionResult.structuredItems.map((cat, catIndex) => (
                    <div key={catIndex} className="mb-2 p-2 border-b last:border-b-0">
                      <h4 className="font-medium text-primary">{cat.categoryName || 'Uncategorized Items'}</h4>
                      <ul className="list-disc list-inside pl-4 text-sm">
                        {cat.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="text-muted-foreground">
                            {item.itemName} 
                            {item.itemPrice && ` - ${item.itemPrice}`}
                            {item.itemDescription && <span className="block text-xs italic pl-2">- {item.itemDescription}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">No structured items were recognized. Raw text (if any): <pre className="text-xs whitespace-pre-wrap bg-background p-2 rounded mt-1">{recognitionResult.rawText || "No text recognized."}</pre></p>
                )}
              </div>
              {recognitionResult.rawText && (!recognitionResult.structuredItems || recognitionResult.structuredItems.length === 0) && (
                <div>
                    <h4 className="text-md font-semibold">Raw Recognized Text:</h4>
                    <pre className="text-xs whitespace-pre-wrap bg-background p-2 rounded max-h-40 overflow-y-auto border">{recognitionResult.rawText}</pre>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="ghost" onClick={handleDialogClose} disabled={isRecognizing || isImporting}>
            Cancel
          </Button>
          {step === 'confirm' && recognitionResult?.structuredItems && recognitionResult.structuredItems.length > 0 && (
            <Button onClick={handleConfirmAndImport} disabled={isImporting || isRecognizing} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isImporting ? <LoadingSpinner className="mr-2 h-4 w-4" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Confirm & Add to Menu
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
