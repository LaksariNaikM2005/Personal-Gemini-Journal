import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { LandingView } from "./components/LandingView";
import { DashboardView } from "./components/DashboardView";
import { NewJournalView } from "./components/NewJournalView";
import { JournalDetailsView } from "./components/JournalDetailsView";
import { JournalHistoryView } from "./components/JournalHistoryView";
import { ChatView } from "./components/ChatView";
import { ProfileView } from "./components/ProfileView";
import { InsightsView } from "./components/InsightsView";
import { AskMyJournalView } from "./components/AskMyJournalView";
import { JournalEntry, Conversation, ViewPage } from "./types";
import {
  subscribeToUserJournals,
  subscribeToUserConversations,
} from "./lib/firebase";
import { deleteJournal } from "./services/journalService";
import { BookOpen, Sparkles, AlertCircle } from "lucide-react";

const MainApp: React.FC = () => {
  const { user, loading, error: authError } = useAuth();

  const [currentPage, setCurrentPage] = useState<ViewPage>("dashboard");
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [journalsLoading, setJournalsLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [promptSeed, setPromptSeed] = useState<string | null>(null);
  const [chatContextSeed, setChatContextSeed] = useState<{
    title: string;
    content: string;
    mood: string;
    journalId?: string;
  } | null>(null);
  const [systemAlert, setSystemAlert] = useState<string | null>(null);

  // Subscribe to Firestore user subcollections when authenticated
  useEffect(() => {
    if (!user) {
      setJournals([]);
      setConversations([]);
      setJournalsLoading(false);
      return;
    }

    setJournalsLoading(true);
    const unsubJournals = subscribeToUserJournals(
      user.uid,
      (entries) => {
        setJournals(entries);
        setJournalsLoading(false);
        // If current selected journal was updated, keep local state in sync
        if (selectedJournal) {
          const updated = entries.find((j) => j.id === selectedJournal.id);
          if (updated) setSelectedJournal(updated);
        }
      },
      (err) => {
        console.error("Firestore journal subscription error:", err);
        setJournalsLoading(false);
      }
    );

    const unsubConversations = subscribeToUserConversations(
      user.uid,
      (convs) => {
        setConversations(convs);
      },
      (err) => {
        console.error("Firestore conversations subscription error:", err);
      }
    );

    return () => {
      unsubJournals();
      unsubConversations();
    };
  }, [user]);

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 font-sans">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm shadow-indigo-200 mb-4 animate-pulse">
          <BookOpen className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">
          Personal Gemini Journal
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-medium">Connecting to your secure sanctuary...</p>
      </div>
    );
  }

  // If unauthenticated: Show Landing & Sign-in
  if (!user) {
    return <LandingView />;
  }

  // Handler functions
  const handleNavigate = (page: ViewPage) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStartNewJournal = () => {
    setSelectedJournal(null);
    setPromptSeed(null);
    setCurrentPage("new-journal");
  };

  const handleStartWithPrompt = (prompt: string) => {
    setSelectedJournal(null);
    setPromptSeed(prompt);
    setCurrentPage("new-journal");
  };

  const handleSelectJournal = (journal: JournalEntry) => {
    setSelectedJournal(journal);
    setCurrentPage("journal-details");
  };

  const handleEditJournal = (journal: JournalEntry) => {
    setSelectedJournal(journal);
    setPromptSeed(null);
    setCurrentPage("new-journal");
  };

  const handleJournalSaved = (journalId: string) => {
    const saved = journals.find((j) => j.id === journalId);
    if (saved) {
      setSelectedJournal(saved);
      setCurrentPage("journal-details");
    } else {
      setCurrentPage("history");
    }
  };

  const handleContinueInChat = (context: {
    title: string;
    content: string;
    mood: string;
    journalId?: string;
  }) => {
    setChatContextSeed(context);
    setActiveConversation(null);
    setCurrentPage("chat");
  };

  const handleSelectConversation = (conv: Conversation | null) => {
    setActiveConversation(conv);
    if (conv) {
      setChatContextSeed(null);
    }
    setCurrentPage("chat");
  };

  const handleJournalDeleted = () => {
    setSelectedJournal(null);
    setCurrentPage("history");
  };

  const handleDeleteJournalDirect = async (journalId: string) => {
    await deleteJournal(journalId);
    if (selectedJournal?.id === journalId) {
      setSelectedJournal(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onNewJournal={handleStartNewJournal}
      />

      {/* System alerts */}
      {(authError || systemAlert) && (
        <div className="mx-auto max-w-7xl px-4 pt-4">
          <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 font-medium">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-rose-600" />
              <span>{authError || systemAlert}</span>
            </div>
            <button
              onClick={() => setSystemAlert(null)}
              className="text-slate-400 hover:text-slate-700 text-xs font-semibold px-2 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* View Router */}
      <main className="flex-1">
        {currentPage === "dashboard" && (
          <DashboardView
            journals={journals}
            conversations={conversations}
            loading={journalsLoading}
            onNavigate={handleNavigate}
            onSelectJournal={handleSelectJournal}
            onSelectConversation={handleSelectConversation}
            onStartWithPrompt={handleStartWithPrompt}
            onDeleteJournal={handleDeleteJournalDirect}
          />
        )}

        {currentPage === "new-journal" && (
          <NewJournalView
            initialJournal={selectedJournal}
            initialPrompt={promptSeed || undefined}
            onNavigate={handleNavigate}
            onJournalSaved={handleJournalSaved}
            onContinueInChat={handleContinueInChat}
          />
        )}

        {currentPage === "journal-details" && selectedJournal && (
          <JournalDetailsView
            journal={selectedJournal}
            onNavigate={handleNavigate}
            onEditJournal={handleEditJournal}
            onContinueInChat={handleContinueInChat}
            onJournalDeleted={handleJournalDeleted}
          />
        )}

        {currentPage === "history" && (
          <JournalHistoryView
            journals={journals}
            onNavigate={handleNavigate}
            onSelectJournal={handleSelectJournal}
          />
        )}

        {currentPage === "insights" && (
          <InsightsView
            journals={journals}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === "ask-my-journal" && (
          <AskMyJournalView
            journals={journals}
            onNavigate={handleNavigate}
            onSelectJournal={handleSelectJournal}
          />
        )}

        {currentPage === "chat" && (
          <ChatView
            conversations={conversations}
            journals={journals}
            activeConversation={activeConversation}
            initialContext={chatContextSeed}
            onNavigate={handleNavigate}
            onSelectConversation={handleSelectConversation}
          />
        )}

        {(currentPage === "profile" || currentPage === "privacy") && (
          <ProfileView
            journals={journals}
            conversations={conversations}
            onNavigate={handleNavigate}
            initialTab={currentPage === "privacy" ? "privacy" : "overview"}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/70 py-6 text-center text-xs text-slate-500 font-medium">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="flex items-center space-x-1.5">
            <span className="font-bold text-slate-800">Personal Gemini Journal</span>
            <span>• Private & End-to-End User Isolated</span>
            <button
              onClick={() => handleNavigate("privacy")}
              className="ml-2 text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
            >
              Privacy Center
            </button>
          </p>
          <p className="text-[11px] text-slate-400 flex items-center space-x-1.5">
            <Sparkles className="h-3 w-3 text-indigo-600" />
            <span>Powered by Gemini 3.8 Flash & Google Cloud Firestore</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
