import type { ReactNode } from "react";
import type { Board, Direction } from "@/lib/board/schema";
import { CATEGORIES, isCategory } from "@/lib/categories";
import { plain, UI, type Lang } from "@/lib/i18n";
import { Bi, T } from "./Bi";
import { Box3D, BoxSync, PackProvider } from "./Box3D";
import { InnerAndManual, paletteVars } from "./BoxFaces";
import { ColorBar } from "./ColorBar";
import { CopyButton } from "./CopyButton";
import { FaceLayout } from "./FaceLayout";
import { PackBar } from "./PackBar";
import { DEFAULT_PACK, type PackSpec } from "@/lib/pack";

const ROUTE_KEY = { safe: "routeSafe", distinctive: "routeDistinctive", bold: "routeBold" } as const;
const LEVEL_KEY = { high: "levelHigh", medium: "levelMedium", low: "levelLow" } as const;

function copyText(p: { zh: string; en: string }, lang: Lang) {
  if (lang === "zh") return p.zh;
  if (lang === "en") return p.en || p.zh;
  return p.en && p.en !== p.zh ? `${p.zh}\n${p.en}` : p.zh;
}

export function DirectionSheet({ d, board, lang, picked, actions }: { d: Direction; board: Board; lang: Lang; picked?: boolean; actions?: ReactNode }) {
  const recommended = board.recommendation.pick === d.id;
  const brand = board.meta.brand.startsWith("[") ? "" : board.meta.brand;
  return (
    <article className={`sheet${recommended ? " is-recommended" : ""}${picked ? " is-picked" : ""}`} aria-labelledby={`dir-${d.id}`} style={paletteVars(d)}>
      <header className="sheet-head">
        <div className="sheet-tags">
          <span className="dir-id">{d.id}</span>
          <T k={ROUTE_KEY[d.route]} lang={lang} className="tag" />
          {recommended ? <T k="recommended" lang={lang} className="tag tag-accent" /> : null}
          {picked ? <T k="picked" lang={lang} className="tag tag-ink" /> : null}
        </div>
        <h3 id={`dir-${d.id}`} className="sheet-name">
          <Bi p={d.name} lang={lang} />
        </h3>
        <Bi p={d.tagline} lang={lang} as="p" className="sheet-tagline" />
      </header>

      <div className="stage">
        <Box3D d={d} brand={brand} lang={lang} label={`${d.id} ${plain(d.name, lang)}: ${plain(UI.boxOf, lang)}`} />
        <InnerAndManual d={d} brand={brand} />
      </div>

      <ColorBar palette={d.palette} lang={lang} label={plain(UI.colorCard, lang)} />

      <div className="sheet-key">
        <div>
          <T k="anchor" lang={lang} as="div" className="label" />
          <Bi p={d.anchor} lang={lang} as="p" className="strong-line" />
        </div>
        <div className="fit">
          <div>
            <T k="suitable" lang={lang} as="div" className="label" />
            <Bi p={d.suitable} lang={lang} as="p" />
          </div>
          <div>
            <T k="risk" lang={lang} as="div" className="label" />
            <Bi p={d.risk} lang={lang} as="p" />
          </div>
        </div>
      </div>

      <details className="more">
        <summary>
          <T k="fullSpec" lang={lang} />
        </summary>
        <div className="more-body">
          <div className="more-layout">
            <FaceLayout d={d} lang={lang} title={plain(UI.faceLayout, lang)} />
            <T k="faceLayout" lang={lang} as="p" className="label" />
          </div>
          <dl className="spec">
            <T k="outerFront" lang={lang} as="dt" />
            <Bi p={d.carriers.outerFront} lang={lang} as="dd" />
            <T k="outerBack" lang={lang} as="dt" />
            <Bi p={d.carriers.outerBack} lang={lang} as="dd" />
            <T k="inner" lang={lang} as="dt" />
            <Bi p={d.carriers.inner} lang={lang} as="dd" />
            <T k="manual" lang={lang} as="dt" />
            <Bi p={d.carriers.manual} lang={lang} as="dd" />
            <T k="typography" lang={lang} as="dt" />
            <Bi p={d.styleDna.typography} lang={lang} as="dd" />
            <T k="imagery" lang={lang} as="dt" />
            <Bi p={d.styleDna.imagery} lang={lang} as="dd" />
            <T k="graphics" lang={lang} as="dt" />
            <Bi p={d.styleDna.graphics} lang={lang} as="dd" />
            <T k="finish" lang={lang} as="dt" />
            <Bi p={d.styleDna.finish} lang={lang} as="dd" />
          </dl>
        </div>
      </details>

      {actions ? <div className="sheet-actions">{actions}</div> : null}
    </article>
  );
}

export function BoardView({
  board,
  lang,
  pickedId,
  directionActions,
  headerExtra,
  pack = DEFAULT_PACK,
  packSaveUrl,
  studioBase,
}: {
  board: Board;
  lang: Lang;
  pickedId?: string | null;
  directionActions?: (d: Direction) => ReactNode;
  headerExtra?: ReactNode;
  /** Package structure the boxes are drawn on. */
  pack?: PackSpec;
  /** Where structure changes are saved; without it they stay on the page. */
  packSaveUrl?: string;
  /** Base link to the full-screen 3D space; `d=<direction>` is appended. */
  studioBase?: string;
}) {
  const cat = isCategory(board.meta.category) ? CATEGORIES[board.meta.category] : null;
  const rec = board.recommendation;
  const recDir = board.directions.find((d) => d.id === rec.pick);
  return (
    <div className="board">
      <header className="board-head">
        <div className="board-titles">
          <p className="board-meta">
            {board.meta.brand ? <span>{board.meta.brand}</span> : null}
            {cat ? <Bi p={cat} lang={lang} /> : null}
          </p>
          <Bi p={board.meta.product} lang={lang} as="h1" className="board-title" />
        </div>
        {headerExtra}
      </header>

      <section className="handoff">
        <div className="handoff-pick">
          <T k="ourPick" lang={lang} as="h2" className="label" />
          <p className="handoff-dir">
            <span className="dir-id">{rec.pick}</span>
            {recDir ? <Bi p={recDir.name} lang={lang} /> : null}
          </p>
          <Bi p={rec.reason} lang={lang} as="p" className="handoff-reason" />
        </div>
        <div className="handoff-quote">
          <div className="handoff-quote-head">
            <T k="forDesigner" lang={lang} as="h2" className="label" />
            <CopyButton text={copyText(rec.designerInstruction, lang)} label={plain(UI.copyText, lang)} done={plain(UI.copied, lang)} />
          </div>
          <Bi p={rec.designerInstruction} lang={lang} as="p" className="quote" />
        </div>
      </section>

      <section aria-label={plain(UI.directions, lang)}>
        <PackProvider initial={pack} saveUrl={packSaveUrl} studioBase={studioBase}>
          <BoxSync label={plain(UI.rotateTogether, lang)} hint={plain(UI.dragHint, lang)} toolbar={<PackBar lang={lang} />}>
            <div className="sheets">
              {board.directions.map((d) => (
                <DirectionSheet key={d.id} d={d} board={board} lang={lang} picked={pickedId === d.id} actions={directionActions?.(d)} />
              ))}
            </div>
          </BoxSync>
        </PackProvider>
      </section>

      <div className="lower">
        <section className="col">
          <T k="whatWeSaw" lang={lang} as="h2" className="col-h" />
          <Bi p={board.reading.product} lang={lang} as="p" />
          {board.reading.references.map((r, i) => (
            <div className="ref" key={i}>
              <h3 className="label">{r.label}</h3>
              <dl className="spec">
                <T k="borrow" lang={lang} as="dt" />
                <Bi p={r.borrow} lang={lang} as="dd" />
                <T k="avoid" lang={lang} as="dt" />
                <Bi p={r.avoid} lang={lang} as="dd" />
              </dl>
            </div>
          ))}
          {board.reading.assumptions.length ? (
            <>
              <T k="assumptions" lang={lang} as="h3" className="label" />
              <ul className="plain-list">
                {board.reading.assumptions.map((a, i) => (
                  <Bi key={i} p={a} lang={lang} as="li" />
                ))}
              </ul>
            </>
          ) : null}
        </section>

        <section className="col">
          <T k="packagingCopy" lang={lang} as="h2" className="col-h" />
          <dl className="spec">
            <T k="nameLine" lang={lang} as="dt" />
            <Bi p={board.copy.nameLine} lang={lang} as="dd" />
            <T k="frontPromise" lang={lang} as="dt" />
            <Bi p={board.copy.frontPromise} lang={lang} as="dd" />
          </dl>
          {board.copy.manualSteps.length ? (
            <>
              <T k="manualSteps" lang={lang} as="h3" className="label" />
              <ol className="steps">
                {board.copy.manualSteps.map((s, i) => (
                  <Bi key={i} p={s} lang={lang} as="li" />
                ))}
              </ol>
            </>
          ) : null}
          {board.copy.placeholders.length ? (
            <>
              <T k="placeholders" lang={lang} as="h3" className="label" />
              <p className="placeholders">
                {board.copy.placeholders.map((p, i) => (
                  <code key={i}>{p}</code>
                ))}
              </p>
            </>
          ) : null}
        </section>

        <section className="col">
          <T k="claimCheck" lang={lang} as="h2" className="col-h" />
          {board.claimCheck.length === 0 ? <T k="claimNone" lang={lang} as="p" /> : null}
          {board.claimCheck.map((c, i) => (
            <div className={`claim claim-${c.level}`} key={i}>
              <p className="claim-text">
                <T k={LEVEL_KEY[c.level]} lang={lang} className="tag" />
                <q>{c.text}</q>
              </p>
              <Bi p={c.issue} lang={lang} as="p" />
              <div className="claim-safer">
                <T k="saferWording" lang={lang} as="div" className="label" />
                <Bi p={c.safer} lang={lang} as="p" />
              </div>
            </div>
          ))}
          {board.complianceNotes.length ? (
            <>
              <T k="compliance" lang={lang} as="h3" className="label" />
              <ul className="plain-list">
                {board.complianceNotes.map((n, i) => (
                  <Bi key={i} p={n} lang={lang} as="li" />
                ))}
              </ul>
            </>
          ) : null}
        </section>
      </div>

      <T k="disclaimer" lang={lang} as="p" className="disclaimer" />
    </div>
  );
}
