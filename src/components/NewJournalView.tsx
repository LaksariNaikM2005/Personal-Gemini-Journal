import React, { useState, useEffect } from "react";
import {
  Save,
  Sparkles,
  ArrowLeft,
  Smile,
  Tag,
  RefreshCw,
  MessageSquare,
  Check,
  AlertCircle,
  Brain,
  HelpCircle,
  Plus,
} from "lucide-react";
import { JournalEntry, MoodType, ViewPage } from "../types";
import { useAuth } from "../context/AuthContext";
import { createJournal, updateJournal } from "../services/journalService";
import {
  requestSummary,
  requestReflection,
  requestMoodAnalysis,
  requestTagSuggestions,
} from "../lib/geminiApi";

interface NewJournalViewProps {
  initialJournal?: JournalEntry | null;
  initialPrompt?: string;
  onNavigate: (page: ViewPage) => void;
  onJournalSaved: (journalId: string) => void;
  onContinueInChat: (context: { title: string; content: string; mood: string }) => void;
}

const ALL_MOODS: Array<{ name: MoodType; label: string; icon: string }> = [
  { name: "Happy", label: "Happy", icon: "😊" },
  { name: "Calm", label: "Calm", icon: "🌿" },
  { name: "Excited", label: "Excited", icon: "✨" },
  { name: "Neutral", label: "Neutral", icon: "😐" },
  { name: "Stressed", label: "Stressed", icon: "⚡" },
  { name: "Sad", label: "Sad", icon: "🌧️" },
  { name: "Frustrated", label: "Frustrated", icon: "🔥" },
  { name: "Peaceful", label: "Peaceful", icon: "🕊️" },
  { name: "Grateful", label: "Grateful", icon: "🙏" },
  { name: "Inspired", label: "Inspired", icon: "💡" },
  { name: "Reflective", label: "Reflective", icon: "🪞" },
  { name: "Balanced", label: "Balanced", icon: "⚖️" },
  { name: "Energized", label: "Energized", icon: "🚀" },
];

export const NewJournalView: React.FC<NewJournalViewProps> = ({
  initialJournal,
  initialPrompt,
  onNavigate,
  onJournalSaved,
  onContinueInChat,
}) => {
  const { user } = useAuth();

  const [title, setTitle] = useState(initialJournal?.title || "");
  const [content, setContent] = useState(
    initialJournal?.content || (initialPrompt ? `Prompt: ${initialPrompt}\n\n` : "")
  );
  const [mood, setMood] = useState<MoodType>(
    (initialJournal?.mood as MoodType) || "Reflective"
  );
  const [tags, setTags] = useState<string[]>(initialJournal?.tags || ["Daily"]);
  const [tagInput, setTagInput] = useState("");
  const [aiSummary, setAiSummary] = useState(initialJournal?.aiSummary || "");

  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isReflecting, setIsReflecting] = useState(false);
  const [reflectionResult, setReflectionResult] = useState<string | null>(null);

  // Phase 3: Mood Analysis & Tag Suggestion states
  const [isAnalyzingMood, setIsAnalyzingMood] = useState(false);
  const [moodExplanation, setMoodExplanation] = useState<string | null>(null);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState(false);

  useEffect(() => {
    if (initialJournal) {
      setTitle(initialJournal.title);
      setContent(initialJournal.content);
      setMood((initialJournal.mood as MoodType) || "Reflective");
      setTags(initialJournal.tags || []);
      setAiSummary(initialJournal.aiSummary || "");
    }
  }, [initialJournal]);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const clean = tagInput.trim().replace(/^#/, "");
      if (clean && !tags.includes(clean) && tags.length < 15) {
        setTags([...tags, clean]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleAddSuggestedTag = (tagToAdd: string) => {
    if (!tags.includes(tagToAdd) && tags.length < 15) {
      setTags([...tags, tagToAdd]);
    }
    setSuggestedTags(suggestedTags.filter((t) => t !== tagToAdd));
  };

  const handleSuggestMood = async () => {
    if (!content.trim() || content.length < 20) {
      setErrorMessage("Please write at least a few sentences so Gemini can suggest a mood reflection.");
      return;
    }
    try {
      setIsAnalyzingMood(true);
      setErrorMessage(null);
      const res = await requestMoodAnalysis(content, title);
      setMood(res.suggestedMood);
      setMoodExplanation(res.explanation);
    } catch (err) {
      console.error("Mood analysis error:", err);
      setErrorMessage("Could not suggest mood. Please select manually.");
    } finally {
      setIsAnalyzingMood(false);
    }
  };

  const handleSuggestTags = async () => {
    if (!content.trim() || content.length < 20) {
      setErrorMessage("Please write a bit more content so Gemini can identify themes for tags.");
      return;
    }
    try {
      setIsSuggestingTags(true);
      setErrorMessage(null);
      const suggestions = await requestTagSuggestions(content, title, tags);
      const filtered = suggestions.filter((t) => !tags.includes(t));
      setSuggestedTags(filtered);
    } catch (err) {
      console.error("Tag suggestion error:", err);
      setErrorMessage("Could not generate tag suggestions at this time.");
    } finally {
      setIsSuggestingTags(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      setErrorMessage("You must be signed in to save journal entries.");
      return;
    }
    if (!title.trim()) {
      setErrorMessage("Please give your journal entry a title.");
      return;
    }
    if (!content.trim()) {
      setErrorMessage("Please write some thoughts before saving.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);

      let savedId: string;
      if (initialJournal?.id) {
        await updateJournal(initialJournal.id, {
          title: title.trim(),
          content: content.trim(),
          mood,
          tags,
          aiSummary: aiSummary.trim(),
        });
        savedId = initialJournal.id;
      } else {
        const created = await createJournal({
          title: title.trim(),
          content: content.trim(),
          mood,
          tags,
          aiSummary: aiSummary.trim(),
        });
        savedId = created.id;
      }

      setSuccessNotice(true);
      setTimeout(() => {
        onJournalSaved(savedId);
      }, 600);
    } catch (err: unknown) {
      console.error("Save error:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to save journal. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!content.trim() || content.length < 20) {
      setErrorMessage("Write at least a few sentences before generating an AI summary.");
      return;
    }

    try {
      setIsGeneratingSummary(true);
      setErrorMessage(null);
      const res = await requestSummary({
        title: title || "Untitled",
        content,
        mood,
        tags,
      });
      setAiSummary(res.summary);
    } catch (err) {
      console.error("Summary error:", err);
      setErrorMessage("Could not generate summary. Check your network or API status.");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleGenerateReflection = async () => {
    if (!content.trim() || content.length < 20) {
      setErrorMessage("Write a bit more about your day or ideas so Gemini can reflect with you.");
      return;
    }

    try {
      setIsReflecting(true);
      setErrorMessage(null);
      const reflection = await requestReflection({
        title: title || "Today's Reflections",
        content,
        mood,
      });
      setReflectionResult(reflection);
    } catch (err) {
      console.error("Reflection error:", err);
      setErrorMessage("Could not generate reflection. Please try again.");
    } finally {
      setIsReflecting(false);
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 font-sans">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 mb-6">
        <div className="flex items-center space-x-3">
          <button
            id="new-jnl-back-btn"
            onClick={() => onNavigate("dashboard")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition cursor-pointer shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {initialJournal ? "Edit Journal Entry" : "New Journal Entry"}
            </h1>
            <p className="text-xs text-slate-500">
              Encrypted & privately stored in your personal Cloud Firestore
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            id="new-jnl-chat-bridge"
            type="button"
            onClick={() =>
              onContinueInChat({
                title: title || "Untitled Journal",
                content,
                mood,
              })
            }
            className="inline-flex items-center space-x-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-xs"
            title="Open conversational brainstorm with this entry"
          >
            <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
            <span>Brainstorm in Chat</span>
          </button>

          <button
            id="new-jnl-save-btn"
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center space-x-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60 transition cursor-pointer"
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-white" />
                <span>Saving...</span>
              </>
            ) : successNotice ? (
              <>
                <Check className="h-4 w-4 text-emerald-300" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Entry</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div
          id="new-jnl-error"
          className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-start space-x-2"
        >
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Notice:</span> {errorMessage}
          </div>
        </div>
      )}

      {/* Form Fields */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Writing Area (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title input */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Entry Title
            </label>
            <input
              id="new-jnl-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Morning Reflections, Project Breakthrough, Finding Peace..."
              maxLength={200}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-100 shadow-xs"
            />
          </div>

          {/* Mood Selector with Gemini AI Mood Suggestion */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Current Mood & Atmosphere
              </label>
              <button
                id="btn-gemini-suggest-mood"
                type="button"
                onClick={handleSuggestMood}
                disabled={isAnalyzingMood}
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 cursor-pointer"
                title="Gemini suggests an informal reflection mood label based on your text"
              >
                {isAnalyzingMood ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                <span>Suggest Mood with Gemini</span>
              </button>
            </div>

            {moodExplanation && (
              <div className="mb-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 p-2.5 text-xs text-indigo-900 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Smile className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <span>
                    <strong className="font-semibold">{mood}:</strong> {moodExplanation}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMoodExplanation(null)}
                  className="text-indigo-400 hover:text-indigo-700 text-xs ml-2"
                >
                  ×
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {ALL_MOODS.map((m) => (
                <button
                  key={m.name}
                  id={`mood-btn-${m.name}`}
                  type="button"
                  onClick={() => {
                    setMood(m.name);
                    setMoodExplanation(null);
                  }}
                  className={`inline-flex items-center space-x-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold border transition cursor-pointer ${
                    mood === m.name
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs ring-1 ring-indigo-600"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 italic">
              Notice: Mood is an informal reflection label, not a medical diagnosis. You can adjust anytime.
            </p>
          </div>

          {/* Content Textarea */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Journal Thoughts
              </label>
              <div className="text-[11px] text-slate-400 font-medium">
                {wordCount} words • {content.length} / 10,000 characters
              </div>
            </div>
            <textarea
              id="new-jnl-content-textarea"
              rows={14}
              value={content}
              maxLength={10000}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write freely... what happened today? What thoughts are turning in your mind? How did you respond to challenges?"
              className="w-full rounded-xl border border-slate-200 bg-white p-4 text-base text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-100 leading-relaxed shadow-xs"
            />
          </div>

          {/* Tags & Gemini Tag Suggestions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Tags
              </label>
              <button
                id="btn-gemini-suggest-tags"
                type="button"
                onClick={handleSuggestTags}
                disabled={isSuggestingTags}
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 cursor-pointer"
                title="Let Gemini suggest tags based on your writing"
              >
                {isSuggestingTags ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                <span>Suggest Tags with Gemini</span>
              </button>
            </div>

            {/* Suggested Tags Chips */}
            {suggestedTags.length > 0 && (
              <div className="mb-2.5 rounded-xl border border-indigo-100 bg-indigo-50/50 p-2.5">
                <div className="text-[11px] font-semibold text-indigo-900 mb-1.5 flex items-center justify-between">
                  <span>Suggested Tags (click to add):</span>
                  <button
                    type="button"
                    onClick={() => setSuggestedTags([])}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleAddSuggestedTag(tag)}
                      className="inline-flex items-center space-x-1 rounded-lg bg-white border border-indigo-200 px-2 py-0.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-600 hover:text-white transition cursor-pointer shadow-xs"
                    >
                      <Plus className="h-3 w-3" />
                      <span>{tag}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center space-x-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
                >
                  <span>#{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                id="new-jnl-tag-input"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Add tag (press Enter)..."
                className="flex-1 min-w-[120px] bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden px-1"
              />
            </div>
          </div>
        </div>

        {/* Gemini AI Side Panel (1 col) */}
        <div className="space-y-6">
          {/* AI Assist Box */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Gemini Reflection Assistant
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Supportive, private & non-clinical
                </p>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <button
                id="btn-gemini-summarize"
                type="button"
                onClick={handleGenerateSummary}
                disabled={isGeneratingSummary}
                className="w-full flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/60 px-3.5 py-2.5 text-xs font-semibold text-indigo-900 shadow-xs hover:bg-indigo-100/70 transition disabled:opacity-60 cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Brain className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Generate Summary & Insights</span>
                </div>
                {isGeneratingSummary && (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                )}
              </button>

              <button
                id="btn-gemini-reflect"
                type="button"
                onClick={handleGenerateReflection}
                disabled={isReflecting}
                className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition disabled:opacity-60 cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <HelpCircle className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Reflect & Deepen (3 Questions)</span>
                </div>
                {isReflecting && (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-600" />
                )}
              </button>
            </div>
          </div>

          {/* AI Summary View */}
          {aiSummary && (
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center space-x-1">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  <span>AI Executive Summary</span>
                </span>
                <button
                  type="button"
                  onClick={() => setAiSummary("")}
                  className="text-[11px] text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
                >
                  Clear
                </button>
              </div>
              <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                {aiSummary}
              </p>
            </div>
          )}

          {/* Reflection Result */}
          {reflectionResult && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center space-x-1">
                  <HelpCircle className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Gemini Reflective Guidance</span>
                </span>
                <button
                  type="button"
                  onClick={() => setReflectionResult(null)}
                  className="text-[11px] text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
              <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                {reflectionResult}
              </div>
            </div>
          )}

          {/* Privacy & non-clinical disclaimer */}
          <div className="rounded-2xl bg-slate-100/70 p-4 text-[11px] text-slate-500 leading-relaxed border border-slate-200">
            <span className="font-semibold text-slate-700">Safety & Ethics:</span>{" "}
            Gemini provides supportive journaling prompts and summaries. It does not
            replace licensed mental health care, diagnoses, or medical advice.
          </div>
        </div>
      </div>
    </div>
  );
};
