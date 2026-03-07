import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ref, push, remove, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { deleteFromGoogleDrive } from "@/lib/googleDrive";
import { useChallenge } from "@/contexts/ChallengeContext";
import { useData } from "@/contexts/DataContext";
import { Trade, DayData, Journal } from "@/types/trade";
import { CalendarDay } from "@/components/CalendarDay";
import { TradeModal } from "@/components/TradeModal";
import { AddTradeModal } from "@/components/AddTradeModal";
import { AddJournalModal } from "@/components/AddJournalModal";
import { AddEntryDialog } from "@/components/AddEntryDialog";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Calendar, RefreshCw, Plus, BookOpen, AlertTriangle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { sendTelegramNotification } from "@/lib/telegram";
import UndoToast from "@/components/UndoToast";
import { useTotpVerification } from "@/hooks/useTotpVerification";
import { TotpVerificationModal } from "@/components/TotpVerificationModal";
import { cn } from "@/lib/utils";
import { useCurrency, SUPPORTED_CURRENCIES } from "@/hooks/useCurrency";
import { useTradingRules, checkRules, RuleViolation } from "@/hooks/useTradingRules";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertTriangle as RuleWarningIcon } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading, getAccessToken } = useAuth();
  const { selectedChallenge } = useChallenge();
  const { getTrades, getJournals, updateLocalTrades, updateLocalJournals } = useData();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [editingJournal, setEditingJournal] = useState<Journal | null>(null);

  const {
    currency,
    setCurrency,
    refreshingRate,
    fetchExchangeRates,
    currentCurrencyInfo,
    currentRate,
    fmt,
    fmtSigned,
  } = useCurrency();

  const {
    isVerificationRequired,
    requireVerification,
    handleVerificationSuccess,
    cancelVerification,
  } = useTotpVerification();

  const { rules } = useTradingRules();
  const [ruleViolations, setRuleViolations] = useState<RuleViolation[]>([]);
  const [ruleWarningOpen, setRuleWarningOpen] = useState(false);
  const [pendingTradeDate, setPendingTradeDate] = useState<string | null>(null);
  const overtradeAlertSentRef = useRef<string | null>(null); // tracks which date we already sent Telegram for

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!selectedChallenge) {
      navigate("/home");
    }
  }, [selectedChallenge, navigate]);

  const trades = selectedChallenge ? getTrades(selectedChallenge.id) : [];
  const journals = selectedChallenge ? getJournals(selectedChallenge.id) : [];

  const addJournal = async (journal: Omit<Journal, 'id' | 'createdAt'>) => {
    if (!user || !selectedChallenge) return;

    try {
      const newJournal = { ...journal, createdAt: new Date().toISOString() };

      if (editingJournal?.id) {
        const journalRef = ref(db, `users/${user.uid}/challenges/${selectedChallenge.id}/journals/${editingJournal.id}`);
        await update(journalRef, newJournal);
        const updatedJournals = journals.map(j => j.id === editingJournal.id ? { ...newJournal, id: editingJournal.id } as Journal : j);
        updateLocalJournals(selectedChallenge.id, updatedJournals);
        toast.success("Journal updated");
      } else {
        const journalsRef = ref(db, `users/${user.uid}/challenges/${selectedChallenge.id}/journals`);
        const newRef = await push(journalsRef, newJournal);
        const updatedJournals = [{ ...newJournal, id: newRef.key!, createdAt: newJournal.createdAt } as Journal, ...journals];
        updateLocalJournals(selectedChallenge.id, updatedJournals);
        toast.success("Journal entry added");
      }
      setEditingJournal(null);
    } catch (error) {
      toast.error("Failed to save journal");
    }
  };

  const addTrade = async (trade: Omit<Trade, 'id' | 'createdAt'>) => {
    if (!user || !selectedChallenge) return;

    const performSave = async () => {
      try {
        const newTrade = { ...trade, createdAt: new Date().toISOString() };

        if (editingTrade?.id) {
          const tradeRef = ref(db, `users/${user.uid}/challenges/${selectedChallenge.id}/trades/${editingTrade.id}`);
          await update(tradeRef, newTrade);
          const updatedTrades = trades.map(t => t.id === editingTrade.id ? { ...newTrade, id: editingTrade.id } as Trade : t);
          updateLocalTrades(selectedChallenge.id, updatedTrades);
          toast.success("Trade updated");
        } else {
          const tradesRef = ref(db, `users/${user.uid}/challenges/${selectedChallenge.id}/trades`);
          const newRef = await push(tradesRef, newTrade);
          const updatedTrades = [{ ...newTrade, id: newRef.key!, createdAt: newTrade.createdAt } as Trade, ...trades];
          updateLocalTrades(selectedChallenge.id, updatedTrades);
          toast.success("Trade added");
        }
        setEditingTrade(null);
      } catch (error) {
        toast.error("Failed to save trade");
      }
    };

    if (editingTrade?.id) {
      requireVerification(performSave);
    } else {
      await performSave();
    }
  };

  const deleteTrade = async (tradeId: string) => {
    if (!user || !selectedChallenge) return;

    const performDelete = async () => {
      const tradeToDelete = trades.find(t => t.id === tradeId);
      if (!tradeToDelete) return;

      const updatedTrades = trades.filter(t => t.id !== tradeId);
      updateLocalTrades(selectedChallenge.id, updatedTrades);

      let isUndone = false;

      const toastId = toast(
        <UndoToast
          message="Trade deleted"
          onUndo={() => {
            isUndone = true;
            toast.dismiss(toastId);
            updateLocalTrades(selectedChallenge.id, [...updatedTrades, tradeToDelete]);
            toast.success("Trade restored");
          }}
        />,
        { duration: 10000 }
      );

      setTimeout(async () => {
        if (!isUndone) {
          try {
            const tradeRef = ref(db, `users/${user.uid}/challenges/${selectedChallenge.id}/trades/${tradeId}`);
            await remove(tradeRef);

            // Delete screenshot from Google Drive if exists
            if (tradeToDelete.screenshotFileId) {
              try {
                const accessToken = await getAccessToken();
                if (accessToken) {
                  await deleteFromGoogleDrive(accessToken, tradeToDelete.screenshotFileId);
                }
              } catch (driveError) {
                console.error('Failed to delete screenshot from Drive:', driveError);
              }
            }
          } catch (error) {
            updateLocalTrades(selectedChallenge.id, [...updatedTrades, tradeToDelete]);
            toast.error("Failed to delete trade");
          }
        }
      }, 10000);
    };

    requireVerification(performDelete);
  };

  /** Open new-trade modal with rule check */
  const openNewTradeModal = (date?: string) => {
    const tradeDate = date || new Date().toISOString().split('T')[0];
    setEditingTrade(null);
    setSelectedDate(tradeDate);

    // Check trading rules
    const violations = checkRules(rules, trades, tradeDate);
    if (violations.length > 0) {
      setRuleViolations(violations);
      setPendingTradeDate(tradeDate);
      setRuleWarningOpen(true);
      return;
    }
    setIsAddModalOpen(true);
  };

  const handleRuleOverride = () => {
    setRuleWarningOpen(false);
    setRuleViolations([]);
    setIsAddModalOpen(true);
  };

  const handleEditTrade = (trade: Trade) => {
    setEditingTrade(trade);
    setIsTradeModalOpen(false);
    setIsAddModalOpen(true);
  };

  const deleteJournal = async (journalId: string) => {
    if (!user || !selectedChallenge) return;

    const journalToDelete = journals.find(j => j.id === journalId);
    if (!journalToDelete) return;

    const updatedJournals = journals.filter(j => j.id !== journalId);
    updateLocalJournals(selectedChallenge.id, updatedJournals);

    let isUndone = false;

    const toastId = toast(
      <UndoToast
        message="Journal deleted"
        onUndo={() => {
          isUndone = true;
          toast.dismiss(toastId);
          updateLocalJournals(selectedChallenge.id, [...updatedJournals, journalToDelete]);
          toast.success("Journal restored");
        }}
      />,
      { duration: 10000 }
    );

    setTimeout(async () => {
      if (!isUndone) {
        try {
          const journalRef = ref(db, `users/${user.uid}/challenges/${selectedChallenge.id}/journals/${journalId}`);
          await remove(journalRef);

          // Delete screenshot from Google Drive if exists
          if (journalToDelete.screenshotFileId) {
            try {
              const accessToken = await getAccessToken();
              if (accessToken) {
                await deleteFromGoogleDrive(accessToken, journalToDelete.screenshotFileId);
              }
            } catch (driveError) {
              console.error('Failed to delete screenshot from Drive:', driveError);
            }
          }
        } catch (error) {
          updateLocalJournals(selectedChallenge.id, [...updatedJournals, journalToDelete]);
          toast.error("Failed to delete journal");
        }
      }
    }, 10000);
  };

  const handleEditJournal = (journal: Journal) => {
    setEditingJournal(journal);
    setIsTradeModalOpen(false);
    setIsJournalModalOpen(true);
  };

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const getDayData = (day: number): DayData | null => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayTrades = trades.filter(t => t.date === dateStr);
    const dayJournals = journals.filter(j => j.date === dateStr);
    if (dayTrades.length === 0 && dayJournals.length === 0) return null;
    return {
      date: dateStr,
      trades: dayTrades,
      journals: dayJournals,
      totalProfit: dayTrades.reduce((sum, t) => sum + t.profit, 0),
      tradeCount: dayTrades.length,
    };
  };

  const isArchived = selectedChallenge?.status === "Achive";

  const handleDayClick = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayData = getDayData(day);

    setSelectedDate(dateStr);

    if (dayData && (dayData.trades.length > 0 || dayData.journals.length > 0)) {
      // Has data - open trade modal to view
      setIsTradeModalOpen(true);
    } else if (!isArchived) {
      // Empty day - show entry selection dialog
      setEditingTrade(null);
      setEditingJournal(null);
      setIsEntryDialogOpen(true);
    }
  };

  const changeMonth = (delta: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  // Keyboard shortcuts: N = new trade, J = new journal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (isArchived) return;
      if (e.key === 'n' || e.key === 'N') {
        openNewTradeModal();
      }
      if (e.key === 'j' || e.key === 'J') {
        setEditingJournal(null);
        setIsJournalModalOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isArchived]);

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();

    for (let i = 0; i < firstDay; i++) {
      days.push(<CalendarDay key={`empty-${i}`} dayData={null} dayNumber={null} onClick={() => {}} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = getDayData(day);
      const isToday = isCurrentMonth && day === today.getDate();
      days.push(<CalendarDay key={day} dayData={dayData} dayNumber={day} onClick={() => handleDayClick(day)} isToday={isToday} formatCurrency={fmt} />);
    }

    return days;
  };

  // Calculate weekly totals for the month (profit minus fees)
  const getWeeklyTotals = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const weeks: { weekNum: number; profit: number; trades: number }[] = [];

    let weekNum = 1;
    let weekProfit = 0;
    let weekFees = 0;
    let weekTrades = 0;
    let dayInWeek = firstDay;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = getDayData(day);
      if (dayData) {
        weekProfit += dayData.totalProfit;
        weekFees += dayData.trades.reduce((sum, t) => sum + (t.fees || 0), 0);
        weekTrades += dayData.tradeCount;
      }
      dayInWeek++;

      if (dayInWeek === 7 || day === daysInMonth) {
        // Net profit = profit - fees
        weeks.push({ weekNum, profit: weekProfit - weekFees, trades: weekTrades });
        weekNum++;
        weekProfit = 0;
        weekFees = 0;
        weekTrades = 0;
        dayInWeek = 0;
      }
    }

    return weeks;
  };

  const weeklyTotals = getWeeklyTotals();

  const selectedDayTrades = selectedDate ? trades.filter(t => t.date === selectedDate) : [];
  const selectedDayJournals = selectedDate ? journals.filter(j => j.date === selectedDate) : [];

  // Calculate monthly stats (profit minus fees)
  const monthlyTrades = trades.filter(t => {
    const tradeDate = new Date(t.date);
    return tradeDate.getMonth() === currentDate.getMonth() && tradeDate.getFullYear() === currentDate.getFullYear();
  });
  const monthlyProfit = monthlyTrades.reduce((sum, t) => sum + t.profit, 0);
  const monthlyFees = monthlyTrades.reduce((sum, t) => sum + (t.fees || 0), 0);
  const monthlyNetProfit = monthlyProfit - monthlyFees;
  const isMonthlyProfit = monthlyNetProfit >= 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen bg-gradient-mesh flex flex-col overflow-hidden">
      <Navbar />

      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:gap-4 mb-3 sm:mb-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="relative hidden sm:block">
                <div className="absolute inset-0 bg-gradient-primary rounded-xl blur-lg opacity-30" />
                <div className="relative bg-gradient-primary p-3 rounded-xl">
                  <Calendar className="h-6 w-6 text-primary-foreground" />
                </div>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold gradient-text">Calendar</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {monthlyTrades.length} trades •
                  <span className={cn("font-semibold ml-1 font-mono", isMonthlyProfit ? "text-profit" : "text-loss/80")}>
                    {isMonthlyProfit ? "+" : ""}{fmt(monthlyNetProfit)}
                  </span>
                </p>
              </div>
            </div>

            {/* Weekly Totals - Center */}
            <div className="hidden md:flex items-center gap-1.5 flex-wrap justify-center">
              {weeklyTotals.map((week) => (
                <div
                  key={week.weekNum}
                  className={cn(
                    "px-2 py-0.5 rounded text-xs font-mono",
                    week.trades === 0 && "text-muted-foreground/40",
                    week.profit > 0 && "text-profit bg-profit/10",
                    week.profit < 0 && "text-loss/80 bg-loss/10",
                    week.profit === 0 && week.trades > 0 && "text-muted-foreground bg-muted/30"
                  )}
                >
                  W{week.weekNum}: {week.trades > 0 ? (week.profit >= 0 ? '+' : '') + fmt(week.profit) : '-'}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              {/* Currency selector */}
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-[80px] sm:w-[110px] h-8 sm:h-9 text-xs sm:text-sm border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card/95 backdrop-blur-xl border-border/50">
                  {SUPPORTED_CURRENCIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="font-mono">{c.symbol}</span> {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currency !== "USD" && (
                <button
                  onClick={() => fetchExchangeRates(true)}
                  disabled={refreshingRate}
                  className="text-muted-foreground hover:text-primary transition-colors p-1"
                  title={`1 USD = ${currentCurrencyInfo.symbol}${currentRate.toFixed(2)}`}
                >
                  <RefreshCw className={cn("h-3 w-3", refreshingRate && "animate-spin")} />
                </button>
              )}
              <Button variant="ghost" size="sm" onClick={goToToday} className="text-muted-foreground text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9">
                Today
              </Button>
            </div>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-center gap-1 bg-card/60 backdrop-blur-sm rounded-xl p-1 border border-border/50">
            <Button variant="ghost" size="icon-sm" onClick={() => changeMonth(-1)} className="h-8 w-8 sm:h-9 sm:w-9">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm sm:text-base font-semibold px-2 sm:px-3 min-w-[120px] sm:min-w-[160px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <Button variant="ghost" size="icon-sm" onClick={() => changeMonth(1)} className="h-8 w-8 sm:h-9 sm:w-9">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Daily Loss Limit Alert */}
        {(() => {
          const limit = selectedChallenge?.dailyLossLimit;
          if (!limit) return null;
          const todayStr = new Date().toISOString().split('T')[0];
          const todayPnL = trades.filter(t => t.date === todayStr).reduce((s, t) => s + t.profit, 0);
          if (todayPnL >= -limit) return null;
          return (
            <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-loss/10 border border-loss/30 text-loss/90 text-sm animate-fade-in">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>
                <strong>Daily loss limit hit</strong> — today&apos;s P&L is{' '}
                <span className="font-mono font-semibold">{fmt(todayPnL)}</span>, exceeding your{' '}
                <span className="font-mono font-semibold">-{fmt(limit)}</span> limit. Consider stepping away.
              </span>
            </div>
          );
        })()}

        {/* Overtrade Warning Banner */}
        {(() => {
          if (!rules.enabled || rules.maxTradesPerDay <= 0) return null;
          const todayStr = new Date().toISOString().split('T')[0];
          const todayTradeCount = trades.filter(t => t.date === todayStr).length;
          if (todayTradeCount < rules.maxTradesPerDay) return null;

          const isOver = todayTradeCount > rules.maxTradesPerDay;
          const isAt = todayTradeCount === rules.maxTradesPerDay;

          // Send Telegram alert once per day when limit is reached/exceeded
          if (user && overtradeAlertSentRef.current !== todayStr) {
            overtradeAlertSentRef.current = todayStr;
            const todayPnL = trades.filter(t => t.date === todayStr).reduce((s, t) => s + t.profit, 0);
            sendTelegramNotification(
              user.uid,
              `⚠️ <b>Overtrade Alert!</b>\n\n` +
              `You've taken <b>${todayTradeCount}</b> trade${todayTradeCount !== 1 ? 's' : ''} today (limit: <b>${rules.maxTradesPerDay}</b>).\n` +
              `Today's P&L: <b>${todayPnL >= 0 ? '+' : ''}$${todayPnL.toFixed(2)}</b>\n\n` +
              `🛑 Step away from the screens and protect your capital.`
            );
          }

          return (
            <div className={cn(
              "mb-3 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm animate-fade-in",
              isOver
                ? "bg-loss/15 border border-loss/40 text-loss"
                : "bg-amber-500/10 border border-amber-500/30 text-amber-500"
            )}>
              <ShieldAlert className="h-5 w-5 flex-shrink-0 animate-pulse" />
              <div className="flex-1">
                <span className="font-semibold">
                  {isOver ? "Overtrade Warning!" : "Daily Trade Limit Reached"}
                </span>
                <span className="ml-1.5">
                  — You've taken{" "}
                  <span className="font-mono font-bold">{todayTradeCount}</span> trade{todayTradeCount !== 1 ? 's' : ''} today
                  (limit: <span className="font-mono font-bold">{rules.maxTradesPerDay}</span>).
                  {isOver ? " Stop trading and review your plan." : " Consider stopping for the day."}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Calendar Grid */}
        <div className="flex-1 flex flex-col min-h-0 animate-scale-in">
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1 sm:mb-3">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider py-1 sm:py-2">
                <span className="sm:hidden">{day.charAt(0)}</span>
                <span className="hidden sm:inline">{day}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2 flex-1 auto-rows-fr overflow-y-auto custom-scrollbar">
            {renderCalendar()}
          </div>

          {/* Mobile Weekly Summary */}
          <div className="md:hidden mt-2 pt-2 border-t border-border/30">
            <div className="flex items-center gap-1 flex-wrap">
              {weeklyTotals.filter(w => w.trades > 0).map((week) => (
                <div
                  key={week.weekNum}
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-mono",
                    week.profit > 0 && "text-profit bg-profit/10",
                    week.profit < 0 && "text-loss/80 bg-loss/10",
                    week.profit === 0 && "text-muted-foreground bg-muted/30"
                  )}
                >
                  W{week.weekNum}: {week.profit >= 0 ? '+' : ''}{fmt(week.profit)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modals */}
        <TradeModal
          open={isTradeModalOpen}
          onClose={() => setIsTradeModalOpen(false)}
          trades={selectedDayTrades}
          journals={selectedDayJournals}
          date={selectedDate || ''}
          onDelete={deleteTrade}
          onEdit={handleEditTrade}
          openAddTrade={() => {
            setIsTradeModalOpen(false);
            openNewTradeModal(selectedDate || undefined);
          }}
          openAddJournal={() => {
            setEditingJournal(null);
            setIsTradeModalOpen(false);
            setIsJournalModalOpen(true);
          }}
          onDeleteJournal={deleteJournal}
          onEditJournal={handleEditJournal}
          readOnly={isArchived}
          formatCurrency={fmt}
        />

        <AddEntryDialog
          open={isEntryDialogOpen}
          onClose={() => setIsEntryDialogOpen(false)}
          onSelectTrade={() => {
            setIsEntryDialogOpen(false);
            openNewTradeModal(selectedDate || undefined);
          }}
          onSelectJournal={() => {
            setIsEntryDialogOpen(false);
            setIsJournalModalOpen(true);
          }}
          date={selectedDate || undefined}
        />

        <AddTradeModal
          open={isAddModalOpen}
          onClose={() => { setIsAddModalOpen(false); setEditingTrade(null); setSelectedDate(null); }}
          onSave={addTrade}
          editingTrade={editingTrade}
          initialDate={selectedDate || undefined}
        />

        <AddJournalModal
          open={isJournalModalOpen}
          onClose={() => { setIsJournalModalOpen(false); setEditingJournal(null); setSelectedDate(null); }}
          onSave={addJournal}
          editingJournal={editingJournal}
          initialDate={selectedDate || undefined}
        />

        {/* Rule Violation Warning */}
        <Dialog open={ruleWarningOpen} onOpenChange={setRuleWarningOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-loss">
                <RuleWarningIcon className="h-5 w-5" />
                Trading Rule Violation
              </DialogTitle>
              <DialogDescription className="pt-1">
                Your trading rules have been triggered:
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              {ruleViolations.map((v, i) => (
                <div key={i} className="bg-loss/10 border border-loss/20 rounded-lg p-3">
                  <p className="text-xs font-semibold text-loss">{v.rule}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{v.message}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Discipline is key. Are you sure you want to override?
            </p>
            <div className="flex gap-3 justify-end pt-1">
              <Button variant="outline" onClick={() => setRuleWarningOpen(false)}>Stop Trading</Button>
              <Button variant="destructive" onClick={handleRuleOverride}>Override & Add</Button>
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

      {/* Quick Stats Widget */}
      {(() => {
        const today = new Date().toISOString().split('T')[0];
        const todayTrades = trades.filter(t => t.date === today);
        if (todayTrades.length === 0) return null;
        const todayPnL = todayTrades.reduce((s, t) => s + t.profit, 0);
        const todayWins = todayTrades.filter(t => t.profit > 0).length;
        const todayWinRate = todayTrades.length > 0 ? Math.round((todayWins / todayTrades.length) * 100) : 0;
        return (
          <div className="fixed bottom-6 left-6 z-40 animate-fade-in">
            <div className="bg-card/90 backdrop-blur-md border border-border/50 rounded-2xl shadow-lg px-4 py-2.5 flex items-center gap-4">
              <div className="text-center">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Today</p>
                <p className={cn(
                  "text-sm font-bold font-mono tabular-nums",
                  todayPnL > 0 ? "text-profit" : todayPnL < 0 ? "text-loss/80" : "text-muted-foreground"
                )}>
                  {todayPnL >= 0 ? "+" : ""}{fmt(todayPnL)}
                </p>
              </div>
              <div className="w-px h-6 bg-border/50" />
              <div className="text-center">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Trades</p>
                <p className="text-sm font-bold font-mono tabular-nums">{todayTrades.length}</p>
              </div>
              <div className="w-px h-6 bg-border/50" />
              <div className="text-center">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Win%</p>
                <p className={cn(
                  "text-sm font-bold font-mono tabular-nums",
                  todayWinRate >= 50 ? "text-profit" : "text-loss/80"
                )}>
                  {todayWinRate}%
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* FAB - Quick Add */}
      {!isArchived && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-40">
          <Button
            size="sm"
            variant="outline"
            className="h-11 px-4 gap-2 shadow-lg rounded-full bg-card/95 backdrop-blur-sm hover:bg-muted border-border/60"
            onClick={() => { setEditingJournal(null); setSelectedDate(new Date().toISOString().split('T')[0]); setIsJournalModalOpen(true); }}
            title="New Journal (J)"
          >
            <BookOpen className="h-4 w-4 text-blue-400" />
            <span className="text-sm">Journal</span>
          </Button>
          <Button
            size="sm"
            className="h-11 px-4 gap-2 shadow-lg rounded-full"
            onClick={() => openNewTradeModal()}
            title="New Trade (N)"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm">Trade</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default Index;
