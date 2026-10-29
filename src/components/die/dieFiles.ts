/**
 * The dieline files of a pack, as downloads: DXF for die-makers' CAD and cutting tables, SVG for
 * Illustrator, and a vector PDF to check and sign. Each holds every printed part's dieline and the
 * press-sheet layout of each sheet-printed part as the quote runs it.
 * Client-only.
 */
import type { Lang } from "@/lib/i18n";
import type { PackSpec } from "@/lib/pack";
import { printLayout } from "@/lib/print/layout";
import { allDieDrawings, type Drawing } from "@/lib/print/die";
import { toDxf, toSvg } from "@/lib/print/dieExport";
import { quoteAt } from "@/lib/spec/quote";
import { DEFAULT_QTY } from "@/lib/spec/quote";

export type DieFormat = "dxf" | "svg" | "pdf";

/** The order quantity the layouts follow: the first of 3,000 or more, else the largest. */
export function layoutQty(spec: PackSpec): number {
  const q = spec.order?.qty?.length ? spec.order.qty : DEFAULT_QTY;
  return q.find((n) => n >= 3000) ?? q[q.length - 1];
}

export function dieSet(spec: PackSpec, category: string, product: string, qty = layoutQty(spec)): Drawing[] {
  const q = quoteAt(spec, category, qty);
  const layouts = q.comps
    .filter((c) => c.imposition && c.comp.blanks?.length && c.comp.blanks.every((b) => b.piece))
    .map((c) => ({ pieces: c.comp.blanks!.map((b) => b.piece!), imposition: c.imposition!, arrange: c.arrange ?? "single", name: c.comp.label }));
  return allDieDrawings(spec, printLayout(spec), product, layouts);
}

const safe = (s: string) => s.replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 40) || "package";

export async function downloadDie(format: DieFormat, spec: PackSpec, category: string, product: string, lang: Lang): Promise<void> {
  const ds = dieSet(spec, category, product);
  let blob: Blob;
  if (format === "dxf") blob = new Blob([toDxf(ds, lang)], { type: "application/dxf" });
  else if (format === "svg") blob = new Blob([toSvg(ds, lang)], { type: "image/svg+xml" });
  else {
    const { buildDiePdf } = await import("../final/diePdf");
    const bytes = await buildDiePdf(ds, lang, `${product} dieline`);
    blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${safe(product)}-刀模-dieline.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
