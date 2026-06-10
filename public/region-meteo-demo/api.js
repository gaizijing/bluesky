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
    const raw = localStorage.getItem('token');
    return parseStoredToken(raw);
  } catch {
    return null;
  }
}

export function hasAuthToken() {
  return Boolean(readToken());
}

function buildAuthError(res, json) {
  if (res.status === 401) {
    return new Error(
      (json?.message || '未登录或 Token 已过期')
      + '。请先在主系统登录（http://'
      + location.host
      + '/#/login），再刷新本页；或 URL 加 ?token=你的JWT',
    );
  }
  if (res.status === 403) {
    return new Error(json?.message || '无权访问该资源（403）');
  }
  return new Error(json?.message || `HTTP ${res.status}`);
}

/** @returns {Promise<any>} */
export async function apiPost(path, body, { signal } = {}) {
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
  const token = readToken();
  if (token) headers.Authorization = 'Bearer ' + token;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), apiTimeoutMs);

  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const res = await fetch(API_BASE + path, {
      method: 'POST',
      headers,
      body: JSON.stringify(body ?? {}),
      signal: controller.signal,
    });

    let json = null;
    try {
      json = await res.json();
    } catch {
      if (!res.ok) throw new Error(`HTTP ${res.status}（${path}）`);
      throw new Error('接口返回非 JSON：' + path);
    }

    if (json.code !== 200) {
      throw buildAuthError(res, json);
    }
    return json.data;
  } finally {
    clearTimeout(timer);
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

    let json = null;
    try {
      json = await res.json();
    } catch {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}（${path}）`);
      }
      throw new Error('接口返回非 JSON：' + path);
    }

    if (json.code !== 200) {
      throw buildAuthError(res, json);
    }
    return json.data;
  } finally {
    clearTimeout(timer);
  }
}

/** 拉取静态或同源 GeoJSON（boundaryUrl 一般为 /cesium/shp/…） */
export async function fetchJson(url, { signal } = {}) {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error('资源加载失败 HTTP ' + res.status + ': ' + url);
  }
  return res.json();
}
