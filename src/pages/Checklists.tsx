import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ref, push, remove, update, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, RotateCcw, ChevronDown, ChevronRight, Check, ListChecks, Edit2, ArrowUp, ArrowDown, Copy, Menu, X, Type, CheckSquare, List, CircleDot, FileText, Download } from "lucide-react";
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
import { checklistTemplates } from "@/data/checklistTemplates";
import { exportChecklistPdf } from "@/lib/exportChecklistPdf";

// Checklist Item Row Component — Card-based design matching reference UI

// Section header icon backgrounds
const sectionIconBg: Record<string, string> = {
  "🕐": "bg-amber-100 dark:bg-amber-900/30",
  "🔍": "bg-red-100 dark:bg-red-900/30",
  "⚡": "bg-blue-100 dark:bg-blue-900/30",
  "🏁": "bg-green-100 dark:bg-green-900/30",
  "📝": "bg-purple-100 dark:bg-purple-900/30",
  "📋": "bg-orange-100 dark:bg-orange-900/30",
};

const getSectionIcon = (text: string) => {
  const emoji = text.match(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u)?.[0];
  return emoji || "📌";
};

const parseSectionTitle = (text: string) => {
  // Extract emoji, title, and time from strings like "🕐 PRE-MARKET PREP (5:15 - 5:30 AM IST)"
  const emoji = text.match(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u)?.[0] || "";
  const withoutEmoji = text.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, "");
  const timeMatch = withoutEmoji.match(/\(([^)]+)\)/);
  const title = withoutEmoji.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const time = timeMatch?.[1] || "";
  return { emoji, title, time };
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
  const itemType = item.type || 'checkbox';

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

  // ── SECTION HEADER (parent with children) ──
  if (hasChildren && level === 0) {
    const { emoji, title, time } = parseSectionTitle(item.text);
    const iconBg = sectionIconBg[emoji] || "bg-muted";

    return (
      <div className="mb-6">
        {/* Section header */}
        <div className="flex items-center gap-3 mb-3 group">
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0", iconBg)}>
            {emoji || "📌"}
          </div>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <Input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEdit();
                  if (e.key === "Escape") setIsEditing(false);
                }}
                onBlur={handleEdit}
                className="text-base font-bold h-8"
                autoFocus
              />
            ) : (
              <h3 className="font-bold text-base tracking-tight truncate">{title}</h3>
            )}
            {time && <p className="text-xs text-muted-foreground mt-0.5">{time}</p>}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </button>
          {/* Section action buttons */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" onClick={() => setIsAddingChild(true)} className="h-7 w-7 p-0 text-muted-foreground hover:text-primary">
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setIsEditing(true); setEditText(item.text); }} className="h-7 w-7 p-0 text-muted-foreground hover:text-primary">
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(item.id)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Add child input */}
        {isAddingChild && (
          <div className="flex items-center gap-2 mb-3 ml-2">
            <Input
              value={newChildText}
              onChange={(e) => setNewChildText(e.target.value)}
              placeholder="Add item to this section..."
              className="h-9 flex-1 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddChild();
                if (e.key === "Escape") setIsAddingChild(false);
              }}
              autoFocus
            />
            <Button size="sm" onClick={handleAddChild} className="h-9">Add</Button>
            <Button size="sm" variant="ghost" onClick={() => setIsAddingChild(false)} className="h-9">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Section children */}
        {isExpanded && (
          <div className="space-y-2">
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
  }

  // ── RADIO TYPE — Horizontal pill buttons ──
  if (itemType === 'radio') {
    return (
      <div className="mb-4">
        <p className="text-sm font-medium text-muted-foreground mb-2.5 flex items-center justify-between group">
          <span>{item.text}</span>
          <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" onClick={() => { setIsEditing(true); setEditText(item.text); }} className="h-6 w-6 p-0 text-muted-foreground hover:text-primary">
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(item.id)} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </Button>
          </span>
        </p>
        {isEditing && (
          <Input
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleEdit();
              if (e.key === "Escape") setIsEditing(false);
            }}
            onBlur={handleEdit}
            className="h-8 text-sm mb-2"
            autoFocus
          />
        )}
        <div className="flex gap-2 flex-wrap">
          {(item.options || []).map((opt, i) => (
            <button
              key={i}
              onClick={() => onValueChange(item.id, item.value === opt ? '' : opt)}
              className={cn(
                "flex-1 min-w-[80px] px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all text-center",
                item.value === opt
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:border-muted-foreground/30 text-foreground"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── TEXT TYPE — Card with input ──
  if (itemType === 'text') {
    return (
      <div className="mb-3">
        <div className="rounded-xl border bg-card p-4 group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">{item.text}</span>
            <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="sm" onClick={() => { setIsEditing(true); setEditText(item.text); }} className="h-6 w-6 p-0 text-muted-foreground hover:text-primary">
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete(item.id)} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </Button>
            </span>
          </div>
          {isEditing && (
            <Input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleEdit();
                if (e.key === "Escape") setIsEditing(false);
              }}
              onBlur={handleEdit}
              className="h-8 text-sm mb-2"
              autoFocus
            />
          )}
          <Input
            value={item.value || ''}
            onChange={(e) => onValueChange(item.id, e.target.value)}
            placeholder="Type your answer..."
            className="h-10 text-sm border-dashed"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    );
  }

  // ── DROPDOWN TYPE — Card with select ──
  if (itemType === 'dropdown') {
    return (
      <div className="mb-3">
        <div className="rounded-xl border bg-card p-4 group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">{item.text}</span>
            <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="sm" onClick={() => { setIsEditing(true); setEditText(item.text); }} className="h-6 w-6 p-0 text-muted-foreground hover:text-primary">
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete(item.id)} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </Button>
            </span>
          </div>
          <Select value={item.value || ''} onValueChange={(val) => onValueChange(item.id, val)}>
            <SelectTrigger className="h-10 text-sm">
              <SelectValue placeholder="Select an option..." />
            </SelectTrigger>
            <SelectContent>
              {(item.options || []).map((opt, i) => (
                <SelectItem key={i} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  // ── CHECKBOX TYPE — Rounded card style ──
  return (
    <div className="relative">
      <div
        className={cn(
          "rounded-xl border bg-card px-4 py-3.5 flex items-center gap-3 transition-all cursor-pointer group",
          "hover:shadow-sm hover:border-primary/20",
          item.completed && "opacity-60 bg-muted/50"
        )}
        style={level > 1 ? { marginLeft: `${(level - 1) * 16}px` } : undefined}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button, input')) return;
          onToggle(item.id);
        }}
      >
        {/* Checkbox */}
        <div
          className={cn(
            "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0",
            item.completed
              ? "bg-primary border-primary text-primary-foreground"
              : "border-muted-foreground/30 hover:border-primary"
          )}
        >
          {item.completed && <Check className="h-3.5 w-3.5" />}
        </div>

        {/* Text */}
        {isEditing ? (
          <Input
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleEdit();
              if (e.key === "Escape") setIsEditing(false);
            }}
            onBlur={handleEdit}
            className="h-8 flex-1 text-sm"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className={cn(
              "flex-1 text-sm leading-relaxed",
              item.completed && "line-through text-muted-foreground"
            )}
          >
            {item.text}
          </span>
        )}

        {/* Action buttons - show on hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {hasChildren && (
            <button
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
              className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
            >
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          )}
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onMoveUp(item.id); }} disabled={!canMoveUp} className="h-6 w-6 p-0 text-muted-foreground hover:text-primary disabled:opacity-30 hidden md:flex">
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onMoveDown(item.id); }} disabled={!canMoveDown} className="h-6 w-6 p-0 text-muted-foreground hover:text-primary disabled:opacity-30 hidden md:flex">
            <ArrowDown className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setIsAddingChild(true); }} className="h-6 w-6 p-0 text-muted-foreground hover:text-primary">
            <Plus className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setIsEditing(true); setEditText(item.text); }} className="h-6 w-6 p-0 text-muted-foreground hover:text-primary">
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Add child input */}
      {isAddingChild && (
        <div className="flex items-center gap-2 mt-2 ml-4">
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
          <Button size="sm" onClick={handleAddChild} className="h-8">Add</Button>
          <Button size="sm" variant="ghost" onClick={() => setIsAddingChild(false)} className="h-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="mt-2 space-y-2 ml-4">
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

  const createFromTemplate = async (templateIndex: number) => {
    if (!user) return;
    const template = checklistTemplates[templateIndex];
    if (!template) return;

    try {
      const checklistsRef = ref(db, `users/${user.uid}/checklists`);
      const newChecklist = {
        title: template.name,
        items: JSON.parse(JSON.stringify(template.items)),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newRef = await push(checklistsRef, newChecklist);
      const createdChecklist = { id: newRef.key!, ...newChecklist };
      setChecklists((prev) => [createdChecklist, ...prev]);
      setSelectedChecklist(createdChecklist);
      setShowTemplateDialog(false);
      toast.success(`"${template.name}" created from template`);
    } catch (error) {
      toast.error("Failed to create from template");
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
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

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
      <div className="p-4 border-b space-y-2">
        <Button onClick={createNewChecklist} className="w-full gap-2" variant="default">
          <Plus className="h-4 w-4" />
          New Checklist
        </Button>
        <Button onClick={() => setShowTemplateDialog(true)} className="w-full gap-2" variant="outline">
          <FileText className="h-4 w-4" />
          From Template
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
                    <Button variant="outline" size="sm" onClick={() => exportChecklistPdf(selectedChecklist)} className="gap-1.5">
                      <Download className="h-4 w-4" />
                      Export PDF
                    </Button>
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
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => exportChecklistPdf(selectedChecklist)}>
                      <Download className="h-4 w-4" />
                    </Button>
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
                    <span className="font-medium text-primary">
                      {selectedStats.completed}/{selectedStats.total} ({progress}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>

               {/* Items */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6">
               
                {/* Checklist items */}
                <div className="space-y-2">
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
      {/* Template Picker Dialog */}
      <AlertDialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Create from Template
            </AlertDialogTitle>
            <AlertDialogDescription>
              Choose a pre-built checklist template to get started quickly.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2 max-h-[50vh] overflow-y-auto">
            {checklistTemplates.map((template, index) => (
              <button
                key={index}
                onClick={() => createFromTemplate(index)}
                className="w-full text-left p-4 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-muted/50 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{template.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{template.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1.5">{template.items.length} sections</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Checklists;
