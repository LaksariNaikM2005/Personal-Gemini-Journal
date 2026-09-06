import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Tag,
  Smile,
  Sparkles,
  MessageSquare,
  Edit3,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Send,
  RotateCcw,
} from "lucide-react";
import { JournalEntry, JournalMessage, ViewPage } from "../types";
import { useAuth } from "../context/AuthContext";
import { deleteJournal, updateJournal, addMessage, subscribeMessages } from "../services/journalService";
import { requestSummary, sendChatMessage } from "../lib/geminiApi";

interface JournalDetailsViewProps {
  journal: JournalEntry;
  onNavigate: (page: ViewPage) => void;
  onEditJournal: (journal: JournalEntry) => void;
  onContinueInChat: (context: { title: string; content: string; mood: string; journalId: string }) => void;
  onJournalDeleted: () => void;
}

const moodColorMap: Record<string, string> = {
  Happy: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Calm: "bg-teal-50 text-teal-700 border-teal-100",
  Excited: "bg-amber-50 text-amber-700 border-amber-100",
  Neutral: "bg-slate-100 text-slate-700 border-slate-200",
  Stressed: "bg-rose-50 text-rose-700 border-rose-100",
  Sad: "bg-indigo-50 text-indigo-700 border-indigo-100",
  Frustrated: "bg-orange-50 text-orange-700 border-orange-100",
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

const STARTER_REFLECTIONS = [
  "What recurring themes do you notice in my thoughts here?",
  "How can I gently reframe this situation for tomorrow?",
  "What is one actionable small step I could take next?",
];

export const JournalDetailsView: React.FC<JournalDetailsViewProps> = ({
  journal,
  onNavigate,
  onEditJournal,
  onContinueInChat,
  onJournalDeleted,
}) => {
  const { user } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [currentSummary, setCurrentSummary] = useState(journal.aiSummary || "");
  const [summaryKeyPoints, setSummaryKeyPoints] = useState<string[]>([]);
  const [summaryReflectionQuestion, setSummaryReflectionQuestion] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Subcollection messages for this journal entry
  const [messages, setMessages] = useState<JournalMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [askGeminiForReflect, setAskGeminiForReflect] = useState(true);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeMessages(
      journal.id,
      (msgs) => {
        setMessages(msgs);
      },
      (err) => {
        console.warn("Messages subscription warning:", err);
      }
    );
    return () => unsub();
  }, [journal.id, user]);

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    try {
      setIsDeleting(true);
      setErrorMsg(null);
      await deleteJournal(journal.id);
      setShowDeleteModal(false);
      onJournalDeleted();
    } catch (err: unknown) {
      console.error("Delete failed:", err);
      setErrorMsg("Failed to delete entry. Please check your permissions.");
      setIsDeleting(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!user) return;
    try {
      setIsSummarizing(true);
      setErrorMsg(null);
      const res = await requestSummary({
        title: journal.title,
        content: journal.content,
        mood: journal.mood,
        tags: journal.tags,
      });
      setCurrentSummary(res.summary);
      setSummaryKeyPoints(res.keyPoints || []);
      setSummaryReflectionQuestion(res.reflectionQuestion || "");
      // Persist summary to Firestore without overwriting original content
      await updateJournal(journal.id, { aiSummary: res.summary });
    } catch (err) {
      console.error("Summary failed:", err);
      setErrorMsg("Could not generate summary at this moment.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSendJournalMessage = async (customText?: string) => {
    if (!user || isSendingMessage) return;
    const content = (customText || messageInput).trim();
    if (!content) return;

    setMessageInput("");
    setIsSendingMessage(true);
    setErrorMsg(null);
    setLastFailedMessage(null);

    try {
      // 1. Store user message in subcollection users/{uid}/journals/{journalId}/messages/{messageId}
      await addMessage(journal.id, {
        role: "user",
        content,
      });

      // 2. If askGemini is enabled, call server API with conversation history context
      if (askGeminiForReflect) {
        const conversationHistory = [
          ...messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          { role: "user" as const, content },
        ];

        const reply = await sendChatMessage(
          conversationHistory,
          {
            title: journal.title,
            content: journal.content,
            mood: journal.mood,
          }
        );

        // 3. Store assistant response in subcollection
        await addMessage(journal.id, {
          role: "assistant",
          content: reply,
        });
      }
    } catch (err: unknown) {
      console.error("Failed to add message:", err);
      setLastFailedMessage(content);
      setErrorMsg("Unable to reach Gemini reflection. You can retry below.");
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      {/* Top breadcrumbs & actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <button
          id="details-back-btn"
          onClick={() => onNavigate("history")}
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to All Journals</span>
        </button>

        <div className="flex items-center space-x-2.5">
          <button
            id="details-chat-btn"
            onClick={() =>
              onContinueInChat({
                title: journal.title,
                content: journal.content,
                mood: journal.mood,
                journalId: journal.id,
              })
            }
            className="inline-flex items-center space-x-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100/70 transition cursor-pointer shadow-xs"
          >
            <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
            <span>Brainstorm in Chat</span>
          </button>

          <button
            id="details-edit-btn"
            onClick={() => onEditJournal(journal)}
            className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-xs"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Edit</span>
          </button>

          <button
            id="details-delete-btn"
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer shadow-xs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium flex items-center justify-between">
          <span>{errorMsg}</span>
          {lastFailedMessage && (
            <button
              onClick={() => handleSendJournalMessage(lastFailedMessage)}
              disabled={isSendingMessage}
              className="inline-flex items-center space-x-1 text-xs font-bold text-rose-800 underline ml-3 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}

      {/* Main Journal Article */}
      <article className="rounded-2xl border border-slate-100 bg-white p-6 sm:p-10 shadow-sm space-y-6">
        {/* Header Metadata */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                moodColorMap[journal.mood] || "bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              <Smile className="mr-1.5 h-3.5 w-3.5" />
              {journal.mood}
            </span>

            <span className="inline-flex items-center text-xs text-slate-400 font-medium">
              <Calendar className="mr-1 h-3.5 w-3.5" />
              {formatDate(journal.createdAt)}
            </span>

            {journal.updatedAt !== journal.createdAt && (
              <span className="inline-flex items-center text-[11px] text-slate-400">
                <Clock className="mr-1 h-3 w-3" />
                Updated {formatDate(journal.updatedAt)}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
            {journal.title || "Untitled Entry"}
          </h1>
        </div>

        {/* PART C: AI Journal Summary Card */}
        {currentSummary ? (
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50/50 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-indigo-100/60 pb-3">
              <div className="flex items-center space-x-2">
                <div className="h-7 w-7 rounded-lg bg-indigo-100/80 text-indigo-700 flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    AI Journal Summary Card
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Non-destructive reflection synthesis
                  </p>
                </div>
              </div>
              <button
                id="btn-regenerate-summary"
                onClick={handleGenerateSummary}
                disabled={isSummarizing}
                className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSummarizing ? "animate-spin" : ""}`} />
                <span>Regenerate Summary</span>
              </button>
            </div>

            {/* 1. Summary */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Summary
              </span>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                {currentSummary}
              </p>
            </div>

            {/* 2. Key Points */}
            {summaryKeyPoints.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Key Points
                </span>
                <ul className="space-y-1">
                  {summaryKeyPoints.map((pt, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start space-x-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 3. Mood & Tags Row */}
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-indigo-100/40">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2">
                  Mood:
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                    moodColorMap[journal.mood] || "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  <Smile className="mr-1 h-3 w-3" />
                  {journal.mood}
                </span>
              </div>

              {journal.tags && journal.tags.length > 0 && (
                <div className="flex items-center flex-wrap gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                    Tags:
                  </span>
                  {journal.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Reflection Question */}
            {summaryReflectionQuestion && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 space-y-1">
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                  Reflection Question
                </span>
                <p className="text-xs text-indigo-900 font-medium italic">
                  &ldquo;{summaryReflectionQuestion}&rdquo;
                </p>
              </div>
            )}

            <div className="text-[11px] text-slate-400 italic">
              Original journal content is preserved untouched.
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-800">
                  AI Journal Summary Card
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Synthesize summary, key points, and reflection question without modifying your entry.
                </p>
              </div>
            </div>
            <button
              id="btn-generate-summary"
              onClick={handleGenerateSummary}
              disabled={isSummarizing}
              className="inline-flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-xs cursor-pointer"
            >
              {isSummarizing && <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />}
              <span>Generate Summary Card</span>
            </button>
          </div>
        )}

        {/* Entry Body */}
        <div className="border-t border-slate-100 pt-6">
          <div className="text-base sm:text-lg text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
            {journal.content}
          </div>
        </div>

        {/* Tags */}
        {journal.tags && journal.tags.length > 0 && (
          <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-slate-400 mr-1" />
            {journal.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </article>

      {/* Subcollection: Journal Reflections & Notes */}
      <section className="rounded-2xl border border-slate-100 bg-white p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Entry Debrief & Reflection Thread
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {messages.length} {messages.length === 1 ? "note" : "notes"} in subcollection
          </span>
        </div>

        {/* Message stream */}
        {messages.length === 0 ? (
          <div className="py-4 text-center space-y-3">
            <p className="text-xs text-slate-400 italic">
              No reflection notes attached yet. Ask Gemini for an empathetic follow-up or explore a question below:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTER_REFLECTIONS.map((st, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendJournalMessage(st)}
                  disabled={isSendingMessage}
                  className="rounded-xl border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-100/70 px-3 py-1.5 text-xs text-indigo-800 transition cursor-pointer font-medium"
                >
                  &ldquo;{st}&rdquo;
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`p-3.5 rounded-xl text-xs sm:text-sm leading-relaxed ${
                  m.role === "assistant"
                    ? "bg-indigo-50/60 border border-indigo-100 text-slate-800"
                    : "bg-slate-50 border border-slate-200 text-slate-800"
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
                  <span className={m.role === "assistant" ? "text-indigo-600" : "text-slate-700"}>
                    {m.role === "assistant" ? "Gemini Reflection" : (user?.displayName || "You")}
                  </span>
                  <span>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            ))}

            {isSendingMessage && (
              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 flex items-center space-x-2">
                <Sparkles className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                <span>Gemini is contemplating your thoughts...</span>
              </div>
            )}
          </div>
        )}

        {/* Message Input Box */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={askGeminiForReflect}
                onChange={(e) => setAskGeminiForReflect(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Ask Gemini to reflect on this note</span>
            </label>
            <span className="text-[11px] text-slate-400">Stored in subcollection • Max 2,000 chars</span>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={messageInput}
              maxLength={2000}
              disabled={isSendingMessage}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendJournalMessage();
                }
              }}
              placeholder="Add a follow-up reflection or question..."
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-hidden transition"
            />
            <button
              id="entry-send-message-btn"
              onClick={() => handleSendJournalMessage()}
              disabled={isSendingMessage || !messageInput.trim()}
              className="inline-flex items-center space-x-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-semibold text-white transition disabled:opacity-50 cursor-pointer"
            >
              {isSendingMessage ? (
                <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Send</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Delete Journal Entry?
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Are you sure you want to delete &ldquo;{journal.title}&rdquo;? This action
              cannot be undone and the entry will be permanently removed from your Firestore database.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center space-x-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 shadow-sm cursor-pointer"
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
