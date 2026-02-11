import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checklist, ChecklistItem, ChecklistItemType } from "@/types/checklist";
import { ChecklistItemComponent } from "./ChecklistItemComponent";
import { Plus, ListChecks, CheckSquare, Type, List, CircleDot } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ChecklistFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (title: string, items: ChecklistItem[]) => void;
  initialChecklist?: Checklist | null;
  mode: "add" | "edit";
}

const generateId = () => Math.random().toString(36).substring(2, 11);

// Deep clone to avoid mutation issues
const deepClone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

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
  const [newItemType, setNewItemType] = useState<ChecklistItemType>('checkbox');
  const [newItemOptions, setNewItemOptions] = useState("");

  useEffect(() => {
    if (open) {
      if (initialChecklist) {
        setTitle(initialChecklist.title);
        setItems(deepClone(initialChecklist.items || []));
      } else {
        setTitle("");
        setItems([]);
      }
      setNewItemText("");
    }
  }, [initialChecklist, open]);

  const handleAddItem = () => {
    if (newItemText.trim()) {
      const newItem: ChecklistItem = {
        id: generateId(),
        text: newItemText.trim(),
        completed: false,
        children: [],
        type: newItemType,
        options: (newItemType === 'dropdown' || newItemType === 'radio')
          ? newItemOptions.split(',').map(o => o.trim()).filter(Boolean)
          : undefined,
        value: '',
      };
      setItems(prev => [...prev, newItem]);
      setNewItemText("");
      setNewItemOptions("");
    }
  };

  // Recursive function to find and update an item by ID
  const updateItemById = (
    itemsList: ChecklistItem[],
    targetId: string,
    updater: (item: ChecklistItem) => ChecklistItem | null
  ): ChecklistItem[] => {
    const result: ChecklistItem[] = [];
    
    for (const item of itemsList) {
      if (item.id === targetId) {
        const updated = updater(item);
        if (updated !== null) {
          result.push(updated);
        }
        // Item found and processed, skip to next
      } else {
        // Not the target, but check children
        const updatedChildren = updateItemById(item.children || [], targetId, updater);
        result.push({
          ...item,
          children: updatedChildren,
        });
      }
    }
    
    return result;
  };

  const handleToggle = (id: string) => {
    setItems(prev => 
      updateItemById(prev, id, (item) => ({
        ...item,
        completed: !item.completed,
      }))
    );
  };

  const handleAddChild = (parentId: string, text: string) => {
    const newChild: ChecklistItem = {
      id: generateId(),
      text,
      completed: false,
      children: [],
    };
    
    setItems(prev =>
      updateItemById(prev, parentId, (item) => ({
        ...item,
        children: [...(item.children || []), newChild],
      }))
    );
  };

  const handleDelete = (id: string) => {
    setItems(prev => updateItemById(prev, id, () => null));
  };

  const handleEdit = (id: string, text: string) => {
    setItems(prev =>
      updateItemById(prev, id, (item) => ({
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

  const countAllItems = (itemsList: ChecklistItem[]): number => {
    let count = 0;
    for (const item of itemsList) {
      count++;
      if (item.children) {
        count += countAllItems(item.children);
      }
    }
    return count;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ListChecks className="h-5 w-5 text-primary" />
            {mode === "add" ? "Create New Checklist" : "Edit Checklist"}
          </DialogTitle>
          <DialogDescription>
            Create tasks and add sub-items to organize your checklist hierarchically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden gap-4">
          {/* Title Input */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-base font-medium">Checklist Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for your checklist..."
              className="h-11 text-base"
              required
            />
          </div>

          {/* Add Item Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Items</Label>
              <span className="text-xs text-muted-foreground">
                {countAllItems(items)} item{countAllItems(items) !== 1 ? 's' : ''} total
              </span>
            </div>
            <div className="flex gap-2">
              <Input
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                placeholder="Add a new item..."
                className="h-11 text-base flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddItem();
                  }
                }}
              />
              <Select value={newItemType} onValueChange={(v) => setNewItemType(v as ChecklistItemType)}>
                <SelectTrigger className="w-[130px] h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checkbox">
                    <span className="flex items-center gap-2"><CheckSquare className="h-3.5 w-3.5" /> Checkbox</span>
                  </SelectItem>
                  <SelectItem value="text">
                    <span className="flex items-center gap-2"><Type className="h-3.5 w-3.5" /> Text</span>
                  </SelectItem>
                  <SelectItem value="dropdown">
                    <span className="flex items-center gap-2"><List className="h-3.5 w-3.5" /> Dropdown</span>
                  </SelectItem>
                  <SelectItem value="radio">
                    <span className="flex items-center gap-2"><CircleDot className="h-3.5 w-3.5" /> Radio</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button 
                type="button" 
                onClick={handleAddItem}
                className="h-11 px-4"
                disabled={!newItemText.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
            {(newItemType === 'dropdown' || newItemType === 'radio') && (
              <Input
                value={newItemOptions}
                onChange={(e) => setNewItemOptions(e.target.value)}
                placeholder="Options (comma-separated, e.g. Yes, No, Maybe)"
                className="h-10 text-sm"
              />
            )}
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-hidden">
            <div className="border rounded-xl bg-card/50 backdrop-blur-sm min-h-[200px] max-h-[350px] overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <ListChecks className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium">No items yet</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Add your first item using the input above
                  </p>
                </div>
              ) : (
                <div className="p-3 space-y-1">
                  {items.map((item) => (
                    <ChecklistItemComponent
                      key={item.id}
                      item={item}
                      onToggle={handleToggle}
                      onAddChild={handleAddChild}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="h-10 px-6">
              Cancel
            </Button>
            <Button type="submit" className="h-10 px-6" disabled={!title.trim()}>
              {mode === "add" ? "Create Checklist" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
