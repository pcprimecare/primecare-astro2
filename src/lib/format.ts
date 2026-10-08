import { weekdayName } from './hours.ts';

/** ["a", "b", "c"] -> "a, b and c" */
export function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** [1,2,3,4] -> "Monday to Thursday", [3,5] -> "Wednesday and Friday", [1,2] -> "Monday and Tuesday" */
export function formatDays(days: number[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.length === 0) return '';
  const first = sorted[0] ?? 0;
  const last = sorted[sorted.length - 1] ?? first;
  const contiguous = last - first === sorted.length - 1;
  if (sorted.length >= 3 && contiguous) return `${weekdayName(first)} to ${weekdayName(last)}`;
  return joinList(sorted.map(weekdayName));
}

/** 1536 -> "1.5 KB", 183000 -> "179 KB", 2400000 -> "2.3 MB" */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
