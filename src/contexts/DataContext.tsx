import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ref, get, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Trade } from "@/types/trade";

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

interface Link {
  id: string;
  title: string;
  url: string;
  createdAt: string;
}

interface Challenge {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  openingBalance: number;
  currentBalance?: number;
  totalFees?: number;
}

interface DataContextType {
  // All challenges with calculated balances
  challenges: Challenge[];
  // Trades grouped by challenge ID
  tradesByChallenge: Record<string, Trade[]>;
  // Get trades for a specific challenge
  getTrades: (challengeId: string) => Trade[];
  notes: Note[];
  links: Link[];
  loading: boolean;
  refetchData: () => Promise<void>;
  // Update local state without refetch
  updateLocalTrades: (challengeId: string, trades: Trade[]) => void;
  updateLocalChallenges: (challenges: Challenge[]) => void;
  updateLocalNotes: (notes: Note[]) => void;
  updateLocalLinks: (links: Link[]) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [tradesByChallenge, setTradesByChallenge] = useState<Record<string, Trade[]>>({});
  const [notes, setNotes] = useState<Note[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!user) {
      setChallenges([]);
      setTradesByChallenge({});
      setNotes([]);
      setLinks([]);
      return;
    }

    setLoading(true);
    try {
      // Fetch all user data in parallel
      const challengesRef = ref(db, `users/${user.uid}/challenges`);
      const notesRef = ref(db, `users/${user.uid}/notes`);
      const linksRef = ref(db, `users/${user.uid}/links`);

      const [challengesSnapshot, notesSnapshot, linksSnapshot] = await Promise.all([
        get(challengesRef),
        get(notesRef),
        get(linksRef),
      ]);

      // Process challenges and fetch all trades
      if (challengesSnapshot.exists()) {
        const challengesData = challengesSnapshot.val();
        const challengesArray: Challenge[] = [];
        const tradesMap: Record<string, Trade[]> = {};

        // Fetch trades for all challenges in parallel
        const tradePromises = Object.entries(challengesData).map(
          async ([id, challenge]: [string, any]) => {
            const tradesRef = ref(db, `users/${user.uid}/challenges/${id}/trades`);
            const tradesSnapshot = await get(tradesRef);

            const tradesData: Trade[] = [];
            let totalProfitLoss = 0;

            if (tradesSnapshot.exists()) {
              const data = tradesSnapshot.val();
              Object.keys(data).forEach((key) => {
                const trade = { id: key, ...data[key] } as Trade;
                tradesData.push(trade);
                const raw = trade.profit ?? (trade as any).profitLoss ?? 0;
                const pnl =
                  typeof raw === 'string'
                    ? parseFloat(String(raw).replace(/[^0-9.-]/g, '')) || 0
                    : Number(raw) || 0;
                totalProfitLoss += pnl;
              });
              tradesData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            }

            tradesMap[id] = tradesData;

            const openingBalance = challenge.openingBalance || 0;
            const currentBalance = openingBalance + totalProfitLoss;
            const totalFees = tradesData.reduce((sum, trade) => sum + trade.fees, 0);

            challengesArray.push({
              id,
              name: challenge.name,
              status: challenge.status,
              createdAt: challenge.createdAt,
              openingBalance,
              currentBalance,
              totalFees
            });
          }
        );

        await Promise.all(tradePromises);
        challengesArray.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        setChallenges(challengesArray);
        setTradesByChallenge(tradesMap);
      } else {
        setChallenges([]);
        setTradesByChallenge({});
      }

      // Process notes
      if (notesSnapshot.exists()) {
        const notesData: Note[] = [];
        const data = notesSnapshot.val();
        Object.keys(data).forEach((key) => {
          notesData.push({ id: key, ...data[key] } as Note);
        });
        notesData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotes(notesData);
      } else {
        setNotes([]);
      }

      // Process links
      if (linksSnapshot.exists()) {
        const linksData: Link[] = [];
        const data = linksSnapshot.val();
        Object.keys(data).forEach((key) => {
          linksData.push({ id: key, ...data[key] } as Link);
        });
        linksData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLinks(linksData);
      } else {
        setLinks([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchData();

    // Set up real-time listener for challenges
    const challengesRef = ref(db, `users/${user.uid}/challenges`);
    const unsubscribe = onValue(challengesRef, () => {
      fetchData(); // Refetch when challenges change
    });

    return () => unsubscribe();
  }, [user]);

  const getTrades = (challengeId: string): Trade[] => {
    return tradesByChallenge[challengeId] || [];
  };

  const updateLocalTrades = (challengeId: string, trades: Trade[]) => {
    setTradesByChallenge(prev => ({
      ...prev,
      [challengeId]: trades,
    }));
  };

  const updateLocalChallenges = (newChallenges: Challenge[]) => {
    setChallenges(newChallenges);
  };

  const updateLocalNotes = (newNotes: Note[]) => {
    setNotes(newNotes);
  };

  const updateLocalLinks = (newLinks: Link[]) => {
    setLinks(newLinks);
  };

  return (
    <DataContext.Provider
      value={{
        challenges,
        tradesByChallenge,
        getTrades,
        notes,
        links,
        loading,
        refetchData: fetchData,
        updateLocalTrades,
        updateLocalChallenges,
        updateLocalNotes,
        updateLocalLinks,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within DataProvider");
  }
  return context;
};
