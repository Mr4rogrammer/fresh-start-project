import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ref, push, remove, update, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, RotateCcw, ChevronDown, ChevronRight, Check, ListChecks, Edit2, GripVertical, ArrowUp, ArrowDown, Copy } from "lucide-react";
import { toast } from "sonner";
import UndoToast from "@/components/UndoToast";
import { Input } from "@/components/ui/input";
import { useTotpVerification } from "@/hooks/useTotpVerification";
import { TotpVerificationModal } from "@/components/TotpVerificationModal";
import { Checklist, ChecklistItem } from "@/types/checklist";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Checklist Item Row Component
const ChecklistItemRow = ({
  item,
  onToggle,
  onAddChild,
  onDelete,
  onEdit,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  level = 0,
}: {
  item: ChecklistItem;
  onToggle: (id: string) => void;
  onAddChild: (parentId: string, text: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  level?: number;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [newChildText, setNewChildText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const hasChildren = item.children && item.children.length > 0;

  const handleAddChild = () => {
    if (newChildText.trim()) {
      onAddChild(item.id, newChildText.trim());
      setNewChildText("");
      setIsAddingChild(false);
    }
  };

  const handleEdit = () => {
    if (editText.trim()) {
      onEdit(item.id, editText.trim());
      setIsEditing(false);
    }
  };

  return (
    <div className="relative">
      {/* Vertical line connector for nested items */}
      {level > 0 && (
        <div
          className="absolute left-0 top-0 bottom-0 w-px bg-border"
          style={{ left: `${(level - 1) * 24 + 12}px` }}
        />
      )}
      
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer",
          item.completed && "opacity-60"
        )}
        style={{ paddingLeft: `${level * 24 + 8}px` }}
        onClick={(e) => {
          // Don't toggle if clicking on buttons or inputs
          if ((e.target as HTMLElement).closest('button, input')) return;
          onToggle(item.id);
        }}
      >
        {/* Expand/Collapse button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className={cn(
            "w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors",
            !hasChildren && "invisible"
          )}
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {/* Checkbox */}
        <div
          className={cn(
            "w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0",
            item.completed
              ? "bg-emerald-500 border-emerald-500 text-white"
              : "border-muted-foreground/40 hover:border-emerald-500"
          )}
        >
          {item.completed && <Check className="h-3 w-3" />}
        </div>

        {/* Item text or edit input */}
        {isEditing ? (
          <Input
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleEdit();
              if (e.key === "Escape") setIsEditing(false);
            }}
            onBlur={handleEdit}
            className="h-7 flex-1"
            autoFocus
          />
        ) : (
          <span
            className={cn(
              "flex-1 text-sm cursor-pointer",
              item.completed && "line-through text-muted-foreground"
            )}
            onDoubleClick={() => setIsEditing(true)}
          >
            {item.text}
          </span>
        )}

        {/* Action buttons - visible on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMoveUp(item.id)}
            disabled={!canMoveUp}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-primary disabled:opacity-30"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMoveDown(item.id)}
            disabled={!canMoveDown}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-primary disabled:opacity-30"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAddingChild(true)}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-emerald-500"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(item.id)}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Add child input */}
      {isAddingChild && (
        <div className="flex items-center gap-2 py-2" style={{ paddingLeft: `${(level + 1) * 24 + 36}px` }}>
          <Input
            value={newChildText}
            onChange={(e) => setNewChildText(e.target.value)}
            placeholder="Add sub-item..."
            className="h-8 flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddChild();
              if (e.key === "Escape") setIsAddingChild(false);
            }}
            autoFocus
          />
          <Button size="sm" onClick={handleAddChild} className="h-8">
            Add
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setIsAddingChild(false)} className="h-8">
            Cancel
          </Button>
        </div>
      )}

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {item.children.map((child, index) => (
            <ChecklistItemRow
              key={child.id}
              item={child}
              onToggle={onToggle}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onEdit={onEdit}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              canMoveUp={index > 0}
              canMoveDown={index < item.children.length - 1}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Checklists = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [newItemText, setNewItemText] = useState("");

  const {
    isVerificationRequired,
    requireVerification,
    handleVerificationSuccess,
    cancelVerification,
  } = useTotpVerification();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchChecklists = async () => {
      if (!user) return;

      try {
        const checklistsRef = ref(db, `users/${user.uid}/checklists`);
        const snapshot = await get(checklistsRef);

        if (snapshot.exists()) {
          const data = snapshot.val();
          const checklistsArray: Checklist[] = Object.entries(data).map(
            ([id, checklist]: [string, any]) => ({
              id,
              ...checklist,
              items: checklist.items || [],
            })
          );
          checklistsArray.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setChecklists(checklistsArray);
          if (checklistsArray.length > 0 && !selectedChecklist) {
            setSelectedChecklist(checklistsArray[0]);
          }
        } else {
          setChecklists([]);
        }
      } catch (error) {
        console.error("Error fetching checklists:", error);
        toast.error("Failed to load checklists");
      } finally {
        setIsLoading(false);
      }
    };

    fetchChecklists();
  }, [user]);

  const countItems = (items: ChecklistItem[]): { total: number; completed: number } => {
    // Only count root-level items, not children
    const total = items?.length || 0;
    const completed = items?.filter(item => item.completed).length || 0;
    return { total, completed };
  };

  const createNewChecklist = async () => {
    if (!user) return;

    try {
      const checklistsRef = ref(db, `users/${user.uid}/checklists`);
      const newChecklist = {
        title: "New Checklist",
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newRef = await push(checklistsRef, newChecklist);
      const createdChecklist = { id: newRef.key!, ...newChecklist };
      setChecklists((prev) => [createdChecklist, ...prev]);
      setSelectedChecklist(createdChecklist);
      setIsEditingTitle(true);
      setEditedTitle("New Checklist");
      toast.success("Checklist created");
    } catch (error) {
      toast.error("Failed to create checklist");
    }
  };

  const updateChecklist = async (updatedChecklist: Checklist) => {
    if (!user) return;

    try {
      const checklistRef = ref(db, `users/${user.uid}/checklists/${updatedChecklist.id}`);
      await update(checklistRef, {
        title: updatedChecklist.title,
        items: updatedChecklist.items,
        updatedAt: new Date().toISOString(),
      });

      setChecklists((prev) =>
        prev.map((cl) => (cl.id === updatedChecklist.id ? updatedChecklist : cl))
      );
      setSelectedChecklist(updatedChecklist);
    } catch (error) {
      toast.error("Failed to update checklist");
    }
  };

  // Confirmation dialog states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateName, setDuplicateName] = useState("");

  const duplicateChecklist = async () => {
    if (!user || !selectedChecklist || !duplicateName.trim()) return;

    try {
      const checklistsRef = ref(db, `users/${user.uid}/checklists`);
      const newChecklist = {
        title: duplicateName.trim(),
        items: JSON.parse(JSON.stringify(selectedChecklist.items)), // Deep copy with current state
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDuplicate: true,
      };

      const newRef = await push(checklistsRef, newChecklist);
      const createdChecklist: Checklist = { id: newRef.key!, ...newChecklist };
      setChecklists((prev) => [createdChecklist, ...prev]);
      setSelectedChecklist(createdChecklist);
      setShowDuplicateDialog(false);
      setDuplicateName("");
      toast.success("Checklist duplicated");
    } catch (error) {
      toast.error("Failed to duplicate checklist");
    }
  };

  const handleOpenDuplicateDialog = () => {
    if (selectedChecklist) {
      setDuplicateName(`${selectedChecklist.title} (Copy)`);
      setShowDuplicateDialog(true);
    }
  };

  const deleteChecklist = async () => {
    if (!user || !selectedChecklist) return;

    const performDelete = async () => {
      // Store checklist for undo
      const checklistToDelete = selectedChecklist;
      
      // Optimistic UI update - remove immediately
      const remaining = checklists.filter((cl) => cl.id !== selectedChecklist.id);
      setChecklists(remaining);
      setSelectedChecklist(remaining.length > 0 ? remaining[0] : null);

      let isUndone = false;

      const toastId = toast(
        <UndoToast
          message="Checklist deleted"
          onUndo={() => {
            isUndone = true;
            toast.dismiss(toastId);
            setChecklists([...remaining, checklistToDelete]);
            setSelectedChecklist(checklistToDelete);
            toast.success("Checklist restored");
          }}
        />,
        { duration: 10000 }
      );

      // Actually delete from Firebase after 10 seconds if not undone
      setTimeout(async () => {
        if (!isUndone) {
          try {
            const checklistRef = ref(db, `users/${user.uid}/checklists/${checklistToDelete.id}`);
            await remove(checklistRef);
          } catch (error) {
            // Restore on error
            setChecklists([...remaining, checklistToDelete]);
            setSelectedChecklist(checklistToDelete);
            toast.error("Failed to delete checklist");
          }
        }
      }, 10000);
    };

    requireVerification(performDelete);
  };

  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    deleteChecklist();
  };

  const handleTitleSave = () => {
    if (!selectedChecklist || !editedTitle.trim()) return;
    updateChecklist({ ...selectedChecklist, title: editedTitle.trim() });
    setIsEditingTitle(false);
  };

  const handleAddItem = () => {
    if (!selectedChecklist || !newItemText.trim()) return;

    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      text: newItemText.trim(),
      completed: false,
      children: [],
    };

    updateChecklist({
      ...selectedChecklist,
      items: [...selectedChecklist.items, newItem],
    });
    setNewItemText("");
  };

  // Deep clone helper
  const deepClone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

  // Recursive update helper
  const updateItemById = (
    items: ChecklistItem[],
    id: string,
    updater: (item: ChecklistItem) => ChecklistItem | null
  ): ChecklistItem[] => {
    return items
      .map((item) => {
        if (item.id === id) {
          return updater(item);
        }
        if (item.children && item.children.length > 0) {
          return {
            ...item,
            children: updateItemById(item.children, id, updater),
          };
        }
        return item;
      })
      .filter((item): item is ChecklistItem => item !== null);
  };

  const handleToggleItem = (itemId: string) => {
    if (!selectedChecklist) return;

    // First toggle the item
    let updatedItems = updateItemById(deepClone(selectedChecklist.items), itemId, (item) => ({
      ...item,
      completed: !item.completed,
    }));

    // Then update parent completion status based on children
    const updateParentStatus = (items: ChecklistItem[]): ChecklistItem[] => {
      return items.map((item) => {
        if (item.children && item.children.length > 0) {
          // First recursively update children
          const updatedChildren = updateParentStatus(item.children);
          // Check if any child is completed
          const hasCompletedChild = updatedChildren.some(child => child.completed);
          return {
            ...item,
            children: updatedChildren,
            completed: hasCompletedChild || item.completed,
          };
        }
        return item;
      });
    };

    updatedItems = updateParentStatus(updatedItems);
    updateChecklist({ ...selectedChecklist, items: updatedItems });
  };

  const handleAddChildItem = (parentId: string, text: string) => {
    if (!selectedChecklist) return;

    const newChild: ChecklistItem = {
      id: Date.now().toString(),
      text,
      completed: false,
      children: [],
    };

    const updatedItems = updateItemById(deepClone(selectedChecklist.items), parentId, (item) => ({
      ...item,
      children: [...(item.children || []), newChild],
    }));

    updateChecklist({ ...selectedChecklist, items: updatedItems });
  };

  const handleDeleteItem = (itemId: string) => {
    if (!selectedChecklist) return;

    const updatedItems = updateItemById(deepClone(selectedChecklist.items), itemId, () => null);
    updateChecklist({ ...selectedChecklist, items: updatedItems });
  };

  const handleEditItem = (itemId: string, newText: string) => {
    if (!selectedChecklist) return;

    const updatedItems = updateItemById(deepClone(selectedChecklist.items), itemId, (item) => ({
      ...item,
      text: newText,
    }));

    updateChecklist({ ...selectedChecklist, items: updatedItems });
  };

  const handleResetChecks = () => {
    if (!selectedChecklist) return;

    const performReset = () => {
      const resetItems = (items: ChecklistItem[]): ChecklistItem[] => {
        return items.map((item) => ({
          ...item,
          completed: false,
          children: item.children ? resetItems(item.children) : [],
        }));
      };

      updateChecklist({ ...selectedChecklist, items: resetItems(selectedChecklist.items) });
      toast.success("All items unchecked");
    };

    requireVerification(performReset);
  };

  const handleResetConfirm = () => {
    setShowResetConfirm(false);
    handleResetChecks();
  };

  // Helper to find parent and move item
  const moveItemInArray = (items: ChecklistItem[], itemId: string, direction: 'up' | 'down'): ChecklistItem[] => {
    const result = deepClone(items);
    
    // Check if item is at this level
    const index = result.findIndex(item => item.id === itemId);
    if (index !== -1) {
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex >= 0 && newIndex < result.length) {
        [result[index], result[newIndex]] = [result[newIndex], result[index]];
      }
      return result;
    }
    
    // Otherwise search in children
    return result.map(item => ({
      ...item,
      children: item.children ? moveItemInArray(item.children, itemId, direction) : []
    }));
  };

  const handleMoveUp = (itemId: string) => {
    if (!selectedChecklist) return;
    const updatedItems = moveItemInArray(selectedChecklist.items, itemId, 'up');
    updateChecklist({ ...selectedChecklist, items: updatedItems });
  };

  const handleMoveDown = (itemId: string) => {
    if (!selectedChecklist) return;
    const updatedItems = moveItemInArray(selectedChecklist.items, itemId, 'down');
    updateChecklist({ ...selectedChecklist, items: updatedItems });
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading checklists...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const selectedStats = selectedChecklist ? countItems(selectedChecklist.items) : { total: 0, completed: 0 };
  const progress = selectedStats.total > 0 ? Math.round((selectedStats.completed / selectedStats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <div className="w-80 border-r bg-muted/30 flex flex-col">
          <div className="p-4 border-b">
            <Button onClick={createNewChecklist} className="w-full gap-2" variant="default">
              <Plus className="h-4 w-4" />
              New Checklist
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {checklists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No checklists yet
              </div>
            ) : (
              <>
                {/* Original Checklists */}
                {checklists.filter(c => !c.isDuplicate).length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground px-3 py-2 uppercase tracking-wider">
                      Checklists
                    </div>
                    {checklists.filter(c => !c.isDuplicate).map((checklist) => {
                      const stats = countItems(checklist.items);
                      const isSelected = selectedChecklist?.id === checklist.id;

                      return (
                        <button
                          key={checklist.id}
                          onClick={() => setSelectedChecklist(checklist)}
                          className={cn(
                            "w-full text-left p-3 rounded-lg transition-all",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <ListChecks className="h-4 w-4 shrink-0" />
                            <span className="font-medium truncate">{checklist.title}</span>
                          </div>
                          <div className={cn(
                            "text-xs mt-1",
                            isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}>
                            {stats.completed}/{stats.total} items
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Duplicated Checklists */}
                {checklists.filter(c => c.isDuplicate).length > 0 && (
                  <div className="space-y-1 mt-4">
                    <div className="text-xs font-medium text-muted-foreground px-3 py-2 uppercase tracking-wider flex items-center gap-2">
                      <Copy className="h-3 w-3" />
                      Duplicated
                    </div>
                    {checklists.filter(c => c.isDuplicate).map((checklist) => {
                      const stats = countItems(checklist.items);
                      const isSelected = selectedChecklist?.id === checklist.id;

                      return (
                        <button
                          key={checklist.id}
                          onClick={() => setSelectedChecklist(checklist)}
                          className={cn(
                            "w-full text-left p-3 rounded-lg transition-all",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted/70"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <ListChecks className="h-4 w-4 shrink-0" />
                            <span className="font-medium truncate">{checklist.title}</span>
                          </div>
                          <div className={cn(
                            "text-xs mt-1",
                            isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}>
                            {stats.completed}/{stats.total} items
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedChecklist ? (
            <>
              {/* Header */}
              <div className="p-6 border-b space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    {isEditingTitle ? (
                      <Input
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        onBlur={handleTitleSave}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleTitleSave();
                          if (e.key === "Escape") setIsEditingTitle(false);
                        }}
                        className="text-2xl font-bold h-auto py-1 px-2"
                        autoFocus
                      />
                    ) : (
                      <h1
                        className="text-2xl font-bold cursor-pointer hover:text-primary transition-colors inline-flex items-center gap-2"
                        onClick={() => {
                          setIsEditingTitle(true);
                          setEditedTitle(selectedChecklist.title);
                        }}
                      >
                        {selectedChecklist.title}
                        <Edit2 className="h-4 w-4 opacity-50" />
                      </h1>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Created {new Date(selectedChecklist.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleOpenDuplicateDialog} className="gap-1.5">
                      <Copy className="h-4 w-4" />
                      Duplicate
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowResetConfirm(true)} className="gap-1.5">
                      <RotateCcw className="h-4 w-4" />
                      Reset
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)} className="gap-1.5">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium text-emerald-500">
                      {selectedStats.completed}/{selectedStats.total} ({progress}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Add new item */}
                <div className="flex items-center gap-2 mb-4">
                  <Input
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    placeholder="Add new item..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddItem();
                    }}
                  />
                  <Button onClick={handleAddItem} disabled={!newItemText.trim()}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>

                {/* Checklist items */}
                <div className="space-y-1">
                  {selectedChecklist.items.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <ListChecks className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No items yet. Add your first item above.</p>
                    </div>
                  ) : (
                    selectedChecklist.items.map((item, index) => (
                      <ChecklistItemRow
                        key={item.id}
                        item={item}
                        onToggle={handleToggleItem}
                        onAddChild={handleAddChildItem}
                        onDelete={handleDeleteItem}
                        onEdit={handleEditItem}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                        canMoveUp={index > 0}
                        canMoveDown={index < selectedChecklist.items.length - 1}
                      />
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <ListChecks className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a checklist or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <TotpVerificationModal
        open={isVerificationRequired}
        onClose={cancelVerification}
        onVerify={handleVerificationSuccess}
        title="Verify to Continue"
        description="Enter your 6-digit code to confirm this action"
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Checklist</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedChecklist?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Checklist</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to uncheck all items in "{selectedChecklist?.title}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetConfirm}>
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Dialog */}
      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate Checklist</AlertDialogTitle>
            <AlertDialogDescription>
              Create a copy of "{selectedChecklist?.title}" with its current state.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              placeholder="Enter name for the copy..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && duplicateName.trim()) {
                  duplicateChecklist();
                }
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={duplicateChecklist} disabled={!duplicateName.trim()}>
              Duplicate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Checklists;
