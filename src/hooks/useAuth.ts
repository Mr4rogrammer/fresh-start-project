import { useState, useEffect } from 'react';
import { User, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// Store access token for Google Drive API
let googleAccessToken: string | null = null;

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    // Load stored access token
    const storedToken = sessionStorage.getItem('googleAccessToken');
    if (storedToken) {
      googleAccessToken = storedToken;
      setAccessToken(storedToken);
    }

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();

      // Request Google Drive scope for file access
      provider.addScope('https://www.googleapis.com/auth/drive.file');

      // Force account selection
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      const result = await signInWithPopup(auth, provider);

      // Get the OAuth access token for Google Drive API
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (token) {
        googleAccessToken = token;
        sessionStorage.setItem('googleAccessToken', token);
        setAccessToken(token);
      }

      return { user: result.user, error: null };
    } catch (error: any) {
      return { user: null, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      googleAccessToken = null;
      sessionStorage.removeItem('googleAccessToken');
      setAccessToken(null);
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  // Refresh access token if needed
  const refreshAccessToken = async (): Promise<string | null> => {
    if (!user) return null;

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.file');

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (token) {
        googleAccessToken = token;
        sessionStorage.setItem('googleAccessToken', token);
        setAccessToken(token);
        return token;
      }

      return null;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return null;
    }
  };

  const getAccessToken = async (): Promise<string | null> => {
    // Return existing token if available
    if (googleAccessToken) {
      return googleAccessToken;
    }

    // Try to refresh
    return refreshAccessToken();
  };

  return {
    user,
    loading,
    accessToken,
    signInWithGoogle,
    signOut,
    getAccessToken,
    refreshAccessToken,
  };
};

// Export function to get token outside of React component
export const getGoogleAccessToken = (): string | null => {
  return googleAccessToken || sessionStorage.getItem('googleAccessToken');
};
