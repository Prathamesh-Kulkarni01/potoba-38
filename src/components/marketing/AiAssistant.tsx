
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Bot, Sparkles, Copy, Check, Download, MessageSquareText, ImageIcon, Share2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function AiAssistant() {
  const { getCurrentRestaurant } = useAuth();
  const currentRestaurant = getCurrentRestaurant();
  const [prompt, setPrompt] = useState('');
  const [promptTemplate, setPromptTemplate] = useState('menu-description');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  const promptTemplates = {
    'menu-description': 'Write a mouth-watering description for a [DISH] that highlights its flavors and ingredients.',
    'promotional-text': 'Create a promotional text for a [SPECIAL] at our restaurant that emphasizes the limited-time offer.',
    'social-media': 'Write an engaging social media post about our [FEATURE] that will attract food lovers.',
    'email-campaign': 'Create an email template promoting our [EVENT] that conveys excitement and exclusivity.',
    'custom': '',
  };
  
  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    
    setIsGenerating(true);
    setGeneratedContent('');
    
    // Mock AI text generation with simulated typing
    const mockText = "This exquisite dish features tender slices of perfectly seared salmon, gently nestled on a bed of aromatic jasmine rice. The salmon is glazed with a delicate honey and soy reduction that caramelizes beautifully, creating a stunning balance of sweet and savory notes. Each bite delivers a harmonious combination of the fish's natural richness and the glaze's complex flavor profile, while a scattering of toasted sesame seeds and finely sliced spring onions add texture and freshness. A side of seasonal vegetables, lightly steamed to preserve their vibrant colors and nutrients, completes this elegant plate. This dish is not only a feast for the palate but also a visual masterpiece that showcases our chef's commitment to culinary excellence and thoughtful presentation.";
    
    let i = 0;
    const intervalId = setInterval(() => {
      if (i < mockText.length) {
        setGeneratedContent(prev => prev + mockText.charAt(i));
        i++;
      } else {
        clearInterval(intervalId);
        setIsGenerating(false);
      }
    }, 15);
  };
  
  const handleCopyContent = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Content copied to clipboard");
  };
  
  const handleGenerateImage = () => {
    if (!imagePrompt.trim()) {
      toast.error("Please enter an image prompt");
      return;
    }
    
    setIsGeneratingImage(true);
    
    // Mock AI image generation
    setTimeout(() => {
      const mockImages = [
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38",
        "https://images.unsplash.com/photo-1555939594-58d7cb561ad1",
      ];
      
      const randomImage = mockImages[Math.floor(Math.random() * mockImages.length)];
      setGeneratedImageUrl(randomImage);
      setIsGeneratingImage(false);
      toast.success("Image generated successfully!");
    }, 3000);
  };
  
  const handleTemplateChange = (value: string) => {
    setPromptTemplate(value);
    if (value !== 'custom') {
      setPrompt(promptTemplates[value as keyof typeof promptTemplates]);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Assistant</h1>
          <p className="text-muted-foreground">
            Generate marketing content and images with AI
          </p>
        </div>
      </div>
      
      <Tabs defaultValue="text" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="text">Text Generation</TabsTrigger>
          <TabsTrigger value="image">Image Generation</TabsTrigger>
        </TabsList>
        
        <TabsContent value="text" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>AI Text Generator</CardTitle>
                <CardDescription>
                  Generate marketing text, menu descriptions, and more
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template">Prompt Template</Label>
                  <Select value={promptTemplate} onValueChange={handleTemplateChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="menu-description">Menu Description</SelectItem>
                      <SelectItem value="promotional-text">Promotional Text</SelectItem>
                      <SelectItem value="social-media">Social Media Post</SelectItem>
                      <SelectItem value="email-campaign">Email Campaign</SelectItem>
                      <SelectItem value="custom">Custom Prompt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="prompt">Your Prompt</Label>
                  <Textarea 
                    id="prompt" 
                    placeholder="Write a detailed and appetizing description for our honey glazed salmon dish..." 
                    rows={6}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                </div>
                
                <Button 
                  onClick={handleGenerate} 
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Bot className="mr-2 h-4 w-4 animate-pulse" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Content
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Generated Content</CardTitle>
                <CardDescription>
                  Your AI-generated text will appear here
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative min-h-[250px] rounded-md border bg-muted p-4">
                  <div className="prose max-w-none">
                    {generatedContent ? (
                      <p>{generatedContent}</p>
                    ) : (
                      <p className="text-muted-foreground italic">
                        Generated content will appear here...
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={!generatedContent}
                  onClick={handleCopyContent}
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={!generatedContent}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="image" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Image Generator</CardTitle>
              <CardDescription>
                Create beautiful images for your marketing campaigns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image-prompt">Image Description</Label>
                <Textarea 
                  id="image-prompt" 
                  placeholder="A professional photo of a gourmet burger with melted cheese, fresh lettuce, and tomatoes on a wooden board..." 
                  rows={4}
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2 col-span-1">
                  <Label htmlFor="style">Image Style</Label>
                  <Select defaultValue="realistic">
                    <SelectTrigger id="style">
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realistic">Realistic</SelectItem>
                      <SelectItem value="artistic">Artistic</SelectItem>
                      <SelectItem value="cartoon">Cartoon</SelectItem>
                      <SelectItem value="vintage">Vintage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2 col-span-1">
                  <Label htmlFor="aspect">Aspect Ratio</Label>
                  <Select defaultValue="square">
                    <SelectTrigger id="aspect">
                      <SelectValue placeholder="Select ratio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="square">Square (1:1)</SelectItem>
                      <SelectItem value="portrait">Portrait (4:5)</SelectItem>
                      <SelectItem value="landscape">Landscape (16:9)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2 col-span-1">
                  <Label htmlFor="quality">Quality</Label>
                  <Select defaultValue="standard">
                    <SelectTrigger id="quality">
                      <SelectValue placeholder="Select quality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button 
                onClick={handleGenerateImage} 
                disabled={isGeneratingImage || !imagePrompt.trim()}
                className="w-full"
              >
                {isGeneratingImage ? (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4 animate-pulse" />
                    Generating Image...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Image
                  </>
                )}
              </Button>
              
              {generatedImageUrl && (
                <div className="space-y-2">
                  <Label className="block">Generated Image</Label>
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg border bg-muted">
                    <img 
                      src={generatedImageUrl} 
                      alt="AI generated" 
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
