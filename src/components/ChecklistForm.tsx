import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checklist, ChecklistItem } from "@/types/checklist";
import { ChecklistItemComponent } from "./ChecklistItemComponent";
import { Plus } from "lucide-react";

interface ChecklistFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (title: string, items: ChecklistItem[]) => void;
  initialChecklist?: Checklist | null;
  mode: "add" | "edit";
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const ChecklistForm = ({
  open,
  onClose,
  onSave,
  initialChecklist,
  mode,
}: ChecklistFormProps) => {
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState("");

  useEffect(() => {
    if (initialChecklist) {
      setTitle(initialChecklist.title);
      setItems(initialChecklist.items || []);
    } else {
      setTitle("");
      setItems([]);
    }
    setNewItemText("");
  }, [initialChecklist, open]);

  const handleAddItem = () => {
    if (newItemText.trim()) {
      setItems([
        ...items,
        {
          id: generateId(),
          text: newItemText.trim(),
          completed: false,
          children: [],
        },
      ]);
      setNewItemText("");
    }
  };

  const findAndUpdateItem = (
    items: ChecklistItem[],
    targetId: string,
    updater: (item: ChecklistItem) => ChecklistItem | null
  ): ChecklistItem[] => {
    return items
      .map((item) => {
        if (item.id === targetId) {
          return updater(item);
        }
        return {
          ...item,
          children: findAndUpdateItem(item.children, targetId, updater),
        };
      })
      .filter((item): item is ChecklistItem => item !== null);
  };

  const handleToggle = (id: string) => {
    setItems(
      findAndUpdateItem(items, id, (item) => ({
        ...item,
        completed: !item.completed,
      }))
    );
  };

  const handleAddChild = (parentId: string, text: string) => {
    setItems(
      findAndUpdateItem(items, parentId, (item) => ({
        ...item,
        children: [
          ...item.children,
          {
            id: generateId(),
            text,
            completed: false,
            children: [],
          },
        ],
      }))
    );
  };

  const handleDelete = (id: string) => {
    setItems(findAndUpdateItem(items, id, () => null));
  };

  const handleEdit = (id: string, text: string) => {
    setItems(
      findAndUpdateItem(items, id, (item) => ({
        ...item,
        text,
      }))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSave(title.trim(), items);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Create New Checklist" : "Edit Checklist"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="space-y-4 flex-1 overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Checklist title..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Items</Label>
              <div className="flex gap-2">
                <Input
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  placeholder="Add a new item..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddItem();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={handleAddItem}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="border rounded-lg p-4 min-h-[200px] max-h-[300px] overflow-y-auto bg-card/50">
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No items yet. Add your first item above.
                  </p>
                ) : (
                  items.map((item) => (
                    <ChecklistItemComponent
                      key={item.id}
                      item={item}
                      onToggle={handleToggle}
                      onAddChild={handleAddChild}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {mode === "add" ? "Create Checklist" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
