import { flyabilityColor } from './flyabilityLevel';

/** 与后端 FlyabilityCalculator / 管理端默认规则一致 */
export const DEFAULT_FLYABILITY_RULES = {
  windSpeedMs: { yellow: 8, red: 12 },
  visibilityKm: { yellow: 3, red: 1 },
  precipMmH: { yellow: 2, red: 5 },
  temperatureC: { min: -10, max: 40 },
  cloudBaseM: { yellow: 300, red: 150 },
};

function toNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function evaluateRangeFactor(value, rule, direction) {
  if (value == null || !rule) return 'GREEN';
  const yellow = toNum(rule.yellow) ?? 0;
  const red = toNum(rule.red) ?? 0;
  if (direction === 'higher') {
    if (red > 0 && value >= red) return 'RED';
    if (yellow > 0 && value >= yellow) return 'YELLOW';
  } else {
    if (red > 0 && value <= red) return 'RED';
    if (yellow > 0 && value <= yellow) return 'YELLOW';
  }
  return 'GREEN';
}

function evaluateTempFactor(value, rule) {
  if (value == null || !rule) return 'GREEN';
  const min = toNum(rule.min) ?? 0;
  const max = toNum(rule.max) ?? 0;
  if ((min !== 0 || max !== 0) && (value < min || value > max)) return 'RED';
  return 'GREEN';
}

/** 拾取点各气象因子适飞等级（GREEN / YELLOW / RED） */
export function evaluateWeatherFlyability(weather, rules = DEFAULT_FLYABILITY_RULES) {
  return {
    temperatureC: evaluateTempFactor(toNum(weather?.temperature), rules.temperatureC),
    windSpeedMs: evaluateRangeFactor(toNum(weather?.windSpeed), rules.windSpeedMs, 'higher'),
    visibilityKm: evaluateRangeFactor(toNum(weather?.visibility), rules.visibilityKm, 'lower'),
    precipMmH: evaluateRangeFactor(toNum(weather?.precipitation), rules.precipMmH, 'higher'),
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
