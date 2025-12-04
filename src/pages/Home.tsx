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
  DollarSign,
  Archive,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTotpVerification } from "@/hooks/useTotpVerification";
import { TotpVerificationModal } from "@/components/TotpVerificationModal";

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
    console.log("Achive challenge clicked:", challengeId);
    if (!user) {
      console.log("No user found");
      return;
    }

    const performAchive = async () => {
      console.log("Performing Achive for challenge:", challengeId);
      try {
        const challengeRef = ref(
          db,
          `users/${user.uid}/challenges/${challengeId}`
        );
        await update(challengeRef, {
          status: "Achive",
        });
        console.log("Challenge Achive successfully");
        // Optimistic UI update
        updateLocalChallenges(challenges.filter((c) => c.id !== challengeId));
        toast.success("Challenge Achive successfully");
      } catch (error) {
        console.error("Failed to Achive challenge:", error);
        toast.error("Failed to Achive challenge");
      }
    };

    console.log("Checking TOTP verification requirement");
    requireVerification(performAchive);
  };

  const handleDeleteChallenge = async (challengeId: string) => {
    console.log("Delete challenge clicked:", challengeId);
    if (!user) {
      console.log("No user found");
      return;
    }

    const performDelete = async () => {
      console.log("Performing delete for challenge:", challengeId);
      try {
        const challengeRef = ref(
          db,
          `users/${user.uid}/challenges/${challengeId}`
        );
        await remove(challengeRef);
        console.log("Challenge deleted successfully");
        // Optimistic UI update
        updateLocalChallenges(challenges.filter((c) => c.id !== challengeId));
        toast.success("Challenge deleted successfully");
      } catch (error) {
        console.error("Failed to delete challenge:", error);
        toast.error("Failed to delete challenge");
      }
    };

    console.log("Checking TOTP verification requirement");
    requireVerification(performDelete);
  };

  const handleSelectChallenge = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    navigate("/dashboard");
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-slide-down">
          <div>
            <h1 className="text-4xl font-bold mb-2 gradient-text">
              My Challenges
            </h1>
            <p className="text-muted-foreground text-lg">
              Select a challenge to view your trading journey
            </p>
          </div>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="gap-2 bg-gradient-primary hover:shadow-glow-primary hover:scale-105 transition-all duration-300 shadow-premium h-12 px-6 text-base font-semibold"
          >
            <Plus className="h-5 w-5" />
            Create Challenge
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {challenges.length === 0 ? (
            <div className="col-span-full text-center py-12 animate-scale-in">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-primary mb-4 shadow-glow-primary">
                <Plus className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-1">
                No challenges yet
              </h3>
              <p className="text-muted-foreground text-xs max-w-md mx-auto">
                Start your trading journey by creating your first challenge
              </p>
            </div>
          ) : (
            challenges.map((challenge, index) => {
              const profitLoss =
                (challenge.currentBalance || challenge.openingBalance) -
                challenge.openingBalance -
                challenge.totalFees;
              const profitLossPercent = (
                (profitLoss / challenge.openingBalance) *
                100
              ).toFixed(2);
              const isProfit = profitLoss >= 0;

              return (
                <Card
                  key={challenge.id}
                  onClick={() => handleSelectChallenge(challenge)}
                  className="animate-scale-in hover-lift cursor-pointer group glass-premium border overflow-hidden relative"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <span
                    className={
                      challenge.status === "Achive"
                        ? "blur-[0.5px] opacity-50"
                        : ""
                    }
                  >
                    {/* Gradient accent bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary" />

                    {/* Floating gradient orb */}
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-primary opacity-10 rounded-full blur-3xl" />

                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-start justify-between gap-2">
                        <span className="gradient-text text-xl leading-tight font-semibold">
                          {challenge.name}
                        </span>
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Balance cards */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gradient-to-br from-muted/80 to-muted/40 rounded-lg p-3 space-y-1.5 border border-border/30">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                            <DollarSign className="h-3.5 w-3.5" />
                            Opening
                          </div>
                          <div className="text-lg font-bold">
                            $
                            {challenge.openingBalance.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-muted/80 to-muted/40 rounded-lg p-3 space-y-1.5 border border-border/30">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                            <TrendingUp className="h-3.5 w-3.5" />
                            Current
                          </div>
                          <div
                            className={`text-lg font-bold ${
                              isProfit ? "text-profit" : "text-loss"
                            }`}
                          >
                            $
                            {(
                              (challenge.currentBalance ||
                                challenge.openingBalance) - challenge.totalFees
                            ).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Performance badge */}
                      <div
                        className={`rounded-lg p-3 ${
                          isProfit
                            ? "bg-profit/10 border border-profit/30"
                            : "bg-loss/10 border border-loss/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Performance
                          </span>
                          <div className="text-right">
                            <div
                              className={`text-base font-bold ${
                                isProfit ? "text-profit" : "text-loss"
                              }`}
                            >
                              {isProfit ? "+" : ""}
                              {profitLossPercent}%
                            </div>
                            <div
                              className={`text-xs font-medium ${
                                isProfit ? "text-profit/80" : "text-loss/80"
                              }`}
                            >
                              {isProfit ? "+" : ""}$
                              {Math.abs(profitLoss).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Created{" "}
                          {new Date(challenge.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </span>

                        {challenge.status !== "Achive" && (
  <span>
    <Button
      variant="ghost"
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        handleAchiveChallenge(challenge.id);
      }}
      className="gap-2"
      title="Archive challenge"
      aria-label={`Archive ${challenge.name}`}
    >
      <Archive className="h-4 w-4" />
      Close
    </Button>
  </span>
)}


                        {challenge.status !== "Achive" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteChallenge(challenge.id);
                            }}
                            className="gap-2"
                            title="Delete challenge"
                            aria-label={`Delete ${challenge.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </span>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-strong border-2 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl gradient-text">
              Create New Challenge
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Challenge Name</label>
              <Input
                placeholder="e.g., 30-Day Trading Challenge"
                value={newChallengeName}
                onChange={(e) => setNewChallengeName(e.target.value)}
                className="border-2 focus:border-primary/50"
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
                className="border-2 focus:border-primary/50"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsDialogOpen(false);
                  setNewChallengeName("");
                  setOpeningBalance("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateChallenge}
                className="bg-gradient-primary hover:shadow-glow-primary"
              >
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
        title="Verify to Delete Challenge"
        description="Enter your 6-digit code to confirm deletion"
      />
    </div>
  );
};

export default Home;
