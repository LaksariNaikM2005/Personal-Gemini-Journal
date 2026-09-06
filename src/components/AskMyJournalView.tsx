import React, { useState } from "react";
import {
  Sparkles,
  Search,
  BookOpen,
  ArrowRight,
  HelpCircle,
  Calendar,
  Smile,
  Tag,
  Lightbulb,
  ShieldCheck,
} from "lucide-react";
import { JournalEntry, ViewPage } from "../types";
import { requestAskJournal } from "../lib/geminiApi";

interface AskMyJournalViewProps {
  journals: JournalEntry[];
  onNavigate: (page: ViewPage) => void;
  onSelectJournal: (journal: JournalEntry) => void;
}

const STOP_WORDS = new Set([
  "a", "about", "all", "am", "an", "and", "any", "are", "as", "at", "be",
  "been", "can", "do", "for", "from", "have", "i", "in", "is", "it", "my",
  "of", "on", "or", "so", "that", "the", "this", "to", "was", "what", "which",
  "who", "will", "with", "would", "you", "your"
]);

/**
 * Intelligent context-selection strategy:
 * 1. Filters user's own journals (guaranteed by auth UID scope)
 * 2. Scores relevance against query tokens (tags, title, content, mood) + recency
 * 3. Limits to top 10 relevant entries and truncates length
 */
function selectRelevantJournals(query: string, allJournals: JournalEntry[]): JournalEntry[] {
  if (allJournals.length <= 10) {
    return allJournals;
  }

  const tokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  const scored = allJournals.map((j, index) => {
    let score = 0;
    const titleLower = (j.title || "").toLowerCase();
    const contentLower = (j.content || "").toLowerCase();
    const moodLower = (j.mood || "").toLowerCase();
    const tagsLower = (j.tags || []).map((t) => t.toLowerCase());

    for (const token of tokens) {
      if (titleLower.includes(token)) score += 4;
      if (tagsLower.some((t) => t.includes(token))) score += 5;
      if (moodLower.includes(token)) score += 3;
      if (contentLower.includes(token)) score += 1.5;
    }

    // Mild recency bonus for the top 5 newest entries
    if (index < 5) score += 1;

    return { entry: j, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 10).map((s) => s.entry);
}

export const AskMyJournalView: React.FC<AskMyJournalViewProps> = ({
  journals,
  onNavigate,
  onSelectJournal,
}) => {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [referencedEntries, setReferencedEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string>("");

  const sampleQuestions = [
    "What have I been worried about recently?",
    "What goals have I mentioned?",
    "What topics do I talk about most?",
    "What progress have I made?",
    "What challenges keep appearing?",
    "What am I excited about?",
    "What should I focus on this week?",
  ];

  const handleAsk = async (questionToAsk?: string) => {
    const q = (questionToAsk || query).trim();
    if (!q) return;

    if (journals.length === 0) {
      setErrorMsg("You have no journal entries yet. Write your first entry to ask Gemini questions!");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);
      setLastQuestion(q);

      // Apply intelligent context selection
      const relevant = selectRelevantJournals(q, journals);
      setReferencedEntries(relevant);

      const entriesPayload = relevant.map((j) => ({
        title: j.title || "Untitled",
        createdAt: new Date(j.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        mood: j.mood || "Reflective",
        content: (j.content || "").slice(0, 1200),
      }));

      const res = await requestAskJournal(q, entriesPayload);
      setAnswer(res);
      setQuery("");
    } catch (err: unknown) {
      console.error("Ask journal failed:", err);
      setErrorMsg("Unable to analyze your journals right now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-2 text-indigo-600 mb-1">
          <HelpCircle className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Semantic Self-Discovery</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Ask My Journal
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Ask questions about your own thoughts, goals and experiences.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="relative">
          <textarea
            id="ask-journal-input"
            rows={3}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleAsk();
              }
            }}
            placeholder="Ask questions about your own thoughts, goals and experiences... (e.g. 'What progress have I made?', 'What have I been worried about recently?')"
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-hidden transition"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>
              Searching {journals.length} {journals.length === 1 ? "entry" : "entries"} strictly in your private vault
            </span>
          </div>
          <button
            id="ask-journal-submit-btn"
            onClick={() => handleAsk()}
            disabled={isLoading || !query.trim() || journals.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Reflecting with Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Ask My Journal</span>
              </>
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Suggested Inquiries */}
      <div className="space-y-2.5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
          <span>Suggested Questions to Try</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {sampleQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(q);
                handleAsk(q);
              }}
              disabled={isLoading || journals.length === 0}
              className="text-left p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40 text-xs text-slate-700 font-medium transition disabled:opacity-50 cursor-pointer flex items-center justify-between group shadow-xs"
            >
              <span>&ldquo;{q}&rdquo;</span>
              <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-indigo-600 transform transition group-hover:translate-x-0.5 ml-2 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Answer Area */}
      {answer && (
        <div className="bg-white rounded-2xl border border-indigo-100 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800">
                  Gemini Synthesis
                </span>
                <p className="text-[11px] text-slate-400">
                  Grounded strictly in your journal history
                </p>
              </div>
            </div>
            {lastQuestion && (
              <span className="text-xs text-slate-500 italic max-w-sm truncate hidden sm:inline-block">
                &ldquo;{lastQuestion}&rdquo;
              </span>
            )}
          </div>

          <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line font-normal">
            {answer}
          </div>

          {/* Referenced Journal Entries */}
          {referencedEntries.length > 0 && (
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 space-y-2.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Referenced Journal Entries ({referencedEntries.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {referencedEntries.map((j) => (
                  <button
                    key={j.id}
                    onClick={() => onSelectJournal(j)}
                    className="p-2.5 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 text-left transition flex items-center justify-between group cursor-pointer shadow-2xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-indigo-600">
                        {j.title || "Untitled Entry"}
                      </p>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(j.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <Smile className="h-3 w-3" />
                        <span>{j.mood}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <span className="text-[11px] text-slate-400">
              Zero model training. Information derived solely from your private entries.
            </span>
            <button
              onClick={() => onNavigate("new-journal")}
              className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
            >
              <span>Write a follow-up journal entry</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Empty State if 0 journals */}
      {journals.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-700">No journals to query</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Once you log reflections, Gemini can answer questions, summarize your progress, and highlight recurring feelings.
          </p>
          <button
            onClick={() => onNavigate("new-journal")}
            className="mt-4 inline-flex items-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition cursor-pointer"
          >
            <span>Write your first entry</span>
          </button>
        </div>
      )}
    </div>
  );
};

