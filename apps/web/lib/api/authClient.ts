export type MeResponse = { user: { id: string; name: string } };

const EXPLICIT_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

const deriveBaseFromChat = () => {
  const chat = process.env.NEXT_PUBLIC_CHAT_API_URL;
  if (!chat) return '/api';
  const normalized = chat.replace(/\/chat(?:\/.*)?$/i, '');
  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
};

const API_BASE = EXPLICIT_API_BASE && EXPLICIT_API_BASE.length > 0 ? EXPLICIT_API_BASE : deriveBaseFromChat();

const buildUrl = (path: string) => `${API_BASE}${path}`;

export async function login(params: { name: string; password: string }): Promise<MeResponse> {
  const res = await fetch(buildUrl('/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    credentials: 'include'
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Login failed');
  }
  return (await res.json()) as MeResponse;
}

export async function me(): Promise<MeResponse | null> {
  const res = await fetch(buildUrl('/auth/me'), { credentials: 'include' });
  if (!res.ok) return null;
  return (await res.json()) as MeResponse;
}

export async function logout(): Promise<void> {
  await fetch(buildUrl('/auth/logout'), { method: 'POST', credentials: 'include' });
}

