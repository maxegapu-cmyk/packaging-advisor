import type { Direction } from "@/lib/board/schema";
import type { Lang } from "@/lib/i18n";

const LABELS = {
  brand: { zh: "品牌", en: "Brand" },
  name: { zh: "品名", en: "Name" },
  visual: { zh: "主视觉", en: "Key visual" },
  info: { zh: "卖点 / 信息", en: "Claims / info" },
};

function lbl(k: keyof typeof LABELS, lang: Lang) {
  const p = LABELS[k];
  // Zones are small: one language per label (Chinese in bilingual mode).
  return lang === "en" ? p.en : p.zh;
}

/**
 * Front-face layout drawn as zones in the direction's colors: where the brand, name,
 * key visual and info sit, and how much area each takes. Not to scale.
 */
export function FaceLayout({ d, lang, title }: { d: Direction; lang: Lang; title: string }) {
  const [ground, ink, key, accent] = [d.palette[0].hex, d.palette[1].hex, d.palette[2].hex, (d.palette[3] ?? d.palette[2]).hex];
  const W = 200;
  const H = 260;
  const zone = (x: number, y: number, w: number, h: number, k: keyof typeof LABELS, fill: string, text: string) => (
    <g key={k}>
      <rect x={x} y={y} width={w} height={h} fill={fill} stroke={ink} strokeWidth={0.75} strokeDasharray="3 2" />
      <text x={x + 6} y={y + 14} fontSize={9.5} fill={text}>
        {lbl(k, lang)}
      </text>
    </g>
  );
  let zones;
  if (d.layout === "stripe") {
    zones = [
      <rect key="band" x={0} y={0} width={44} height={H} fill={key} />,
      zone(56, 18, 92, 22, "brand", "transparent", ink),
      zone(56, 150, 132, 54, "name", "transparent", ink),
      zone(120, 60, 68, 76, "visual", "transparent", ink),
      zone(56, 216, 132, 30, "info", "transparent", ink),
    ];
  } else if (d.layout === "split") {
    zones = [
      <rect key="half" x={116} y={0} width={84} height={H} fill={key} />,
      zone(12, 14, 92, 22, "brand", "transparent", ink),
      zone(12, 70, 92, 90, "name", "transparent", ink),
      zone(124, 40, 66, 150, "visual", "transparent", ground),
      zone(12, 214, 92, 32, "info", "transparent", ink),
    ];
  } else {
    zones = [
      <circle key="orb" cx={150} cy={196} r={56} fill={key} />,
      <circle key="ring" cx={168} cy={190} r={26} fill="none" stroke={accent} strokeWidth={2} />,
      zone(12, 14, 88, 22, "brand", "transparent", ink),
      zone(12, 46, 104, 78, "name", "transparent", ink),
      zone(104, 146, 88, 100, "visual", "transparent", ink),
      zone(12, 214, 84, 32, "info", "transparent", ink),
    ];
  }
  return (
    <figure className="facelayout">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
        <rect x={0} y={0} width={W} height={H} fill={ground} />
        {zones}
        <rect x={0.5} y={0.5} width={W - 1} height={H - 1} fill="none" stroke="#000" strokeOpacity={0.25} />
      </svg>
    </figure>
  );
}
