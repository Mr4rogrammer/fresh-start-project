import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { imageCache } from "@/lib/imageCache";

interface DriveImageProps {
  fileId?: string;
  fallbackUrl?: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}

export const DriveImage = ({ fileId, fallbackUrl, alt, className, onClick }: DriveImageProps) => {
  const { getAccessToken } = useAuth();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadImage = async () => {
      if (!fileId && !fallbackUrl) {
        setError(true);
        setLoading(false);
        return;
      }

      // If no fileId, use fallback URL directly
      if (!fileId && fallbackUrl) {
        setImageSrc(fallbackUrl);
        setLoading(false);
        return;
      }

      // Check cache first
      const cacheKey = fileId!;
      const cached = imageCache.get(cacheKey);
      if (cached) {
        setImageSrc(cached);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(false);

      // Fetch from Google Drive API with auth
      try {
        const token = await getAccessToken();
        if (!token || cancelled) {
          if (!cancelled) {
            setError(true);
            setLoading(false);
          }
          return;
        }

        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (cancelled) return;

        if (!response.ok) {
          console.error('Drive fetch failed:', response.status);
          setError(true);
          setLoading(false);
          return;
        }

        const blob = await response.blob();
        if (cancelled) return;

        const url = URL.createObjectURL(blob);

        // Store in cache
        imageCache.set(cacheKey, url);

        setImageSrc(url);
        setLoading(false);
      } catch (err) {
        console.error('Error loading image:', err);
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      cancelled = true;
    };
  }, [fileId, fallbackUrl]); // Removed getAccessToken from deps to prevent re-fetching

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center bg-muted/50", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !imageSrc) {
    return (
      <div className={cn("flex items-center justify-center bg-muted/30", className)}>
        <ImageOff className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      onClick={onClick}
    />
  );
};
