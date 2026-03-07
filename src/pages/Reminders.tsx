import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, Edit, CalendarPlus, Loader2, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AddReminderModal } from "@/components/AddReminderModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { format } from "date-fns";

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

const Reminders = () => {
  const { user, loading, getAccessToken, refreshAccessToken } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CalendarEvent | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/");
  }, [user, loading, navigate]);

  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      let token = await getAccessToken();
      if (!token) {
        setLoadingEvents(false);
        return;
      }

      const now = new Date().toISOString();
      const maxDate = new Date();
      maxDate.setMonth(maxDate.getMonth() + 3);

      const makeRequest = async (t: string) => {
        return fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(now)}&timeMax=${encodeURIComponent(maxDate.toISOString())}&maxResults=50&singleEvents=true&orderBy=startTime`,
          { headers: { Authorization: `Bearer ${t}` } }
        );
      };

      let response = await makeRequest(token);

      // Retry with fresh token on auth failure
      if (response.status === 401 || response.status === 403) {
        const freshToken = await refreshAccessToken();
        if (!freshToken) {
          toast.error("Could not access Google Calendar. Please sign in again.");
          setLoadingEvents(false);
          return;
        }
        token = freshToken;
        response = await makeRequest(freshToken);
      }

      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }

      const data = await response.json();
      setEvents(data.items || []);
    } catch (error) {
      console.error("Failed to fetch events:", error);
      toast.error("Failed to load reminders");
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (user) fetchEvents();
  }, [user]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      let token = await getAccessToken();
      if (!token) {
        toast.error("Please sign in again");
        return;
      }

      const makeRequest = async (t: string) => {
        return fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${confirmDelete.id}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${t}` } }
        );
      };

      let response = await makeRequest(token);

      if (response.status === 401 || response.status === 403) {
        const freshToken = await refreshAccessToken();
        if (!freshToken) {
          toast.error("Could not access Google Calendar.");
          return;
        }
        response = await makeRequest(freshToken);
      }

      if (!response.ok && response.status !== 204) {
        throw new Error("Failed to delete event");
      }

      setEvents((prev) => prev.filter((e) => e.id !== confirmDelete.id));
      toast.success("Reminder deleted");
      setConfirmDelete(null);
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete reminder");
    } finally {
      setDeleting(false);
    }
  };

  const handleEditClick = (event: CalendarEvent) => {
    setEditingEvent(event);
    setIsFormOpen(true);
  };

  const handleModalClose = () => {
    setIsFormOpen(false);
    setEditingEvent(null);
  };

  const handleSaveSuccess = () => {
    handleModalClose();
    fetchEvents(); // Refresh the list
  };

  const formatEventDate = (event: CalendarEvent) => {
    const dateStr = event.start.dateTime || event.start.date;
    if (!dateStr) return "Unknown date";
    const d = new Date(dateStr);
    if (event.start.dateTime) {
      return format(d, "MMM d, yyyy 'at' h:mm a");
    }
    return format(d, "MMM d, yyyy");
  };

  const isEventPast = (event: CalendarEvent) => {
    const dateStr = event.start.dateTime || event.start.date;
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 animate-slide-down">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Reminders</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Your upcoming Google Calendar reminders
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchEvents}
              disabled={loadingEvents}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingEvents ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={() => setIsFormOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Reminder
            </Button>
          </div>
        </div>

        {/* Events List */}
        {loadingEvents ? (
          <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardContent className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : events.length === 0 ? (
          <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                <CalendarPlus className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Upcoming Reminders</h3>
              <p className="text-muted-foreground text-sm mb-4 max-w-sm">
                Your upcoming Google Calendar events will appear here. Click "Add Reminder" to create one.
              </p>
              <Button onClick={() => setIsFormOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Reminder
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {events.map((event, index) => (
              <Card
                key={event.id}
                className={`animate-fade-in hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card/80 backdrop-blur-sm border-border/50 hover:border-primary/30 ${
                  isEventPast(event) ? "opacity-60" : ""
                }`}
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-2 line-clamp-1">
                    {event.summary || "Untitled Event"}
                  </h3>
                  {event.description && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatEventDate(event)}</span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClick(event)}
                      className="gap-2 hover:scale-110 transition-all"
                    >
                      <Edit className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirmDelete(event)}
                      className="gap-2 hover:scale-110 transition-all"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AddReminderModal
        open={isFormOpen}
        onClose={handleModalClose}
        onSaveSuccess={handleSaveSuccess}
        editingEvent={editingEvent}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Reminder"
        description={`Are you sure you want to delete "${confirmDelete?.summary || "this reminder"}"? This will remove it from your Google Calendar.`}
      />
    </div>
  );
};

export default Reminders;
