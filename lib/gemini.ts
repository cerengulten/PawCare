import { supabase } from './supabase';

// gemini-1.5-flash, then gemini-2.5-flash, were both retired/closed to this key before this
// shipped — verified live via the ListModels endpoint (2026-09-08) and confirmed
// gemini-flash-lite-latest is the current flash model supporting generateContent.
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent';

export type ChatTurn = { role: 'user' | 'model'; text: string };

export function hasGeminiApiKey(): boolean {
  // Served securely via the authenticated Supabase Edge Function ('chat'), or via env key in __DEV__
  return true;
}

export async function sendChatMessage(history: ChatTurn[], systemInstruction: string): Promise<string> {
  const boundedHistory = history.slice(-20).map((turn) => ({
    role: turn.role,
    text: String(turn.text || '').slice(0, 4000),
  }));

  // 1. Primary path: authenticated Supabase Edge Function ('chat') — keeps API key on server
  try {
    const { data, error } = await supabase.functions.invoke('chat', {
      body: { history: boundedHistory, systemInstruction },
    });
    if (!error && data?.text) {
      return data.text;
    }
  } catch {
    // Edge function unreachable; only allow direct client key fallback in __DEV__
  }

  // 2. Direct client fallback restricted strictly to local development (__DEV__)
  if (!__DEV__) {
    throw new Error('AI Chat service is temporarily unavailable. Please check your connection and try again.');
  }

  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('AI Chat is unavailable in development: missing EXPO_PUBLIC_GEMINI_API_KEY or chat Edge Function.');
  }

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: boundedHistory.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
      generationConfig: {
        maxOutputTokens: 600,
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.warn('Gemini request failed', response.status);
    throw new Error(`Gemini request failed (${response.status}): ${body}`);
  }
  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned no response');
  }
  return text;
}
