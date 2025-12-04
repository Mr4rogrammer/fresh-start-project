import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ref, push, remove, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { useData } from "@/contexts/DataContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, Edit, Search } from "lucide-react";
import { toast } from "sonner";
import { NoteForm } from "@/components/NoteForm";
import { NoteViewModal } from "@/components/NoteViewModal";
import { Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTotpVerification } from "@/hooks/useTotpVerification";
import { TotpVerificationModal } from "@/components/TotpVerificationModal";

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

const Notes = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { notes, updateLocalNotes } = useData();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
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

  const handleAddNote = async (title: string, content: string) => {
    if (!user) {
      toast.error("You must be signed in");
      return;
    }

    const notesRef = ref(db, `users/${user.uid}/notes`);
    const newRef = await push(notesRef, {
      title,
      content,
      createdAt: new Date().toISOString(),
    });
    
    // Update local state
    const newNote = {
      id: newRef.key!,
      title,
      content,
      createdAt: new Date().toISOString(),
    };
    updateLocalNotes([newNote, ...notes]);
    
    toast.success("Note added successfully");
  };

  const handleEditNote = async (title: string, content: string) => {
    if (!user || !editingNote) return;

    const performEdit = async () => {
      const noteRef = ref(db, `users/${user.uid}/notes/${editingNote.id}`);
      await update(noteRef, { title, content });
      
      // Update local state
      const updatedNotes = notes.map(note =>
        note.id === editingNote.id ? { ...note, title, content } : note
      );
      updateLocalNotes(updatedNotes);
      
      toast.success("Note updated successfully");
      setEditingNote(null);
    };

    requireVerification(performEdit);
  };

  const deleteNote = async (noteId: string) => {
    if (!user) return;

    const performDelete = async () => {
      try {
        const noteRef = ref(db, `users/${user.uid}/notes/${noteId}`);
        await remove(noteRef);
        
        // Update local state
        const updatedNotes = notes.filter(note => note.id !== noteId);
        updateLocalNotes(updatedNotes);
        
        toast.success("Note deleted successfully");
      } catch (error) {
        toast.error("Failed to delete note");
      }
    };

    requireVerification(performDelete);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  // Filter notes based on search query
  const filteredNotes = notes.filter(note =>
    (note.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 animate-slide-down">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">My Notes</h1>
            <p className="text-muted-foreground mt-1">Capture your trading insights</p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="gap-2 hover:scale-105 transition-all shadow-lg hover:shadow-xl hover:shadow-primary/20">
            <Plus className="h-4 w-4" />
            Add Note
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Notes List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.length === 0 ? (
            <div className="col-span-full text-center py-16 animate-fade-in">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                <Plus className="h-10 w-10 text-primary" />
              </div>
              <p className="text-muted-foreground text-lg">No notes yet. Click "Add Note" to create your first one!</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="col-span-full text-center py-16 animate-fade-in">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                <Search className="h-10 w-10 text-primary" />
              </div>
              <p className="text-muted-foreground text-lg">No notes found matching "{searchQuery}"</p>
            </div>
          ) : (
            filteredNotes.map((note, index) => (
              <Card
                key={note.id}
                className="animate-fade-in hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-2 line-clamp-1">{note.title || "Untitled Note"}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-4 line-clamp-3">{note.content}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingNote(note)}
                        className="gap-2 hover:scale-110 transition-all"
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingNote(note);
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
                        onClick={() => deleteNote(note.id)}
                        className="gap-2 hover:scale-110 transition-all"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <NoteForm
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingNote(null);
        }}
        onSave={editingNote ? handleEditNote : handleAddNote}
        initialTitle={editingNote?.title}
        initialContent={editingNote?.content}
        mode={editingNote ? "edit" : "add"}
      />

      <NoteViewModal
        note={viewingNote}
        open={!!viewingNote}
        onClose={() => setViewingNote(null)}
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

export default Notes;
