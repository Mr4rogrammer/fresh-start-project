import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface Challenge {
  id: string;
  name: string;
  createdAt: string;
  openingBalance: number;
  currentBalance?: number;
}

interface ChallengeContextType {
  selectedChallenge: Challenge | null;
  setSelectedChallenge: (challenge: Challenge | null) => void;
}

const ChallengeContext = createContext<ChallengeContextType | undefined>(undefined);

export const ChallengeProvider = ({ children }: { children: ReactNode }) => {
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Load selected challenge from localStorage
    const saved = localStorage.getItem("selectedChallenge");
    if (saved) {
      setSelectedChallenge(JSON.parse(saved));
    }
  }, []);

  const handleSetChallenge = (challenge: Challenge | null) => {
    setSelectedChallenge(challenge);
    if (challenge) {
      localStorage.setItem("selectedChallenge", JSON.stringify(challenge));
    } else {
      localStorage.removeItem("selectedChallenge");
      navigate("/home");
    }
  };

  return (
    <ChallengeContext.Provider
      value={{
        selectedChallenge,
        setSelectedChallenge: handleSetChallenge,
      }}
    >
      {children}
    </ChallengeContext.Provider>
  );
};

export const useChallenge = () => {
  const context = useContext(ChallengeContext);
  if (!context) {
    throw new Error("useChallenge must be used within ChallengeProvider");
  }
  return context;
};
