/** A folded box drawn with a die line: the product's mark. */
export function Brandmark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M4 10 16 4l12 6v12l-12 6-12-6z" fill="#fff" stroke="#1b1d1f" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M4 10l12 6 12-6M16 16v12" fill="none" stroke="#d4006f" strokeWidth="1.5" strokeDasharray="2.5 2" />
    </svg>
  );
}
