import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import {
  generateJournalSummary,
  generateJournalReflection,
  analyzeJournalMood,
  suggestJournalTags,
  generatePromptSparks,
  chatWithJournalAssistant,
  queryJournalArchive,
  generatePersonalGrowthRadar,
} from "./server/gemini";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "5mb" }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      time: new Date().toISOString(),
    });
  });

  // 1. Generate Summary & Key Takeaways
  app.post("/api/gemini/summarize", async (req, res) => {
    try {
      const { title, content, mood, tags } = req.body;
      if (!content || typeof content !== "string" || content.trim().length === 0) {
        return res.status(400).json({ error: "Content is required for summarization." });
      }

      const result = await generateJournalSummary({ title, content, mood, tags });
      res.json(result);
    } catch (err: unknown) {
      console.error("Gemini Summarize Route Error:", err);
      const message = err instanceof Error ? err.message : "Failed to generate AI summary";
      res.status(500).json({ error: message });
    }
  });

  // 2. Reflect on Day & Suggest Follow-up Prompts
  app.post("/api/gemini/reflect", async (req, res) => {
    try {
      const { title, content, mood } = req.body;
      if (!content || typeof content !== "string" || content.trim().length === 0) {
        return res.status(400).json({ error: "Journal content is required for reflection." });
      }

      const result = await generateJournalReflection({ title, content, mood });
      res.json(result);
    } catch (err: unknown) {
      console.error("Gemini Reflection Route Error:", err);
      const message = err instanceof Error ? err.message : "Failed to generate reflection";
      res.status(500).json({ error: message });
    }
  });

  // 3. Mood Analysis (Informal reflection suggestion)
  app.post("/api/gemini/mood-analysis", async (req, res) => {
    try {
      const { content, title } = req.body;
      if (!content || typeof content !== "string" || content.trim().length === 0) {
        return res.status(400).json({ error: "Journal content is required for mood analysis." });
      }

      const result = await analyzeJournalMood({ content, title });
      res.json(result);
    } catch (err: unknown) {
      console.error("Gemini Mood Route Error:", err);
      const message = err instanceof Error ? err.message : "Failed to analyze mood";
      res.status(500).json({ error: message });
    }
  });

  // 4. Tag Generation & Suggestion
  app.post("/api/gemini/suggest-tags", async (req, res) => {
    try {
      const { content, title, existingTags } = req.body;
      if (!content || typeof content !== "string" || content.trim().length === 0) {
        return res.status(400).json({ error: "Journal content is required for tag suggestions." });
      }

      const result = await suggestJournalTags({ content, title, existingTags });
      res.json(result);
    } catch (err: unknown) {
      console.error("Gemini Tag Route Error:", err);
      const message = err instanceof Error ? err.message : "Failed to suggest tags";
      res.status(500).json({ error: message });
    }
  });

  // 5. Brainstorming Prompt Sparks
  app.post("/api/gemini/prompt-spark", async (req, res) => {
    try {
      const { mood, theme, recentTitles } = req.body;
      const prompts = await generatePromptSparks({ mood, theme, recentTitles });
      res.json({ prompts });
    } catch (err: unknown) {
      console.error("Gemini Prompt Spark Route Error:", err);
      res.status(500).json({
        error: "Failed to spark prompts",
        fallback: [
          "What moment brought unexpected joy or curiosity into your day?",
          "What is a thought or feeling you haven't fully processed yet?",
          "What is a dream or project you'd love to brainstorm without boundaries?"
        ]
      });
    }
  });

  // 6. Conversational Chat & Brainstorming
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { messages, journalContext } = req.body;
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Messages array is required." });
      }

      const result = await chatWithJournalAssistant({ messages, journalContext });
      res.json(result);
    } catch (err: unknown) {
      console.error("Gemini Chat Route Error:", err);
      const message = err instanceof Error ? err.message : "Failed to process chat message";
      res.status(500).json({ error: message });
    }
  });

  // 7. Ask My Journal Query & Synthesis
  app.post("/api/gemini/ask-journal", async (req, res) => {
    try {
      const { question, entries } = req.body;
      if (!question || typeof question !== "string" || question.trim().length === 0) {
        return res.status(400).json({ error: "A question is required." });
      }
      if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ error: "At least one journal entry is required for synthesis." });
      }

      const result = await queryJournalArchive(question, entries);
      res.json(result);
    } catch (err: unknown) {
      console.error("Ask My Journal Route Error:", err);
      const message = err instanceof Error ? err.message : "Failed to query journals";
      res.status(500).json({ error: message });
    }
  });

  // 8. Personal Growth Radar Synthesis
  app.post("/api/gemini/growth-radar", async (req, res) => {
    try {
      const { entries } = req.body;
      if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ error: "At least one journal entry is required for the Growth Radar." });
      }

      const result = await generatePersonalGrowthRadar(entries);
      res.json(result);
    } catch (err: unknown) {
      console.error("Growth Radar Route Error:", err);
      const message = err instanceof Error ? err.message : "Failed to generate personal growth radar";
      res.status(500).json({ error: message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
