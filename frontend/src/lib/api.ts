const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export async function fetchAPI(endpoint: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function postChat(query: string, mode: string = 'rag', sessionId?: string) {
  return fetchAPI('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ query, mode, session_id: sessionId }),
  });
}

export { API_URL };
