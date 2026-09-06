import { useAuth as useAuthContext } from "../context/AuthContext";

/**
 * Reusable authentication hook providing user identity, state, and authentication methods.
 * Strictly relies on Firebase Authentication (Google Sign-In) and never stores passwords manually.
 */
export function useAuth() {
  const context = useAuthContext();
  const user = context.user;

  return {
    ...context,
    user,
    isAuthenticated: !!user,
    uid: user?.uid ?? null,
    email: user?.email ?? null,
    displayName: user?.displayName ?? null,
    photoURL: user?.photoURL ?? null,
    loading: context.loading,
    error: context.error,
    signInWithGoogle: context.signInWithGoogle,
    signOut: context.signOut,
    clearError: context.clearError,
  };
}

export default useAuth;
