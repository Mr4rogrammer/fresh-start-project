import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ref, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { verifyTotpToken } from "@/lib/totp";

export const useTotpVerification = () => {
  const { user } = useAuth();
  const [isVerificationRequired, setIsVerificationRequired] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const checkTotpEnabled = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const totpRef = ref(db, `users/${user.uid}/totp`);
      const snapshot = await get(totpRef);
      return snapshot.exists() && snapshot.val().enabled === true;
    } catch (error) {
      console.error("Error checking TOTP status:", error);
      return false;
    }
  };

  const verifyTotpCode = async (code: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Get TOTP secret from database
      const totpRef = ref(db, `users/${user.uid}/totp`);
      const snapshot = await get(totpRef);

      if (!snapshot.exists()) {
        return true; // No TOTP enrolled, allow action
      }

      const { secret } = snapshot.val();

      // Verify the code
      return verifyTotpToken(code, secret);
    } catch (error) {
      console.error("TOTP verification error:", error);
      return false;
    }
  };

  const requireVerification = async (action: () => void) => {
    const enabled = await checkTotpEnabled();
    
    if (!enabled) {
      // No TOTP enabled, execute action immediately
      action();
      return;
    }

    // TOTP is enabled, require verification
    setPendingAction(() => action);
    setIsVerificationRequired(true);
  };

  const handleVerificationSuccess = async (code: string): Promise<boolean> => {
    const isValid = await verifyTotpCode(code);
    
    if (isValid) {
      // Execute pending action
      if (pendingAction) {
        pendingAction();
      }
      setIsVerificationRequired(false);
      setPendingAction(null);
      return true;
    }
    
    return false;
  };

  const cancelVerification = () => {
    setIsVerificationRequired(false);
    setPendingAction(null);
  };

  return {
    isVerificationRequired,
    requireVerification,
    handleVerificationSuccess,
    cancelVerification,
  };
};