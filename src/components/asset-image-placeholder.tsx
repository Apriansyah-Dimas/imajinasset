import { Package } from "lucide-react";

interface AssetImagePlaceholderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

export default function AssetImagePlaceholder({
  size = "md",
  className = "",
  text = "",
}: AssetImagePlaceholderProps) {
  const sizeClasses = {
    sm: "w-10 h-10 sm:w-12 sm:h-12",
    md: "w-16 h-16 sm:w-20 sm:h-20",
    lg: "w-24 h-24 sm:w-32 sm:h-32",
  };

  const iconSizes = {
    sm: "h-4 w-4 sm:h-5 sm:w-5",
    md: "h-6 w-6 sm:h-8 sm:w-8",
    lg: "h-8 w-8 sm:h-10 sm:w-10",
  };

  return (
    <div
      className={`${sizeClasses[size]} bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center ${className}`}
    >
      <Package className={`${iconSizes[size]} text-gray-400`} />
    </div>
  );
}
