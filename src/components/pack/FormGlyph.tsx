import type { Form } from "@/lib/pack";

const P = { viewBox: "0 0 32 32", "aria-hidden": true, fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinejoin: "round", strokeLinecap: "round" } as const;

/** Line drawings of the package forms, for pickers. */
export function FormGlyph({ form }: { form: Form }) {
  switch (form) {
    case "tin":
      return (
        <svg {...P}>
          <ellipse cx="16" cy="8" rx="8" ry="3" />
          <path d="M8 8v16c0 1.7 3.6 3 8 3s8-1.3 8-3V8" />
          <path d="M8 11.5c0 1.7 3.6 3 8 3s8-1.3 8-3" />
        </svg>
      );
    case "gift":
      return (
        <svg {...P}>
          <path d="M3 13l13-5 13 5-13 5z" />
          <path d="M3 13v4l13 5 13-5v-4" />
          <path d="M5 17v6l11 4 11-4v-6" />
        </svg>
      );
    case "bookBox":
      return (
        <svg {...P}>
          <path d="M4 14l12-5 12 5-12 5z" />
          <path d="M4 14v7l12 5 12-5v-7" />
          <path d="M16 19v7" />
          <path d="M4 14l-1-6 12-5 1 6" />
        </svg>
      );
    case "mailer":
      return (
        <svg {...P}>
          <path d="M3 15l13-5 13 5-13 5z" />
          <path d="M3 15v6l13 5 13-5v-6" />
          <path d="M16 10l-2-6 13 5 2 6" />
        </svg>
      );
    case "drawer":
      return (
        <svg {...P}>
          <path d="M5 12l11-4 11 4-11 4z" />
          <path d="M5 12v8l11 4 11-4v-8" />
          <path d="M11 18v5l9 3.3 7-2.6v-5" />
          <path d="M15.5 23.5h2" />
        </svg>
      );
    case "paperTube":
      return (
        <svg {...P}>
          <ellipse cx="16" cy="6" rx="7" ry="2.5" />
          <path d="M9 6v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6" />
          <path d="M9 13.5V26c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V13.5" />
        </svg>
      );
    case "bag":
      return (
        <svg {...P}>
          <path d="M6 12h20l-1 16H7z" />
          <path d="M12 12c0-6 8-6 8 0" />
          <path d="M26 12l3 2-1 13-3 1" />
        </svg>
      );
    case "pouch":
      return (
        <svg {...P}>
          <path d="M8 5h16v3c0 6 2 10 2 15 0 3-4 4-10 4s-10-1-10-4c0-5 2-9 2-15z" />
          <path d="M8 8h16" />
          <path d="M9.5 10.5h13" strokeDasharray="1.5 1.5" />
        </svg>
      );
    case "bottle":
      return (
        <svg {...P}>
          <path d="M13 4h5v3h-5z" />
          <path d="M18 5h4" />
          <path d="M12 7h7v3h-7z" />
          <path d="M12 10c-3 1-4 2-4 5v11c0 1 1 2 2 2h11c1 0 2-1 2-2V15c0-3-1-4-4-5" />
        </svg>
      );
    case "tube":
      return (
        <svg {...P}>
          <path d="M8 4h16v3H8z" />
          <path d="M9 7c0 6 3 10 3 14h8c0-4 3-8 3-14" />
          <path d="M12 21l1 2h6l1-2" />
          <path d="M12.5 23h7v5h-7z" />
        </svg>
      );
    case "jar":
      return (
        <svg {...P}>
          <path d="M10 5h12v4H10z" />
          <path d="M11 9c-3 1-4 2-4 4v12c0 1.5 1.5 3 3 3h12c1.5 0 3-1.5 3-3V13c0-2-1-3-4-4" />
          <path d="M7 16h18M7 23h18" />
        </svg>
      );
    case "glassBottle":
      return (
        <svg {...P}>
          <path d="M14 3h4v3h-4z" />
          <path d="M14.5 6v5c0 2-5 3-5 7v9c0 1 1 2 2 2h9c1 0 2-1 2-2v-9c0-4-5-5-5-7V6" />
          <path d="M9.5 18h13v6h-13z" />
        </svg>
      );
    case "ceramic":
      return (
        <svg {...P}>
          <path d="M14.5 4h3v2h-3z" />
          <path d="M11 9c0-2 2.5-3 5-3s5 1 5 3z" />
          <path d="M12 9v2c-3 1-5 2.5-5 5v9c0 1.5 4 3 9 3s9-1.5 9-3v-9c0-2.5-2-4-5-5V9" />
          <path d="M7 19c2 1 5.5 1.5 9 1.5s7-.5 9-1.5" />
        </svg>
      );
    case "can":
      return (
        <svg {...P}>
          <ellipse cx="16" cy="6.5" rx="6" ry="2" />
          <path d="M10 6.5l-1.5 3V25c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5V9.5L22 6.5" />
          <path d="M15 5.5h3" />
        </svg>
      );
    case "blister":
      return (
        <svg {...P}>
          <rect x="7" y="3" width="18" height="26" rx="1.5" />
          <path d="M14 6.5h4" />
          <rect x="10.5" y="11" width="11" height="14" rx="3" />
          <path d="M13 14v8" opacity="0.5" />
        </svg>
      );
    case "aseptic":
      return (
        <svg {...P}>
          <path d="M9 7l9-2 6 2-9 2z" />
          <path d="M9 7v21l6 1.5V9M24 7v20l-9 2.5" />
          <path d="M24 7l-2.5 4" />
          <rect x="11" y="4" width="3" height="2.4" rx="0.8" />
        </svg>
      );
    case "woodBox":
      return (
        <svg {...P}>
          <path d="M3 12l13-5 13 5-13 5z" />
          <path d="M3 12v10l13 5 13-5V12" />
          <path d="M16 17v10" />
          <path d="M6 16.5l7 2.7M6 20l7 2.7M19 19.2l7-2.7M19 22.7l7-2.7" opacity="0.55" />
        </svg>
      );
    default:
      return (
        <svg {...P}>
          <path d="M9 7l10-3 6 3-10 3z" />
          <path d="M9 7v19l6 3V10M25 7v19l-10 3" />
        </svg>
      );
  }
}
