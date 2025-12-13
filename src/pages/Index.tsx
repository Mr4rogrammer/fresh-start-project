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
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import UndoToast from "@/components/UndoToast";
import { useTotpVerification } from "@/hooks/useTotpVerification";
import { TotpVerificationModal } from "@/components/TotpVerificationModal";

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

  // Get trades from context instead of fetching
  const trades = selectedChallenge ? getTrades(selectedChallenge.id) : [];

  const addTrade = async (trade: Omit<Trade, 'id' | 'createdAt'>) => {
    if (!user || !selectedChallenge) return;

    const performSave = async () => {
      try {
        const newTrade = {
          ...trade,
          createdAt: new Date().toISOString(),
        };

        if (editingTrade?.id) {
          const tradeRef = ref(db, `users/${user.uid}/challenges/${selectedChallenge.id}/trades/${editingTrade.id}`);
          await update(tradeRef, newTrade);
          
          // Update local state
          const updatedTrades = trades.map(t => 
            t.id === editingTrade.id ? { ...newTrade, id: editingTrade.id } as Trade : t
          );
          updateLocalTrades(selectedChallenge.id, updatedTrades);
          
          toast.success("Trade updated successfully");
        } else {
          const tradesRef = ref(db, `users/${user.uid}/challenges/${selectedChallenge.id}/trades`);
          const newRef = await push(tradesRef, newTrade);
          
          // Update local state
          const updatedTrades = [{ ...newTrade, id: newRef.key!, createdAt: newTrade.createdAt } as Trade, ...trades];
          updateLocalTrades(selectedChallenge.id, updatedTrades);
          
          toast.success("Trade added successfully");
        }

        setEditingTrade(null);
      } catch (error) {
        console.error("Error saving trade:", error);
        toast.error("Failed to save trade");
      }
    };

    // Only require verification for edits, not new trades
    if (editingTrade?.id) {
      requireVerification(performSave);
    } else {
      await performSave();
    }
  };

  const deleteTrade = async (tradeId: string) => {
    if (!user || !selectedChallenge) return;

    const performDelete = async () => {
      // Find the trade to delete (for undo)
      const tradeToDelete = trades.find(t => t.id === tradeId);
      if (!tradeToDelete) return;

      // Optimistic UI update - remove immediately
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

      // Actually delete from Firebase after 10 seconds if not undone
      setTimeout(async () => {
        if (!isUndone) {
          try {
            const tradeRef = ref(db, `users/${user.uid}/challenges/${selectedChallenge.id}/trades/${tradeId}`);
            await remove(tradeRef);
          } catch (error) {
            console.error("Error deleting trade:", error);
            // Restore on error
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

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

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
      // Open add modal with the selected date (only if not archived)
      setSelectedDate(dateStr);
      setEditingTrade(null);
      setIsAddModalOpen(true);
    }
  };

  const changeMonth = (delta: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<CalendarDay key={`empty-${i}`} dayData={null} dayNumber={null} onClick={() => { }} />);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = getDayData(day);
      days.push(
        <CalendarDay
          key={day}
          dayData={dayData}
          dayNumber={day}
          onClick={() => handleDayClick(day)}
        />
      );
    }

    return days;
  };

  const selectedDayTrades = selectedDate ? trades.filter(t => t.date === selectedDate) : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col overflow-hidden">
      <Navbar />

      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full p-4 md:p-6 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Calendar
          </h1>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-card/50 backdrop-blur-sm rounded-lg p-1 border border-border/50 shadow-sm">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => changeMonth(-1)}
                className="h-10 w-10 transition-all hover:scale-110 hover:bg-primary/10"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <span className="text-xl font-semibold text-foreground min-w-[180px] text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => changeMonth(1)}
                className="h-10 w-10 transition-all hover:scale-110 hover:bg-primary/10"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Calendar Grid - Flex layout to fill remaining space */}
        <div className="flex-1 flex flex-col min-h-0 animate-scale-in mt-10  overflow-y-auto">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-2 md:gap-3 mb-2">
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thuesday', 'Friday', 'Saturday'].map(day => (
              <div key={day} className="text-center text-muted-foreground font-bold  text-base">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days - Fills remaining space */}
          <div className="grid grid-cols-7 gap-2 md:gap-3 flex-1 auto-rows-fr mt-5">
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
            setIsTradeModalOpen(false)
            setIsAddModalOpen(true);
          }}
          readOnly={isArchived}
        />

        <AddTradeModal
          open={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingTrade(null);
            setSelectedDate(null);
          }}
          onSave={addTrade}
          editingTrade={editingTrade}
          initialDate={selectedDate || undefined}
        />

        <TotpVerificationModal
          open={isVerificationRequired}
          onClose={cancelVerification}
          onVerify={handleVerificationSuccess}
          title="Verify to Delete Trade"
          description="Enter your 6-digit code to confirm deletion"
        />
      </div>
    </div>
  );
};

export default Index;
