export function calcScrollProgress(scrollTop, scrollHeight, clientHeight) {
  const scrollable = scrollHeight - clientHeight;
  if (scrollable <= 0) return 0;
  const ratio = (scrollTop / scrollable) * 100;
  return Math.min(100, Math.max(0, ratio));
}
