/**
 * The product's mark: a square cinnabar seal cut in 白文 (characters left in the paper colour),
 * reading 包装顾问 the traditional way, right column first: 包装 on the right, 顾问 on the left.
 */
export function Brandmark({ size = 28 }: { size?: number }) {
  return (
    <svg className="bm" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect className="bm-seal" x="0.5" y="0.5" width="31" height="31" rx="1.6" />
      <g className="bm-chars">
        <text x="23.2" y="14.2">包</text>
        <text x="23.2" y="28.2">装</text>
        <text x="8.8" y="14.2">顾</text>
        <text x="8.8" y="28.2">问</text>
      </g>
    </svg>
  );
}
