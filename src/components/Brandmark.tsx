/**
 * The product's mark: a square cinnabar seal cut in 白文 (characters left in the paper colour),
 * reading 包装顾问 the traditional way, right column first: 包装 on the right, 顾问 on the left.
 * A filter keeps the stone's wear: edges a little uneven, a few specks the paste missed.
 * (Every mark on a page shares one identical filter definition.)
 */
export function Brandmark({ size = 28 }: { size?: number }) {
  return (
    <svg className="bm" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <filter id="bm-wear" x="-6%" y="-6%" width="112%" height="112%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="11" result="grain" />
          <feDisplacementMap in="SourceGraphic" in2="grain" scale="0.9" xChannelSelector="R" yChannelSelector="G" result="worn" />
          <feComponentTransfer in="grain" result="specks">
            <feFuncA type="discrete" tableValues="1 1 1 1 1 1 1 1 1 1 1 0" />
          </feComponentTransfer>
          <feComposite in="worn" in2="specks" operator="in" />
        </filter>
      </defs>
      <g filter="url(#bm-wear)">
        <rect className="bm-seal" x="1" y="1" width="30" height="30" rx="1.4" />
        <g className="bm-chars">
          <text x="23.2" y="14.2">包</text>
          <text x="23.2" y="28.2">装</text>
          <text x="8.8" y="14.2">顾</text>
          <text x="8.8" y="28.2">问</text>
        </g>
      </g>
    </svg>
  );
}
