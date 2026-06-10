const API_BASE = '/api';

let apiTimeoutMs = 15000;

export function setApiTimeout(ms) {
  apiTimeoutMs = ms;
}

function readToken() {
  try {
    const raw = localStorage.getItem('token');
    if (!raw || raw === 'null') return null;
    if (raw.startsWith('"') || raw.startsWith('{')) return JSON.parse(raw);
    return raw;
  } catch {
    return null;
  }
}

/** @returns {Promise<any>} */
export async function apiGet(path, { signal } = {}) {
  const headers = { Accept: 'application/json' };
  const token = readToken();
  if (token) headers.Authorization = 'Bearer ' + token;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), apiTimeoutMs);

  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const res = await fetch(API_BASE + path, {
      headers,
      signal: controller.signal,
    });
    const json = await res.json();
    if (json.code !== 200) {
      throw new Error(json.message || `HTTP ${res.status}`);
    }
    return json.data;
  } finally {
    clearTimeout(timer);
  }
}
