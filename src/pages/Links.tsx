import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ref, push, remove, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { useData } from "@/contexts/DataContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, ExternalLink, Edit } from "lucide-react";
import { toast } from "sonner";
import { LinkForm } from "@/components/LinkForm";
import { useTotpVerification } from "@/hooks/useTotpVerification";
import { TotpVerificationModal } from "@/components/TotpVerificationModal";

interface Link {
  id: string;
  title: string;
  url: string;
  createdAt: string;
}

const Links = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { links, updateLocalLinks } = useData();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  
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

  const handleAddLink = async (title: string, url: string) => {
    if (!user) {
      toast.error("You must be signed in");
      return;
    }

    const linksRef = ref(db, `users/${user.uid}/links`);
    const newRef = await push(linksRef, {
      title,
      url,
      createdAt: new Date().toISOString(),
    });
    
    // Update local state
    const newLink = {
      id: newRef.key!,
      title,
      url,
      createdAt: new Date().toISOString(),
    };
    updateLocalLinks([newLink, ...links]);
    
    toast.success("Link added successfully");
  };

  const handleEditLink = async (title: string, url: string) => {
    if (!user || !editingLink) return;

    const performEdit = async () => {
      const linkRef = ref(db, `users/${user.uid}/links/${editingLink.id}`);
      await update(linkRef, { title, url });
      
      // Update local state
      const updatedLinks = links.map(link =>
        link.id === editingLink.id ? { ...link, title, url } : link
      );
      updateLocalLinks(updatedLinks);
      
      toast.success("Link updated successfully");
      setEditingLink(null);
    };

    requireVerification(performEdit);
  };

  const deleteLink = async (linkId: string) => {
    if (!user) return;

    const performDelete = async () => {
      try {
        const linkRef = ref(db, `users/${user.uid}/links/${linkId}`);
        await remove(linkRef);
        
        // Update local state
        const updatedLinks = links.filter(link => link.id !== linkId);
        updateLocalLinks(updatedLinks);
        
        toast.success("Link deleted successfully");
      } catch (error) {
        toast.error("Failed to delete link");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 animate-slide-down">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Link Manager</h1>
            <p className="text-muted-foreground mt-1">Organize your trading resources</p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="gap-2 hover:scale-105 transition-all shadow-lg hover:shadow-xl hover:shadow-primary/20">
            <Plus className="h-4 w-4" />
            Add Link
          </Button>
        </div>

        {/* Links List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {links.length === 0 ? (
            <div className="col-span-full text-center py-16 animate-fade-in">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                <Plus className="h-10 w-10 text-primary" />
              </div>
              <p className="text-muted-foreground text-lg">No links yet. Click "Add Link" to create your first one!</p>
            </div>
          ) : (
            links.map((link, index) => (
              <Card
                key={link.id}
                className="animate-fade-in hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3
                      className="font-semibold text-lg flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                      onClick={() => window.open(link.url, "_blank")}
                    >
                      {link.title}
                      <ExternalLink className="h-4 w-4 text-primary" />
                    </h3>
                  </div>
                  <p
                    className="text-sm text-muted-foreground mb-4 truncate cursor-pointer"
                    onClick={() => window.open(link.url, "_blank")}
                  >
                    {link.url}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {new Date(link.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingLink(link);
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
                        onClick={() => deleteLink(link.id)}
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

      <LinkForm
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingLink(null);
        }}
        onSave={editingLink ? handleEditLink : handleAddLink}
        initialTitle={editingLink?.title}
        initialUrl={editingLink?.url}
        mode={editingLink ? "edit" : "add"}
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

export default Links;
