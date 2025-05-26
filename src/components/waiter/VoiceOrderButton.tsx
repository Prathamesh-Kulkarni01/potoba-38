
"use client";

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Send, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useOrders } from '@/contexts/waiter/OrderContext';
import type { MenuItem } from '@/lib/types';
import { parseVoiceOrder, type ParsedOrderItemOutput } from '@/ai/flows/parse-voice-order-flow';
import { MENU_ITEMS } from '@/data/waiter/menu';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface VoiceOrderButtonProps {
  tableId: string;
}

const findMenuItemByName = (name: string, menu: MenuItem[]): MenuItem | undefined => {
  return menu.find(item => item.name.toLowerCase() === name.toLowerCase());
};

export function VoiceOrderButton({ tableId }: VoiceOrderButtonProps) {
  const { addItemToOrder } = useOrders();
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [parsedVoiceResult, setParsedVoiceResult] = useState<ParsedOrderItemOutput[] | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [speechApiSupported, setSpeechApiSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const accumulatedTranscriptRef = useRef<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        setSpeechApiSupported(true);
        recognitionRef.current = new SpeechRecognitionAPI();
        const recognition = recognitionRef.current;
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-IN';

        recognition.onstart = () => {
          setIsListening(true);
          // Clear all previous states for a new session
          setTranscript('');
          setInterimTranscript('');
          accumulatedTranscriptRef.current = '';
          setParsedVoiceResult(null);
          setProcessingError(null);
          setShowConfirmation(false);
        };

        recognition.onresult = (event) => {
          let finalTranscriptPart = '';
          let currentInterim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscriptPart += event.results[i][0].transcript;
            } else {
              currentInterim += event.results[i][0].transcript;
            }
          }
          setInterimTranscript(currentInterim);
          if (finalTranscriptPart) {
             accumulatedTranscriptRef.current = (accumulatedTranscriptRef.current + " " + finalTranscriptPart).trim();
             setTranscript(accumulatedTranscriptRef.current);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          const finalUserTranscript = accumulatedTranscriptRef.current.trim();
          if (finalUserTranscript) {
            handleProcessTranscript(finalUserTranscript);
          } else if (interimTranscript.trim()) {
            // If 'onend' fired but we only have interim, try processing that.
            // This can happen if recognition stops abruptly.
            setTranscript(interimTranscript.trim()); // Set final transcript to the interim one
            handleProcessTranscript(interimTranscript.trim());
          } else {
            setProcessingError("No speech was detected or transcribed. Please try again.");
          }
          setInterimTranscript('');
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error, event.message);
          let errorMessage = `Speech recognition error: ${event.error}.`;
          if (event.error === 'no-speech') {
            errorMessage = "No speech was detected. Please try speaking again.";
          } else if (event.error === 'audio-capture') {
            errorMessage = "Audio capture failed. Check microphone permissions and hardware.";
          } else if (event.error === 'not-allowed') {
            errorMessage = "Microphone access was not allowed. Please enable it in your browser settings.";
          } else {
            errorMessage += ` ${event.message || ''}`;
          }
          setProcessingError(errorMessage);
          setIsListening(false);
          accumulatedTranscriptRef.current = '';
          setTranscript('');
          setInterimTranscript('');
        };
      } else {
        setSpeechApiSupported(false);
        toast({
          variant: 'destructive',
          title: 'Voice Order Not Supported',
          description: 'Speech recognition is not supported by your browser.',
        });
        setProcessingError("Speech recognition not supported by this browser.");
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.abort();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const handleToggleListen = () => {
    if (!speechApiSupported) {
      toast({
          variant: 'destructive',
          title: 'Voice Order Not Supported',
          description: 'Speech recognition is not supported by your browser.',
      });
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (recognitionRef.current) {
        try {
          // Clear states for a new recording session
          setTranscript(''); 
          setInterimTranscript('');
          accumulatedTranscriptRef.current = '';
          setProcessingError(null);
          setParsedVoiceResult(null);
          setShowConfirmation(false);
          recognitionRef.current.start();
        } catch (e: any) {
          console.error("Error starting speech recognition:", e);
          setProcessingError(`Could not start voice recognition: ${e.message}. Please ensure microphone access is granted and try again.`);
          setIsListening(false);
        }
      } else {
         setProcessingError("Speech recognition component not available.");
      }
    }
  };

  const handleProcessTranscript = async (textToProcess: string) => {
    if (!textToProcess.trim()) {
        setProcessingError("No speech detected to process.");
        setIsProcessing(false); // Ensure processing is set to false
        return;
    }
    setIsProcessing(true);
    setProcessingError(null);
    setParsedVoiceResult(null);
    setShowConfirmation(false);
    console.log("Sending to Genkit for NLU:", textToProcess);

    try {
      const result = await parseVoiceOrder({ transcribedText: textToProcess, menuItems: MENU_ITEMS });
      console.log("Genkit NLU result:", result);
      if (result.error) {
        setProcessingError(result.error);
        setParsedVoiceResult([]); 
      } else if (result.parsedItems.length === 0) {
        setProcessingError(null); // Clear previous errors if NLU just found no items
        setParsedVoiceResult([]); // Set to empty array to trigger "no items found" card
      } else {
        setParsedVoiceResult(result.parsedItems);
      }
      setShowConfirmation(true); // Show confirmation card for results or "no items found"
    } catch (error: any) {
      console.error('Error parsing voice order with Genkit:', error);
      const message = error.message || 'Failed to understand the order. Please try again or enter manually.';
      setProcessingError(`NLU Error: ${message}`);
      setParsedVoiceResult([]);
      setShowConfirmation(true); // Still show a card, which will display the error
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmOrder = () => {
    if (parsedVoiceResult && parsedVoiceResult.length > 0) {
      let itemsAddedCount = 0;
      let itemsNotFound: string[] = [];

      parsedVoiceResult.forEach(parsedItem => {
        const menuItem = findMenuItemByName(parsedItem.menuItemName, MENU_ITEMS);
        if (menuItem) {
          const itemToAdd: MenuItem & { instructions?: string; uniqueId?: string } = {
            ...menuItem,
            ...(parsedItem.instructions && { instructions: parsedItem.instructions }),
          };
          addItemToOrder(tableId, itemToAdd, parsedItem.quantity);
          itemsAddedCount++;
        } else {
          itemsNotFound.push(parsedItem.menuItemName);
          console.warn(`Could not find "${parsedItem.menuItemName}" in the menu.`);
        }
      });

      if (itemsAddedCount > 0) {
        toast({
          title: 'Order Updated',
          description: `${itemsAddedCount} item type(s) added/updated for Table ${tableId.replace('t', '')}.`,
        });
      }
      if (itemsNotFound.length > 0) {
         toast({
            variant: 'destructive',
            title: 'Some Items Not Found',
            description: `Could not find: ${itemsNotFound.join(', ')}. These were not added. Please check menu.`,
            duration: 5000,
          });
      }
      setParsedVoiceResult(null);
      setShowConfirmation(false);
      // Don't clear transcript here, user might want to refer to it or retry if some items were missed
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
    setParsedVoiceResult(null);
    // Keep transcript for potential retry
  };
  
  const handleRetryProcess = () => {
    if (transcript.trim()) {
        // Reset states before retrying, except for the transcript itself
        setProcessingError(null);
        setParsedVoiceResult(null);
        setShowConfirmation(false);
        handleProcessTranscript(transcript.trim());
    } else {
        toast({variant: "destructive", title: "No Transcript", description: "Nothing to retry processing."})
    }
  }

  const canRetry = transcript.trim() && !isListening && !isProcessing;

  return (
    <div className="my-6 space-y-4">
      <div className="flex gap-2">
        <Button 
            onClick={handleToggleListen} 
            variant="outline" 
            size="lg" 
            className="flex-grow rounded-full text-base"
            disabled={!speechApiSupported || isProcessing }
        >
            {isListening ? <MicOff className="mr-2 h-5 w-5" /> : <Mic className="mr-2 h-5 w-5" />}
            {isProcessing && !isListening ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            {isListening ? 'Stop Listening' : isProcessing ? 'Processing...' : 'Start Voice Order'}
        </Button>
        {canRetry && (
             <Button onClick={handleRetryProcess} variant="ghost" size="lg" className="rounded-full text-base" title="Retry processing last transcript">
                <Send className="mr-2 h-5 w-5" /> Retry
             </Button>
        )}
      </div>


      {(transcript || interimTranscript) && (
        <div className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/30 min-h-[40px]">
          {isListening && !interimTranscript && !transcript && "Listening..."}
          {transcript || interimTranscript} {interimTranscript && transcript && <span className="text-foreground/50"> (listening...)</span>}
        </div>
      )}

      {isProcessing && !isListening && ( 
        <div className="flex items-center justify-center text-muted-foreground p-4">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Analyzing your order...
        </div>
      )}

      {/* Display Area for Errors OR Confirmation Cards */}
      {showConfirmation && !isProcessing && (
        <>
          {processingError && (
            <Card className="shadow-md border-destructive">
              <CardHeader>
                <CardTitle className="flex items-center text-destructive"><AlertCircle className="mr-2 h-5 w-5"/> Processing Error</CardTitle>
              </CardHeader>
              <CardContent>
                 <p className="text-sm text-destructive mb-2">{processingError}</p>
                 {transcript && <p className="text-xs text-muted-foreground">Original transcript: &quot;{transcript}&quot;</p>}
              </CardContent>
              <CardFooter>
                <Button onClick={handleCancelConfirmation} variant="outline" className="w-full rounded-full">
                    Try Again / Re-record
                </Button>
              </CardFooter>
            </Card>
          )}

          {!processingError && parsedVoiceResult && parsedVoiceResult.length > 0 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Confirm Voice Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                {transcript && <p className="text-sm text-muted-foreground mb-2">Your order: &quot;{transcript}&quot;</p>}
                <p className="text-xs text-muted-foreground mb-3">Review the items below. Edit quantities or instructions on the main order screen after adding.</p>
                <ScrollArea className="max-h-[200px] pr-3">
                    <div className="space-y-2">
                    {parsedVoiceResult.map((item, index) => (
                        <div key={index} className="p-2.5 border rounded-md bg-background">
                        <p className="font-semibold">{item.menuItemName} <Badge variant="secondary" className="align-middle">x {item.quantity}</Badge></p>
                        {item.instructions && <p className="text-xs text-accent-foreground bg-accent/10 px-1.5 py-0.5 rounded inline-block mt-1">Note: {item.instructions}</p>}
                        </div>
                    ))}
                    </div>
                </ScrollArea>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleConfirmOrder} className="w-full sm:w-auto rounded-full">
                  <CheckCircle className="mr-2 h-5 w-5" /> Add These Items
                </Button>
                <Button onClick={handleCancelConfirmation} variant="outline" className="w-full sm:w-auto rounded-full">
                  Discard / Re-record
                </Button>
              </CardFooter>
            </Card>
          )}
          
          {!processingError && parsedVoiceResult && parsedVoiceResult.length === 0 && (
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>No Items Recognized</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="text-center text-muted-foreground py-2">
                        <p className="mb-1">No menu items were identified from your speech:</p>
                        {transcript && <p className="italic text-foreground/80 mb-2">&quot;{transcript}&quot;</p>}
                        <p className="mt-2">Please try speaking again or enter items manually.</p>
                    </div>
                </CardContent>
                 <CardFooter>
                    <Button onClick={handleCancelConfirmation} variant="outline" className="w-full rounded-full">
                        Try Again / Re-record
                    </Button>
                 </CardFooter>
            </Card>
          )}
        </>
      )}
    </div>
  );
}


    