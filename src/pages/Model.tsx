import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ref, set, get, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Trash2, Maximize2, Minimize2, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { uploadToGoogleDrive, deleteFromGoogleDrive } from "@/lib/googleDrive";
import { DriveImage } from "@/components/DriveImage";
import { useTotpVerification } from "@/hooks/useTotpVerification";
import { TotpVerificationModal } from "@/components/TotpVerificationModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";

interface ModelData {
  fileId: string;
  uploadedAt: string;
}

const Model = () => {
  const { user, loading, getAccessToken, refreshAccessToken } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modelData, setModelData] = useState<ModelData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingModel, setLoadingModel] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    isVerificationRequired,
    requireVerification,
    handleVerificationSuccess,
    cancelVerification,
  } = useTotpVerification();

  useEffect(() => {
    if (!loading && !user) navigate("/");
  }, [user, loading, navigate]);

  // Load existing model image
  useEffect(() => {
    const loadModel = async () => {
      if (!user) return;
      try {
        const modelRef = ref(db, `users/${user.uid}/model`);
        const snapshot = await get(modelRef);
        if (snapshot.exists()) {
          setModelData(snapshot.val() as ModelData);
        }
      } catch (error) {
        console.error("Failed to load model:", error);
      } finally {
        setLoadingModel(false);
      }
    };
    loadModel();
  }, [user]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    setUploading(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast.error("Please sign in again to upload");
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      // If there's an existing model image, delete it first
      if (modelData?.fileId) {
        try {
          await deleteFromGoogleDrive(accessToken, modelData.fileId);
        } catch {
          // Continue even if old delete fails
        }
      }

      // Step 1: Upload to Google Drive (retry once with fresh token on auth failure)
      let result;
      let tokenToUse = accessToken;
      try {
        result = await uploadToGoogleDrive(tokenToUse, file, `model_${Date.now()}_${file.name}`);
      } catch (driveError: any) {
        console.warn("First upload attempt failed, refreshing token...", driveError);
        // Try refreshing the token and retry once
        try {
          const freshToken = await refreshAccessToken();
          if (!freshToken) {
            toast.error("Could not get Drive access. A sign-in popup should appear — please allow access.");
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
          }
          tokenToUse = freshToken;
          result = await uploadToGoogleDrive(freshToken, file, `model_${Date.now()}_${file.name}`);
        } catch (retryError: any) {
          console.error("Google Drive upload failed after retry:", retryError);
          toast.error(retryError.message || "Failed to upload to Google Drive.");
          setUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
      }

      // Step 2: Save reference to Firebase
      const newModelData: ModelData = {
        fileId: result.fileId,
        uploadedAt: new Date().toISOString(),
      };

      try {
        const modelRef = ref(db, `users/${user.uid}/model`);
        await set(modelRef, newModelData);
      } catch (fbError) {
        console.error("Firebase save failed:", fbError);
        toast.error("Image uploaded to Drive but failed to save reference. Try again.");
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      setModelData(newModelData);
      toast.success("Model image uploaded");
    } catch (error: any) {
      console.error("Upload failed:", error);
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = () => {
    setConfirmDelete(true);
  };

  const performDelete = async () => {
    if (!user || !modelData) return;

    const doDelete = async () => {
      try {
        const accessToken = await getAccessToken();
        if (accessToken && modelData.fileId) {
          try {
            await deleteFromGoogleDrive(accessToken, modelData.fileId);
          } catch {
            // Continue even if Drive delete fails
          }
        }

        const modelRef = ref(db, `users/${user.uid}/model`);
        await remove(modelRef);
        setModelData(null);
        setIsFullscreen(false);
        toast.success("Model image deleted");
      } catch {
        toast.error("Failed to delete model image");
      }
    };

    requireVerification(doDelete);
  };

  // Fullscreen view
  if (isFullscreen && modelData) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            className="bg-black/50 border-white/20 text-white hover:bg-red-500/80 hover:text-white hover:border-red-500"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(false)}
            className="bg-black/50 border-white/20 text-white hover:bg-white/20"
          >
            <Minimize2 className="h-4 w-4 mr-2" />
            Exit
          </Button>
        </div>
        <DriveImage
          fileId={modelData.fileId}
          alt="Trading Model"
          className="max-w-full max-h-full object-contain"
        />

        <ConfirmDialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          onConfirm={performDelete}
          title="Delete Model Image"
          description="Are you sure you want to delete your model image? This cannot be undone."
        />
        <TotpVerificationModal
          open={isVerificationRequired}
          onClose={cancelVerification}
          onVerify={handleVerificationSuccess}
          title="Verify to Delete"
          description="Enter your 6-digit code to confirm deletion"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Trading Model</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Upload your trading model to reference while trading
            </p>
          </div>
          <div className="flex items-center gap-2">
            {modelData && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {modelData ? "Replace Image" : "Upload Image"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Content */}
        {loadingModel ? (
          <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardContent className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : modelData ? (
          <Card
            className="bg-card/80 backdrop-blur-sm border-border/50 cursor-pointer group relative overflow-hidden"
            onClick={() => setIsFullscreen(true)}
          >
            <CardContent className="p-2 sm:p-4">
              <div className="relative rounded-lg overflow-hidden">
                <DriveImage
                  fileId={modelData.fileId}
                  alt="Trading Model"
                  className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-3">
                    <Maximize2 className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Model Image</h3>
              <p className="text-muted-foreground text-sm mb-4 max-w-sm">
                Upload your trading model image to keep it handy while you trade.
                Click the button above or drag and drop an image.
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload Model Image
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={performDelete}
        title="Delete Model Image"
        description="Are you sure you want to delete your model image? This cannot be undone."
      />
      <TotpVerificationModal
        open={isVerificationRequired}
        onClose={cancelVerification}
        onVerify={handleVerificationSuccess}
        title="Verify to Delete"
        description="Enter your 6-digit code to confirm deletion"
      />
    </div>
  );
};

export default Model;
