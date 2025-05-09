import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  className?: string;
}

const LoadingSpinner = ({ className }: LoadingSpinnerProps) => {
  return (
    <Loader2 className={cn("animate-spin", className)} />
  );
};

export default LoadingSpinner;
