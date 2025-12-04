import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface Note {
  id: string;
  content: string;
  createdAt: string;
}

interface NoteViewModalProps {
  note: Note | null;
  open: boolean;
  onClose: () => void;
}

export const NoteViewModal = ({ note, open, onClose }: NoteViewModalProps) => {
  if (!note) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Note Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-xs text-muted-foreground">
            Created: {format(new Date(note.createdAt), "PPP")}
          </div>
          <div className="whitespace-pre-wrap text-sm max-h-[60vh] overflow-y-auto pr-2">
            {note.content}
          </div>
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
