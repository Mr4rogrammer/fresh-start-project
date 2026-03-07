import { useState } from "react";
import { useKillZones, KillZone } from "@/hooks/useKillZones";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  Plus,
  Trash2,
  Edit,
  Bell,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Convert "HH:mm" (24h) → "h:mm AM/PM" */
function to12h(time: string): string {
  const [hStr, mStr] = time.split(":");
  let h = parseInt(hStr, 10);
  const suffix = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${mStr} ${suffix}`;
}

export const KillZoneConfig = () => {
  const {
    killZones,
    activeZones,
    loading,
    addKillZone,
    updateKillZone,
    deleteKillZone,
    toggleKillZone,
  } = useKillZones();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<KillZone | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<KillZone | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formStart, setFormStart] = useState("09:00");
  const [formEnd, setFormEnd] = useState("12:00");
  const [formMessage, setFormMessage] = useState("");

  const activeIds = new Set(activeZones.map((z) => z.id));

  const openAddForm = () => {
    setEditingZone(null);
    setFormName("");
    setFormStart("09:00");
    setFormEnd("12:00");
    setFormMessage("");
    setIsFormOpen(true);
  };

  const openEditForm = (zone: KillZone) => {
    setEditingZone(zone);
    setFormName(zone.name);
    setFormStart(zone.startTime);
    setFormEnd(zone.endTime);
    setFormMessage(zone.message);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Please enter a name");
      return;
    }
    if (!formStart || !formEnd) {
      toast.error("Please set start and end times");
      return;
    }

    setSaving(true);
    try {
      if (editingZone) {
        await updateKillZone(editingZone.id, {
          name: formName.trim(),
          startTime: formStart,
          endTime: formEnd,
          message: formMessage.trim(),
        });
        toast.success("Kill zone updated");
      } else {
        await addKillZone({
          name: formName.trim(),
          startTime: formStart,
          endTime: formEnd,
          message: formMessage.trim() || `${formName.trim()} is active`,
          enabled: true,
        });
        toast.success("Kill zone added");
      }
      setIsFormOpen(false);
    } catch {
      toast.error("Failed to save kill zone");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteKillZone(confirmDelete.id);
      toast.success("Kill zone deleted");
      setConfirmDelete(null);
    } catch {
      toast.error("Failed to delete kill zone");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Kill Zone Alerts</h2>
        </div>
        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Kill Zone Alerts</h2>
          <span className="text-xs text-muted-foreground">(All times in IST)</span>
        </div>
        <Button size="sm" onClick={openAddForm} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Zone
        </Button>
      </div>

      {/* Active zone banner */}
      {activeZones.length > 0 && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <span className="font-semibold text-red-500">
                {activeZones.map((z) => z.name).join(" • ")}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 ml-5">
              {activeZones[0]?.message}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Kill Zones List */}
      <div className="grid gap-3">
        {killZones.length === 0 ? (
          <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">
                No kill zones configured. Add one to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          killZones.map((zone) => {
            const isActive = activeIds.has(zone.id);
            return (
              <Card
                key={zone.id}
                className={cn(
                  "bg-card/80 backdrop-blur-sm border-border/50 transition-all",
                  isActive && zone.enabled && "border-red-500/50 shadow-red-500/10 shadow-lg",
                  !zone.enabled && "opacity-50"
                )}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Active indicator */}
                      <div className="flex-shrink-0">
                        {isActive && zone.enabled ? (
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full h-2.5 w-2.5 bg-muted-foreground/30" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-semibold text-sm truncate",
                            isActive && zone.enabled && "text-red-500"
                          )}>
                            {zone.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs font-mono text-muted-foreground">
                            {to12h(zone.startTime)} – {to12h(zone.endTime)} IST
                          </span>
                        </div>
                        {zone.message && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {zone.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch
                        checked={zone.enabled}
                        onCheckedChange={() => toggleKillZone(zone.id)}
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEditForm(zone)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setConfirmDelete(zone)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => !open && setIsFormOpen(false)}>
        <DialogContent className="sm:max-w-[400px] glass-strong">
          <DialogHeader>
            <DialogTitle>
              {editingZone ? "Edit Kill Zone" : "Add Kill Zone"}
            </DialogTitle>
            <DialogDescription>
              Set the time window in IST. You'll get an alert when the zone becomes active.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input
                placeholder="e.g., London Kill Zone"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Start Time (IST) *</Label>
                <Input
                  type="time"
                  value={formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>End Time (IST) *</Label>
                <Input
                  type="time"
                  value={formEnd}
                  onChange={(e) => setFormEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Alert Message</Label>
              <Input
                placeholder="Message shown when zone starts..."
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingZone ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Kill Zone"
        description={`Are you sure you want to delete "${confirmDelete?.name}"?`}
      />
    </div>
  );
};
