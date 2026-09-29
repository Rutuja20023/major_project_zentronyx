/**
 * Utility functions for safely parsing and formatting server timestamps.
 * Server stores timestamps in UTC. If SQLite or an older API response omitted
 * the trailing 'Z' or timezone offset, this utility ensures it is parsed as UTC,
 * and rendered in the user's local browser timezone.
 */

export function parseServerDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // If the ISO string lacks timezone designation (no 'Z' and no +/-HH:mm offset),
  // append 'Z' so JavaScript Date constructor interprets it as UTC instead of local time.
  const hasTimezone = trimmed.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(trimmed);
  const normalized = hasTimezone ? trimmed : `${trimmed}Z`;

  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDateTime(dateStr?: string | null, fallback = 'N/A'): string {
  const d = parseServerDate(dateStr);
  return d ? d.toLocaleString() : fallback;
}

export function formatDate(dateStr?: string | null, fallback = 'N/A'): string {
  const d = parseServerDate(dateStr);
  return d ? d.toLocaleDateString() : fallback;
}

export function formatTime(dateStr?: string | null, fallback = 'N/A'): string {
  const d = parseServerDate(dateStr);
  return d ? d.toLocaleTimeString() : fallback;
}
