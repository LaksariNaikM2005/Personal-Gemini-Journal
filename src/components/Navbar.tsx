import React from "react";
import {
  BookOpen,
  Plus,
  LayoutDashboard,
  History,
  MessageSquare,
  User as UserIcon,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ViewPage } from "../types";

interface NavbarProps {
  currentPage: ViewPage;
  onNavigate: (page: ViewPage) => void;
  onNewJournal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  onNewJournal,
}) => {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div
          id="nav-brand"
          onClick={() => onNavigate("dashboard")}
          className="flex cursor-pointer items-center space-x-3 transition hover:opacity-90"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-slate-800">
                Personal Gemini Journal
              </span>
              <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-600/20 ring-inset">
                <Sparkles className="mr-1 h-3 w-3 text-indigo-600" />
                AI
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Reflect, Brainstorm & Grow</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          <button
            id="nav-btn-dashboard"
            onClick={() => onNavigate("dashboard")}
            className={`flex items-center space-x-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
              currentPage === "dashboard"
                ? "bg-slate-100 text-indigo-700 font-semibold"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </button>

          <button
            id="nav-btn-history"
            onClick={() => onNavigate("history")}
            className={`flex items-center space-x-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
              currentPage === "history" || currentPage === "journal-details"
                ? "bg-slate-100 text-indigo-700 font-semibold"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            <History className="h-4 w-4" />
            <span>Journals</span>
          </button>

          <button
            id="nav-btn-insights"
            onClick={() => onNavigate("insights")}
            className={`flex items-center space-x-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
              currentPage === "insights"
                ? "bg-slate-100 text-indigo-700 font-semibold"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <span>Insights</span>
          </button>

          <button
            id="nav-btn-ask-journal"
            onClick={() => onNavigate("ask-my-journal")}
            className={`flex items-center space-x-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
              currentPage === "ask-my-journal"
                ? "bg-slate-100 text-indigo-700 font-semibold"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            <BookOpen className="h-4 w-4 text-indigo-600" />
            <span>Ask Journal</span>
          </button>

          <button
            id="nav-btn-chat"
            onClick={() => onNavigate("chat")}
            className={`flex items-center space-x-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
              currentPage === "chat"
                ? "bg-slate-100 text-indigo-700 font-semibold"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Gemini Chat</span>
          </button>

          <button
            id="nav-btn-profile"
            onClick={() => onNavigate("profile")}
            className={`flex items-center space-x-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
              currentPage === "profile"
                ? "bg-slate-100 text-indigo-700 font-semibold"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            <UserIcon className="h-4 w-4" />
            <span>Settings</span>
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          <button
            id="nav-quick-new-journal"
            onClick={onNewJournal}
            className="hidden sm:inline-flex items-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition-colors hover:bg-indigo-700 active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Journal Entry</span>
          </button>

          {user && (
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
              <button
                id="nav-avatar-btn"
                onClick={() => onNavigate("profile")}
                title={user.displayName || user.email || "Account"}
                className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-200 ring-2 ring-slate-100 transition hover:ring-indigo-400"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="User profile"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-semibold text-slate-700">
                    {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                  </span>
                )}
              </button>

              <button
                id="nav-btn-signout"
                onClick={signOut}
                title="Log out"
                className="p-2 text-slate-400 transition hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sub-bar */}
      <div className="flex md:hidden border-t border-slate-200 px-2 py-1.5 justify-around bg-white">
        <button
          onClick={() => onNavigate("dashboard")}
          className={`flex flex-col items-center py-1 px-2 text-[11px] font-medium ${
            currentPage === "dashboard" ? "text-indigo-600 font-semibold" : "text-slate-500"
          }`}
        >
          <LayoutDashboard className="h-4 w-4 mb-0.5" />
          Home
        </button>
        <button
          onClick={() => onNavigate("history")}
          className={`flex flex-col items-center py-1 px-2 text-[11px] font-medium ${
            currentPage === "history" || currentPage === "journal-details"
              ? "text-indigo-600 font-semibold"
              : "text-slate-500"
          }`}
        >
          <History className="h-4 w-4 mb-0.5" />
          Journals
        </button>
        <button
          onClick={onNewJournal}
          className="flex flex-col items-center py-1 px-2 text-[11px] font-semibold text-indigo-600"
        >
          <Plus className="h-4 w-4 mb-0.5" />
          Write
        </button>
        <button
          onClick={() => onNavigate("chat")}
          className={`flex flex-col items-center py-1 px-2 text-[11px] font-medium ${
            currentPage === "chat" ? "text-indigo-600 font-semibold" : "text-slate-500"
          }`}
        >
          <MessageSquare className="h-4 w-4 mb-0.5" />
          Chat
        </button>
        <button
          onClick={() => onNavigate("profile")}
          className={`flex flex-col items-center py-1 px-2 text-[11px] font-medium ${
            currentPage === "profile" ? "text-indigo-600 font-semibold" : "text-slate-500"
          }`}
        >
          <UserIcon className="h-4 w-4 mb-0.5" />
          Settings
        </button>
      </div>
    </header>
  );
};
