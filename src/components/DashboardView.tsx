import React, { useState } from "react";
import {
  Plus,
  BookOpen,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Smile,
  Calendar,
  Tag,
  RefreshCw,
  Compass,
  Trash2,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { JournalEntry, Conversation, ViewPage, MoodType } from "../types";
import { useAuth } from "../context/AuthContext";
import { requestPromptSparks } from "../lib/geminiApi";

interface DashboardViewProps {
  journals: JournalEntry[];
  conversations: Conversation[];
  loading?: boolean;
  onNavigate: (page: ViewPage) => void;
  onSelectJournal: (journal: JournalEntry) => void;
  onSelectConversation: (conversation: Conversation) => void;
  onStartWithPrompt: (promptText: string) => void;
  onDeleteJournal?: (journalId: string) => Promise<void>;
}

const moodColorMap: Record<string, string> = {
  Grateful: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Inspired: "bg-indigo-50 text-indigo-700 border-indigo-100",
  Peaceful: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Reflective: "bg-slate-100 text-slate-700 border-slate-200",
  Energized: "bg-amber-50 text-amber-700 border-amber-100",
  Balanced: "bg-sky-50 text-sky-700 border-sky-100",
  Overwhelmed: "bg-rose-50 text-rose-700 border-rose-100",
  Anxious: "bg-purple-50 text-purple-700 border-purple-100",
  Melancholy: "bg-slate-100 text-slate-600 border-slate-200",
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  journals,
  conversations,
  loading = false,
  onNavigate,
  onSelectJournal,
  onSelectConversation,
  onStartWithPrompt,
  onDeleteJournal,
}) => {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState<string[]>([
    "What is one small victory or unexpected delight from your day?",
    "What creative project or idea is calling for your curiosity right now?",
    "What is a thought or tension you are ready to gently let go of?",
  ]);
  const [isSparking, setIsSparking] = useState(false);
  const [journalToDelete, setJournalToDelete] = useState<JournalEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const latestJournal = journals.length > 0 ? journals[0] : null;
  const latestMood: MoodType | string = latestJournal?.mood || "Reflective";

  const handleRefreshPrompts = async () => {
    try {
      setIsSparking(true);
      const recentTitles = journals.slice(0, 3).map((j) => j.title);
      const newPrompts = await requestPromptSparks({
        mood: latestMood,
        recentTitles,
      });
      if (newPrompts.length > 0) {
        setPrompts(newPrompts.slice(0, 3));
      }
    } catch (err) {
      console.warn("Could not refresh prompt sparks:", err);
    } finally {
      setIsSparking(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!journalToDelete || !onDeleteJournal) return;
    try {
      setIsDeleting(true);
      await onDeleteJournal(journalToDelete.id);
      setJournalToDelete(null);
    } catch (err) {
      console.error("Failed to delete journal:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-8 font-sans">
        <div className="h-10 w-64 bg-slate-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="h-28 bg-white rounded-2xl border border-slate-100 p-6 animate-pulse" />
          <div className="h-28 bg-white rounded-2xl border border-slate-100 p-6 animate-pulse" />
          <div className="h-28 bg-white rounded-2xl border border-slate-100 p-6 animate-pulse" />
        </div>
        <div className="h-44 bg-white rounded-2xl border border-slate-100 p-6 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      {/* Header Banner */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Hello, {user?.displayName?.split(" ")[0] || "Friend"}
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Ready to reflect on your day and brainstorm with Gemini?
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            id="dash-quick-new-journal"
            onClick={() => onNavigate("new-journal")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm shadow-indigo-200 transition-colors flex items-center gap-2 text-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Journal Entry</span>
          </button>
          <button
            id="dash-quick-chat"
            onClick={() => onNavigate("chat")}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <MessageSquare className="h-4 w-4 text-indigo-600" />
            <span>Gemini Assistant</span>
          </button>
        </div>
      </header>

      {/* Metrics Row (3-column clean minimalism grid) */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {/* Metric 1: Total Journals */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            Total Journals
          </p>
          <h3 className="text-3xl font-bold text-slate-900">{journals.length}</h3>
          <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
            <span>{journals.length === 1 ? "1 personal entry" : `${journals.length} personal entries recorded`}</span>
          </div>
        </div>

        {/* Metric 2: Latest Mood */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            Latest Mood
          </p>
          <h3 className="text-2xl font-bold text-emerald-600">{latestMood}</h3>
          <div className="mt-2 text-xs text-slate-400 font-medium">
            {latestJournal ? `Analyzed from "${latestJournal.title}"` : "Awaiting first reflection"}
          </div>
        </div>

        {/* Metric 3: Gemini Conversations */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            Brainstorm Sessions
          </p>
          <h3 className="text-3xl font-bold text-indigo-600">{conversations.length}</h3>
          <div className="mt-2 text-xs text-indigo-500 font-medium">
            AI-guided self reflections
          </div>
        </div>
      </div>

      {/* Prompt Sparks Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              AI Journaling Sparks
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any prompt to begin a new entry
            </p>
          </div>

          <button
            id="dash-refresh-sparks-btn"
            onClick={handleRefreshPrompts}
            disabled={isSparking}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/70 px-3 py-1.5 rounded-lg transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${isSparking ? "animate-spin" : ""}`} />
            <span>Generate New</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {prompts.map((prompt, idx) => (
            <div
              key={idx}
              id={`dash-prompt-spark-${idx}`}
              onClick={() => onStartWithPrompt(prompt)}
              className="group flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/30 cursor-pointer"
            >
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed group-hover:text-slate-900 font-medium">
                &ldquo;{prompt}&rdquo;
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-indigo-600 font-semibold">
                <span>Write about this</span>
                <ArrowRight className="h-3.5 w-3.5 transform transition group-hover:translate-x-1" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Section: Recent Journals + Recent Conversations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Journals (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              Recent Journals
            </h2>
            <button
              onClick={() => onNavigate("history")}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
            >
              <span>View all ({journals.length})</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {journals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No journal entries yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Begin your private journaling journey. Capture your day or explore an idea with Gemini.
              </p>
              <button
                onClick={() => onNavigate("new-journal")}
                className="mt-4 inline-flex items-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Write First Entry</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {journals.slice(0, 4).map((entry) => (
                <div
                  key={entry.id}
                  id={`dash-journal-${entry.id}`}
                  onClick={() => onSelectJournal(entry)}
                  className="group flex flex-col justify-between bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden transition hover:border-slate-300 hover:shadow-md cursor-pointer"
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-50 rounded-bl-full -mr-8 -mt-8 opacity-40 group-hover:opacity-70 transition"></div>
                  <div className="relative space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-3 py-1 text-xs font-bold rounded-full ${
                          moodColorMap[entry.mood] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {entry.mood}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatDate(entry.createdAt)}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-700">
                      {entry.title || "Untitled Entry"}
                    </h3>

                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {entry.content}
                    </p>

                    {entry.aiSummary && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2">
                        <p className="text-[10px] font-bold text-indigo-600 uppercase mb-1">
                          Gemini Summary
                        </p>
                        <p className="text-xs text-slate-500 italic line-clamp-2 leading-relaxed">
                          {entry.aiSummary}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="relative mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                    <div className="flex items-center space-x-1 text-slate-400 text-[11px]">
                      <Tag className="h-3 w-3" />
                      <span>{entry.tags.length > 0 ? entry.tags.slice(0, 2).join(", ") : "No tags"}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {onDeleteJournal && (
                        <button
                          id={`dash-delete-btn-${entry.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setJournalToDelete(entry);
                          }}
                          title="Delete entry"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectJournal(entry);
                        }}
                        className="font-semibold text-slate-700 group-hover:text-indigo-600 flex items-center cursor-pointer hover:underline"
                      >
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        <span>View</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Brainstorming Chats (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              Gemini Assistant
            </h2>
            <button
              onClick={() => onNavigate("chat")}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
            >
              <span>Open Chat</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {conversations.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm">
              <div className="w-10 h-10 mx-auto rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-2">
                <MessageSquare className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold text-slate-800">No conversations yet</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Gemini is available anytime to explore thoughts, brainstorm, or guide your debrief.
              </p>
              <button
                onClick={() => onNavigate("chat")}
                className="mt-4 inline-flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
              >
                <Compass className="h-3.5 w-3.5 text-indigo-600" />
                <span>Start Brainstorm</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.slice(0, 4).map((conv) => {
                const lastMsg = conv.messages[conv.messages.length - 1];
                return (
                  <div
                    key={conv.id}
                    id={`dash-conv-${conv.id}`}
                    onClick={() => onSelectConversation(conv)}
                    className="group rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span className="font-bold text-slate-800 group-hover:text-indigo-700 truncate max-w-[170px]">
                        {conv.title}
                      </span>
                      <span className="text-[10px]">{formatDate(conv.updatedAt)}</span>
                    </div>

                    {conv.journalTitle && (
                      <div className="text-[11px] text-indigo-600 font-semibold truncate mb-1">
                        Linked to: {conv.journalTitle}
                      </div>
                    )}

                    <p className="text-xs text-slate-500 line-clamp-2">
                      {lastMsg ? lastMsg.content : "Session started"}
                    </p>

                    <div className="mt-2 text-right text-[11px] font-semibold text-indigo-600 group-hover:underline">
                      Continue conversation &rarr;
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {journalToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Delete Journal Entry?
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete &ldquo;
              <strong className="text-slate-800">{journalToDelete.title}</strong>
              &rdquo;? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setJournalToDelete(null)}
                disabled={isDeleting}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="dash-confirm-delete-btn"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
