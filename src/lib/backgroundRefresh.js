// Coalesce polling, focus and realtime events. A burst during a request causes
// at most one follow-up, so its last change is not lost. Hidden tabs stay idle.
export function backgroundRefresh(task, isVisible = () => document.visibilityState !== 'hidden', onError = console.error) {
  let running = false;
  let pending = false;
  let stopped = false;
  const refresh = async () => {
    if (stopped || !isVisible()) return;
    if (running) { pending = true; return; }
    running = true;
    try {
      do {
        pending = false;
        try { await task(); } catch (error) { onError(error); }
      } while (pending && !stopped && isVisible());
    } finally { running = false; }
  };
  return { refresh, stop: () => { stopped = true; pending = false; } };
}
