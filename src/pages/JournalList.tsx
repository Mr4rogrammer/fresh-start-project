import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useChallenge } from "@/contexts/ChallengeContext";
import { useData } from "@/contexts/DataContext";
import { Journal, TRADE_EMOTIONS, JOURNAL_ENTRY_TYPES } from "@/types/trade";
import { Navbar } from "@/components/Navbar";
import { AddJournalModal } from "@/components/AddJournalModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ImageIcon, Edit, Trash2, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { ImageViewerModal } from "@/components/ImageViewerModal";
import { ref, update, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { deleteFromGoogleDrive } from "@/lib/googleDrive";

const JournalList = () => {
  const { user, loading, getAccessToken } = useAuth();
  const navigate = useNavigate();
  const { selectedChallenge } = useChallenge();
  const { getJournals, updateLocalJournals } = useData();
  const [filteredJournals, setFilteredJournals] = useState<Journal[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [emotionFilter, setEmotionFilter] = useState<string>("all");
  const [entryTypeFilter, setEntryTypeFilter] = useState<string>("all");
  const [viewingImage, setViewingImage] = useState<{ fileId?: string; url?: string; title?: string } | null>(null);
  const [editingJournal, setEditingJournal] = useState<Journal | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Journal | null>(null);

  useEffect(() => { if (!loading && !user) navigate("/"); }, [user, loading, navigate]);
  useEffect(() => { if (!selectedChallenge) navigate("/home"); }, [selectedChallenge, navigate]);

  const journals = selectedChallenge ? getJournals(selectedChallenge.id) : [];

  useEffect(() => { setFilteredJournals(journals); }, [journals]);

  useEffect(() => {
    let filtered = [...journals];
    if (dateRange?.from) {
      const from = dateRange.from, to = dateRange.to || dateRange.from;
      filtered = filtered.filter(j => { const d = new Date(j.date); return d >= from && d <= to; });
    }
    if (emotionFilter !== "all") filtered = filtered.filter(j => j.emotion === emotionFilter);
    if (entryTypeFilter !== "all") filtered = filtered.filter(j => j.entryType === entryTypeFilter);
    setFilteredJournals(filtered);
  }, [journals, dateRange, emotionFilter, entryTypeFilter]);

  const clearFilters = () => { setDateRange(undefined); setEmotionFilter("all"); setEntryTypeFilter("all"); };

  const handleSaveJournal = async (journal: Omit<Journal, 'id' | 'createdAt'>) => {
    if (!user || !selectedChallenge || !editingJournal?.id) return;
    try {
      const updated = { ...journal, createdAt: editingJournal.createdAt };
      const journalRef = ref(db, `users/${user.uid}/challenges/${selectedChallenge.id}/journals/${editingJournal.id}`);
      await update(journalRef, updated);
      const updatedJournals = journals.map(j => j.id === editingJournal.id ? { ...updated, id: editingJournal.id } as Journal : j);
      updateLocalJournals(selectedChallenge.id, updatedJournals);
      toast.success("Journal updated");
      setEditingJournal(null);
    } catch { toast.error("Failed to update journal"); }
  };

  const handleDeleteJournal = async (journal: Journal) => {
    if (!user || !selectedChallenge || !journal.id) return;
    try {
      const journalRef = ref(db, `users/${user.uid}/challenges/${selectedChallenge.id}/journals/${journal.id}`);
      await remove(journalRef);
      if (journal.screenshotFileId) {
        try { const tok = await getAccessToken(); if (tok) await deleteFromGoogleDrive(tok, journal.screenshotFileId); } catch {}
      }
      updateLocalJournals(selectedChallenge.id, journals.filter(j => j.id !== journal.id));
      toast.success("Journal entry deleted");
    } catch { toast.error("Failed to delete journal entry"); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Journal List</h1>
            <p className="text-muted-foreground text-sm mt-1">Review and manage your trading journal entries</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 p-4 bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50">
          <div className="col-span-2 sm:col-span-1">
            <label className="text-xs font-medium mb-1 block">Date Range</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-xs h-9", !dateRange && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd")}` : format(dateRange.from, "LLL dd, y")) : "Pick dates"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={1} className="pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Entry Type</label>
            <Select value={entryTypeFilter} onValueChange={setEntryTypeFilter}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {JOURNAL_ENTRY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.emoji} {t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Emotion</label>
            <Select value={emotionFilter} onValueChange={setEmotionFilter}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {TRADE_EMOTIONS.map(e => <SelectItem key={e.value} value={e.value}>{e.emoji} {e.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={clearFilters} variant="outline" className="w-full h-9 text-xs">Clear</Button>
          </div>
        </div>

        <div className="mb-3">
          <p className="text-xs text-muted-foreground">Showing {filteredJournals.length} of {journals.length} entries</p>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {filteredJournals.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border border-dashed border-border/50 flex flex-col items-center gap-3">
              <BookOpen className="h-10 w-10 opacity-30" />
              <p>No journal entries found</p>
            </div>
          ) : filteredJournals.map((journal) => {
            const em = TRADE_EMOTIONS.find(e => e.value === journal.emotion);
            const et = JOURNAL_ENTRY_TYPES.find(t => t.value === journal.entryType);
            return (
              <div key={journal.id} className="bg-card rounded-lg border border-blue-500/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{journal.date}</span>
                  <div className="flex items-center gap-1.5">
                    {et && <span className="text-xs px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground">{et.emoji} {et.label}</span>}
                    {em && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">{em.emoji} {em.label}</span>}
                  </div>
                </div>
                {journal.notes && <p className="text-xs text-muted-foreground line-clamp-2">{journal.notes}</p>}
                <div className="flex items-center gap-2 pt-1 border-t border-border/30">
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => { setEditingJournal(journal); setIsEditModalOpen(true); }}>
                    <Edit className="h-3 w-3" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-loss hover:text-loss" onClick={() => setConfirmDelete(journal)}>
                    <Trash2 className="h-3 w-3" /> Delete
                  </Button>
                  {(journal.screenshotFileId || journal.screenshotUrl) && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-profit ml-auto" onClick={() => setViewingImage({ fileId: journal.screenshotFileId, url: journal.screenshotUrl, title: `Journal - ${journal.date}` })}>
                      <ImageIcon className="h-3 w-3" /> Image
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block border rounded-xl overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Emotion</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-16 text-center">Img</TableHead>
                <TableHead className="w-20 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJournals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                    <div className="flex flex-col items-center gap-3">
                      <BookOpen className="h-10 w-10 opacity-30" />
                      <p>No journal entries found. Add entries from the calendar.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredJournals.map((journal) => {
                const em = TRADE_EMOTIONS.find(e => e.value === journal.emotion);
                const et = JOURNAL_ENTRY_TYPES.find(t => t.value === journal.entryType);
                return (
                  <TableRow key={journal.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="text-sm">{journal.date}</TableCell>
                    <TableCell>
                      {et ? (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-muted/60 text-muted-foreground">{et.emoji} {et.label}</span>
                      ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {em ? (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-400">{em.emoji} {em.label}</span>
                      ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="max-w-xl">
                      <p className="truncate text-sm text-muted-foreground">{journal.notes || "-"}</p>
                    </TableCell>
                    <TableCell className="text-center">
                      {(journal.screenshotFileId || journal.screenshotUrl) ? (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-profit hover:text-profit hover:bg-profit/10" onClick={() => setViewingImage({ fileId: journal.screenshotFileId, url: journal.screenshotUrl, title: `Journal - ${journal.date}` })}>
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                      ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingJournal(journal); setIsEditModalOpen(true); }}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-loss/70 hover:text-loss" onClick={() => setConfirmDelete(journal)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <AddJournalModal
        open={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditingJournal(null); }}
        onSave={handleSaveJournal}
        editingJournal={editingJournal}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDeleteJournal(confirmDelete)}
        title="Delete Journal Entry"
        description={`Are you sure you want to delete the journal entry from ${confirmDelete?.date}? This cannot be undone.`}
        confirmLabel="Delete Entry"
      />

      <ImageViewerModal
        open={!!viewingImage}
        onClose={() => setViewingImage(null)}
        fileId={viewingImage?.fileId}
        imageUrl={viewingImage?.url}
        title={viewingImage?.title}
      />
    </div>
  );
};

export default JournalList;
