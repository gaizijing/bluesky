/** 将高频回调合并到每帧最多执行一次（如 ISIM WebSocket 更新） */
export function createRafScheduler(fn) {
  let pending = null;
  let rafId = null;

  const flush = () => {
    rafId = null;
    const payload = pending;
    pending = null;
    if (payload != null) fn(payload);
  };

  return (payload) => {
    pending = payload;
    if (rafId != null) return;
    rafId = requestAnimationFrame(flush);
  };
}

export function cancelRafScheduler(scheduler) {
  if (scheduler?.cancel) scheduler.cancel();
}

export function createCancellableRafScheduler(fn) {
  let pending = null;
  let rafId = null;

  const schedule = (payload) => {
    pending = payload;
    if (rafId != null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      const p = pending;
      pending = null;
      if (p != null) fn(p);
    });
  };

  schedule.cancel = () => {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    pending = null;
  };

  return schedule;
}
