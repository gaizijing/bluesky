import request from '@/utils/request';
import { bucketFromIso } from '@/utils/timeBucket';

let apiTimeoutMs = 15000;

export function setApiTimeout(ms) {
  apiTimeoutMs = ms;
}

export function hasAuthToken() {
  return true;
}

function resolveTimeParam(rawTime, overrideTime) {
  if (overrideTime != null && overrideTime !== '') {
    return bucketFromIso(overrideTime);
  }
  if (!rawTime || String(rawTime).trim().toLowerCase() === 'now') {
    return bucketFromIso(new Date());
  }
  return bucketFromIso(rawTime);
}

function parsePathQuery(path, { time } = {}) {
  const [urlPath, queryStr] = String(path).split('?');
  const params = {};
  if (queryStr) {
    new URLSearchParams(queryStr).forEach((value, key) => {
      params[key] = value;
    });
  }
  if (params.time != null) {
    params.time = resolveTimeParam(params.time, time);
  }
  return { urlPath, params };
}

/** @returns {Promise<any>} */
export async function apiGet(path, { signal, time } = {}) {
  const { urlPath, params } = parsePathQuery(path, { time });
  const config = {
    skipLoading: true,
    timeout: apiTimeoutMs,
  };
  if (signal) config.signal = signal;
  return request.get(urlPath, params, config);
}

/** @returns {Promise<any>} */
export async function apiPost(path, body, { signal, time } = {}) {
  const { urlPath, params } = parsePathQuery(path, { time });
  const config = {
    skipLoading: true,
    timeout: apiTimeoutMs,
  };
  if (signal) config.signal = signal;
  const query = new URLSearchParams(params).toString();
  const url = query ? `${urlPath}?${query}` : urlPath;
  return request.post(url, body ?? {}, config);
}

/** 拉取静态或同源 GeoJSON（boundaryUrl 一般为 /cesium/shp/…） */
export async function fetchJson(url, { signal } = {}) {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error('资源加载失败 HTTP ' + res.status + ': ' + url);
  }
  return res.json();
}
