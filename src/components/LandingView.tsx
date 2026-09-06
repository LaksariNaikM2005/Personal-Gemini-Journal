import React, { useState } from "react";
import {
  BookOpen,
  Sparkles,
  ShieldCheck,
  Brain,
  MessageSquare,
  Lock,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const LandingView: React.FC = () => {
  const { signInWithGoogle, error, clearError } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    try {
      clearError();
      setIsSigningIn(true);
      await signInWithGoogle();
    } catch {
      // Handled in AuthContext
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-indigo-100 selection:text-indigo-900 font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800">
              Personal Gemini Journal
            </span>
          </div>

          <button
            id="landing-header-login-btn"
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="inline-flex items-center space-x-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
          >
            <span>Sign In</span>
          </button>
        </div>
      </header>

      {/* Main Hero & Login */}
      <main className="flex-1 py-12 sm:py-20 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          {/* Subtle Tag */}
          <div className="inline-flex items-center space-x-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1 text-xs font-semibold text-indigo-700 shadow-xs mb-6">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span>Private Journaling & Brainstorming Powered by Gemini</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.15]">
            A sanctuary for your thoughts,{" "}
            <span className="text-indigo-600 underline decoration-indigo-200 underline-offset-8">
              illuminated
            </span>{" "}
            by AI.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-slate-600">
            Write uninhibitedly in a private, encrypted space. Unpack your feelings,
            brainstorm creative projects, and discover thoughtful insights with gentle,
            supportive reflections from Gemini.
          </p>

          {/* Authentication Card */}
          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-slate-100 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              Begin Your Journaling Journey
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
              Sign in securely with your Google account. Your journal entries and AI
              conversations remain strictly accessible only to your UID.
            </p>

            {error && (
              <div
                id="landing-error-banner"
                className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-left text-xs text-rose-700"
              >
                <div className="font-semibold">Authentication notice:</div>
                <div>{error}</div>
              </div>
            )}

            <button
              id="landing-google-signin-btn"
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="w-full flex items-center justify-center space-x-3 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-xs transition hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {isSigningIn ? (
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                  <span>Connecting to Google...</span>
                </div>
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </>
              )}
            </button>

            <div className="mt-4 flex items-center justify-center space-x-1.5 text-[11px] text-slate-400">
              <Lock className="h-3 w-3 text-slate-400" />
              <span>Zero-Trust Firestore Rules & Server-side Gemini API</span>
            </div>
          </div>

          {/* Pillars Grid */}
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3 text-left">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 mb-4">
                <Brain className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Supportive AI Reflection
              </h3>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-600">
                Receive non-clinical, empathetic observations, summary highlights, and
                three thoughtful questions that guide your self-discovery.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 mb-4">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Context-Aware Chat
              </h3>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-600">
                Discuss specific entries or brainstorm wild new ideas in a dedicated
                conversational space that remembers your journaling context.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-4">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Absolute Privacy
              </h3>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-600">
                All data is locked down to your unique Firebase UID via rigorous
                Firestore rules. Your Gemini API key never touches the browser.
              </p>
            </div>
          </div>

          {/* Trust points */}
          <div className="mt-12 inline-flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-slate-400">
            <span className="flex items-center space-x-1.5">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span>Full-stack security</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span>Cloud Firestore sync</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span>Export anytime</span>
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/60 py-6 px-6 text-center text-xs text-slate-400">
        <p>Personal Gemini Journal • Securely powered by Google Gemini & Firebase</p>
      </footer>
    </div>
  );
};
