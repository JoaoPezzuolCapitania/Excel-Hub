import { cn } from "@/lib/utils";
import Image from "next/image";

interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Avatar({ src, alt, size = "md", className }: AvatarProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const sizePixels = {
    sm: 24,
    md: 32,
    lg: 40,
  };

  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        width={sizePixels[size]}
        height={sizePixels[size]}
        className={cn("rounded-full", sizeClasses[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-brand-100 text-brand-700 font-medium",
        sizeClasses[size],
        {
          "text-xs": size === "sm",
          "text-sm": size === "md",
          "text-base": size === "lg",
        },
        className
      )}
    >
      {alt.charAt(0).toUpperCase()}
    </div>
  );
}
