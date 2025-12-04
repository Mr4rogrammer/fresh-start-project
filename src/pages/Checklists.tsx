import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ref, push, remove, update, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, Edit, Search, Eye, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { ChecklistForm } from "@/components/ChecklistForm";
import { ChecklistViewModal } from "@/components/ChecklistViewModal";
import { Input } from "@/components/ui/input";
import { useTotpVerification } from "@/hooks/useTotpVerification";
import { TotpVerificationModal } from "@/components/TotpVerificationModal";
import { Checklist, ChecklistItem } from "@/types/checklist";

const Checklists = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<Checklist | null>(null);
  const [viewingChecklist, setViewingChecklist] = useState<Checklist | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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

  const handleAddChecklist = async (title: string, items: ChecklistItem[]) => {
    if (!user) {
      toast.error("You must be signed in");
      return;
    }

    const checklistsRef = ref(db, `users/${user.uid}/checklists`);
    const newChecklist = {
      title,
      items,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const newRef = await push(checklistsRef, newChecklist);
    
    setChecklists([
      { id: newRef.key!, ...newChecklist },
      ...checklists,
    ]);
    
    toast.success("Checklist created successfully");
  };

  const handleEditChecklist = async (title: string, items: ChecklistItem[]) => {
    if (!user || !editingChecklist) return;

    const performEdit = async () => {
      const checklistRef = ref(db, `users/${user.uid}/checklists/${editingChecklist.id}`);
      await update(checklistRef, {
        title,
        items,
        updatedAt: new Date().toISOString(),
      });

      const updatedChecklists = checklists.map((cl) =>
        cl.id === editingChecklist.id
          ? { ...cl, title, items, updatedAt: new Date().toISOString() }
          : cl
      );
      setChecklists(updatedChecklists);

      toast.success("Checklist updated successfully");
      setEditingChecklist(null);
    };

    requireVerification(performEdit);
  };

  const deleteChecklist = async (checklistId: string) => {
    if (!user) return;

    const performDelete = async () => {
      try {
        const checklistRef = ref(db, `users/${user.uid}/checklists/${checklistId}`);
        await remove(checklistRef);

        setChecklists(checklists.filter((cl) => cl.id !== checklistId));
        toast.success("Checklist deleted successfully");
      } catch (error) {
        toast.error("Failed to delete checklist");
      }
    };

    requireVerification(performDelete);
  };

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

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  const filteredChecklists = checklists.filter((cl) =>
    cl.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 animate-slide-down">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              My Checklists
            </h1>
            <p className="text-muted-foreground mt-1">Organize your tasks with multi-level checklists</p>
          </div>
          <Button
            onClick={() => setIsFormOpen(true)}
            className="gap-2 hover:scale-105 transition-all shadow-lg hover:shadow-xl hover:shadow-primary/20"
          >
            <Plus className="h-4 w-4" />
            Add Checklist
          </Button>
        </div>

        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search checklists by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {checklists.length === 0 ? (
            <div className="col-span-full text-center py-16 animate-fade-in">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                <CheckSquare className="h-10 w-10 text-primary" />
              </div>
              <p className="text-muted-foreground text-lg">
                No checklists yet. Click "Add Checklist" to create your first one!
              </p>
            </div>
          ) : filteredChecklists.length === 0 ? (
            <div className="col-span-full text-center py-16 animate-fade-in">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                <Search className="h-10 w-10 text-primary" />
              </div>
              <p className="text-muted-foreground text-lg">
                No checklists found matching "{searchQuery}"
              </p>
            </div>
          ) : (
            filteredChecklists.map((checklist, index) => {
              const { total, completed } = countItems(checklist.items || []);
              const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

              return (
                <Card
                  key={checklist.id}
                  className="animate-fade-in hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold mb-2 line-clamp-1">
                      {checklist.title}
                    </h3>

                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span>
                          {completed}/{total} ({progress}%)
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(checklist.createdAt).toLocaleDateString()}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingChecklist(checklist)}
                          className="gap-2 hover:scale-110 transition-all"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingChecklist(checklist);
                            setIsFormOpen(true);
                          }}
                          className="gap-2 hover:scale-110 transition-all"
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteChecklist(checklist.id)}
                          className="gap-2 hover:scale-110 transition-all"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <ChecklistForm
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingChecklist(null);
        }}
        onSave={editingChecklist ? handleEditChecklist : handleAddChecklist}
        initialChecklist={editingChecklist}
        mode={editingChecklist ? "edit" : "add"}
      />

      <ChecklistViewModal
        checklist={viewingChecklist}
        open={!!viewingChecklist}
        onClose={() => setViewingChecklist(null)}
      />

      <TotpVerificationModal
        open={isVerificationRequired}
        onClose={cancelVerification}
        onVerify={handleVerificationSuccess}
        title="Verify to Continue"
        description="Enter your 6-digit code to confirm this action"
      />
    </div>
  );
};

export default Checklists;
