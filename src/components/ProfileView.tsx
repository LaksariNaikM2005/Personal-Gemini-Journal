import React, { useState } from "react";
import {
  User as UserIcon,
  ShieldCheck,
  Download,
  LogOut,
  Mail,
  Key,
  Database,
  Brain,
  CheckCircle2,
  FileText,
  Clock,
  Sparkles,
  ArrowLeft,
  Trash2,
  AlertTriangle,
  Lock,
  EyeOff,
  Server,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { JournalEntry, Conversation, ViewPage } from "../types";
import { deleteAllUserJournals } from "../services/journalService";

interface ProfileViewProps {
  journals: JournalEntry[];
  conversations: Conversation[];
  onNavigate: (page: ViewPage) => void;
  initialTab?: "overview" | "privacy" | "danger";
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  journals,
  conversations,
  onNavigate,
  initialTab = "overview",
}) => {
  const { user, signOut } = useAuth();
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "privacy" | "danger">(initialTab);

  // Deletion modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Statistics calculation
  const totalWords = journals.reduce(
    (acc, j) => acc + (j.content ? j.content.trim().split(/\s+/).length : 0),
    0
  );

  const moodCounts: Record<string, number> = {};
  journals.forEach((j) => {
    if (j.mood) {
      moodCounts[j.mood] = (moodCounts[j.mood] || 0) + 1;
    }
  });

  const topMood =
    Object.keys(moodCounts).length > 0
      ? Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0][0]
      : "None yet";

  const handleExportJSON = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        email: user?.email,
        displayName: user?.displayName,
      },
      journalsCount: journals.length,
      conversationsCount: conversations.length,
      journals,
      conversations,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gemini-journal-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setDownloadSuccess("JSON export successfully downloaded!");
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleExportMarkdown = () => {
    let md = `# Personal Gemini Journal Export\n`;
    md += `*Exported on ${new Date().toLocaleDateString()} for ${user?.displayName || user?.email}*\n\n---\n\n`;

    journals.forEach((j, index) => {
      md += `## ${index + 1}. ${j.title || "Untitled"}\n`;
      md += `**Date:** ${new Date(j.createdAt).toLocaleString()}\n`;
      md += `**Mood:** ${j.mood} | **Tags:** ${j.tags.join(", ") || "None"}\n\n`;
      if (j.aiSummary) {
        md += `> **Gemini Summary:** ${j.aiSummary}\n\n`;
      }
      md += `${j.content}\n\n---\n\n`;
    });

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gemini-journals-${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);

    setDownloadSuccess("Markdown export successfully downloaded!");
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleDeleteAllJournals = async () => {
    if (deleteConfirmationText !== "DELETE") {
      setDeleteError('Please type "DELETE" to confirm.');
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError(null);
      await deleteAllUserJournals();
      setShowDeleteModal(false);
      setDeleteConfirmationText("");
      setDownloadSuccess("All journal entries have been permanently removed from your isolated vault.");
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err: unknown) {
      console.error("Bulk delete failed:", err);
      setDeleteError("Failed to delete journal entries. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const accountCreated = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Active";

  const lastSignIn = user?.metadata?.lastSignInTime
    ? new Date(user.metadata.lastSignInTime).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Current session";

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigate("dashboard")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-xs cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Account & Privacy Center
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Profile metadata, verified privacy boundaries, and data export
            </p>
          </div>
        </div>

        <button
          id="profile-signout-btn"
          onClick={signOut}
          className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer shadow-xs"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {downloadSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 flex items-center space-x-2 font-medium">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
            activeTab === "overview"
              ? "bg-indigo-600 text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Overview & Stats
        </button>
        <button
          onClick={() => setActiveTab("privacy")}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center space-x-1.5 ${
            activeTab === "privacy"
              ? "bg-indigo-600 text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Privacy Center</span>
        </button>
        <button
          onClick={() => setActiveTab("danger")}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition cursor-pointer text-rose-600 hover:bg-rose-50 ${
            activeTab === "danger" ? "bg-rose-50 font-bold border border-rose-200" : ""
          }`}
        >
          Data Management
        </button>
      </div>

      {activeTab === "overview" && (
        <>
          {/* User Information Card */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-slate-100 ring-4 ring-indigo-50 shrink-0">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserIcon className="h-10 w-10 text-slate-400" />
              )}
            </div>

            <div className="flex-1 space-y-2 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-xl font-bold text-slate-900">
                  {user?.displayName || "Journaler"}
                </h2>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-100">
                  Google Authenticated
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-500 flex items-center justify-center sm:justify-start space-x-1.5 font-medium">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span>{user?.email}</span>
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-[11px] text-slate-400 font-medium">
                <span>Member since: {accountCreated}</span>
                <span>•</span>
                <span>Last active: {lastSignIn}</span>
              </div>

              <div className="pt-2 text-[11px] text-slate-400 font-mono">
                Firestore User Vault ID: {user?.uid}
              </div>
            </div>
          </div>

          {/* Journaling Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Written Entries</span>
              <p className="mt-1 text-2xl font-bold text-slate-900">{journals.length}</p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Words</span>
              <p className="mt-1 text-2xl font-bold text-slate-900">{totalWords}</p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Primary Mood</span>
              <p className="mt-1 text-xl font-bold text-slate-900 truncate">
                {topMood}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Brainstorms</span>
              <p className="mt-1 text-2xl font-bold text-slate-900">{conversations.length}</p>
            </div>
          </div>

          {/* Export Data Card */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 sm:p-8 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Export Your Journal Data
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                You own your thoughts. Download all journals, moods, and AI summaries anytime.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                id="btn-export-markdown"
                onClick={handleExportMarkdown}
                disabled={journals.length === 0}
                className="inline-flex items-center space-x-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer shadow-xs"
              >
                <FileText className="h-3.5 w-3.5 text-indigo-600" />
                <span>Download as Markdown (.md)</span>
              </button>

              <button
                id="btn-export-json"
                onClick={handleExportJSON}
                disabled={journals.length === 0}
                className="inline-flex items-center space-x-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer shadow-xs"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>Download as JSON (.json)</span>
              </button>
            </div>
          </div>
        </>
      )}

      {activeTab === "privacy" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-6 sm:p-8 shadow-sm space-y-3">
            <div className="flex items-center space-x-2 text-indigo-700">
              <ShieldCheck className="h-6 w-6" />
              <h2 className="text-lg font-bold">Privacy Architecture & Data Guarantees</h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Personal Gemini Journal is built from the ground up with end-to-end security isolation. Below is how your information is stored, processed, and protected.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-2">
              <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm">
                <Database className="h-4 w-4 text-emerald-600" />
                <span>1. Multi-Tenant User Isolation</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                All journal entries are stored inside strict Firestore user subcollections at <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-600 font-mono text-[11px]">users/{"{userId}"}/journals/*</code>. Firestore security rules cryptographically enforce that only the matched authenticated user can read or write.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-2">
              <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm">
                <Server className="h-4 w-4 text-indigo-600" />
                <span>2. Server-Side Gemini Proxy</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Gemini API calls are mediated solely through an authenticated Node.js / Express backend. The Gemini API key never reaches the client-side browser or application bundle.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-2">
              <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm">
                <EyeOff className="h-4 w-4 text-purple-600" />
                <span>3. Zero Base Model Training</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Your private reflections, memories, and emotions are never fed back to train foundation AI models. Every prompt is treated as an ephemeral inference session.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-2">
              <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm">
                <Lock className="h-4 w-4 text-amber-600" />
                <span>4. Controlled Context Windows</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Features like &ldquo;Ask My Journal&rdquo; and &ldquo;Growth Radar&rdquo; do not blindly transmit your entire historical archive. They extract relevant, sanitized entries with token caps to safeguard your confidentiality and performance.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "danger" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-rose-200 bg-white p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center space-x-2.5 text-rose-700">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-base font-bold">Delete All Journal Entries</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              If you wish to wipe your personal journal records completely, you can execute a hard deletion. This will permanently delete all {journals.length} journal documents from your isolated Firestore subcollection. This action cannot be undone.
            </p>

            <button
              id="btn-open-delete-all-modal"
              onClick={() => {
                setShowDeleteModal(true);
                setDeleteError(null);
                setDeleteConfirmationText("");
              }}
              disabled={journals.length === 0}
              className="inline-flex items-center space-x-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2.5 text-xs font-semibold text-white transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete All {journals.length} Journal Entries</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Bulk Delete */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4 border border-rose-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-rose-600 font-bold text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>Confirm Hard Deletion</span>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will permanently delete all <strong>{journals.length}</strong> journal entries and their associated AI summaries from your secure Firestore vault.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Type <span className="font-mono text-rose-600">DELETE</span> to proceed:
              </label>
              <input
                id="delete-confirmation-input"
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="DELETE"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono text-slate-800 focus:border-rose-500 focus:outline-hidden focus:ring-1 focus:ring-rose-200"
              />
            </div>

            {deleteError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete-all"
                onClick={handleDeleteAllJournals}
                disabled={isDeleting || deleteConfirmationText !== "DELETE"}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white disabled:opacity-50 transition cursor-pointer"
              >
                {isDeleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

