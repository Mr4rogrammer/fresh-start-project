import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Journal } from "@/types/trade";
import { useState, useEffect, useRef } from "react";
import { X, Image, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { uploadToGoogleDrive, deleteFromGoogleDrive } from "@/lib/googleDrive";
import { DriveImage } from "@/components/DriveImage";
import { toast } from "sonner";

interface AddJournalModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (journal: Omit<Journal, 'id' | 'createdAt'>) => void;
  editingJournal?: Journal | null;
  initialDate?: string;
}

export const AddJournalModal = ({ open, onClose, onSave, editingJournal, initialDate }: AddJournalModalProps) => {
  const { getAccessToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    date: initialDate || new Date().toISOString().split('T')[0],
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
    if (editingJournal) {
      setFormData({
        date: editingJournal.date,
        notes: editingJournal.notes || '',
        screenshotUrl: editingJournal.screenshotUrl || '',
        screenshotFileId: editingJournal.screenshotFileId || '',
      });

      if (editingJournal.screenshotFileId || editingJournal.screenshotUrl) {
        setPreviewUrl('existing');
      }
    }
  }, [editingJournal]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size should be less than 10MB');
      return;
    }

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
        `journal_${formData.date}_${Date.now()}.${file.name.split('.').pop()}`
      );

      setFormData(prev => ({
        ...prev,
        screenshotUrl: result.thumbnailLink,
        screenshotFileId: result.fileId,
      }));

      setPreviewUrl(result.thumbnailLink);
      toast.success('Screenshot uploaded to Google Drive');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload screenshot');
      setPreviewUrl(null);
    } finally {
      setUploading(false);
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
      notes: '',
      screenshotUrl: '',
      screenshotFileId: '',
    });
    setPreviewUrl(null);
    onClose();
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.notes.trim() && !formData.screenshotFileId) {
      toast.error('Please add notes or a screenshot');
      return;
    }

    onSave({
      date: formData.date,
      notes: formData.notes,
      screenshotUrl: formData.screenshotUrl || '',
      screenshotFileId: formData.screenshotFileId || '',
    });

    clearFormDataAndClose();
  };

  return (
    <Dialog open={open} onOpenChange={clearFormDataAndClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {editingJournal ? 'Edit Journal Entry' : 'Add Journal Entry'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Record your analysis, missed trades, or market observations
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-2">
          {/* Screenshot Upload Section */}
          <div>
            <Label>Screenshot</Label>
            <div className="mt-2">
              {(previewUrl || formData.screenshotFileId) ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  {previewUrl === 'existing' && formData.screenshotFileId ? (
                    <DriveImage
                      fileId={formData.screenshotFileId}
                      fallbackUrl={formData.screenshotUrl}
                      alt="Journal screenshot"
                      className="w-full h-48 object-cover"
                    />
                  ) : previewUrl && previewUrl !== 'existing' ? (
                    <img
                      src={previewUrl}
                      alt="Journal screenshot"
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
                      <span className="ml-2 text-sm">Uploading...</span>
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
                    Chart analysis, missed setup, etc.
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
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Describe what you observed, why you missed the entry, lessons learned..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={5}
              className="mt-2"
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
                editingJournal ? 'Update Entry' : 'Save Entry'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
