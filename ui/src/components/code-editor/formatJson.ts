/**
 * Format utilities for JSON code editing.
 */

export interface FormatResult {
  formatted: string;
  changed: boolean;
  error: string | null;
}

/**
 * Formats a raw JSON string with 2-space indentation.
 * Returns the formatted string, whether it changed, and any error encountered.
 */
export function formatJsonString(raw: string): FormatResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { formatted: raw, changed: false, error: null };
  }

  try {
    const parsed = JSON.parse(trimmed);
    const formatted = JSON.stringify(parsed, null, 2);
    return {
      formatted,
      changed: formatted !== raw,
      error: null,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Invalid JSON";
    return {
      formatted: raw,
      changed: false,
      error: errorMessage,
    };
  }
}
