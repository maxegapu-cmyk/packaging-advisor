import { rolesOf, sealRoleOf } from "@/lib/artwork";
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
  const seal = (() => {
    const r = rolesOf(d);
    return r[sealRoleOf(r)];
  })();
  if (d.layout === "scroll") {
    // a hanging scroll: 天头 and 地头 in the key colour, two 惊燕 strips, the painting inset
    zones = [
      <rect key="sky" x={0} y={0} width={W} height={44} fill={key} />,
      <rect key="foot" x={0} y={H - 26} width={W} height={26} fill={key} />,
      <rect key="s1" x={72} y={0} width={6} height={44} fill={ground} opacity={0.72} />,
      <rect key="s2" x={122} y={0} width={6} height={44} fill={ground} opacity={0.72} />,
      <rect key="paint" x={20} y={56} width={160} height={164} fill={ground} stroke={ink} strokeOpacity={0.35} />,
      zone(30, 150, 96, 60, "visual", "transparent", ink),
      zone(136, 64, 36, 104, "name", "transparent", ink),
      zone(138, 176, 30, 34, "brand", seal, ground),
      zone(20, H - 22, 120, 18, "info", "transparent", ground),
    ];
  } else if (d.layout === "seal") {
    zones = [
      <rect key="seal" x={102} y={18} width={84} height={104} fill={seal} />,
      zone(108, 26, 72, 22, "brand", "transparent", ground),
      zone(12, 150, 150, 58, "name", "transparent", ink),
      zone(110, 216, 80, 30, "info", "transparent", ink),
      zone(12, 216, 80, 20, "visual", "transparent", ink),
    ];
  } else if (d.layout === "symmetric") {
    // on the centre line: a thick-and-thin frame, the title slip down the axis, a small seal
    zones = [
      <rect key="f1" x={8} y={8} width={W - 16} height={H - 16} fill="none" stroke={key} strokeWidth={3} />,
      <rect key="f2" x={15} y={15} width={W - 30} height={H - 30} fill="none" stroke={key} strokeWidth={1} />,
      <rect key="slip" x={82} y={56} width={36} height={112} fill={key} />,
      zone(64, 24, 72, 22, "brand", "transparent", ink),
      zone(84, 62, 32, 100, "name", "transparent", ground),
      zone(56, 176, 88, 30, "visual", "transparent", ink),
      zone(56, 214, 88, 24, "info", "transparent", ink),
    ];
  } else if (d.layout === "stripe") {
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
