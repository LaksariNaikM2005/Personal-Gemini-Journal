import React from "react";
import { useAuth } from "../hooks/useAuth";
import { LandingView } from "./LandingView";
import { BookOpen } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Reusable ProtectedRoute component.
 * Guards private pages against unauthenticated access.
 * Unauthenticated users are redirected to the Login / Landing page.
 * Authenticated users pass through without unnecessary redirects.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallback,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 font-sans">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm shadow-indigo-200 mb-4 animate-pulse">
          <BookOpen className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">
          Personal Gemini Journal
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Verifying secure identity & data isolation...
        </p>
      </div>
    );
  }

  if (!user) {
    return fallback ? <>{fallback}</> : <LandingView />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
