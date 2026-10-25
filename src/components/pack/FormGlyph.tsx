import type { Form } from "@/lib/pack";

/** Line drawings of the three package forms, for pickers. */
export function FormGlyph({ form }: { form: Form }) {
  if (form === "tin")
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4">
        <ellipse cx="16" cy="8" rx="8" ry="3" />
        <path d="M8 8v16c0 1.7 3.6 3 8 3s8-1.3 8-3V8" />
        <path d="M8 11.5c0 1.7 3.6 3 8 3s8-1.3 8-3" />
      </svg>
    );
  if (form === "gift")
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
        <path d="M3 13l13-5 13 5-13 5z" />
        <path d="M3 13v4l13 5 13-5v-4" />
        <path d="M5 17v6l11 4 11-4v-6" />
      </svg>
    );
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
      <path d="M9 7l10-3 6 3-10 3z" />
      <path d="M9 7v19l6 3V10M25 7v19l-10 3" />
    </svg>
  );
}
