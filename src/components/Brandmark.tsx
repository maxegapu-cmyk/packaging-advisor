/** A folded box drawn in ink, its creases in celadon, with a small vermilion seal: the product's mark. */
export function Brandmark({ size = 28 }: { size?: number }) {
  return (
    <svg className="bm" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path className="bm-box" d="M4 10 16 4l12 6v12l-12 6-12-6z" strokeWidth="1.4" strokeLinejoin="round" />
      <path className="bm-crease" d="M4 10l12 6 12-6M16 16v12" fill="none" strokeWidth="1.4" strokeDasharray="2.5 2" />
      <rect className="bm-seal" x="24.5" y="24.5" width="6" height="6" rx="0.6" />
    </svg>
  );
}
