import React, { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { auth, loginWithGoogle, logoutUser } from "../lib/firebase";

interface AuthContextValue {
  user: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      },
      (err) => {
        console.error("Auth state error:", err);
        setError("Failed to verify authentication status.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      setError(null);
      await loginWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign-in could not be completed.";
      setError(msg);
      throw err;
    }
  };

  const handleSignOut = async () => {
    try {
      setError(null);
      await logoutUser();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign-out failed.";
      setError(msg);
      throw err;
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signInWithGoogle: handleSignIn,
        signOut: handleSignOut,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
