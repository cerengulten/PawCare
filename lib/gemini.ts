// gemini-1.5-flash, then gemini-2.5-flash, were both retired/closed to this key before this
// shipped — verified live via the ListModels endpoint (2026-09-08) and confirmed
// gemini-3.6-flash is the current flash model still open to new users and supporting
// generateContent (Google's error response for retired models points at the newer
// "Interactions API" instead, but generateContent still works against this model).
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';

export type ChatTurn = { role: 'user' | 'model'; text: string };

export function hasGeminiApiKey(): boolean {
  return !!process.env.EXPO_PUBLIC_GEMINI_API_KEY;
}

export async function sendChatMessage(history: ChatTurn[], systemInstruction: string): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing Gemini API key');

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: history.map(turn => ({ role: turn.role, parts: [{ text: turn.text }] })),
      // gemini-3.6-flash runs an internal "thinking" pass by default (hundreds of hidden
      // tokens even for a one-line answer) — verified via the API directly that this model
      // requires a nonzero thinkingBudget (0 is rejected as invalid), and that 1 is the
      // practical minimum that disables the added latency while still returning complete,
      // untruncated answers (finishReason: STOP).
      generationConfig: { thinkingConfig: { thinkingBudget: 1 } },
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
