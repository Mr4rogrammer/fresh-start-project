import { useState } from "react";
import { ChecklistItem } from "@/types/checklist";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Plus, Trash2, Edit, Check, X, CornerDownRight } from "lucide-react";
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

  const getLevelColor = (lvl: number) => {
    const colors = [
      "border-primary/40",
      "border-blue-500/40",
      "border-green-500/40",
      "border-yellow-500/40",
      "border-purple-500/40",
    ];
    return colors[lvl % colors.length];
  };

  return (
    <div 
      className={cn(
        "relative",
        level > 0 && `ml-4 pl-4 border-l-2 ${getLevelColor(level)}`
      )}
    >
      <div className={cn(
        "flex items-center gap-3 py-2 px-3 rounded-lg group transition-all",
        "hover:bg-muted/50",
        item.completed && "opacity-60"
      )}>
        {/* Expand/Collapse Button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-6 w-6 shrink-0 transition-all",
            !hasChildren && "opacity-0 pointer-events-none"
          )}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>

        {/* Checkbox */}
        <Checkbox
          checked={item.completed}
          onCheckedChange={() => onToggle(item.id)}
          className="shrink-0 h-5 w-5"
        />

        {/* Text or Edit Input */}
        {isEditing ? (
          <div className="flex-1 flex items-center gap-2">
            <Input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="h-9 text-base"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit();
                if (e.key === "Escape") setIsEditing(false);
              }}
            />
            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={handleSaveEdit}>
              <Check className="h-4 w-4 text-green-500" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setIsEditing(false)}>
              <X className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ) : (
          <>
            <span
              className={cn(
                "flex-1 text-sm font-medium transition-colors",
                item.completed && "line-through text-muted-foreground"
              )}
            >
              {item.text}
            </span>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10"
                onClick={() => setIsAddingChild(true)}
                title="Add sub-item"
              >
                <Plus className="h-4 w-4 mr-1" />
                <span className="text-xs">Sub</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => {
                  setEditText(item.text);
                  setIsEditing(true);
                }}
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(item.id)}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Add Child Input */}
      {isAddingChild && (
        <div className="ml-10 flex items-center gap-2 py-2 px-3 bg-muted/30 rounded-lg mt-1 animate-in slide-in-from-top-2 duration-200">
          <CornerDownRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Enter sub-item text..."
            value={newChildText}
            onChange={(e) => setNewChildText(e.target.value)}
            className="h-9 flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddChild();
              if (e.key === "Escape") {
                setIsAddingChild(false);
                setNewChildText("");
              }
            }}
          />
          <Button size="sm" onClick={handleAddChild} className="h-8">
            <Check className="h-4 w-4 mr-1" />
            Add
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8" 
            onClick={() => {
              setIsAddingChild(false);
              setNewChildText("");
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-0.5">
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
