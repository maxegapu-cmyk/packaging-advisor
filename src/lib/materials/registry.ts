/**
 * Which material numbers a board may name: the list's own, or the library's as set by
 * setLibrary (added materials in, hidden ones out). Kept apart from the catalog so the board
 * validator does not load the whole list.
 */
import { MATERIAL_IDS } from "./ids";

let known: ReadonlySet<string> = MATERIAL_IDS;
export const isKnownMaterial = (id: string) => known.has(id);
export function setKnownMaterials(ids: Iterable<string>) {
  known = new Set(ids);
}
