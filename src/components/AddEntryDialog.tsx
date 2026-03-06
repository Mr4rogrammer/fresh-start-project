import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TrendingUp, BookOpen } from "lucide-react";

interface AddEntryDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectTrade: () => void;
  onSelectJournal: () => void;
  date?: string;
}

export const AddEntryDialog = ({ open, onClose, onSelectTrade, onSelectJournal, date }: AddEntryDialogProps) => {
  const formattedDate = date ? new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }) : '';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-xl text-center">
            {formattedDate ? `Add entry for ${formattedDate}` : 'What would you like to add?'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <Button
            variant="outline"
            className="h-auto py-6 flex flex-col gap-3 hover:bg-profit/10 hover:border-profit/50 transition-all"
            onClick={onSelectTrade}
          >
            <TrendingUp className="h-8 w-8 text-profit" />
            <div className="text-center">
              <div className="font-semibold">Trade</div>
              <div className="text-xs text-muted-foreground">Record a trade</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-6 flex flex-col gap-3 hover:bg-blue-500/10 hover:border-blue-500/50 transition-all"
            onClick={onSelectJournal}
          >
            <BookOpen className="h-8 w-8 text-blue-500" />
            <div className="text-center">
              <div className="font-semibold">Journal</div>
              <div className="text-xs text-muted-foreground">Analysis / Notes</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
