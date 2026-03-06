import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ZoomIn, ZoomOut, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { imageCache } from "@/lib/imageCache";

interface ImageViewerModalProps {
  open: boolean;
  onClose: () => void;
  imageUrl?: string;
  fileId?: string;
  title?: string;
}

export const ImageViewerModal = ({ open, onClose, imageUrl, fileId, title }: ImageViewerModalProps) => {
  const { getAccessToken } = useAuth();
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setZoom(1);
      return;
    }

    let cancelled = false;

    const loadImage = async () => {
      setLoading(true);
      setError(false);
      setZoom(1);

      // If no fileId, use imageUrl directly
      if (!fileId && imageUrl) {
        setImageSrc(imageUrl);
        setLoading(false);
        return;
      }

      if (!fileId) {
        setError(true);
        setLoading(false);
        return;
      }

      // Check cache first
      const cached = imageCache.get(fileId);
      if (cached) {
        setImageSrc(cached);
        setLoading(false);
        return;
      }

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
        imageCache.set(fileId, url);

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
  }, [open, fileId, imageUrl]); // Removed getAccessToken from deps

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

  const openInDrive = () => {
    if (fileId) {
      window.open(`https://drive.google.com/file/d/${fileId}/view`, '_blank');
    } else if (imageUrl) {
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border bg-card">
          <span className="text-sm font-medium truncate">
            {title || "Trade Screenshot"}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={openInDrive}
              title="Open in Google Drive"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 ml-2"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Image Container */}
        <div className="overflow-auto bg-black/90 flex items-center justify-center min-h-[300px]" style={{ maxHeight: 'calc(90vh - 60px)' }}>
          {loading && (
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Unable to load image</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Try signing out and back in</p>
              </div>
              <Button variant="outline" size="sm" onClick={openInDrive}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Google Drive
              </Button>
            </div>
          )}
          {!loading && !error && imageSrc && (
            <img
              src={imageSrc}
              alt={title || "Trade screenshot"}
              className="transition-transform duration-200"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center',
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
