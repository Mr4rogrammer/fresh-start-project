import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ref, push, remove, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useChallenge } from "@/contexts/ChallengeContext";
import { useData } from "@/contexts/DataContext";
import { Trade, DayData } from "@/types/trade";
import { CalendarDay } from "@/components/CalendarDay";
import { TradeModal } from "@/components/TradeModal";
import { AddTradeModal } from "@/components/AddTradeModal";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { toast } from "sonner";
import UndoToast from "@/components/UndoToast";
import { useTotpVerification } from "@/hooks/useTotpVerification";
import { TotpVerificationModal } from "@/components/TotpVerificationModal";
import { cn } from "@/lib/utils";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { selectedChallenge } = useChallenge();
  const { getTrades, updateLocalTrades } = useData();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  
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

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const getDayData = (day: number): DayData | null => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayTrades = trades.filter(t => t.date === dateStr);
    if (dayTrades.length === 0) return null;
    return {
      date: dateStr,
      trades: dayTrades,
      totalProfit: dayTrades.reduce((sum, t) => sum + t.profit, 0),
      tradeCount: dayTrades.length,
    };
  };

  const isArchived = selectedChallenge?.status === "Achive";

  const handleDayClick = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayData = getDayData(day);

    if (dayData && dayData.trades.length > 0) {
      setSelectedDate(dayData.date);
      setIsTradeModalOpen(true);
    } else if (!isArchived) {
      setSelectedDate(dateStr);
      setEditingTrade(null);
      setIsAddModalOpen(true);
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
      days.push(<CalendarDay key={day} dayData={dayData} dayNumber={day} onClick={() => handleDayClick(day)} isToday={isToday} />);
    }

    return days;
  };

  const selectedDayTrades = selectedDate ? trades.filter(t => t.date === selectedDate) : [];

  // Calculate monthly stats
  const monthlyTrades = trades.filter(t => {
    const tradeDate = new Date(t.date);
    return tradeDate.getMonth() === currentDate.getMonth() && tradeDate.getFullYear() === currentDate.getFullYear();
  });
  const monthlyProfit = monthlyTrades.reduce((sum, t) => sum + t.profit, 0);
  const isMonthlyProfit = monthlyProfit >= 0;

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
    <div className="h-screen bg-gradient-mesh flex flex-col overflow-hidden relative">
      {/* Ambient background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] opacity-50" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] opacity-40" />
      </div>
      
      <Navbar />

      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full p-2 sm:p-4 md:p-6 overflow-hidden relative z-10">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:gap-4 mb-3 sm:mb-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="relative hidden sm:block">
                <div className="absolute inset-0 bg-gradient-primary rounded-xl blur-lg opacity-40" />
                <div className="relative bg-gradient-primary p-3 rounded-xl shadow-glow-primary">
                  <Calendar className="h-6 w-6 text-primary-foreground" />
                </div>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold gradient-text-static">Calendar</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {monthlyTrades.length} trades • 
                  <span className={cn(
                    "font-semibold ml-1 transition-colors",
                    isMonthlyProfit ? "text-profit" : "text-loss"
                  )}>
                    {isMonthlyProfit ? "+" : ""}${Math.abs(monthlyProfit).toFixed(2)}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <Button variant="ghost" size="sm" onClick={goToToday} className="text-muted-foreground text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9 hover:text-primary hover:bg-primary/10">
                Today
              </Button>
            </div>
          </div>

          {/* Month Navigation - Separate row on mobile */}
          <div className="flex items-center justify-center gap-1 glass rounded-xl p-1.5 border border-border/40">
            <Button variant="ghost" size="icon-sm" onClick={() => changeMonth(-1)} className="h-8 w-8 sm:h-9 sm:w-9 hover:bg-primary/10 hover:text-primary">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm sm:text-base font-semibold px-2 sm:px-4 min-w-[120px] sm:min-w-[180px] text-center gradient-text-static">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <Button variant="ghost" size="icon-sm" onClick={() => changeMonth(1)} className="h-8 w-8 sm:h-9 sm:w-9 hover:bg-primary/10 hover:text-primary">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 flex flex-col min-h-0 animate-scale-in glass-subtle rounded-2xl p-2 sm:p-4 border border-border/30">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1 sm:mb-3">
            {dayNames.map((day, index) => (
              <div key={day} className="text-center text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider py-1 sm:py-2">
                <span className="sm:hidden">{day.charAt(0)}</span>
                <span className="hidden sm:inline">{day}</span>
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 flex-1 auto-rows-fr overflow-y-auto custom-scrollbar">
            {renderCalendar()}
          </div>
        </div>

        {/* Modals */}
        <TradeModal
          open={isTradeModalOpen}
          onClose={() => setIsTradeModalOpen(false)}
          trades={selectedDayTrades}
          date={selectedDate || ''}
          onDelete={deleteTrade}
          onEdit={handleEditTrade}
          openAddTrade={() => {
            setEditingTrade(null);
            setSelectedDate(null);
            setIsTradeModalOpen(false);
            setIsAddModalOpen(true);
          }}
          readOnly={isArchived}
        />

        <AddTradeModal
          open={isAddModalOpen}
          onClose={() => { setIsAddModalOpen(false); setEditingTrade(null); setSelectedDate(null); }}
          onSave={addTrade}
          editingTrade={editingTrade}
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
