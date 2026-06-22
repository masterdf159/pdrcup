export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ── Groq (primary) ─────────────────────────────────────────────
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_BASE_URL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

async function groqChat(messages: ChatMessage[]): Promise<string> {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.4,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Groq error ${res.status}: ${text}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(timer);
  }
}

// ── Ollama Cloud (secondary fallback) ──────────────────────────
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || '';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'https://api.ollama.com';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma4:31b';

async function ollamaChat(messages: ChatMessage[]): Promise<string> {
  if (!OLLAMA_API_KEY) throw new Error('OLLAMA_API_KEY not set');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 40_000);
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OLLAMA_API_KEY}`,
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        options: { temperature: 0.4, num_predict: 3000 },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama error ${res.status}: ${text}`);
    }
    const data = await res.json();
    return data.message?.content || '';
  } finally {
    clearTimeout(timer);
  }
}

/** Try Groq first; on any failure fall back to Ollama Cloud. */
export async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  try {
    return await groqChat(messages);
  } catch (err) {
    console.error('Groq failed, falling back to Ollama:', err instanceof Error ? err.message : err);
    return await ollamaChat(messages);
  }
}
