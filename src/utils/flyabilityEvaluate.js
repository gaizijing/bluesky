import { flyabilityColor } from './flyabilityLevel';

/** 与后端 FlyabilityCalculator / 管理端默认规则一致 */
export const DEFAULT_FLYABILITY_RULES = {
  windSpeedMs: { medium: 8, high: 12 },
  visibilityKm: { medium: 3, low: 1 },
  precipMmH: { medium: 2, high: 5 },
  temperatureC: { low: -10, high: 40 },
  cloudBaseM: { medium: 300, low: 150 },
};

function toNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pickThreshold(rule, keys) {
  if (!rule) return null;
  for (const key of keys) {
    const n = toNum(rule[key]);
    if (n != null) return n;
  }
  return null;
}

function evaluateHigherWorse(value, rule) {
  if (value == null || !rule) return 'GREEN';
  const medium = pickThreshold(rule, ['medium', 'yellow']) ?? 0;
  const high = pickThreshold(rule, ['high', 'red']) ?? 0;
  if (high > 0 && value >= high) return 'RED';
  if (medium > 0 && value >= medium) return 'YELLOW';
  return 'GREEN';
}

function evaluateLowerWorse(value, rule) {
  if (value == null || !rule) return 'GREEN';
  const medium = pickThreshold(rule, ['medium', 'yellow']) ?? 0;
  const low = pickThreshold(rule, ['low', 'red']) ?? 0;
  if (low > 0 && value <= low) return 'RED';
  if (medium > 0 && value <= medium) return 'YELLOW';
  return 'GREEN';
}

function evaluateTempFactor(value, rule) {
  if (value == null || !rule) return 'GREEN';
  const low = pickThreshold(rule, ['low', 'min']) ?? 0;
  const high = pickThreshold(rule, ['high', 'max']) ?? 0;
  if ((low !== 0 || high !== 0) && (value < low || value > high)) return 'RED';
  return 'GREEN';
}

/** 拾取点各气象因子适飞等级（GREEN / YELLOW / RED） */
export function evaluateWeatherFlyability(weather, rules = DEFAULT_FLYABILITY_RULES) {
  return {
    temperatureC: evaluateTempFactor(toNum(weather?.temperature), rules.temperatureC),
    windSpeedMs: evaluateHigherWorse(toNum(weather?.windSpeed), rules.windSpeedMs),
    visibilityKm: evaluateLowerWorse(toNum(weather?.visibility), rules.visibilityKm),
    precipMmH: evaluateHigherWorse(toNum(weather?.precipitation), rules.precipMmH),
  };
}

export function factorLevelColor(level) {
  const lv = String(level || 'GREEN').toUpperCase();
  if (lv === 'YELLOW' || lv === 'RED') return flyabilityColor(lv);
  return null;
}

export function metricLevelClass(level) {
  const lv = String(level || 'GREEN').toLowerCase();
  if (lv === 'yellow' || lv === 'red') return `landing-popup__metric--${lv}`;
  return '';
}

export function riskBadgeClass(level) {
  const lv = String(level || '').toUpperCase();
  if (lv === 'HIGH' || lv === 'RED') return 'landing-popup__badge--red';
  if (lv === 'MEDIUM' || lv === 'YELLOW') return 'landing-popup__badge--yellow';
  return '';
}
