const API_BASE = '/api';

let apiTimeoutMs = 15000;

export function setApiTimeout(ms) {
  apiTimeoutMs = ms;
}

function parseStoredToken(raw) {
  if (!raw || raw === 'null' || raw === 'undefined') return null;
  if (raw.startsWith('"') || raw.startsWith('{') || raw.startsWith('[')) {
    return JSON.parse(raw);
  }
  return raw;
}

export function readToken() {
  const params = new URLSearchParams(location.search);
  const fromUrl = params.get('token') || params.get('accessToken');
  if (fromUrl?.trim()) return fromUrl.trim();
  try {
    return parseStoredToken(localStorage.getItem('token'));
  } catch {
    return null;
  }
}

export function hasAuthToken() {
  return Boolean(readToken());
}

/** @returns {Promise<any>} */
export async function apiGet(path, { signal } = {}) {
  const headers = { Accept: 'application/json' };
  const token = readToken();
  if (token) headers.Authorization = 'Bearer ' + token;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), apiTimeoutMs);
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });

  try {
    const res = await fetch(API_BASE + path, { headers, signal: controller.signal });
    const json = await res.json();
    if (json.code !== 200) throw new Error(json.message || `HTTP ${res.status}`);
    return json.data;
  } finally {
    clearTimeout(timer);
  }
}
