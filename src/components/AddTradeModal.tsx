import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trade, TradeEmotion, TRADE_EMOTIONS } from "@/types/trade";
import { Star } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Upload, X, Image, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { uploadToGoogleDrive, deleteFromGoogleDrive } from "@/lib/googleDrive";
import { DriveImage } from "@/components/DriveImage";
import { toast } from "sonner";

interface AddTradeModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (trade: Omit<Trade, 'id' | 'createdAt'>) => void;
  editingTrade?: Trade | null;
  initialDate?: string;
}

export const AddTradeModal = ({ open, onClose, onSave, editingTrade, initialDate }: AddTradeModalProps) => {
  const { getAccessToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    date: initialDate || new Date().toISOString().split('T')[0],
    pair: '',
    entryPrice: '',
    slPrice: '',
    fees: "",
    exitPrice: '',
    lotSize: '',
    direction: 'Buy' as 'Buy' | 'Sell',
    profit: '',
    emotion: '' as TradeEmotion | '',
    strategy: '',
    rating: 0,
    notes: '',
    screenshotUrl: '',
    screenshotFileId: '',
  });

  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (initialDate) {
      setFormData(prev => ({ ...prev, date: initialDate }));
    }
  }, [initialDate]);

  useEffect(() => {
    if (editingTrade) {
      setFormData({
        date: editingTrade.date,
        pair: editingTrade.pair,
        entryPrice: editingTrade.entryPrice.toString(),
        slPrice: editingTrade.slPrice.toString(),
        exitPrice: editingTrade.exitPrice.toString(),
        lotSize: editingTrade.lotSize.toString(),
        direction: editingTrade.direction,
        profit: editingTrade.profit.toString(),
        emotion: editingTrade.emotion || '',
        strategy: editingTrade.strategy || '',
        rating: editingTrade.rating || 0,
        notes: editingTrade.notes || '',
        fees: editingTrade.fees.toString(),
        screenshotUrl: editingTrade.screenshotUrl || '',
        screenshotFileId: editingTrade.screenshotFileId || '',
      });

      // Mark that we have an existing screenshot
      if (editingTrade.screenshotFileId || editingTrade.screenshotUrl) {
        setPreviewUrl('existing');
      }
    }
  }, [editingTrade]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size should be less than 10MB');
      return;
    }

    // Show local preview immediately
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    setUploading(true);

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        toast.error('Please sign in again to upload images');
        setUploading(false);
        return;
      }

      const result = await uploadToGoogleDrive(
        accessToken,
        file,
        `trade_${formData.date}_${formData.pair || 'screenshot'}_${Date.now()}.${file.name.split('.').pop()}`
      );

      setFormData(prev => ({
        ...prev,
        screenshotUrl: result.thumbnailLink,
        screenshotFileId: result.fileId,
      }));

      // Update preview with Drive URL
      setPreviewUrl(result.thumbnailLink);

      toast.success('Screenshot uploaded to Google Drive');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload screenshot');
      setPreviewUrl(null);
    } finally {
      setUploading(false);
      // Clean up local preview URL
      URL.revokeObjectURL(localPreview);
    }
  };

  const removeScreenshot = async () => {
    // Delete from Google Drive if there's a fileId
    if (formData.screenshotFileId) {
      try {
        const accessToken = await getAccessToken();
        if (accessToken) {
          await deleteFromGoogleDrive(accessToken, formData.screenshotFileId);
          toast.success('Screenshot removed from Google Drive');
        }
      } catch (error) {
        console.error('Failed to delete from Google Drive:', error);
        // Continue with local removal even if Drive deletion fails
      }
    }

    setFormData(prev => ({
      ...prev,
      screenshotUrl: '',
      screenshotFileId: '',
    }));
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  function clearFormDataAndClose() {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      pair: '',
      entryPrice: '',
      slPrice: '',
      exitPrice: '',
      lotSize: '',
      fees: "",
      direction: 'Buy',
      profit: '',
      emotion: '',
      strategy: '',
      rating: 0,
      notes: '',
      screenshotUrl: '',
      screenshotFileId: '',
    });
    setPreviewUrl(null);
    onClose();
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSave({
      date: formData.date,
      pair: formData.pair,
      entryPrice: parseFloat(formData.entryPrice),
      slPrice: parseFloat(formData.slPrice),
      exitPrice: parseFloat(formData.exitPrice),
      fees: parseFloat(formData.fees),
      lotSize: parseFloat(formData.lotSize),
      direction: formData.direction,
      profit: parseFloat(formData.profit),
      emotion: formData.emotion || undefined,
      strategy: formData.strategy || undefined,
      rating: formData.rating || undefined,
      notes: formData.notes,
      screenshotUrl: formData.screenshotUrl || '',
      screenshotFileId: formData.screenshotFileId || '',
    });

    clearFormDataAndClose();
  };

  return (
    <Dialog open={open} onOpenChange={clearFormDataAndClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {editingTrade ? 'Edit Trade' : 'Add New Trade'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pair">Pair/Symbol</Label>
              <Input
                id="pair"
                placeholder="EUR/USD"
                value={formData.pair}
                onChange={(e) => setFormData({ ...formData, pair: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="direction">Direction</Label>
              <Select
                value={formData.direction}
                onValueChange={(value: 'Buy' | 'Sell') => setFormData({ ...formData, direction: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Buy">Buy</SelectItem>
                  <SelectItem value="Sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="emotion">Emotion (Optional)</Label>
              <Select
                value={formData.emotion}
                onValueChange={(value: TradeEmotion) => setFormData({ ...formData, emotion: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="How were you feeling?" />
                </SelectTrigger>
                <SelectContent>
                  {TRADE_EMOTIONS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      <div className="flex flex-col py-0.5">
                        <span className="font-medium">{e.emoji} {e.label}</span>
                        <span className="text-xs text-muted-foreground leading-snug">{e.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="entry">Entry Price</Label>
              <Input
                id="entry"
                type="number"
                step="0.00001"
                placeholder="1.0650"
                value={formData.entryPrice}
                onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="exit">Exit Price</Label>
              <Input
                id="exit"
                type="number"
                step="0.00001"
                placeholder="1.0700"
                value={formData.exitPrice}
                onChange={(e) => setFormData({ ...formData, exitPrice: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="slPrice">Stop Loss Price</Label>
              <Input
                id="slPrice"
                type="number"
                step="0.01"
                placeholder="0.05"
                value={formData.slPrice}
                onChange={(e) => setFormData({ ...formData, slPrice: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="fees">Fees</Label>
              <Input
                id="fees"
                type="number"
                step="0.01"
                placeholder="0.05"
                value={formData.fees}
                onChange={(e) => setFormData({ ...formData, fees: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="profit">Profit/Loss ($)</Label>
              <Input
                id="profit"
                type="number"
                step="0.01"
                placeholder="25.00"
                value={formData.profit}
                onChange={(e) => setFormData({ ...formData, profit: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="lotSize">Lot Size</Label>
              <Input
                id="lotSize"
                type="number"
                step="0.01"
                placeholder="0.05"
                value={formData.lotSize}
                onChange={(e) => setFormData({ ...formData, lotSize: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Trade Rating (Optional)</Label>
              <div className="flex items-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: formData.rating === star ? 0 : star })}
                    className="p-0.5 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-6 w-6 transition-colors ${star <= formData.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                    />
                  </button>
                ))}
                {formData.rating > 0 && (
                  <span className="text-xs text-muted-foreground ml-1">
                    {['', 'Poor', 'Below avg', 'Average', 'Good', 'Excellent'][formData.rating]}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Screenshot Upload Section */}
          <div>
            <Label>Screenshot (Optional)</Label>
            <div className="mt-2">
              {(previewUrl || formData.screenshotFileId) ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  {previewUrl === 'existing' && formData.screenshotFileId ? (
                    <DriveImage
                      fileId={formData.screenshotFileId}
                      fallbackUrl={formData.screenshotUrl}
                      alt="Trade screenshot"
                      className="w-full h-48 object-cover"
                    />
                  ) : previewUrl && previewUrl !== 'existing' ? (
                    <img
                      src={previewUrl}
                      alt="Trade screenshot"
                      className="w-full h-48 object-cover"
                    />
                  ) : null}
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={removeScreenshot}
                    disabled={uploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  {uploading && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="ml-2 text-sm">Uploading to Google Drive...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                >
                  <Image className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload screenshot
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Saved to your Google Drive
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Momentum trade, strong uptrend..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={clearFormDataAndClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                editingTrade ? 'Update Trade' : 'Add Trade'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
