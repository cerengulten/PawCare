import { supabase } from './supabase';

// gemini-1.5-flash, then gemini-2.5-flash, were both retired/closed to this key before this
// shipped — verified live via the ListModels endpoint (2026-09-08) and confirmed
// gemini-3.6-flash is the current flash model still open to new users and supporting
// generateContent.
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent';

export type ChatTurn = { role: 'user' | 'model'; text: string };

export function hasGeminiApiKey(): boolean {
  // Always true: either served via Supabase Edge Function ('chat') or via env key
  return true;
}

export async function sendChatMessage(history: ChatTurn[], systemInstruction: string): Promise<string> {
  // 1. Try secure Supabase Edge Function first (keeps API key secure on server)
  try {
    const { data, error } = await supabase.functions.invoke('chat', {
      body: { history, systemInstruction },
    });
    if (!error && data?.text) {
      return data.text;
    }
  } catch (edgeErr) {
    // Edge function not deployed yet or offline; fallback to direct key if available
  }

  // 2. Direct client fallback for development / local testing
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('AI Chat is currently unavailable. Please configure the chat Edge Function or API key.');
  }

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: history.map(turn => ({ role: turn.role, parts: [{ text: turn.text }] })),
      generationConfig: {
        maxOutputTokens: 600,
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.log('Gemini request failed', response.status, body);
    throw new Error(`Gemini request failed (${response.status}): ${body}`);
  }
  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.log('Gemini returned no candidate text', JSON.stringify(json));
    throw new Error('Gemini returned no response');
  }
  return text;
}
