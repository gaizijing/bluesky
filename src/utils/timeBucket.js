/** 与后端 TimeBucketUtil 一致：15 分钟 floor，Asia/Shanghai */

export const ZONE = 'Asia/Shanghai';
export const BUCKET_MINUTES = 15;

function getShanghaiParts(date) {
  const d = date instanceof Date ? date : new Date(date);
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

function pad(n) {
  return String(n).padStart(2, '0');
}

/** 格式化为 +08:00 ISO 字符串（上海本地墙钟） */
export function toShanghaiIso(date = new Date()) {
  const p = getShanghaiParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}+08:00`;
}

export function parseOrNow(time) {
  if (time == null || time === '' || String(time).trim().toLowerCase() === 'now') {
    return new Date();
  }
  const normalized = String(time).trim().replace(' ', '+');
  return new Date(normalized);
}

export function toBucket(date = new Date()) {
  const p = getShanghaiParts(date);
  const flooredMinute = Math.floor(p.minute / BUCKET_MINUTES) * BUCKET_MINUTES;
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(flooredMinute)}:00+08:00`;
}

export function bucketFromIso(iso) {
  return toBucket(parseOrNow(iso));
}
