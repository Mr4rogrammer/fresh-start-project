import { useState } from "react";
import { ChecklistItem } from "@/types/checklist";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Plus, Trash2, Edit, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistItemComponentProps {
  item: ChecklistItem;
  onToggle: (id: string) => void;
  onAddChild: (parentId: string, text: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  level?: number;
}

export const ChecklistItemComponent = ({
  item,
  onToggle,
  onAddChild,
  onDelete,
  onEdit,
  level = 0,
}: ChecklistItemComponentProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newChildText, setNewChildText] = useState("");
  const [editText, setEditText] = useState(item.text);

  const hasChildren = item.children && item.children.length > 0;

  const handleAddChild = () => {
    if (newChildText.trim()) {
      onAddChild(item.id, newChildText.trim());
      setNewChildText("");
      setIsAddingChild(false);
    }
  };

  const handleSaveEdit = () => {
    if (editText.trim()) {
      onEdit(item.id, editText.trim());
      setIsEditing(false);
    }
  };

  return (
    <div className={cn("relative", level > 0 && "ml-6 border-l-2 border-border/50 pl-4")}>
      <div className="flex items-center gap-2 py-1.5 group">
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

        <Checkbox
          checked={item.completed}
          onCheckedChange={() => onToggle(item.id)}
          className="shrink-0"
        />

        {isEditing ? (
          <div className="flex-1 flex items-center gap-2">
            <Input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="h-8"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit();
                if (e.key === "Escape") setIsEditing(false);
              }}
            />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveEdit}>
              <Check className="h-4 w-4 text-green-500" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsEditing(false)}>
              <X className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ) : (
          <>
            <span
              className={cn(
                "flex-1 text-sm transition-colors",
                item.completed && "line-through text-muted-foreground"
              )}
            >
              {item.text}
            </span>

            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsAddingChild(true)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setEditText(item.text);
                  setIsEditing(true);
                }}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onDelete(item.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        )}
      </div>

      {isAddingChild && (
        <div className="ml-8 flex items-center gap-2 py-1">
          <Input
            placeholder="Add sub-item..."
            value={newChildText}
            onChange={(e) => setNewChildText(e.target.value)}
            className="h-8"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddChild();
              if (e.key === "Escape") setIsAddingChild(false);
            }}
          />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleAddChild}>
            <Check className="h-4 w-4 text-green-500" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsAddingChild(false)}>
            <X className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      )}

      {hasChildren && isExpanded && (
        <div className="mt-1">
          {item.children.map((child) => (
            <ChecklistItemComponent
              key={child.id}
              item={child}
              onToggle={onToggle}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onEdit={onEdit}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
