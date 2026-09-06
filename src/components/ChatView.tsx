import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Sparkles,
  Plus,
  Trash2,
  Paperclip,
  X,
  MessageSquare,
  AlertCircle,
  Copy,
  Check,
  Compass,
  ArrowLeft,
} from "lucide-react";
import {
  Conversation,
  ChatMessage,
  JournalEntry,
  ViewPage,
} from "../types";
import { useAuth } from "../context/AuthContext";
import { saveConversation, deleteConversation } from "../lib/firebase";
import { sendChatMessage } from "../lib/geminiApi";

interface ChatViewProps {
  conversations: Conversation[];
  journals: JournalEntry[];
  activeConversation: Conversation | null;
  initialContext?: { title: string; content: string; mood: string; journalId?: string } | null;
  onNavigate: (page: ViewPage) => void;
  onSelectConversation: (conv: Conversation | null) => void;
}

const STARTER_PROMPTS = [
  "I have a lot on my mind. Can you help me sort out my priorities?",
  "Reflect on my day with me and ask 3 grounding questions.",
  "Brainstorm 5 creative angles for a project I've been hesitating on.",
  "What is a fresh, compassionate perspective on feeling overwhelmed?",
];

export const ChatView: React.FC<ChatViewProps> = ({
  conversations,
  journals,
  activeConversation,
  initialContext,
  onNavigate,
  onSelectConversation,
}) => {
  const { user } = useAuth();

  const [currentConvId, setCurrentConvId] = useState<string | null>(
    activeConversation?.id || null
  );
  const [messages, setMessages] = useState<ChatMessage[]>(
    activeConversation?.messages || []
  );
  const [inputMessage, setInputMessage] = useState("");
  const [selectedJournalId, setSelectedJournalId] = useState<string | null>(
    initialContext?.journalId || activeConversation?.journalId || null
  );

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeConversation) {
      setCurrentConvId(activeConversation.id);
      setMessages(activeConversation.messages);
      setSelectedJournalId(activeConversation.journalId || null);
    } else {
      setCurrentConvId(null);
      setMessages([]);
      if (initialContext?.journalId) {
        setSelectedJournalId(initialContext.journalId);
      }
    }
  }, [activeConversation, initialContext]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const activeJournal = journals.find((j) => j.id === selectedJournalId);

  const handleStartNewChat = () => {
    onSelectConversation(null);
    setCurrentConvId(null);
    setMessages([]);
    setErrorMessage(null);
    setSelectedJournalId(null);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading || !user) return;

    setErrorMessage(null);
    setLastFailedText(null);
    setInputMessage("");

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Build journal context if attached
      const journalContext = activeJournal
        ? {
            title: activeJournal.title,
            content: activeJournal.content,
            mood: activeJournal.mood,
          }
        : initialContext
        ? {
            title: initialContext.title,
            content: initialContext.content,
            mood: initialContext.mood,
          }
        : null;

      // Send to server-side Gemini API
      const reply = await sendChatMessage(
        newMessages.map((m) => ({ role: m.role, content: m.content })),
        journalContext
      );

      const aiMsg: ChatMessage = {
        id: `msg_${Date.now()}_a`,
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString(),
      };

      const updatedHistory = [...newMessages, aiMsg];
      setMessages(updatedHistory);

      // Generate a title for the session from the first prompt
      const title =
        activeConversation?.title ||
        (text.length > 40 ? `${text.slice(0, 40)}...` : text);

      // Persist to Cloud Firestore
      const convId = await saveConversation(
        user.uid,
        {
          title,
          messages: updatedHistory,
          journalId: selectedJournalId || initialContext?.journalId || null,
          journalTitle:
            activeJournal?.title || initialContext?.title || null,
        },
        currentConvId || undefined
      );

      if (!currentConvId) {
        setCurrentConvId(convId);
      }
    } catch (err: unknown) {
      console.error("Chat error:", err);
      setLastFailedText(text);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Could not reach Gemini. Please check your connection."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteConversation(user.uid, convId);
      if (currentConvId === convId) {
        handleStartNewChat();
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const formatTime = (iso: string) => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return "";
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-4rem)] flex flex-col font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigate("dashboard")}
            className="flex md:hidden h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2.5">
              <span>Gemini Brainstorm & Reflection</span>
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-100">
                <Sparkles className="mr-1 h-3 w-3 text-indigo-600" />
                gemini-3.8-flash
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Conversational journaling partner • Non-clinical & private
            </p>
          </div>
        </div>

        <button
          id="chat-new-session-btn"
          onClick={handleStartNewChat}
          className="inline-flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 transition cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Main Chat Layout (Sidebar + Chat Canvas) */}
      <div className="flex-1 mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-hidden">
        {/* Left Sidebar: Previous Conversations */}
        <div className="hidden md:flex flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Conversations ({conversations.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 mt-3 pr-1">
            {conversations.length === 0 ? (
              <p className="text-xs text-slate-400 p-2 text-center font-medium">
                No past chat history
              </p>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  id={`chat-history-item-${c.id}`}
                  onClick={() => onSelectConversation(c)}
                  className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs transition cursor-pointer ${
                    currentConvId === c.id
                      ? "bg-indigo-600 text-white font-semibold shadow-xs"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <MessageSquare
                      className={`h-3.5 w-3.5 shrink-0 ${
                        currentConvId === c.id ? "text-white" : "text-slate-400"
                      }`}
                    />
                    <span className="truncate">{c.title}</span>
                  </div>

                  <button
                    onClick={(e) => handleDeleteConversation(e, c.id)}
                    title="Delete session"
                    className={`opacity-0 group-hover:opacity-100 p-1 rounded-md transition ${
                      currentConvId === c.id
                        ? "text-indigo-200 hover:text-white"
                        : "text-slate-400 hover:text-rose-600"
                    }`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Canvas: Chat Stream */}
        <div className="md:col-span-3 flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          {/* Active Journal Context Indicator */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 text-xs">
            <div className="flex items-center space-x-2">
              <Paperclip className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-slate-500 font-medium">Context:</span>
              {activeJournal ? (
                <span className="rounded-lg bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-indigo-700 font-semibold">
                  {activeJournal.title}
                </span>
              ) : (
                <span className="text-slate-400 italic font-medium">No entry attached</span>
              )}
            </div>

            {/* Dropdown to attach a journal */}
            <select
              id="chat-attach-journal-select"
              value={selectedJournalId || ""}
              onChange={(e) => setSelectedJournalId(e.target.value || null)}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-hidden max-w-[200px] truncate shadow-xs cursor-pointer"
            >
              <option value="">Attach journal...</option>
              {journals.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3 shadow-xs">
                  <Compass className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  What would you like to explore today?
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
                  Ask Gemini to reflect on your day, brainstorm creative projects, or
                  unpack complicated thoughts in a safe, non-judgmental space.
                </p>

                {/* Starters */}
                <div className="mt-6 w-full space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Try starting with:
                  </span>
                  {STARTER_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      id={`chat-starter-${idx}`}
                      onClick={() => handleSendMessage(prompt)}
                      className="w-full text-left rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-indigo-50/60 hover:border-indigo-200 p-3 text-xs text-slate-700 transition cursor-pointer font-medium"
                    >
                      &ldquo;{prompt}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id || idx}
                    id={`chat-msg-${idx}`}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center space-x-1.5 mb-1 px-1 text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-600">
                        {isUser ? "You" : "Gemini"}
                      </span>
                      <span>•</span>
                      <span>{formatTime(msg.timestamp)}</span>
                    </div>

                    <div
                      className={`relative group max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-xs ${
                        isUser
                          ? "bg-indigo-600 text-white rounded-br-xs font-medium"
                          : "bg-slate-50 text-slate-800 rounded-bl-xs border border-slate-100"
                      }`}
                    >
                      <div className="whitespace-pre-wrap font-sans">
                        {msg.content}
                      </div>

                      {!isUser && (
                        <button
                          onClick={() => handleCopy(msg.content, idx)}
                          title="Copy response"
                          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 rounded-lg transition bg-white shadow-xs"
                        >
                          {copiedIndex === idx ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex flex-col items-start space-y-1">
                <div className="px-1 text-[11px] text-slate-400 font-semibold">Gemini</div>
                <div className="rounded-2xl rounded-bl-xs bg-indigo-50 border border-indigo-100 px-4 py-3 text-xs text-indigo-900 flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 animate-spin text-indigo-600" />
                  <span className="font-medium">Gemini is contemplating your thoughts...</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start justify-between font-medium">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Notice:</span> {errorMessage}
                  </div>
                </div>
                {lastFailedText && (
                  <button
                    type="button"
                    onClick={() => handleSendMessage(lastFailedText)}
                    disabled={isLoading}
                    className="ml-3 underline text-rose-900 font-bold shrink-0 hover:text-rose-700 cursor-pointer"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="border-t border-slate-100 bg-white p-3 sm:p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-2"
            >
              <input
                id="chat-input-field"
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Message Gemini... ask for advice, brainstorming ideas, or a calm reflection..."
                disabled={isLoading}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-100 shadow-xs"
              />
              <button
                id="chat-send-btn"
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 transition cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
