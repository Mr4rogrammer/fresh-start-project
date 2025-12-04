import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface NoteFormProps {
    open: boolean;
    onClose: () => void;
    onSave: (title: string, content: string) => Promise<void>;
    initialTitle?: string;
    initialContent?: string;
    mode: "add" | "edit";
}

export const NoteForm = ({ open, onClose, onSave, initialTitle = "", initialContent = "", mode }: NoteFormProps) => {
    const [title, setTitle] = useState(initialTitle);
    const [content, setContent] = useState(initialContent);

    useEffect(() => {
        setTitle(initialTitle);
        setContent(initialContent);
    }, [initialTitle, initialContent, open]);

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error("Please enter a title");
            return;
        }
        if (!content.trim()) {
            toast.error("Please enter note content");
            return;
        }

        try {
            await onSave(title, content);
            setTitle("");
            setContent("");
            onClose();
        } catch (error: any) {
            toast.error(`Failed to ${mode} note: ${error.message || 'Unknown error'}`);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{mode === "add" ? "Add New Note" : "Edit Note"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="note-title">Title</Label>
                        <Input
                            id="note-title"
                            placeholder="Enter note title..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label htmlFor="note-content">Content</Label>
                        <Textarea
                            id="note-content"
                            placeholder="Write your plan, goals, or important reminders..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="min-h-[200px] mt-1"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>
                            {mode === "add" ? "Add Note" : "Save Changes"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
