import { useState, useEffect } from "react";
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
import { ChevronLeft, ChevronRight, Calendar, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import UndoToast from "@/components/UndoToast";
import { useTotpVerification } from "@/hooks/useTotpVerification";
import { TotpVerificationModal } from "@/components/TotpVerificationModal";
import { cn } from "@/lib/utils";
import { useCurrency, SUPPORTED_CURRENCIES } from "@/hooks/useCurrency";

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
            setEditingTrade(null);
            setIsTradeModalOpen(false);
            setIsAddModalOpen(true);
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
            setIsAddModalOpen(true);
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

        <TotpVerificationModal
          open={isVerificationRequired}
          onClose={cancelVerification}
          onVerify={handleVerificationSuccess}
          title="Verify Action"
          description="Enter your 6-digit code to confirm"
        />
      </div>
    </div>
  );
};

export default Index;
