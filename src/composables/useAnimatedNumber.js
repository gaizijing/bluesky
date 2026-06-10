import { ref, watch, onUnmounted, toValue } from 'vue';

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
    (val) => animateTo(val),
    { immediate: true },
  );

  onUnmounted(() => {
    if (frame) cancelAnimationFrame(frame);
  });

  return display;
}

/** 对 flight 对象各字段做平滑动画 */
export function useAnimatedFlight(flightSource, options) {
  const src = () => toValue(flightSource);
  return {
    roll: useAnimatedNumber(() => src().roll, options),
    pitch: useAnimatedNumber(() => src().pitch, options),
    altitude: useAnimatedNumber(() => src().altitude, options),
    verticalSpeed: useAnimatedNumber(() => src().verticalSpeed, options),
    speed: useAnimatedNumber(() => src().speed, options),
    battery: useAnimatedNumber(() => src().battery, options),
  };
}
