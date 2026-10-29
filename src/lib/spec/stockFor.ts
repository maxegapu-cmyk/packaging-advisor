/**
 * Which stock a part is made of: the one ordered, else a stock made of the material picked for the
 * part, else the usual one for that part. Kept apart from the bill of components so the print
 * layout can ask for a board's thickness without importing the layout itself.
 * Client-safe.
 */
import type { Form, MaterialPick, PackSpec } from "../pack";
import { choiceOf, insertKind, isFood, pick, type Slot } from "../materials";
import { listStocks, stock as bookStock, type BookStock } from "./book";
import type { StockKind } from "./stocks";

/** Stock kinds a part can be made of, by structure and part. */
export function kindsFor(form: Form, slotId: string, insert?: string): StockKind[] {
  if (slotId === "insert") return insert === "card" ? ["board"] : insert === "pulp" ? ["insert"] : insert === "foam" ? ["insert"] : form === "brocade" ? ["fabric"] : ["insert"];
  switch (slotId) {
    case "core":
      return ["greyboard"];
    case "wrap":
      return form === "paperTube" ? ["paper", "special"] : ["paper", "special", "board"];
    case "slip":
      return ["paper", "special"];
    case "cover":
      return ["fabric", "special"];
    case "label":
      return ["label"];
    case "film":
      return ["laminate"];
    case "handle":
    case "ribbon":
    case "pump":
    case "stopper":
    case "toggle":
      return ["trim"];
    case "liner":
      return form === "paperTube" ? ["special"] : ["trim"];
    case "card":
      return ["board"];
    case "facing":
      return ["board", "paper"];
    case "base":
      return form === "bag" ? ["greyboard", "board"] : ["board"];
  }
  if (slotId === "body") {
    if (form === "carton") return ["board", "flute"];
    if (form === "bag") return ["board", "paper"];
    if (form === "mailer") return ["flute"];
    if (form === "paperTube") return ["tube"];
    return ["container"];
  }
  if (slotId === "glass" || slotId === "blister") return ["container"];
  return ["trim"];
}

/** The usual stock for a part, as a factory would quote it without being told. */
function usualStock(form: Form, slotId: string, category: string, slot: Slot, insert: string): string {
  const food = isFood(category) && slot.contact === "direct";
  switch (`${form}.${slotId}`) {
    case "carton.body":
      return food ? "fbbFood" : "fbb";
    case "bag.body":
      return "fbb";
    case "bag.handle":
      return "ropeHandle";
    case "bag.base":
      return "greyboard";
    case "mailer.body":
      return "bSingle";
    case "mailer.facing":
    case "carton.facing":
      return "duplex";
    case "paperTube.body":
      return "tubeBoard";
    case "paperTube.liner":
      return "foilPaper";
    case "pouch.film":
      return "petVmpetPe";
    case "bottle.body":
      return "hdpeBottle";
    case "bottle.pump":
      return "lotionPump";
    case "tube.body":
      return "peTube";
    case "blister.card":
      return "fbb";
    case "blister.blister":
      return "blisterPet";
    case "jar.glass":
      return "glassJar";
    case "glassBottle.glass":
      return "glassBottle";
    case "glassBottle.stopper":
      return "corkStopper";
    case "tin.body":
      return "tinRound";
    case "can.body":
      return "alCan";
    case "ceramic.body":
      return "ceramicJar";
    case "woodBox.body":
      return "pineCrate";
    case "aseptic.body":
      return "aseptic";
    case "aseptic.cap":
      return "screwCap";
    case "drawer.ribbon":
      return "ribbon";
    case "brocade.cover":
      return "brocadeCloth";
    case "brocade.slip":
      return "offset";
    case "brocade.toggle":
      return "toggle";
  }
  if (slotId === "core") return "greyboard";
  if (slotId === "wrap") return "art";
  if (slotId === "label") return "labelPP";
  if (slotId === "insert") return insert === "card" ? "fbb" : insert === "pulp" ? "pulpDry" : insert === "foam" ? "epe" : form === "brocade" ? "satin" : "flockTray";
  return "included";
}

/**
 * The stock a part is made of: the one ordered when it is still made of the material picked for
 * the part, else a stock of the kinds the part takes made of that material, else the usual one.
 */
export function stockFor(spec: PackSpec, key: string, slot: Slot, category: string): BookStock {
  const own = key.startsWith("inner.") ? (spec.inner?.form ?? spec.form) : spec.form;
  const slotId = key.replace(/^inner\./, "");
  const c = choiceOf(spec, key);
  const mid = pick(spec, key, slot);
  const kinds = kindsFor(own, slotId, insertKind(spec));
  const ordered = c.stock ? bookStock(c.stock) : undefined;
  if (ordered && (!ordered.mid || ordered.mid === mid || !c.id)) return ordered;
  const usual = bookStock(usualStock(own, slotId, category, slot, insertKind(spec)))!;
  if (usual.mid === mid || !usual.mid) return usual;
  const same = listStocks(...kinds).find((s) => s.mid === mid);
  return same ?? usual;
}

/** The grammage a part is ordered in: the seller's, else the stock's usual (snapped to what it is sold in). */
export function gsmFor(s: BookStock, c: MaterialPick, slot?: Slot): number | undefined {
  if (s.kind === "flute" || s.basis === "piece" || s.basis === "litre") return undefined;
  const want = c.gsm ?? (s.kind === "greyboard" ? (slot?.gsm ?? s.gsm) : s.gsm);
  return want;
}

