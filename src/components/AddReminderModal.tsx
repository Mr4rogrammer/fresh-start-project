import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarPlus, Loader2, Edit } from "lucide-react";
import { toast } from "sonner";

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

interface AddReminderModalProps {
  open: boolean;
  onClose: () => void;
  onSaveSuccess?: () => void;
  editingEvent?: CalendarEvent | null;
}

export const AddReminderModal = ({ open, onClose, onSaveSuccess, editingEvent }: AddReminderModalProps) => {
  const { getAccessToken, refreshAccessToken } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [saving, setSaving] = useState(false);

  const isEditing = !!editingEvent;

  // Populate form when editing
  useEffect(() => {
    if (editingEvent && open) {
      setTitle(editingEvent.summary || "");
      setDescription(editingEvent.description || "");

      const dateStr = editingEvent.start.dateTime || editingEvent.start.date;
      if (dateStr) {
        const d = new Date(dateStr);
        setDate(d.toISOString().split("T")[0]);
        if (editingEvent.start.dateTime) {
          setTime(d.toTimeString().slice(0, 5));
        }
      }
    }
  }, [editingEvent, open]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDate("");
    setTime("09:00");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please enter a reminder title");
      return;
    }
    if (!date) {
      toast.error("Please select a date");
      return;
    }

    setSaving(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast.error("Please sign in again to manage reminders");
        return;
      }

      // Combine date and time into ISO format
      const startDateTime = new Date(`${date}T${time}:00`);
      const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000); // 30 min duration

      const event = {
        summary: title.trim(),
        description: description.trim() || undefined,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "popup", minutes: 10 },
            { method: "popup", minutes: 0 },
          ],
        },
      };

      let tokenToUse = accessToken;

      const sendRequest = async (token: string) => {
        const url = isEditing
          ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${editingEvent!.id}`
          : "https://www.googleapis.com/calendar/v3/calendars/primary/events";

        return fetch(url, {
          method: isEditing ? "PUT" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        });
      };

      let response = await sendRequest(tokenToUse);

      // If auth failed, refresh token and retry once
      if (response.status === 401 || response.status === 403) {
        const freshToken = await refreshAccessToken();
        if (!freshToken) {
          toast.error("Could not get Calendar access. A sign-in popup should appear — please allow access.");
          return;
        }
        tokenToUse = freshToken;
        response = await sendRequest(freshToken);
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `Failed to ${isEditing ? "update" : "create"} reminder`);
      }

      toast.success(isEditing ? "Reminder updated!" : "Reminder added to Google Calendar!");

      if (onSaveSuccess) {
        onSaveSuccess();
      } else {
        handleClose();
      }
    } catch (error: any) {
      console.error(`Failed to ${isEditing ? "update" : "add"} reminder:`, error);
      toast.error(error.message || `Failed to ${isEditing ? "update" : "add"} reminder`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px] glass-strong">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <Edit className="h-5 w-5 text-primary" />
            ) : (
              <CalendarPlus className="h-5 w-5 text-primary" />
            )}
            {isEditing ? "Edit Reminder" : "Add Reminder"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this reminder in your Google Calendar"
              : "Create a reminder in your Google Calendar"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reminder-title">Title *</Label>
            <Input
              id="reminder-title"
              placeholder="e.g., Check EUR/USD setup"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reminder-description">Description</Label>
            <Textarea
              id="reminder-description"
              placeholder="Optional notes for the reminder..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="reminder-date">Date *</Label>
              <Input
                id="reminder-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reminder-time">Time</Label>
              <Input
                id="reminder-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : isEditing ? (
              <Edit className="h-4 w-4 mr-2" />
            ) : (
              <CalendarPlus className="h-4 w-4 mr-2" />
            )}
            {isEditing ? "Update Reminder" : "Add Reminder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
