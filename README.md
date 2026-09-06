# Personal Gemini Journal

A secure, private personal journaling and cognitive reflection application powered by **Google Gemini** and **Cloud Firestore**.

Designed with **zero-trust user isolation**, calm thoughtful design aesthetics, and a server-side proxy architecture that guarantees API keys and personal thoughts remain strictly confidential.

---

## 🛡️ Core Security & Privacy Architecture

- **End-to-End User Isolation**: All journal documents and conversations reside under strictly scoped per-user collections (`/users/{userId}/journals/*` and `/users/{userId}/conversations/*`).
- **Cryptographic Firestore Rules**: Data access is guarded by `request.auth.uid == userId` rules preventing cross-user reads, updates, or unauthorized writes.
- **Server-Side Gemini Proxy**: The `GEMINI_API_KEY` is kept exclusively on the server (`server/gemini.ts` via Express). It is never sent to the browser or bundled in frontend client code.
- **Ephemeral AI Processing**: User reflections are evaluated during active inference sessions without ever being retained to train base AI models.
- **Controlled Context Window**: Features such as *Ask My Journal* and *Growth Radar* use relevance scoring and token bounding instead of unconstrained data dumping.

---

## ✨ Key Features

### 1. "Ask My Journal" (Intelligent Archive Querying)
- Ask natural language questions about your previous journal entries (e.g., *"What goals have I mentioned recently?"*, *"What challenges keep appearing?"*).
- Employs a token-weighted relevance scoring algorithm with recency bonuses to retrieve the most pertinent journal entries before submitting context to Gemini.
- Clearly displays cited source entries with timestamps and direct links.

### 2. Personal Growth Radar
- Analyzes multi-dimensional emotional and cognitive growth across 5 holistic axes:
  - **Mental Clarity**
  - **Emotional Balance**
  - **Intentionality & Goals**
  - **Resilience & Growth Mindset**
  - **Gratitude & Groundedness**
- Provides synthesized qualitative insights, emergent patterns, and personalized focus recommendations.
- Prominently features clear non-clinical wellness disclaimers.

### 3. AI Journal Summarization & Reflection
- Automatic synthesis of journal entries into structured AI summaries, key takeaways, and constructive reflection prompts.
- Non-destructive: original user writing is never mutated or altered.

### 4. Smart Journal Search & History
- Comprehensive keyword filtering matching titles, full content, AI summaries, and tags.
- Quick filtering by mood (Grateful, Inspired, Peaceful, Reflective, Energized, Balanced, Overwhelmed, etc.).
- Date range filtering (Past 7 days, 30 days, 90 days, All time) and chronological order toggles.

### 5. 30-Day Mood Trends & Analytics (Recharts)
- Interactive Recharts visualization tracking emotional valence, 30-day average scores, trajectory trends, and daily journal entry inspections.
- Dual-view toggling between continuous 30-day timelines and active-days-only metrics.

### 6. Privacy Center, Data Portability & Erasure
- One-click data export in both **Markdown (.md)** and structured **JSON (.json)**.
- Permanent Hard Deletion modal with safety confirmation to wipe isolated Firestore vaults.

---

## 🚀 Technical Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons
- **AI Engine**: Google Gemini API (`@google/genai` via Express proxy)
- **Database & Auth**: Google Cloud Firestore & Firebase Authentication (Google OAuth)
- **Server**: Express.js with Vite development middleware
