import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ref, push, remove, update, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Edit, Search, Eye, CheckSquare, ListChecks } from "lucide-react";
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

    try {
      const checklistsRef = ref(db, `users/${user.uid}/checklists`);
      const newChecklist = {
        title,
        items,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newRef = await push(checklistsRef, newChecklist);

      setChecklists(prev => [{ id: newRef.key!, ...newChecklist }, ...prev]);
      toast.success("Checklist created successfully");
    } catch (error) {
      console.error("Error creating checklist:", error);
      toast.error("Failed to create checklist");
    }
  };

  const handleEditChecklist = async (title: string, items: ChecklistItem[]) => {
    if (!user || !editingChecklist) return;

    const performEdit = async () => {
      try {
        const checklistRef = ref(db, `users/${user.uid}/checklists/${editingChecklist.id}`);
        await update(checklistRef, {
          title,
          items,
          updatedAt: new Date().toISOString(),
        });

        setChecklists(prev =>
          prev.map((cl) =>
            cl.id === editingChecklist.id
              ? { ...cl, title, items, updatedAt: new Date().toISOString() }
              : cl
          )
        );

        toast.success("Checklist updated successfully");
        setEditingChecklist(null);
      } catch (error) {
        console.error("Error updating checklist:", error);
        toast.error("Failed to update checklist");
      }
    };

    requireVerification(performEdit);
  };

  const deleteChecklist = async (checklistId: string) => {
    if (!user) return;

    const performDelete = async () => {
      try {
        const checklistRef = ref(db, `users/${user.uid}/checklists/${checklistId}`);
        await remove(checklistRef);

        setChecklists(prev => prev.filter((cl) => cl.id !== checklistId));
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

    const count = (itemsList: ChecklistItem[]) => {
      itemsList.forEach((item) => {
        total++;
        if (item.completed) completed++;
        if (item.children && item.children.length > 0) {
          count(item.children);
        }
      });
    };

    count(items || []);
    return { total, completed };
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

  const filteredChecklists = checklists.filter((cl) =>
    cl.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
              My Checklists
            </h1>
            <p className="text-muted-foreground">
              Organize your tasks with multi-level checklists
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingChecklist(null);
              setIsFormOpen(true);
            }}
            size="lg"
            className="gap-2 shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all"
          >
            <Plus className="h-5 w-5" />
            New Checklist
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search checklists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
        </div>

        {/* Checklists Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {checklists.length === 0 ? (
            <Card className="col-span-full border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <ListChecks className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No checklists yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first checklist to start organizing tasks
                </p>
                <Button onClick={() => setIsFormOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Checklist
                </Button>
              </CardContent>
            </Card>
          ) : filteredChecklists.length === 0 ? (
            <Card className="col-span-full border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Search className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground text-center">
                  No checklists match "{searchQuery}"
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredChecklists.map((checklist, index) => {
              const { total, completed } = countItems(checklist.items || []);
              const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

              return (
                <Card
                  key={checklist.id}
                  className="group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1 bg-card/80 backdrop-blur-sm border-border/50 hover:border-primary/30 overflow-hidden"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckSquare className="h-5 w-5 text-primary shrink-0" />
                        <span className="truncate">{checklist.title}</span>
                      </div>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">
                          {completed}/{total} ({progress}%)
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-primary to-primary/70 h-full rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Meta & Actions */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        {new Date(checklist.createdAt).toLocaleDateString()}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingChecklist(checklist)}
                          className="h-8 px-2"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingChecklist(checklist);
                            setIsFormOpen(true);
                          }}
                          className="h-8 px-2"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteChecklist(checklist.id)}
                          className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
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
