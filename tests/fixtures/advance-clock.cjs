const now = performance.now.bind(performance);
const wait = Atomics.wait;
let elapsed = 0;
Object.defineProperty(performance, 'now', { value: () => now() + elapsed });
Atomics.wait = (array, index, value, timeout) => {
  const started = now();
  const result = wait(array, index, value, Number.isFinite(timeout) ? 0 : timeout);
  if (result === 'timed-out' && Number.isFinite(timeout)) elapsed += Math.max(0, timeout - (now() - started));
  return result;
};
