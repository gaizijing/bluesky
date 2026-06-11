import { ref, computed, watch, onUnmounted, toValue } from 'vue';

function readNumber(source) {
  const v = Number(toValue(source));
  return Number.isFinite(v) ? v : 0;
}

/**
 * 数值平滑过渡（easeOutCubic）
 * @param {import('vue').MaybeRefOrGetter<number>} source
 * @param {{ duration?: number }} options
 */
export function useAnimatedNumber(source, { duration = 420 } = {}) {
  const display = ref(readNumber(source));
  let frame = null;
  let from = display.value;
  let startAt = 0;

  function animateTo(target) {
    const to = Number(target);
    if (!Number.isFinite(to)) return;
    if (frame) cancelAnimationFrame(frame);
    from = display.value;
    startAt = performance.now();

    function step(now) {
      const t = Math.min(1, (now - startAt) / duration);
      const eased = 1 - (1 - t) ** 3;
      display.value = from + (to - from) * eased;
      if (t < 1) frame = requestAnimationFrame(step);
      else display.value = to;
    }
    frame = requestAnimationFrame(step);
  }

  watch(
    () => readNumber(source),
    (val, prev) => {
      if (prev !== undefined && Math.abs(val - prev) > 500) {
        display.value = val;
        return;
      }
      animateTo(val);
    },
    { immediate: true },
  );

  onUnmounted(() => {
    if (frame) cancelAnimationFrame(frame);
  });

  return display;
}

function normalizeHeading(deg) {
  return ((deg % 360) + 360) % 360;
}

function headingShortestDelta(from, to) {
  let delta = normalizeHeading(to) - normalizeHeading(from);
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}

/** 航向平滑过渡（按最短弧旋转，避免 359°→1° 绕大圈） */
export function useAnimatedHeading(source, { duration = 420 } = {}) {
  const display = ref(normalizeHeading(readNumber(source)));
  let frame = null;
  let from = display.value;
  let startAt = 0;

  function animateTo(target) {
    const to = normalizeHeading(Number(target));
    if (!Number.isFinite(to)) return;
    if (frame) cancelAnimationFrame(frame);
    from = display.value;
    const delta = headingShortestDelta(from, to);
    startAt = performance.now();

    function step(now) {
      const t = Math.min(1, (now - startAt) / duration);
      const eased = 1 - (1 - t) ** 3;
      display.value = normalizeHeading(from + delta * eased);
      if (t < 1) frame = requestAnimationFrame(step);
      else display.value = to;
    }
    frame = requestAnimationFrame(step);
  }

  watch(
    () => normalizeHeading(readNumber(source)),
    (val) => animateTo(val),
    { immediate: true },
  );

  onUnmounted(() => {
    if (frame) cancelAnimationFrame(frame);
  });

  return display;
}

function readFlightField(flightSource, key) {
  return computed(() => {
    const n = Number(toValue(flightSource)?.[key]);
    return Number.isFinite(n) ? n : 0;
  });
}

/** 对 flight 对象各字段做平滑动画（高频遥测字段直接跟源，避免动画漂移） */
export function useAnimatedFlight(flightSource, options) {
  const src = () => toValue(flightSource);
  return {
    heading: readFlightField(flightSource, 'heading'),
    roll: useAnimatedNumber(() => src().roll, options),
    pitch: useAnimatedNumber(() => src().pitch, options),
    altitude: readFlightField(flightSource, 'altitude'),
    verticalSpeed: readFlightField(flightSource, 'verticalSpeed'),
    speed: readFlightField(flightSource, 'speed'),
    battery: useAnimatedNumber(() => src().battery, options),
  };
}
