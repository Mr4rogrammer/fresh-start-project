import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checklist, ChecklistItem } from "@/types/checklist";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface ChecklistViewModalProps {
  checklist: Checklist | null;
  open: boolean;
  onClose: () => void;
}

const ViewItem = ({ item, level = 0 }: { item: ChecklistItem; level?: number }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div className={cn(level > 0 && "ml-6 border-l-2 border-border/50 pl-4")}>
      <div className="flex items-center gap-2 py-1.5">
        {hasChildren ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        ) : (
          <div className="w-6" />
        )}

        <Checkbox checked={item.completed} disabled className="shrink-0" />
        <span
          className={cn(
            "text-sm",
            item.completed && "line-through text-muted-foreground"
          )}
        >
          {item.text}
        </span>
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-1">
          {item.children.map((child) => (
            <ViewItem key={child.id} item={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const ChecklistViewModal = ({ checklist, open, onClose }: ChecklistViewModalProps) => {
  if (!checklist) return null;

  const countItems = (items: ChecklistItem[]): { total: number; completed: number } => {
    let total = 0;
    let completed = 0;
    
    const count = (items: ChecklistItem[]) => {
      items.forEach((item) => {
        total++;
        if (item.completed) completed++;
        if (item.children) count(item.children);
      });
    };
    
    count(items);
    return { total, completed };
  };

  const { total, completed } = countItems(checklist.items || []);
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{checklist.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Created: {format(new Date(checklist.createdAt), "PPP")}</span>
            <span className="font-medium">
              {completed}/{total} completed ({progress}%)
            </span>
          </div>

          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="border rounded-lg p-4 max-h-[50vh] overflow-y-auto bg-card/50">
            {checklist.items?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No items in this checklist.
              </p>
            ) : (
              checklist.items?.map((item) => (
                <ViewItem key={item.id} item={item} />
              ))
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
