/**
 * Edits the spec sheet makes to a pack: ordering a part in another stock (which also sets the
 * part's material number, so compliance, the 3D look and the print file follow), its grammage,
 * print and finishing, and the order's terms.
 * Client-safe.
 */
import type { MaterialPick, Order, PackSpec } from "../pack";
import { stock as bookStock } from "./book";

export function withStock(spec: PackSpec, key: string, id: string, gsm?: number): PackSpec {
  const s = bookStock(id);
  const cur = spec.materials?.[key] ?? {};
  const next: MaterialPick = { ...cur, stock: id };
  if (s?.mid) next.id = s.mid;
  else delete next.id;
  // a grammage the new stock is sold in, else its usual one
  const g = gsm ?? (cur.gsm && s?.gsms?.includes(cur.gsm) ? cur.gsm : s?.gsm);
  if (g && s && s.kind !== "flute" && s.basis !== "piece" && s.basis !== "litre") next.gsm = g;
  else delete next.gsm;
  delete next.grade;
  return { ...spec, materials: { ...(spec.materials ?? {}), [key]: next } };
}

export function withPart(spec: PackSpec, key: string, patch: Partial<MaterialPick>): PackSpec {
  const next: MaterialPick = { ...(spec.materials?.[key] ?? {}), ...patch };
  for (const k of Object.keys(next) as (keyof MaterialPick)[]) if (next[k] === undefined) delete next[k];
  const materials = { ...(spec.materials ?? {}) };
  if (Object.keys(next).length) materials[key] = next;
  else delete materials[key];
  return { ...spec, materials };
}

export function withOrder(spec: PackSpec, patch: Partial<Order>): PackSpec {
  const next: Order = { ...(spec.order ?? {}), ...patch };
  for (const k of Object.keys(next) as (keyof Order)[]) if (next[k] === undefined) delete next[k];
  return { ...spec, order: next };
}
