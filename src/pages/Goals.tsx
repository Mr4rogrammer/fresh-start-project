import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useChallenge } from "@/contexts/ChallengeContext";
import { useData } from "@/contexts/DataContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  ArrowLeft,
  Target,
  Plus,
  Trash2,
  TrendingUp,
  Calendar,
  Trophy,
  Flame,
  Edit2,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { ref, get, set, remove, push } from "firebase/database";
import { db } from "@/lib/firebase";

import { cn } from "@/lib/utils";
import {
  isWithinInterval,
  parseISO,
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";

interface Goal {
  id: string;
  type: "weekly" | "monthly" | "custom";
  startDate: string;
  endDate: string;
  target: number;
  label: string;
  metric: "profit" | "trades" | "winrate";
  createdAt: string;
}

const Goals = () => {
  const { user } = useAuth();
  const { selectedChallenge } = useChallenge();
  const { getTrades } = useData();
  const navigate = useNavigate();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formMetric, setFormMetric] = useState<"profit" | "trades" | "winrate">("profit");
  const [formTarget, setFormTarget] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formStartDate, setFormStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formEndDate, setFormEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    if (user) loadGoals();
  }, [user]);

  const loadGoals = async () => {
    if (!user) return;
    try {
      const goalsRef = ref(db, `users/${user.uid}/goals`);
      const snapshot = await get(goalsRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const arr: Goal[] = Object.entries(data).map(([id, g]: [string, any]) => ({
          id,
          ...g,
        }));
        arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setGoals(arr);
      } else {
        setGoals([]);
      }
    } catch (error) {
      console.error("Error loading goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !formTarget || !formStartDate || !formEndDate) {
      toast.error("Please fill in all fields");
      return;
    }
    if (formStartDate > formEndDate) {
      toast.error("Start date must be before end date");
      return;
    }
    try {
      const goalData = {
        type: "custom" as const,
        startDate: formStartDate,
        endDate: formEndDate,
        target: Number(formTarget),
        label: formLabel || `${formMetric === "profit" ? "Profit" : formMetric === "trades" ? "Trades" : "Win Rate"} Target`,
        metric: formMetric,
        createdAt: editingGoal?.createdAt || new Date().toISOString(),
      };

      if (editingGoal) {
        await set(ref(db, `users/${user.uid}/goals/${editingGoal.id}`), goalData);
        toast.success("Goal updated");
      } else {
        await push(ref(db, `users/${user.uid}/goals`), goalData);
        toast.success("Goal created");
      }

      resetForm();
      setIsAddOpen(false);
      setEditingGoal(null);
      loadGoals();
    } catch (error) {
      console.error("Error saving goal:", error);
      toast.error("Failed to save goal");
    }
  };

  const handleDelete = async (goalId: string) => {
    if (!user) return;
    try {
      await remove(ref(db, `users/${user.uid}/goals/${goalId}`));
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
      toast.success("Goal deleted");
    } catch (error) {
      toast.error("Failed to delete goal");
    }
  };

  const openEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormMetric(goal.metric);
    setFormTarget(String(goal.target));
    setFormLabel(goal.label);
    setFormStartDate(goal.startDate || new Date().toISOString().split("T")[0]);
    setFormEndDate(goal.endDate || new Date().toISOString().split("T")[0]);
    setIsAddOpen(true);
  };

  const resetForm = () => {
    setFormMetric("profit");
    setFormTarget("");
    setFormLabel("");
    const today = new Date().toISOString().split("T")[0];
    setFormStartDate(today);
    setFormEndDate(today);
    setEditingGoal(null);
  };

  const setQuickRange = (type: "week" | "month") => {
    const now = new Date();
    if (type === "week") {
      setFormStartDate(format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"));
      setFormEndDate(format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"));
    } else {
      setFormStartDate(format(startOfMonth(now), "yyyy-MM-dd"));
      setFormEndDate(format(endOfMonth(now), "yyyy-MM-dd"));
    }
  };

  // Calculate progress for a goal based on its start/end dates
  const getProgress = (goal: Goal): { current: number; percentage: number; periodTrades: number } => {
    if (!selectedChallenge) return { current: 0, percentage: 0, periodTrades: 0 };

    const trades = getTrades(selectedChallenge.id);

    const start = parseISO(goal.startDate);
    const end = parseISO(goal.endDate);
    // Set end to end of day
    end.setHours(23, 59, 59, 999);

    const periodTrades = trades.filter((t) => {
      try {
        const d = parseISO(t.date);
        return isWithinInterval(d, { start, end });
      } catch {
        return false;
      }
    });

    let current = 0;
    if (goal.metric === "profit") {
      current = periodTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    } else if (goal.metric === "trades") {
      current = periodTrades.length;
    } else if (goal.metric === "winrate") {
      if (periodTrades.length === 0) return { current: 0, percentage: 0, periodTrades: 0 };
      const wins = periodTrades.filter((t) => t.profit > 0).length;
      current = Math.round((wins / periodTrades.length) * 100);
    }

    const percentage = goal.target > 0 ? Math.min(Math.round((current / goal.target) * 100), 100) : 0;
    return { current, percentage, periodTrades: periodTrades.length };
  };

  const formatDateRange = (goal: Goal) => {
    try {
      const s = parseISO(goal.startDate);
      const e = parseISO(goal.endDate);
      return `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`;
    } catch {
      return "";
    }
  };

  const getMetricSuffix = (metric: string) => {
    if (metric === "profit") return "$";
    if (metric === "winrate") return "%";
    return "";
  };

  const getMetricIcon = (metric: string) => {
    if (metric === "profit") return TrendingUp;
    if (metric === "trades") return Calendar;
    return Trophy;
  };

  if (!selectedChallenge) {
    return (
      <div className="min-h-screen bg-gradient-mesh">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="text-center py-16">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Challenge Selected</h2>
            <p className="text-muted-foreground mb-4">Select a challenge from the home page to set goals</p>
            <Button onClick={() => navigate("/home")}>Go to Home</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
        <div className="flex flex-col gap-4 mb-6 sm:mb-8 animate-slide-down">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="gap-2 w-fit"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1">Goals</h1>
              <p className="text-muted-foreground text-sm">
                Set targets and track your progress for {selectedChallenge.name}
              </p>
            </div>
            <Button
              onClick={() => {
                resetForm();
                setIsAddOpen(true);
              }}
              variant="gradient"
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Goal
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-semibold mb-2">No Goals Yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Set weekly or monthly targets for profit, number of trades, or win rate to stay on track.
            </p>
            <Button
              onClick={() => {
                resetForm();
                setIsAddOpen(true);
              }}
              variant="gradient"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Your First Goal
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {goals.map((goal) => {
              const { current, percentage, periodTrades } = getProgress(goal);
              const Icon = getMetricIcon(goal.metric);
              const isComplete = percentage >= 100;
              const suffix = getMetricSuffix(goal.metric);

              return (
                <Card
                  key={goal.id}
                  className={cn(
                    "bg-card/80 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all animate-fade-in",
                    isComplete && "border-profit/40 bg-profit/5"
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-lg",
                            isComplete ? "bg-profit/20" : "bg-primary/10"
                          )}
                        >
                          {isComplete ? (
                            <Trophy className="h-4.5 w-4.5 text-profit" />
                          ) : (
                            <Icon className="h-4.5 w-4.5 text-primary" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-base">{goal.label}</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            <CalendarDays className="h-3 w-3 inline mr-1" />
                            {formatDateRange(goal)} · {periodTrades} trade{periodTrades !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(goal)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(goal.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-end justify-between">
                      <div>
                        <span className="text-2xl font-bold font-mono">
                          {goal.metric === "profit" ? `$${current.toFixed(2)}` : `${current}${suffix}`}
                        </span>
                        <span className="text-sm text-muted-foreground ml-1">
                          / {goal.metric === "profit" ? `$${goal.target}` : `${goal.target}${suffix}`}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          isComplete ? "text-profit" : percentage >= 50 ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {percentage}%
                      </span>
                    </div>
                    <Progress
                      value={percentage}
                      className={cn(
                        "h-2.5",
                        isComplete && "[&>div]:bg-profit"
                      )}
                    />
                    {isComplete && (
                      <div className="flex items-center gap-1.5 text-xs text-profit font-medium">
                        <Flame className="h-3.5 w-3.5" />
                        Goal achieved!
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Add/Edit Goal Dialog */}
        <Dialog
          open={isAddOpen}
          onOpenChange={(open) => {
            if (!open) {
              resetForm();
              setEditingGoal(null);
            }
            setIsAddOpen(open);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingGoal ? "Edit Goal" : "Add Goal"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickRange("week")}
                  className="text-xs flex-1"
                >
                  This Week
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickRange("month")}
                  className="text-xs flex-1"
                >
                  This Month
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Metric</Label>
                <Select value={formMetric} onValueChange={(v) => setFormMetric(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profit">Profit ($)</SelectItem>
                    <SelectItem value="trades">Number of Trades</SelectItem>
                    <SelectItem value="winrate">Win Rate (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Target{" "}
                  {formMetric === "profit"
                    ? "($)"
                    : formMetric === "winrate"
                    ? "(%)"
                    : "(count)"}
                </Label>
                <Input
                  type="number"
                  placeholder={
                    formMetric === "profit"
                      ? "500"
                      : formMetric === "winrate"
                      ? "60"
                      : "20"
                  }
                  value={formTarget}
                  onChange={(e) => setFormTarget(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Label (optional)</Label>
                <Input
                  placeholder="e.g., March Profit Goal"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} variant="gradient" className="flex-1">
                  {editingGoal ? "Update" : "Create"} Goal
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddOpen(false);
                    resetForm();
                    setEditingGoal(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Goals;
