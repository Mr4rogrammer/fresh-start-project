import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ref, push, remove, update, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, RotateCcw, ChevronDown, ChevronRight, Check, ListChecks, Edit2, ArrowUp, ArrowDown, Copy, Menu, X, Type, CheckSquare, List, CircleDot } from "lucide-react";
import { toast } from "sonner";
import UndoToast from "@/components/UndoToast";
import { Input } from "@/components/ui/input";
import { useTotpVerification } from "@/hooks/useTotpVerification";
import { TotpVerificationModal } from "@/components/TotpVerificationModal";
import { Checklist, ChecklistItem, ChecklistItemType } from "@/types/checklist";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// Checklist Item Row Component
// Control type icon helper
const getControlTypeIcon = (type: ChecklistItemType) => {
  switch (type) {
    case 'text': return <Type className="h-3.5 w-3.5" />;
    case 'dropdown': return <List className="h-3.5 w-3.5" />;
    case 'radio': return <CircleDot className="h-3.5 w-3.5" />;
    default: return <CheckSquare className="h-3.5 w-3.5" />;
  }
};

const ChecklistItemRow = ({
  item,
  onToggle,
  onAddChild,
  onDelete,
  onEdit,
  onMoveUp,
  onMoveDown,
  onValueChange,
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
  onValueChange: (id: string, value: string) => void;
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
          "flex items-center gap-1 md:gap-2 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer",
          item.completed && "opacity-60"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={(e) => {
          // Don't toggle if clicking on buttons, inputs, selects, or labels
          if ((e.target as HTMLElement).closest('button, input, [role="combobox"], [role="radio"], [role="listbox"], label')) return;
          // Only toggle for checkbox type
          const itemType = item.type || 'checkbox';
          if (itemType === 'checkbox') onToggle(item.id);
        }}
      >
        {/* Expand/Collapse button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className={cn(
            "w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0",
            !hasChildren && "invisible"
          )}
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {/* Control based on item type */}
        {(!item.type || item.type === 'checkbox') && (
          <>
            <div
              className={cn(
                "w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0",
                item.completed
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-muted-foreground/40 hover:border-primary"
              )}
            >
              {item.completed && <Check className="h-3 w-3" />}
            </div>
            {isEditing ? (
              <Input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEdit();
                  if (e.key === "Escape") setIsEditing(false);
                }}
                onBlur={handleEdit}
                className="h-7 flex-1 text-sm"
                autoFocus
              />
            ) : (
              <span
                className={cn(
                  "flex-1 text-xs md:text-sm cursor-pointer truncate",
                  item.completed && "line-through text-muted-foreground"
                )}
                onDoubleClick={() => setIsEditing(true)}
              >
                {item.text}
              </span>
            )}
          </>
        )}

        {item.type === 'text' && (
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <span className="text-xs md:text-sm font-medium truncate">{item.text}</span>
            <Input
              value={item.value || ''}
              onChange={(e) => onValueChange(item.id, e.target.value)}
              placeholder="Enter your answer..."
              className="h-8 text-sm mt-0"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {item.type === 'dropdown' && (
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <span className="text-xs md:text-sm font-medium truncate">{item.text}</span>
            <Select
              value={item.value || ''}
              onValueChange={(val) => onValueChange(item.id, val)}
            >
              <SelectTrigger className="h-8 text-sm" onClick={(e) => e.stopPropagation()}>
                <SelectValue placeholder="Select an option..." />
              </SelectTrigger>
              <SelectContent>
                {(item.options || []).map((opt, i) => (
                  <SelectItem key={i} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {item.type === 'radio' && (
          <div className="flex-1 flex flex-col gap-1.5 min-w-0">
            <span className="text-xs md:text-sm font-medium truncate">{item.text}</span>
            <RadioGroup
              value={item.value || ''}
              onValueChange={(val) => onValueChange(item.id, val)}
              className="flex flex-col gap-1.5"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              {(item.options || []).map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <RadioGroupItem value={opt} id={`${item.id}-${i}`} />
                  <Label htmlFor={`${item.id}-${i}`} className="text-xs md:text-sm cursor-pointer">{opt}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Type badge */}
        {item.type && item.type !== 'checkbox' && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
            {item.type}
          </span>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 md:gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMoveUp(item.id)}
            disabled={!canMoveUp}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-primary disabled:opacity-30 hidden md:flex"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMoveDown(item.id)}
            disabled={!canMoveDown}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-primary disabled:opacity-30 hidden md:flex"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAddingChild(true)}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-emerald-500"
          >
            <Plus className="h-3 md:h-3.5 w-3 md:w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
          >
            <Edit2 className="h-3 md:h-3.5 w-3 md:w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(item.id)}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 md:h-3.5 w-3 md:w-3.5" />
          </Button>
        </div>
      </div>

      {/* Add child input */}
      {isAddingChild && (
        <div className="flex items-center gap-2 py-2" style={{ paddingLeft: `${(level + 1) * 16 + 24}px` }}>
          <Input
            value={newChildText}
            onChange={(e) => setNewChildText(e.target.value)}
            placeholder="Add sub-item..."
            className="h-8 flex-1 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddChild();
              if (e.key === "Escape") setIsAddingChild(false);
            }}
            autoFocus
          />
          <Button size="sm" onClick={handleAddChild} className="h-8">
            <span className="hidden xs:inline">Add</span>
            <Check className="h-4 w-4 xs:hidden" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setIsAddingChild(false)} className="h-8">
            <span className="hidden xs:inline">Cancel</span>
            <X className="h-4 w-4 xs:hidden" />
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
              onValueChange={onValueChange}
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
  const [newItemType, setNewItemType] = useState<ChecklistItemType>('checkbox');
  const [newItemOptions, setNewItemOptions] = useState("");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Swipe gesture state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  // Navigate to previous/next checklist
  const navigateChecklist = (direction: 'prev' | 'next') => {
    if (!selectedChecklist || checklists.length <= 1) return;
    
    const currentIndex = checklists.findIndex(c => c.id === selectedChecklist.id);
    if (currentIndex === -1) return;
    
    let newIndex: number;
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : checklists.length - 1;
    } else {
      newIndex = currentIndex < checklists.length - 1 ? currentIndex + 1 : 0;
    }
    
    setSelectedChecklist(checklists[newIndex]);
  };

  // Touch handlers for swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      navigateChecklist('next');
    } else if (isRightSwipe) {
      navigateChecklist('prev');
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };

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
      type: newItemType,
      options: (newItemType === 'dropdown' || newItemType === 'radio') 
        ? newItemOptions.split(',').map(o => o.trim()).filter(Boolean) 
        : undefined,
      value: '',
    };

    updateChecklist({
      ...selectedChecklist,
      items: [...selectedChecklist.items, newItem],
    });
    setNewItemText("");
    setNewItemOptions("");
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

  const handleValueChange = (itemId: string, value: string) => {
    if (!selectedChecklist) return;
    const updatedItems = updateItemById(deepClone(selectedChecklist.items), itemId, (item) => ({
      ...item,
      value,
      completed: !!value, // mark completed when value is set
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
          value: '',
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

  // Sidebar content component to reuse for desktop and mobile
  const SidebarContent = ({ onSelectChecklist }: { onSelectChecklist?: () => void }) => (
    <>
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
                      onClick={() => {
                        setSelectedChecklist(checklist);
                        onSelectChecklist?.();
                      }}
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
                      onClick={() => {
                        setSelectedChecklist(checklist);
                        onSelectChecklist?.();
                      }}
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
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex h-[calc(100vh-64px)]">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex w-80 border-r bg-muted/30 flex-col">
          <SidebarContent />
        </div>

        {/* Mobile Sidebar Sheet */}
        <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
          <SheetContent side="left" className="w-80 p-0 flex flex-col">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5" />
                My Checklists
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 flex flex-col overflow-hidden">
              <SidebarContent onSelectChecklist={() => setIsMobileSidebarOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        {/* Main Content - with swipe gesture support on mobile */}
        <div 
          className="flex-1 flex flex-col overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {selectedChecklist ? (
            <>
              {/* Header */}
              <div className="p-4 md:p-6 border-b space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {/* Mobile menu button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden shrink-0"
                      onClick={() => setIsMobileSidebarOpen(true)}
                    >
                      <Menu className="h-5 w-5" />
                    </Button>
                    
                    <div className="space-y-1 flex-1 min-w-0">
                      {isEditingTitle ? (
                        <Input
                          value={editedTitle}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          onBlur={handleTitleSave}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleTitleSave();
                            if (e.key === "Escape") setIsEditingTitle(false);
                          }}
                          className="text-xl md:text-2xl font-bold h-auto py-1 px-2"
                          autoFocus
                        />
                      ) : (
                        <h1
                          className="text-xl md:text-2xl font-bold cursor-pointer hover:text-primary transition-colors inline-flex items-center gap-2 truncate"
                          onClick={() => {
                            setIsEditingTitle(true);
                            setEditedTitle(selectedChecklist.title);
                          }}
                        >
                          <span className="truncate">{selectedChecklist.title}</span>
                          <Edit2 className="h-4 w-4 opacity-50 shrink-0" />
                        </h1>
                      )}
                      <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-2">
                        <span>Created {new Date(selectedChecklist.createdAt).toLocaleDateString()}</span>
                        {/* Mobile swipe indicator */}
                        {checklists.length > 1 && (
                          <span className="md:hidden text-xs text-muted-foreground/70">
                            • {checklists.findIndex(c => c.id === selectedChecklist.id) + 1}/{checklists.length}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Desktop action buttons */}
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
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

                  {/* Mobile action buttons - icons only */}
                  <div className="flex sm:hidden items-center gap-1 shrink-0">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleOpenDuplicateDialog}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setShowResetConfirm(true)}>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => setShowDeleteConfirm(true)}>
                      <Trash2 className="h-4 w-4" />
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
              <div className="flex-1 overflow-y-auto p-4 md:p-6">
                {/* Add new item */}
                <div className="space-y-3 mb-4 p-3 border rounded-xl bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Input
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      placeholder="Item label..."
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddItem();
                      }}
                    />
                    <Select value={newItemType} onValueChange={(v) => setNewItemType(v as ChecklistItemType)}>
                      <SelectTrigger className="w-[130px] h-10">
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
                    <Button onClick={handleAddItem} disabled={!newItemText.trim()} size="sm">
                      <Plus className="h-4 w-4 md:mr-1" />
                      <span className="hidden md:inline">Add</span>
                    </Button>
                  </div>
                  {(newItemType === 'dropdown' || newItemType === 'radio') && (
                    <Input
                      value={newItemOptions}
                      onChange={(e) => setNewItemOptions(e.target.value)}
                      placeholder="Options (comma-separated, e.g. Yes, No, Maybe)"
                      className="text-sm"
                    />
                  )}
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
                        onValueChange={handleValueChange}
                        canMoveUp={index > 0}
                        canMoveDown={index < selectedChecklist.items.length - 1}
                      />
                    ))
                  )}
                </div>
                
                {/* Mobile swipe hint */}
                {checklists.length > 1 && (
                  <div className="md:hidden flex items-center justify-center gap-1.5 py-3 text-xs text-muted-foreground/60">
                    <span>← Swipe to navigate →</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4">
              {/* Mobile menu button for empty state */}
              <Button
                variant="outline"
                className="md:hidden mb-4"
                onClick={() => setIsMobileSidebarOpen(true)}
              >
                <Menu className="h-4 w-4 mr-2" />
                View Checklists
              </Button>
              <div className="text-center">
                <ListChecks className="h-12 md:h-16 w-12 md:w-16 mx-auto mb-4 opacity-50" />
                <p className="text-base md:text-lg">Select a checklist or create a new one</p>
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
