import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ref, push, remove, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { useChallenge } from "@/contexts/ChallengeContext";
import { useData } from "@/contexts/DataContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import {
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Archive,
  ChevronDown,
  Wallet,
  Target,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import UndoToast from "@/components/UndoToast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTotpVerification } from "@/hooks/useTotpVerification";
import { TotpVerificationModal } from "@/components/TotpVerificationModal";
import { cn } from "@/lib/utils";

interface Challenge {
  id: string;
  name: string;
  createdAt: string;
  openingBalance: number;
  currentBalance?: number;
}

const Home = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { setSelectedChallenge } = useChallenge();
  const { challenges, loading: dataLoading, updateLocalChallenges } = useData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newChallengeName, setNewChallengeName] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [isBreachedOpen, setIsBreachedOpen] = useState(false);

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

  const handleCreateChallenge = async () => {
    if (!user) return;
    if (!newChallengeName.trim()) {
      toast.error("Please enter a challenge name");
      return;
    }
    if (!openingBalance.trim() || isNaN(Number(openingBalance))) {
      toast.error("Please enter a valid opening balance");
      return;
    }

    try {
      const challengesRef = ref(db, `users/${user.uid}/challenges`);
      await push(challengesRef, {
        name: newChallengeName,
        openingBalance: Number(openingBalance),
        createdAt: new Date().toISOString(),
      });
      toast.success("Challenge created successfully");
      setNewChallengeName("");
      setOpeningBalance("");
      setIsDialogOpen(false);
    } catch (error) {
      toast.error("Failed to create challenge");
    }
  };

  const handleAchiveChallenge = async (challengeId: string) => {
    if (!user) return;

    const performAchive = async () => {
      try {
        const challengeRef = ref(db, `users/${user.uid}/challenges/${challengeId}`);
        await update(challengeRef, { status: "Achive" });
        updateLocalChallenges(challenges.filter((c) => c.id !== challengeId));
        toast.success("Challenge archived successfully");
      } catch (error) {
        toast.error("Failed to archive challenge");
      }
    };

    requireVerification(performAchive);
  };

  const handleDeleteChallenge = async (challengeId: string) => {
    if (!user) return;

    const performDelete = async () => {
      const challengeToDelete = challenges.find((c) => c.id === challengeId);
      if (!challengeToDelete) return;

      updateLocalChallenges(challenges.filter((c) => c.id !== challengeId));

      let isUndone = false;
      
      const toastId = toast(
        <UndoToast
          message="Challenge deleted"
          onUndo={() => {
            isUndone = true;
            toast.dismiss(toastId);
            updateLocalChallenges([...challenges.filter((c) => c.id !== challengeId), challengeToDelete]);
            toast.success("Challenge restored");
          }}
        />,
        { duration: 10000 }
      );

      setTimeout(async () => {
        if (!isUndone) {
          try {
            const challengeRef = ref(db, `users/${user.uid}/challenges/${challengeId}`);
            await remove(challengeRef);
          } catch (error) {
            updateLocalChallenges([...challenges.filter((c) => c.id !== challengeId), challengeToDelete]);
            toast.error("Failed to delete challenge");
          }
        }
      }, 10000);
    };

    requireVerification(performDelete);
  };

  const handleSelectChallenge = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    navigate("/dashboard");
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <div className="absolute inset-0 w-12 h-12 rounded-full bg-primary/20 blur-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const activeChallenges = challenges.filter(c => c.status !== "Achive");
  const archivedChallenges = challenges.filter(c => c.status === "Achive");

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-fade-in">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-2">
              My Challenges
            </h1>
            <p className="text-muted-foreground">
              Track your trading journey and performance
            </p>
          </div>
          <Button
            onClick={() => setIsDialogOpen(true)}
            size="lg"
            className="gap-2 shadow-lg hover:shadow-glow-primary"
          >
            <Plus className="h-5 w-5" />
            New Challenge
          </Button>
        </div>

        {/* Active Challenges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {activeChallenges.length === 0 ? (
            <div className="col-span-full">
              <Card className="border-dashed border-2 border-border/50 bg-card/30 hover:border-primary/30 hover:bg-card/50 transition-all duration-300">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-gradient-primary rounded-2xl blur-xl opacity-30" />
                    <div className="relative bg-gradient-primary p-4 rounded-2xl">
                      <Target className="h-8 w-8 text-primary-foreground" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No active challenges</h3>
                  <p className="text-muted-foreground text-center max-w-sm mb-6">
                    Start your trading journey by creating your first challenge
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Challenge
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            activeChallenges.map((challenge, index) => {
              const profitLoss = (challenge.currentBalance || challenge.openingBalance) - challenge.openingBalance - challenge.totalFees;
              const profitLossPercent = ((profitLoss / challenge.openingBalance) * 100).toFixed(2);
              const isProfit = profitLoss >= 0;

              return (
                <Card
                  key={challenge.id}
                  onClick={() => handleSelectChallenge(challenge)}
                  className={cn(
                    "card-interactive group overflow-hidden",
                    "animate-scale-in"
                  )}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {/* Top accent gradient */}
                  <div className="h-1 bg-gradient-primary" />

                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-start justify-between">
                      <span className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors truncate pr-2">
                        {challenge.name}
                      </span>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Balance Display */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1 p-3 rounded-xl bg-muted/50 border border-border/30">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                          <Wallet className="h-3.5 w-3.5" />
                          Opening
                        </div>
                        <div className="text-base font-bold font-mono">
                          ${challenge.openingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="space-y-1 p-3 rounded-xl bg-muted/50 border border-border/30">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                          <DollarSign className="h-3.5 w-3.5" />
                          Current
                        </div>
                        <div className={cn(
                          "text-base font-bold font-mono",
                          isProfit ? "text-profit" : "text-loss"
                        )}>
                          ${((challenge.currentBalance || challenge.openingBalance) - challenge.totalFees).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    {/* Performance Badge */}
                    <div className={cn(
                      "flex items-center justify-between p-3 rounded-xl",
                      isProfit ? "bg-profit/10 border border-profit/20" : "bg-loss/10 border border-loss/20"
                    )}>
                      <div className="flex items-center gap-2">
                        {isProfit ? (
                          <TrendingUp className="h-4 w-4 text-profit" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-loss" />
                        )}
                        <span className="text-xs font-medium text-muted-foreground">Performance</span>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          "text-sm font-bold font-mono",
                          isProfit ? "text-profit" : "text-loss"
                        )}>
                          {isProfit ? "+" : ""}{profitLossPercent}%
                        </div>
                        <div className={cn(
                          "text-xs font-medium font-mono",
                          isProfit ? "text-profit/70" : "text-loss/70"
                        )}>
                          {isProfit ? "+" : ""}${Math.abs(profitLoss).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-border/30 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(challenge.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleAchiveChallenge(challenge.id); }}
                          className="h-8 px-2 text-muted-foreground hover:text-foreground"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleDeleteChallenge(challenge.id); }}
                          className="h-8 px-2 text-muted-foreground hover:text-destructive"
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

        {/* Archived Challenges */}
        {archivedChallenges.length > 0 && (
          <Collapsible open={isBreachedOpen} onOpenChange={setIsBreachedOpen} className="mt-12">
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center gap-3 mb-6 group cursor-pointer">
                <div className="h-px flex-1 bg-border/30" />
                <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  <Archive className="h-4 w-4" />
                  Breached Accounts
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                    {archivedChallenges.length}
                  </span>
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isBreachedOpen && "rotate-180"
                  )} />
                </span>
                <div className="h-px flex-1 bg-border/30" />
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {archivedChallenges.map((challenge, index) => {
                  const profitLoss = (challenge.currentBalance || challenge.openingBalance) - challenge.openingBalance - challenge.totalFees;
                  const profitLossPercent = ((profitLoss / challenge.openingBalance) * 100).toFixed(2);
                  const isProfit = profitLoss >= 0;

                  return (
                    <Card
                      key={challenge.id}
                      onClick={() => handleSelectChallenge(challenge)}
                      className="card-interactive opacity-60 hover:opacity-80"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="h-1 bg-muted" />
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-start justify-between">
                          <span className="text-lg font-semibold text-muted-foreground truncate pr-2">
                            {challenge.name}
                          </span>
                          <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground flex-shrink-0">
                            Archived
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1 p-3 rounded-xl bg-muted/30 border border-border/20">
                            <div className="text-xs text-muted-foreground font-medium">Opening</div>
                            <div className="text-base font-bold font-mono text-muted-foreground">
                              ${challenge.openingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                          <div className="space-y-1 p-3 rounded-xl bg-muted/30 border border-border/20">
                            <div className="text-xs text-muted-foreground font-medium">Final</div>
                            <div className={cn(
                              "text-base font-bold font-mono",
                              isProfit ? "text-profit/60" : "text-loss/60"
                            )}>
                              ${((challenge.currentBalance || challenge.openingBalance) - challenge.totalFees).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-border/20 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {new Date(challenge.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleDeleteChallenge(challenge.id); }}
                            className="h-8 px-2 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      {/* Create Challenge Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl gradient-text">Create New Challenge</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Challenge Name</label>
              <Input
                placeholder="e.g., 30-Day Trading Challenge"
                value={newChallengeName}
                onChange={(e) => setNewChallengeName(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Opening Balance</label>
              <Input
                type="number"
                placeholder="e.g., 10000"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateChallenge()}
                className="h-11"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => { setIsDialogOpen(false); setNewChallengeName(""); setOpeningBalance(""); }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateChallenge}>
                Create Challenge
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TotpVerificationModal
        open={isVerificationRequired}
        onClose={cancelVerification}
        onVerify={handleVerificationSuccess}
        title="Verify Action"
        description="Enter your 6-digit code to confirm"
      />
    </div>
  );
};

export default Home;
