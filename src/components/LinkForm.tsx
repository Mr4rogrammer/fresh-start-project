import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface LinkFormProps {
    open: boolean;
    onClose: () => void;
    onSave: (title: string, url: string) => Promise<void>;
    initialTitle?: string;
    initialUrl?: string;
    mode: "add" | "edit";
}

export const LinkForm = ({ open, onClose, onSave, initialTitle = "", initialUrl = "", mode }: LinkFormProps) => {
    const [title, setTitle] = useState(initialTitle);
    const [url, setUrl] = useState(initialUrl);

    useEffect(() => {
        setTitle(initialTitle);
        setUrl(initialUrl);
    }, [initialTitle, initialUrl, open]);

    const handleSave = async () => {
        if (!title.trim() || !url.trim()) {
            toast.error("Please enter both title and URL");
            return;
        }

        // Basic URL validation
        try {
            new URL(url.startsWith("http") ? url : `https://${url}`);
        } catch {
            toast.error("Please enter a valid URL");
            return;
        }

        try {
            const formattedUrl = url.startsWith("http") ? url : `https://${url}`;
            await onSave(title, formattedUrl);
            setTitle("");
            setUrl("");
            onClose();
        } catch (error: any) {
            toast.error(`Failed to ${mode} link: ${error.message || 'Unknown error'}`);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{mode === "add" ? "Add New Link" : "Edit Link"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-2 block">Title</label>
                        <Input
                            placeholder="e.g., Trading View"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-2 block">URL</label>
                        <Input
                            placeholder="e.g., https://tradingview.com"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>
                            {mode === "add" ? "Add Link" : "Save Changes"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
