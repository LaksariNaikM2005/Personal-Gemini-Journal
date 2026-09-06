import { ChatMessage, MoodType } from "../types";

export interface SummarizeParams {
  title: string;
  content: string;
  mood?: MoodType | string;
  tags?: string[];
}

export interface ReflectionParams {
  title: string;
  content: string;
  mood?: MoodType | string;
}

export interface PromptSparkParams {
  mood?: MoodType | string;
  theme?: string;
  recentTitles?: string[];
}

export interface SummaryResponse {
  summary: string;
  keyPoints?: string[];
  reflectionQuestion?: string;
}

export async function requestSummary(params: SummarizeParams): Promise<SummaryResponse> {
  const res = await fetch("/api/gemini/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Server returned ${res.status}: Failed to generate summary`);
  }

  const data = await res.json();
  return {
    summary: data.summary || "",
    keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
    reflectionQuestion: data.reflectionQuestion || "",
  };
}

export async function requestReflection(params: ReflectionParams): Promise<string> {
  const res = await fetch("/api/gemini/reflect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Server returned ${res.status}: Failed to generate reflection`);
  }

  const data = await res.json();
  return data.reflection || "";
}

export async function requestPromptSparks(params: PromptSparkParams): Promise<string[]> {
  const res = await fetch("/api/gemini/prompt-spark", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (Array.isArray(data.fallback)) {
      return data.fallback;
    }
    throw new Error(data.error || `Server returned ${res.status}: Failed to fetch prompt ideas`);
  }

  const data = await res.json();
  return Array.isArray(data.prompts) ? data.prompts : [];
}

export async function sendChatMessage(
  messages: Array<Pick<ChatMessage, "role" | "content">>,
  journalContext?: { title: string; content: string; mood: string } | null
): Promise<string> {
  const res = await fetch("/api/gemini/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, journalContext }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Server returned ${res.status}: Failed to send message`);
  }

  const data = await res.json();
  return data.reply || "";
}

export async function requestAskJournal(
  question: string,
  entries: Array<{ title: string; createdAt: string; mood: string; content: string }>
): Promise<string> {
  const res = await fetch("/api/gemini/ask-journal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, entries }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Server returned ${res.status}: Failed to ask your journal`);
  }

  const data = await res.json();
  return data.answer || "";
}

export interface MoodAnalysisResponse {
  suggestedMood: MoodType;
  explanation: string;
}

export async function requestMoodAnalysis(
  content: string,
  title?: string
): Promise<MoodAnalysisResponse> {
  const res = await fetch("/api/gemini/mood-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, title }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Server returned ${res.status}: Failed to analyze mood`);
  }

  return await res.json();
}

export async function requestTagSuggestions(
  content: string,
  title?: string,
  existingTags?: string[]
): Promise<string[]> {
  const res = await fetch("/api/gemini/suggest-tags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, title, existingTags }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Server returned ${res.status}: Failed to suggest tags`);
  }

  const data = await res.json();
  return Array.isArray(data.suggestedTags) ? data.suggestedTags : [];
}

export interface GrowthRadarCategory {
  name: string;
  score: number;
  highlight: string;
}

export interface GrowthRadarResult {
  overallSummary: string;
  recurringThemes: string[];
  frequentlyMentionedGoals: string[];
  positiveProgress: string[];
  commonChallenges: string[];
  suggestedFocus: string;
  reflectionQuestion: string;
  categories: GrowthRadarCategory[];
}

export async function requestGrowthRadar(
  entries: Array<{ title: string; createdAt: string; mood: string; content: string; tags?: string[] }>
): Promise<GrowthRadarResult> {
  const res = await fetch("/api/gemini/growth-radar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entries }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Server returned ${res.status}: Failed to generate Personal Growth Radar`);
  }

  return await res.json();
}

