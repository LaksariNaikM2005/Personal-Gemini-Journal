import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  BookOpen,
  Tag,
  Calendar,
  Smile,
  ArrowRight,
  Sparkles,
  X,
} from "lucide-react";
import { JournalEntry, MoodType, ViewPage } from "../types";

interface JournalHistoryViewProps {
  journals: JournalEntry[];
  onNavigate: (page: ViewPage) => void;
  onSelectJournal: (journal: JournalEntry) => void;
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

export const JournalHistoryView: React.FC<JournalHistoryViewProps> = ({
  journals,
  onNavigate,
  onSelectJournal,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMood, setSelectedMood] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<"all" | "7d" | "30d" | "90d">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    journals.forEach((j) => {
      (j.tags || []).forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet);
  }, [journals]);

  const uniqueMoods = useMemo(() => {
    const set = new Set<string>();
    journals.forEach((j) => {
      if (j.mood) set.add(j.mood);
    });
    return Array.from(set);
  }, [journals]);

  const filteredJournals = useMemo(() => {
    const now = Date.now();
    return journals
      .filter((entry) => {
        // Search matching title, content, tags, or aiSummary
        const s = searchTerm.toLowerCase();
        const matchesSearch =
          !s ||
          (entry.title || "").toLowerCase().includes(s) ||
          (entry.content || "").toLowerCase().includes(s) ||
          (entry.aiSummary || "").toLowerCase().includes(s) ||
          (entry.tags || []).some((t) => t.toLowerCase().includes(s));

        // Mood matching
        const matchesMood =
          selectedMood === "all" || (entry.mood || "").toLowerCase() === selectedMood.toLowerCase();

        // Tag matching
        const matchesTag =
          selectedTag === "all" || (entry.tags || []).includes(selectedTag);

        // Date range matching
        let matchesDate = true;
        if (dateFilter !== "all") {
          const entryTime = new Date(entry.createdAt).getTime();
          const daysDiff = (now - entryTime) / (1000 * 60 * 60 * 24);
          if (dateFilter === "7d") matchesDate = daysDiff <= 7;
          else if (dateFilter === "30d") matchesDate = daysDiff <= 30;
          else if (dateFilter === "90d") matchesDate = daysDiff <= 90;
        }

        return matchesSearch && matchesMood && matchesTag && matchesDate;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
      });
  }, [journals, searchTerm, selectedMood, selectedTag, dateFilter, sortOrder]);

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const hasActiveFilters =
    searchTerm !== "" ||
    selectedMood !== "all" ||
    selectedTag !== "all" ||
    dateFilter !== "all";

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedMood("all");
    setSelectedTag("all");
    setDateFilter("all");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Journal History
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Smart search, thematic filters, and chronological timeline ({journals.length} reflections stored)
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => onNavigate("ask-my-journal")}
            className="inline-flex items-center space-x-1.5 rounded-xl border border-indigo-200 bg-indigo-50/60 px-3.5 py-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Ask My Journal</span>
          </button>

          <button
            id="history-write-entry-btn"
            onClick={() => onNavigate("new-journal")}
            className="inline-flex items-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Write New Entry</span>
          </button>
        </div>
      </div>

      {/* Smart Search and Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              id="history-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by keywords, emotions, goals, or AI summary insights..."
              className="w-full rounded-xl border border-slate-200 pl-10 pr-9 py-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-100 shadow-xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Controls row */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Mood Dropdown */}
            <div className="flex items-center space-x-1.5 text-xs text-slate-600">
              <Smile className="h-3.5 w-3.5 text-slate-400" />
              <select
                id="history-mood-filter"
                value={selectedMood}
                onChange={(e) => setSelectedMood(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-hidden shadow-xs cursor-pointer"
              >
                <option value="all">All Moods</option>
                {uniqueMoods.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center space-x-1.5 text-xs text-slate-600">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <select
                id="history-date-filter"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-hidden shadow-xs cursor-pointer"
              >
                <option value="all">All Time</option>
                <option value="7d">Past 7 Days</option>
                <option value="30d">Past 30 Days</option>
                <option value="90d">Past 90 Days</option>
              </select>
            </div>

            {/* Sort Order Toggle */}
            <button
              id="history-sort-toggle"
              type="button"
              onClick={() =>
                setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))
              }
              className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              <span>{sortOrder === "newest" ? "Newest First" : "Oldest First"}</span>
            </button>
          </div>
        </div>

        {/* Tag Quick Filters */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Tag className="h-3 w-3" />
              <span>Tags:</span>
            </span>
            <button
              onClick={() => setSelectedTag("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                selectedTag === "all"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Tags
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTag(t === selectedTag ? "all" : t)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  selectedTag === t
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                #{t}
              </button>
            ))}
          </div>
        )}

        {/* Status Line */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            Showing {filteredJournals.length} of {journals.length} {journals.length === 1 ? "entry" : "entries"}
          </span>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Journals Grid */}
      {filteredJournals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-800">
            No journal entries match your filters
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {hasActiveFilters
              ? "Try adjusting your search keywords, mood, or date filters."
              : "You haven't written any journal entries yet. Start your first reflection!"}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={clearAllFilters}
              className="mt-4 inline-flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
            >
              <span>Reset all filters</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate("new-journal")}
              className="mt-4 inline-flex items-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition cursor-pointer"
            >
              <span>Write your first entry</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJournals.map((entry) => (
            <div
              key={entry.id}
              id={`history-card-${entry.id}`}
              onClick={() => onSelectJournal(entry)}
              className="group flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:border-indigo-200 hover:shadow-md cursor-pointer"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      moodColorMap[entry.mood] || "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <Smile className="mr-1 h-3 w-3" />
                    {entry.mood}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {formatDate(entry.createdAt)}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 line-clamp-1 transition-colors">
                  {entry.title || "Untitled Entry"}
                </h3>

                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                  {entry.content}
                </p>

                {entry.aiSummary && (
                  <div className="rounded-xl bg-indigo-50/70 border border-indigo-100 p-2.5 text-[11px] text-slate-700 line-clamp-2">
                    <span className="font-bold text-indigo-900">AI Summary: </span>
                    {entry.aiSummary}
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1 text-slate-400 text-[11px] truncate max-w-[170px]">
                  <Tag className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {entry.tags && entry.tags.length > 0 ? entry.tags.join(", ") : "No tags"}
                  </span>
                </div>

                <span className="font-semibold text-indigo-600 group-hover:text-indigo-700 flex items-center shrink-0">
                  Read entry <ArrowRight className="ml-1 h-3 w-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

