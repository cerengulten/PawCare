import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SERVER_SYSTEM_BASE = `You are Bisco AI, a veterinary-informed pet health, nutrition, and daily care assistant inside the Bisco app.
CRITICAL SAFETY & SCOPE RULES:
1. Only answer questions related to pet health, nutrition, behavior, hygiene, preventive care, and companion animal well-being.
2. Never provide human medical advice, legal advice, financial advice, or execute arbitrary coding/unrelated tasks.
3. Always remind owners that your guidance is educational and not a substitute for an in-person veterinary diagnosis, and urge immediate emergency vet care for red-flag symptoms (e.g., breathing distress, bloat, seizures, toxin ingestion, severe lethargy, or blood in vomit/stool).`;

const MAX_HISTORY_TURNS = 20;
const MAX_CHARS_PER_TURN = 4000;
const MAX_SYSTEM_INSTRUCTION_CHARS = 3000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    // 1. Authenticate caller via Supabase JWT
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing bearer token' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: 'Server auth configuration missing' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or expired session' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // 2. Verify Gemini API key
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing GEMINI_API_KEY secret in Supabase' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // 3. Verify server-side rate limit & daily quota
    try {
      const { data: isAllowedQuota, error: quotaError } = await supabase.rpc('check_and_increment_chat_quota');
      if (!quotaError && isAllowedQuota === false) {
        return new Response(
          JSON.stringify({
            error: 'Daily consultation limit reached. Please upgrade to Pro or try again tomorrow.',
          }),
          {
            status: 429,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          }
        );
      }
    } catch {
      // Fail-open if quota table is migrating so chat is not blocked
    }

    // 4. Parse, sanitize, and bound request payload
    const body = await req.json();
    const rawHistory = Array.isArray(body?.history) ? body.history : [];
    const clientContextInstruction =
      typeof body?.systemInstruction === 'string'
        ? body.systemInstruction.slice(0, MAX_SYSTEM_INSTRUCTION_CHARS)
        : '';

    const sanitizedHistory = rawHistory
      .slice(-MAX_HISTORY_TURNS)
      .filter(
        (turn: any) =>
          turn &&
          (turn.role === 'user' || turn.role === 'model') &&
          typeof turn.text === 'string' &&
          turn.text.trim().length > 0
      )
      .map((turn: { role: 'user' | 'model'; text: string }) => ({
        role: turn.role,
        parts: [{ text: turn.text.slice(0, MAX_CHARS_PER_TURN) }],
      }));

    if (sanitizedHistory.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid or empty chat history' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Structure client pet context into conversation history without contaminating systemInstruction
    let conversationContents = sanitizedHistory;
    if (clientContextInstruction) {
      const cleanContext = clientContextInstruction.replace(/[\r\n]+/g, ' ').trim();
      conversationContents = [
        {
          role: 'user',
          parts: [{ text: `[Active Pet Profile & Context: ${cleanContext}]` }],
        },
        {
          role: 'model',
          parts: [{ text: 'Understood. I will keep this pet profile in mind while providing pet care guidance.' }],
        },
        ...sanitizedHistory,
      ];
    }

    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SERVER_SYSTEM_BASE }] },
        contents: conversationContents,
        generationConfig: {
          maxOutputTokens: 600,
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: errText }), {
        status: response.status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const json = await response.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return new Response(JSON.stringify({ text }), {
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
      },
    });
  }
});
