import { useCallback, useEffect, useRef, useState } from 'react';

async function req(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

export const api = {
  get: (url) => req('GET', url),
  post: (url, body) => req('POST', url, body || {}),
  put: (url, body) => req('PUT', url, body),
  setKey: (key, value, by) => req('PUT', `/api/state/${key}`, { value, by }),
  saveSession: (s) => req('POST', '/api/sessions', s),
  exerciseAlert: (body) => req('POST', '/api/exercise-alerts', body),
  reportIssue: (r) => req('POST', '/api/issues', r),
  issueAction: (id, body) => req('POST', `/api/issues/${id}/action`, body),
  followUp: (id, answer) => req('POST', `/api/issues/${id}/followup`, { answer }),
  advanceClock: (minutes) => req('POST', '/api/clock/advance', { minutes }),
  resetClock: () => req('POST', '/api/clock/reset', {}),
  reset: (scenario) => req('POST', '/api/reset', { scenario }),
  aiNote: (issueId) => req('POST', '/api/ai/note', { issueId }),
  async upload(blob, { kind = 'file', name = '' } = {}) {
    const res = await fetch(`/api/media?kind=${encodeURIComponent(kind)}&name=${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: { 'Content-Type': blob.type || 'application/octet-stream' },
      body: blob,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Upload failed');
    return json; // {id, url}
  },
};

export const mediaUrl = (id) => (id ? `/api/media/${id}` : null);

// Polls the server for changes. Everything (patient phone, physio laptop,
// care-chain views) shares this one source of truth.
export function useStore(enabled = true) {
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const rev = useRef(0);
  const fetchedAt = useRef(Date.now());

  const refresh = useCallback(async () => {
    try {
      const j = await api.get(`/api/state?since=${rev.current}`);
      if (!j.unchanged) {
        rev.current = j.rev;
        fetchedAt.current = Date.now();
        setState(j.state);
      }
      setError(null);
    } catch (e) {
      setError(e.message || 'Cannot reach the server');
    }
  }, []);

  useEffect(() => {
    if (!enabled) { rev.current = 0; setState(null); return; }
    refresh();
    const t = setInterval(refresh, 1500);
    return () => clearInterval(t);
  }, [refresh, enabled]);

  // "Now" on the server's (possibly demo-advanced) clock.
  const now = useCallback(() => (state ? state.serverNow + (Date.now() - fetchedAt.current) : Date.now()), [state]);

  return { state, error, refresh, now };
}
