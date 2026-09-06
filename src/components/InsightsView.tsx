import React, { useState } from "react";
import {
  TrendingUp,
  Smile,
  Calendar,
  Tag,
  BookOpen,
  Sparkles,
  ArrowRight,
  Flame,
  PieChart,
  Compass,
  CheckCircle2,
  Target,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { JournalEntry, ViewPage } from "../types";
import { requestGrowthRadar, GrowthRadarResult } from "../lib/geminiApi";
import { MoodTrendChart } from "./MoodTrendChart";

interface InsightsViewProps {
  journals: JournalEntry[];
  onNavigate: (page: ViewPage) => void;
  onSelectJournal?: (journal: JournalEntry) => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({
  journals,
  onNavigate,
  onSelectJournal,
}) => {
  const [radarResult, setRadarResult] = useState<GrowthRadarResult | null>(null);
  const [isGeneratingRadar, setIsGeneratingRadar] = useState(false);
  const [radarError, setRadarError] = useState<string | null>(null);

  // Compute analytics
  const totalEntries = journals.length;
  const totalWords = journals.reduce((acc, j) => acc + (j.content ? j.content.split(/\s+/).filter(Boolean).length : 0), 0);
  const avgWords = totalEntries > 0 ? Math.round(totalWords / totalEntries) : 0;

  // Mood counts
  const moodCounts: Record<string, number> = {};
  journals.forEach((j) => {
    const m = j.mood || "Reflective";
    moodCounts[m] = (moodCounts[m] || 0) + 1;
  });

  const sortedMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);

  // Tag frequency
  const tagCounts: Record<string, number> = {};
  journals.forEach((j) => {
    (j.tags || []).forEach((t) => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });

  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Journal streak approximation (unique days)
  const uniqueDays = new Set(
    journals.map((j) => new Date(j.createdAt).toISOString().split("T")[0])
  );
  const streakCount = uniqueDays.size;

  const handleGenerateRadar = async () => {
    if (journals.length === 0) return;
    try {
      setIsGeneratingRadar(true);
      setRadarError(null);
      const payload = journals.slice(0, 25).map((j) => ({
        title: j.title || "Untitled",
        createdAt: new Date(j.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        mood: j.mood || "Reflective",
        content: (j.content || "").slice(0, 1200),
        tags: j.tags || [],
      }));

      const res = await requestGrowthRadar(payload);
      setRadarResult(res);
    } catch (err: unknown) {
      console.error("Growth radar generation failed:", err);
      setRadarError("Unable to synthesize Personal Growth Radar right now. Please try again.");
    } finally {
      setIsGeneratingRadar(false);
    }
  };

  const moodColorMap: Record<string, { bg: string; text: string; bar: string }> = {
    Grateful: { bg: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-500" },
    Inspired: { bg: "bg-indigo-50", text: "text-indigo-700", bar: "bg-indigo-500" },
    Peaceful: { bg: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-500" },
    Reflective: { bg: "bg-slate-100", text: "text-slate-700", bar: "bg-slate-500" },
    Energized: { bg: "bg-amber-50", text: "text-amber-700", bar: "bg-amber-500" },
    Balanced: { bg: "bg-sky-50", text: "text-sky-700", bar: "bg-sky-500" },
    Overwhelmed: { bg: "bg-rose-50", text: "text-rose-700", bar: "bg-rose-500" },
    Anxious: { bg: "bg-purple-50", text: "text-purple-700", bar: "bg-purple-500" },
    Melancholy: { bg: "bg-slate-100", text: "text-slate-600", bar: "bg-slate-400" },
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-2 text-indigo-600 mb-1">
          <TrendingUp className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Self-Discovery Analytics</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Journal Insights & Growth
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Review your emotional rhythms, writing habits, and frequent life themes across your private journal entries.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
            Total Entries
          </p>
          <h3 className="text-3xl font-bold text-slate-900">{totalEntries}</h3>
          <p className="mt-2 text-xs text-slate-400">Captured in secure vault</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
            Words Written
          </p>
          <h3 className="text-3xl font-bold text-indigo-600">{totalWords.toLocaleString()}</h3>
          <p className="mt-2 text-xs text-indigo-500">Avg {avgWords} words/entry</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
            Active Days
          </p>
          <div className="flex items-center gap-2">
            <h3 className="text-3xl font-bold text-amber-500">{streakCount}</h3>
            <Flame className="h-5 w-5 text-amber-500" />
          </div>
          <p className="mt-2 text-xs text-amber-600">Reflection sessions logged</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
            Dominant Mood
          </p>
          <h3 className="text-2xl font-bold text-emerald-600 truncate">
            {sortedMoods.length > 0 ? sortedMoods[0][0] : "None"}
          </h3>
          <p className="mt-2 text-xs text-slate-400">
            {sortedMoods.length > 0 ? `${sortedMoods[0][1]} entries recorded` : "Awaiting first log"}
          </p>
        </div>
      </div>

      {/* 30-Day Mood Trends Line Chart (Recharts) */}
      <MoodTrendChart
        journals={journals}
        onSelectJournal={onSelectJournal}
        onNavigate={onNavigate}
      />

      {/* Personal Growth Radar (AI-Powered) */}
      <div className="rounded-2xl border border-indigo-100 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Compass className="h-4 w-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Personal Growth Radar
              </h2>
              <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-600/20 ring-inset">
                <Sparkles className="mr-1 h-3 w-3" />
                Gemini AI
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Synthesizes life themes, goal trajectories, and constructive weekly focuses across your entries.
            </p>
          </div>

          <button
            id="btn-generate-radar"
            onClick={handleGenerateRadar}
            disabled={isGeneratingRadar || journals.length === 0}
            className="inline-flex items-center space-x-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            {isGeneratingRadar ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Synthesizing Radar...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>{radarResult ? "Refresh Growth Radar" : "Generate Growth Radar"}</span>
              </>
            )}
          </button>
        </div>

        {/* Clinical Disclaimer */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-[11px] text-amber-800 flex items-start space-x-2">
          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Self-Reflection Notice:</strong> The Personal Growth Radar synthesizes patterns strictly to encourage mindful personal reflection and intentional goal-setting. It is not intended as medical, therapeutic, or psychological diagnosis.
          </span>
        </div>

        {radarError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
            {radarError}
          </div>
        )}

        {!radarResult && !isGeneratingRadar && (
          <div className="py-8 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <Compass className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-700">Radar Not Yet Generated</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
              Click &ldquo;Generate Growth Radar&rdquo; to analyze your recent reflections for goals, progress, challenges, and life dimensions.
            </p>
          </div>
        )}

        {radarResult && (
          <div className="space-y-6">
            {/* Overall Summary */}
            <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                High-Level Perspective
              </span>
              <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                {radarResult.overallSummary}
              </p>
            </div>

            {/* Radar Dimensions */}
            {radarResult.categories && radarResult.categories.length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Growth Radar Dimensions
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {radarResult.categories.map((cat, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-800">{cat.name}</span>
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {cat.score}/10
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-600"
                          style={{ width: `${Math.min(100, (cat.score / 10) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        {cat.highlight}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4-Card Insight Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Recurring Themes */}
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/40 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Recurring Themes</span>
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {radarResult.recurringThemes?.map((theme, i) => (
                    <span
                      key={i}
                      className="inline-block px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-2xs"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>

              {/* Frequently Mentioned Goals */}
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/40 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Frequently Mentioned Goals</span>
                </span>
                <ul className="space-y-1.5 text-xs text-slate-700 pt-1">
                  {radarResult.goalsMentioned?.map((goal, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <span>{goal}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Positive Progress Noticed */}
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/40 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Positive Progress Noticed</span>
                </span>
                <ul className="space-y-1.5 text-xs text-slate-700 pt-1">
                  {radarResult.positiveProgress?.map((prog, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{prog}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Common Challenges */}
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/40 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <span>Common Challenges</span>
                </span>
                <ul className="space-y-1.5 text-xs text-slate-700 pt-1">
                  {radarResult.commonChallenges?.map((chal, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <span>{chal}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Suggested Focus & Reflection Question */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Suggested Focus for Coming Week</span>
                </span>
                <p className="text-xs text-slate-800 font-medium leading-relaxed">
                  {radarResult.suggestedWeeklyFocus}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Thoughtful Reflection Question</span>
                </span>
                <blockquote className="text-xs italic text-slate-800 leading-relaxed">
                  &ldquo;{radarResult.reflectionQuestion}&rdquo;
                </blockquote>
              </div>
            </div>
          </div>
        )}
      </div>

      {totalEntries === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-700">No insight data available yet</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Write your first reflections to generate emotional distribution maps and writing analytics.
          </p>
          <button
            onClick={() => onNavigate("new-journal")}
            className="mt-4 inline-flex items-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition cursor-pointer"
          >
            <span>Create Journal Entry</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Mood Distribution */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Smile className="h-4 w-4 text-indigo-600" />
                <span>Emotional Tone Distribution</span>
              </h2>
              <span className="text-xs text-slate-400">{sortedMoods.length} moods recorded</span>
            </div>

            <div className="space-y-3 pt-1">
              {sortedMoods.map(([mood, count]) => {
                const pct = Math.round((count / totalEntries) * 100);
                const colors = moodColorMap[mood] || {
                  bg: "bg-slate-100",
                  text: "text-slate-700",
                  bar: "bg-indigo-500",
                };
                return (
                  <div key={mood} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{mood}</span>
                      <span className="text-slate-400">{count} entries ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Frequent Themes & Tags */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Tag className="h-4 w-4 text-indigo-600" />
                <span>Recurring Themes & Tags</span>
              </h2>
              <span className="text-xs text-slate-400">{sortedTags.length} themes</span>
            </div>

            {sortedTags.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">
                Add tags to your journal entries to track recurring life domains and themes.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 pt-1">
                {sortedTags.map(([tag, count]) => (
                  <div
                    key={tag}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between"
                  >
                    <span className="text-xs font-semibold text-slate-700 truncate max-w-[120px]">
                      #{tag}
                    </span>
                    <span className="text-[11px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
                      {count}x
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => onNavigate("ask-my-journal")}
                className="w-full inline-flex items-center justify-center space-x-2 rounded-xl border border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50 py-2.5 text-xs font-semibold text-indigo-700 transition cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Ask Gemini about your patterns</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
