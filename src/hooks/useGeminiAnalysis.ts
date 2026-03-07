import { useState, useCallback, useEffect } from "react";
import { Trade } from "@/types/trade";
import { analyzeTrades } from "@/lib/tradeAnalyzer";
import { ref, get, set } from "firebase/database";
import { db } from "@/lib/firebase";

const CACHE_KEY = "ai_analysis_cache";
const GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

export const DEFAULT_PROMPT_TEMPLATE = `You are a professional trading coach reviewing a trader's performance data. Write a concise, honest, and actionable coaching report in 3 short paragraphs. Be direct — do not pad with generic advice. Use the specific numbers provided.

{{stats}}

{{insights}}

Write the coaching report now. Paragraph 1: what they're doing well. Paragraph 2: the biggest area holding them back (be specific with the numbers). Paragraph 3: the single most important thing they should focus on improving next.`;

interface CacheEntry {
  tradeHash: string;
  report: string;
  generatedAt: string;
}

function hashTrades(trades: Trade[]): string {
  return trades.length + "_" + trades.reduce((s, t) => s + t.profit, 0).toFixed(2);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function useGeminiAnalysis(trades: Trade[], userId?: string) {
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [promptTemplate, setPromptTemplate] = useState(DEFAULT_PROMPT_TEMPLATE);
  const [promptLoading, setPromptLoading] = useState(false);
  const [report, setReport] = useState<string>(() => {
    try {
      const cached: CacheEntry = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (cached && cached.tradeHash === hashTrades(trades)) return cached.report;
    } catch {}
    return "";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load keys + prompt from Firebase
  useEffect(() => {
    if (!userId) return;
    setKeysLoading(true);
    setPromptLoading(true);

    get(ref(db, `users/${userId}/settings/groqApiKeys`))
      .then(snap => {
        const data = snap.val();
        if (Array.isArray(data)) setApiKeys(data.filter(Boolean));
      })
      .catch(() => {})
      .finally(() => setKeysLoading(false));

    get(ref(db, `users/${userId}/settings/aiPromptTemplate`))
      .then(snap => {
        const data = snap.val();
        if (typeof data === "string" && data.trim()) setPromptTemplate(data);
      })
      .catch(() => {})
      .finally(() => setPromptLoading(false));
  }, [userId]);

  const saveKeys = useCallback(async (keys: string[]) => {
    if (!userId) return;
    const filtered = keys.map(k => k.trim()).filter(Boolean);
    await set(ref(db, `users/${userId}/settings/groqApiKeys`), filtered);
    setApiKeys(filtered);
  }, [userId]);

  const addKey = useCallback(async (key: string) => {
    const trimmed = key.trim();
    if (!trimmed || apiKeys.includes(trimmed)) return;
    await saveKeys([...apiKeys, trimmed]);
  }, [apiKeys, saveKeys]);

  const removeKey = useCallback(async (key: string) => {
    await saveKeys(apiKeys.filter(k => k !== key));
  }, [apiKeys, saveKeys]);

  const savePromptTemplate = useCallback(async (template: string) => {
    if (!userId) return;
    await set(ref(db, `users/${userId}/settings/aiPromptTemplate`), template);
    setPromptTemplate(template);
  }, [userId]);

  const resetPromptTemplate = useCallback(async () => {
    await savePromptTemplate(DEFAULT_PROMPT_TEMPLATE);
  }, [savePromptTemplate]);

  const generate = useCallback(async () => {
    const validKeys = apiKeys.filter(k => k.trim());
    if (validKeys.length === 0 || trades.length < 5) return;

    setLoading(true);
    setError(null);

    try {
      const insights = analyzeTrades(trades);
      const winners = trades.filter(t => t.profit > 0);
      const losers = trades.filter(t => t.profit < 0);
      const winRate = ((winners.length / trades.length) * 100).toFixed(0);
      const avgWin = winners.length > 0 ? (winners.reduce((s, t) => s + t.profit, 0) / winners.length).toFixed(2) : "0";
      const avgLoss = losers.length > 0 ? Math.abs(losers.reduce((s, t) => s + t.profit, 0) / losers.length).toFixed(2) : "0";
      const netPnl = trades.reduce((s, t) => s + t.profit, 0).toFixed(2);
      const totalFees = trades.reduce((s, t) => s + (t.fees || 0), 0).toFixed(2);

      const statsBlock = `PERFORMANCE SUMMARY:
- Total trades: ${trades.length}
- Win rate: ${winRate}%
- Net P&L: $${netPnl}
- Total fees paid: $${totalFees}
- Average win: $${avgWin}
- Average loss: $${avgLoss}`;

      const insightsBlock = `KEY INSIGHTS:\n` + insights.map(i => `- [${i.type.toUpperCase()}] ${i.title}: ${i.body}`).join("\n");

      const prompt = promptTemplate
        .replace("{{stats}}", statsBlock)
        .replace("{{insights}}", insightsBlock);

      async function callGroq(apiKey: string, model: string): Promise<string> {
        const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 400,
          }),
        });
        if (!r.ok) {
          const errData = await r.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `API error ${r.status}`);
        }
        const d = await r.json();
        const t: string = d?.choices?.[0]?.message?.content || "";
        if (!t) throw new Error("Empty response");
        return t;
      }

      const startKey = pickRandom(validKeys);
      const keysToTry = [startKey, ...validKeys.filter(k => k !== startKey)];

      let text = "";
      let lastError = "";
      outer: for (const tryKey of keysToTry) {
        for (const model of GROQ_MODELS) {
          try {
            text = await callGroq(tryKey, model);
            break outer;
          } catch (e: any) {
            lastError = e.message || "Unknown error";
          }
        }
      }

      if (!text) throw new Error(lastError || "All keys exhausted");

      setReport(text);
      const cache: CacheEntry = {
        tradeHash: hashTrades(trades),
        report: text,
        generatedAt: new Date().toISOString(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (err: any) {
      setError(err.message || "Failed to generate analysis");
    } finally {
      setLoading(false);
    }
  }, [apiKeys, trades, promptTemplate]);

  const clearReport = useCallback(() => {
    setReport("");
    localStorage.removeItem(CACHE_KEY);
  }, []);

  const isStale = (() => {
    try {
      const cached: CacheEntry = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      return !cached || cached.tradeHash !== hashTrades(trades);
    } catch { return true; }
  })();

  return {
    apiKeys, keysLoading,
    promptTemplate, promptLoading, savePromptTemplate, resetPromptTemplate,
    report, loading, error, isStale,
    generate, addKey, removeKey, clearReport,
  };
}
