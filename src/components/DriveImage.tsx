import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ImageOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { imageCache } from "@/lib/imageCache";
import { Button } from "@/components/ui/button";

interface DriveImageProps {
  fileId?: string;
  fallbackUrl?: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}

export const DriveImage = ({ fileId, fallbackUrl, alt, className, onClick }: DriveImageProps) => {
  const { getAccessToken, refreshAccessToken } = useAuth();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const fetchImageWithToken = useCallback(async (token: string, fileIdToFetch: string): Promise<Response> => {
    return fetch(
      `https://www.googleapis.com/drive/v3/files/${fileIdToFetch}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }, []);

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
      setAuthError(false);

      // Fetch from Google Drive API with auth
      try {
        // Try to get the stored token without triggering a popup
        // (getAccessToken may open a popup which gets blocked in useEffect)
        const storedToken = sessionStorage.getItem('googleAccessToken');

        if (!storedToken) {
          // No token at all — need user gesture to re-authenticate
          if (!cancelled) {
            setAuthError(true);
            setLoading(false);
          }
          return;
        }

        // Validate the stored token quickly
        let tokenToUse = storedToken;
        try {
          const tokenCheck = await fetch(
            'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + storedToken
          );
          if (!tokenCheck.ok) {
            // Token expired — need user gesture to re-authenticate
            sessionStorage.removeItem('googleAccessToken');
            if (!cancelled) {
              setAuthError(true);
              setLoading(false);
            }
            return;
          }
        } catch {
          if (!cancelled) {
            setAuthError(true);
            setLoading(false);
          }
          return;
        }

        if (cancelled) return;

        const response = await fetchImageWithToken(tokenToUse, fileId!);

        if (cancelled) return;

        if (response.status === 401 || response.status === 403) {
          // Auth failed — token may have just expired
          console.warn('Drive image fetch auth failed:', response.status);
          sessionStorage.removeItem('googleAccessToken');
          imageCache.delete(cacheKey);
          if (!cancelled) {
            setAuthError(true);
            setLoading(false);
          }
          return;
        }

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
  }, [fileId, fallbackUrl, retryCount, fetchImageWithToken]);

  // Called from a button click (user gesture) so popup won't be blocked
  const handleReconnect = async () => {
    setLoading(true);
    setAuthError(false);
    setError(false);

    try {
      const freshToken = await refreshAccessToken();

      if (!freshToken) {
        setAuthError(true);
        setLoading(false);
        return;
      }

      if (!fileId) {
        setError(true);
        setLoading(false);
        return;
      }

      // Clear old cache entry
      imageCache.delete(fileId);

      const response = await fetchImageWithToken(freshToken, fileId);

      if (!response.ok) {
        console.error('Drive fetch after reconnect failed:', response.status);
        if (response.status === 401 || response.status === 403) {
          setAuthError(true);
        } else {
          setError(true);
        }
        setLoading(false);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      imageCache.set(fileId, url);
      setImageSrc(url);
      setLoading(false);
    } catch (err) {
      console.error('Reconnect failed:', err);
      setAuthError(true);
      setLoading(false);
    }
  };

  const handleRetry = () => {
    imageCache.delete(fileId || '');
    setRetryCount((c) => c + 1);
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center bg-muted/50", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-3 bg-muted/30", className)}>
        <ImageOff className="h-6 w-6 text-muted-foreground" />
        <p className="text-xs text-muted-foreground text-center px-4">
          Google Drive session expired
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReconnect}
          className="gap-2"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reconnect Google Drive
        </Button>
      </div>
    );
  }

  if (error || !imageSrc) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-3 bg-muted/30", className)}>
        <ImageOff className="h-6 w-6 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Failed to load image</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRetry}
          className="gap-2"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
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
