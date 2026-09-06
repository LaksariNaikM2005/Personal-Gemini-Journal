export type MoodType =
  | "Happy"
  | "Calm"
  | "Excited"
  | "Neutral"
  | "Stressed"
  | "Sad"
  | "Frustrated"
  | "Peaceful"
  | "Grateful"
  | "Inspired"
  | "Reflective"
  | "Energized"
  | "Balanced"
  | "Overwhelmed"
  | "Anxious"
  | "Melancholy";

export interface JournalEntry {
  id: string;
  journalId?: string;
  title: string;
  content: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  userId: string;
  tags: string[];
  mood: MoodType | string;
  aiSummary?: string;
}

export interface JournalMessage {
  id: string;
  messageId?: string;
  userId: string;
  journalId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string; // ISO string
}

export interface Conversation {
  id: string;
  userId: string;
  journalId?: string | null;
  journalTitle?: string | null;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string;
  lastLoginAt: string;
  updatedAt?: string;
}

export type ViewPage =
  | "landing"
  | "dashboard"
  | "new-journal"
  | "journal-details"
  | "history"
  | "chat"
  | "insights"
  | "ask-my-journal"
  | "profile"
  | "privacy";
