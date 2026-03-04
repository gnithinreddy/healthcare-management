/**
 * Shared utility functions
 */

/** Formats status strings: NO_SHOW → "No Show", SENT_TO_PHARMACY → "Sent To Pharmacy" */
export function formatStatus(s: string): string {
  return s
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
