import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Dot,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Smile,
  Sparkles,
  Info,
  ArrowRight,
  Filter,
} from "lucide-react";
import { JournalEntry, ViewPage } from "../types";

interface MoodTrendChartProps {
  journals: JournalEntry[];
  onSelectJournal?: (journal: JournalEntry) => void;
  onNavigate?: (page: ViewPage) => void;
}

export const MOOD_SCORES: Record<string, number> = {
  Excited: 9,
  Inspired: 9,
  Happy: 8,
  Energized: 8,
  Grateful: 8,
  Peaceful: 7,
  Calm: 7,
  Balanced: 6,
  Reflective: 5,
  Neutral: 5,
  Melancholy: 4,
  Frustrated: 3,
  Stressed: 3,
  Sad: 2,
  Anxious: 2,
  Overwhelmed: 2,
};

function getMoodScore(mood: string): number {
  if (MOOD_SCORES[mood] !== undefined) {
    return MOOD_SCORES[mood];
  }
  const lower = (mood || "").toLowerCase();
  if (lower.includes("happy") || lower.includes("joy") || lower.includes("excite") || lower.includes("inspire")) return 8.5;
  if (lower.includes("peace") || lower.includes("calm") || lower.includes("grat")) return 7.5;
  if (lower.includes("balance") || lower.includes("good") || lower.includes("fine")) return 6.5;
  if (lower.includes("reflect") || lower.includes("neutr") || lower.includes("ponder")) return 5.0;
  if (lower.includes("tired") || lower.includes("melan") || lower.includes("down")) return 4.0;
  if (lower.includes("stress") || lower.includes("anx") || lower.includes("frust") || lower.includes("sad")) return 2.5;
  return 5.0;
}

function getScoreTier(score: number): { label: string; color: string; bg: string } {
  if (score >= 7.5) {
    return { label: "Uplifted & Joyful", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" };
  }
  if (score >= 6.0) {
    return { label: "Balanced & Calm", color: "text-sky-700", bg: "bg-sky-50 border-sky-200" };
  }
  if (score >= 4.5) {
    return { label: "Reflective & Centered", color: "text-slate-700", bg: "bg-slate-100 border-slate-200" };
  }
  return { label: "Challenging / Needs Care", color: "text-rose-700", bg: "bg-rose-50 border-rose-200" };
}

interface DayDataPoint {
  dateKey: string; // YYYY-MM-DD
  displayDate: string; // e.g. "Oct 12"
  fullDate: string; // e.g. "Saturday, Oct 12, 2026"
  score: number | null;
  entryCount: number;
  moods: string[];
  entries: JournalEntry[];
}

export const MoodTrendChart: React.FC<MoodTrendChartProps> = ({
  journals,
  onSelectJournal,
  onNavigate,
}) => {
  const [viewMode, setViewMode] = useState<"timeline" | "active-only">("timeline");
  const [selectedPoint, setSelectedPoint] = useState<DayDataPoint | null>(null);

  // Compute 30-day range
  const { chartData, stats, hasEntriesIn30Days } = useMemo(() => {
    const now = new Date();
    // Group journals by YYYY-MM-DD
    const dateMap = new Map<string, JournalEntry[]>();

    journals.forEach((j) => {
      try {
        const d = new Date(j.createdAt);
        if (!isNaN(d.getTime())) {
          const key = d.toISOString().split("T")[0];
          const existing = dateMap.get(key) || [];
          existing.push(j);
          dateMap.set(key, existing);
        }
      } catch {
        // ignore invalid dates
      }
    });

    // Generate consecutive 30 days ending today
    const days: DayDataPoint[] = [];
    let totalScoreSum = 0;
    let scoredDaysCount = 0;
    let entriesIn30Days = 0;
    const moodFrequencyMap: Record<string, number> = {};

    const firstHalfScores: number[] = [];
    const secondHalfScores: number[] = [];

    for (let i = 29; i >= 0; i--) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() - i);
      const key = targetDate.toISOString().split("T")[0];
      const dayEntries = dateMap.get(key) || [];

      const displayDate = targetDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const fullDate = targetDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      if (dayEntries.length > 0) {
        entriesIn30Days += dayEntries.length;
        scoredDaysCount++;

        const dayScores = dayEntries.map((e) => getMoodScore(e.mood));
        const dayAvg = Math.round((dayScores.reduce((a, b) => a + b, 0) / dayScores.length) * 10) / 10;
        totalScoreSum += dayAvg;

        if (i >= 15) {
          firstHalfScores.push(dayAvg);
        } else {
          secondHalfScores.push(dayAvg);
        }

        const moodsList: string[] = [];
        dayEntries.forEach((e) => {
          if (e.mood) {
            moodsList.push(e.mood);
            moodFrequencyMap[e.mood] = (moodFrequencyMap[e.mood] || 0) + 1;
          }
        });

        days.push({
          dateKey: key,
          displayDate,
          fullDate,
          score: dayAvg,
          entryCount: dayEntries.length,
          moods: Array.from(new Set(moodsList)),
          entries: dayEntries,
        });
      } else {
        days.push({
          dateKey: key,
          displayDate,
          fullDate,
          score: null,
          entryCount: 0,
          moods: [],
          entries: [],
        });
      }
    }

    // Determine trajectory
    const avgFirstHalf = firstHalfScores.length > 0
      ? firstHalfScores.reduce((a, b) => a + b, 0) / firstHalfScores.length
      : null;
    const avgSecondHalf = secondHalfScores.length > 0
      ? secondHalfScores.reduce((a, b) => a + b, 0) / secondHalfScores.length
      : null;

    let trajectory: "up" | "down" | "stable" = "stable";
    let trajectoryDiff = 0;
    if (avgFirstHalf !== null && avgSecondHalf !== null) {
      trajectoryDiff = Math.round((avgSecondHalf - avgFirstHalf) * 10) / 10;
      if (trajectoryDiff >= 0.5) trajectory = "up";
      else if (trajectoryDiff <= -0.5) trajectory = "down";
    }

    // Top mood in 30 days
    const sortedMoods = Object.entries(moodFrequencyMap).sort((a, b) => b[1] - a[1]);
    const topMood30 = sortedMoods.length > 0 ? sortedMoods[0][0] : null;

    const avgScore = scoredDaysCount > 0 ? Math.round((totalScoreSum / scoredDaysCount) * 10) / 10 : null;

    return {
      chartData: days,
      hasEntriesIn30Days: entriesIn30Days > 0,
      stats: {
        entriesIn30Days,
        scoredDaysCount,
        avgScore,
        trajectory,
        trajectoryDiff,
        topMood30,
      },
    };
  }, [journals]);

  const displayedData = useMemo(() => {
    if (viewMode === "active-only") {
      return chartData.filter((d) => d.score !== null);
    }
    return chartData;
  }, [chartData, viewMode]);

  // Custom Dot renderer
  const renderCustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.score === null) return null;

    const isSelected = selectedPoint?.dateKey === payload.dateKey;
    const tier = getScoreTier(payload.score);
    const strokeColor = payload.score >= 7 ? "#10b981" : payload.score >= 5 ? "#6366f1" : "#f43f5e";

    return (
      <circle
        key={`dot-${payload.dateKey}`}
        cx={cx}
        cy={cy}
        r={isSelected ? 6 : 4}
        fill="#ffffff"
        stroke={strokeColor}
        strokeWidth={isSelected ? 3 : 2}
        className="cursor-pointer transition-all duration-200 hover:scale-125"
        onClick={() => setSelectedPoint(payload)}
      />
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              30-Day Mood Trends
            </h2>
            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-600/20 ring-inset">
              Recharts Analytics
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tracking daily emotional valence and psychological equilibrium across the last 30 days.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center space-x-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs">
            <button
              onClick={() => setViewMode("timeline")}
              className={`rounded-lg px-3 py-1 font-medium transition cursor-pointer ${
                viewMode === "timeline"
                  ? "bg-white text-indigo-600 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              30-Day Timeline
            </button>
            <button
              onClick={() => setViewMode("active-only")}
              className={`rounded-lg px-3 py-1 font-medium transition cursor-pointer ${
                viewMode === "active-only"
                  ? "bg-white text-indigo-600 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Active Days ({stats.scoredDaysCount})
            </button>
          </div>
        </div>
      </div>

      {/* 30-Day Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            30-Day Average
          </span>
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold text-slate-900">
              {stats.avgScore !== null ? `${stats.avgScore} / 10` : "—"}
            </span>
            {stats.avgScore !== null && (
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${getScoreTier(stats.avgScore).bg} ${getScoreTier(stats.avgScore).color}`}>
                {stats.avgScore >= 7 ? "Uplifted" : stats.avgScore >= 5 ? "Centered" : "Challenging"}
              </span>
            )}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Trajectory
          </span>
          <div className="flex items-center space-x-1.5">
            {stats.trajectory === "up" ? (
              <>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700">
                  Uplifting (+{stats.trajectoryDiff})
                </span>
              </>
            ) : stats.trajectory === "down" ? (
              <>
                <TrendingDown className="h-4 w-4 text-rose-600" />
                <span className="text-xs font-semibold text-rose-700">
                  Subdued ({stats.trajectoryDiff})
                </span>
              </>
            ) : (
              <>
                <Minus className="h-4 w-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-700">
                  Stable Equilibrium
                </span>
              </>
            )}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Active Reflections
          </span>
          <p className="text-xl font-bold text-slate-900">
            {stats.entriesIn30Days} <span className="text-xs font-normal text-slate-500">entries</span>
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Primary Tone
          </span>
          <p className="text-base font-bold text-indigo-700 truncate">
            {stats.topMood30 || "—"}
          </p>
        </div>
      </div>

      {/* Chart Canvas Area */}
      {!hasEntriesIn30Days ? (
        <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/40 space-y-2">
          <Calendar className="mx-auto h-8 w-8 text-slate-300" />
          <h3 className="text-sm font-semibold text-slate-800">
            No Reflections Recorded in the Last 30 Days
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Write a journal entry today to begin visualizing your 30-day emotional trajectory and emotional rhythm.
          </p>
          {onNavigate && (
            <button
              onClick={() => onNavigate("new-journal")}
              className="mt-2 inline-flex items-center space-x-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Write Today&apos;s Entry</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={displayedData}
                margin={{ top: 12, right: 16, left: -20, bottom: 8 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const point = e.activePayload[0].payload as DayDataPoint;
                    if (point && point.score !== null) {
                      setSelectedPoint(point);
                    }
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                
                <XAxis
                  dataKey="displayDate"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  interval={viewMode === "timeline" ? 4 : 0}
                />
                
                <YAxis
                  domain={[1, 10]}
                  ticks={[2, 5, 7, 9]}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickFormatter={(val) => {
                    if (val === 9) return "Uplifted (9)";
                    if (val === 7) return "Balanced (7)";
                    if (val === 5) return "Centered (5)";
                    if (val === 2) return "Low (2)";
                    return `${val}`;
                  }}
                />

                {/* Reference baseline at 5.0 */}
                <ReferenceLine
                  y={5}
                  stroke="#cbd5e1"
                  strokeDasharray="4 4"
                  label={{
                    value: "Reflective Baseline",
                    position: "insideBottomRight",
                    fill: "#94a3b8",
                    fontSize: 10,
                  }}
                />

                {/* Custom Tooltip */}
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0].payload as DayDataPoint;
                      if (data.score === null) {
                        return (
                          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-xs space-y-1">
                            <p className="font-bold text-slate-800">{data.fullDate}</p>
                            <p className="text-slate-400 italic">No entry logged on this day</p>
                          </div>
                        );
                      }
                      const tier = getScoreTier(data.score);
                      return (
                        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-lg text-xs space-y-2 min-w-[200px]">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                            <span className="font-bold text-slate-800">{data.displayDate}</span>
                            <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] border ${tier.bg} ${tier.color}`}>
                              {data.score} / 10
                            </span>
                          </div>

                          <div className="space-y-1">
                            <p className="text-[11px] font-medium text-slate-500">
                              {data.entryCount} {data.entryCount === 1 ? "reflection" : "reflections"} logged
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {data.moods.map((m) => (
                                <span
                                  key={m}
                                  className="inline-block px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-semibold"
                                >
                                  {m}
                                </span>
                              ))}
                            </div>
                          </div>

                          <p className="text-[10px] text-indigo-600 font-medium pt-1">
                            Click point to view entries below
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  connectNulls={true}
                  dot={renderCustomDot}
                  activeDot={{ r: 6, fill: "#4f46e5", stroke: "#ffffff", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Scale Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span>8–10 Uplifted (Happy, Inspired, Grateful)</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                <span>6–7 Balanced (Calm, Peaceful, Centered)</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span>1–4 Challenging (Stressed, Anxious, Low)</span>
              </span>
            </div>

            <div className="flex items-center space-x-1 text-slate-400">
              <Info className="h-3.5 w-3.5" />
              <span>Connects consecutive entries across 30 days</span>
            </div>
          </div>
        </div>
      )}

      {/* Selected Day Details Inspection Panel */}
      {selectedPoint && selectedPoint.entries.length > 0 && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800">
                Entries for {selectedPoint.fullDate}
              </span>
              <span className="text-xs font-bold text-indigo-600 bg-white border border-indigo-200 px-2 py-0.5 rounded-md shadow-2xs">
                Score: {selectedPoint.score} / 10
              </span>
            </div>
            <button
              onClick={() => setSelectedPoint(null)}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {selectedPoint.entries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => onSelectJournal && onSelectJournal(entry)}
                className="p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 transition cursor-pointer flex items-center justify-between group shadow-2xs"
              >
                <div className="min-w-0 pr-2 space-y-0.5">
                  <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-indigo-600">
                    {entry.title || "Untitled Entry"}
                  </p>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                    <Smile className="h-3 w-3 text-indigo-500" />
                    <span>{entry.mood}</span>
                    {entry.tags && entry.tags.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="truncate">#{entry.tags.join(", #")}</span>
                      </>
                    )}
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
