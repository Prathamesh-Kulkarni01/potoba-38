
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  bgColor?: string;
  fgColor?: string;
  includeMargin?: boolean;
}

const QRCodeGenerator = ({
  value,
  size = 128,
  bgColor = "#ffffff",
  fgColor = "#000000",
  includeMargin = true
}: QRCodeGeneratorProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const generateQRCode = async () => {
      try {
        setIsLoading(true);
        
        // Convert parameters to query string
        const params = new URLSearchParams({
          size: size.toString(),
          data: value,
          margin: includeMargin ? '4' : '0',
          bgcolor: bgColor.replace('#', ''),
          color: fgColor.replace('#', '')
        });
        
        // Use the QR code API service
        const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
        
        setQrCodeUrl(apiUrl);
        setIsLoading(false);
      } catch (error) {
        console.error('Error generating QR code:', error);
        setIsLoading(false);
      }
    };
    
    generateQRCode();
  }, [value, size, bgColor, fgColor, includeMargin]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!qrCodeUrl) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <p className="text-sm text-muted-foreground">QR code generation failed</p>
      </div>
    );
  }
  
  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border">
      <img 
        src={qrCodeUrl} 
        alt="QR Code" 
        width={size} 
        height={size} 
        style={{ display: 'block' }}
      />
    </div>
  );
};

export default QRCodeGenerator;
