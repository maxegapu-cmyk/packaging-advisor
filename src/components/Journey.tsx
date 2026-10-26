import type { Lang, Pair } from "@/lib/i18n";
import { UI } from "@/lib/i18n";
import { Bi } from "./Bi";

export type StepState = "done" | "current" | "todo";
export type JourneyStep = { state: StepState; href?: string };

const STEPS: { t: Pair; d: Pair }[] = [
  { t: UI.step1, d: UI.step1d },
  { t: UI.step2, d: UI.step2d },
  { t: UI.step3, d: UI.step3d },
  { t: UI.step4, d: UI.step4d },
];

/** Where a product is in the four steps, from what has happened to it. */
export function journeyOf(p: { boards: number; picked: boolean; handedOff: boolean }): StepState[] {
  if (p.handedOff) return ["done", "done", "done", "done"];
  if (p.picked) return ["done", "done", "current", "todo"];
  if (p.boards > 0) return ["done", "current", "todo", "todo"];
  return ["current", "todo", "todo", "todo"];
}

/**
 * The four steps every product goes through: upload → compare directions → proof in 3D →
 * hand off. Shown at the top of each step's page, so a seller always knows where they are
 * and what comes next. Done steps can link back.
 */
export function Journey({ steps, lang, compact = false }: { steps: JourneyStep[]; lang: Lang; compact?: boolean }) {
  return (
    <nav className={compact ? "journey is-compact" : "journey"} aria-label={lang === "en" ? UI.journey.en : UI.journey.zh}>
      <ol>
        {STEPS.map((s, i) => {
          const st = steps[i] ?? { state: "todo" };
          const body = (
            <>
              <span className="journey-n" aria-hidden="true">
                {st.state === "done" ? (
                  <svg viewBox="0 0 16 16">
                    <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span className="journey-text">
                <Bi p={s.t} lang={lang} className="journey-t" />
                {compact ? null : <Bi p={s.d} lang={lang} className="journey-d" />}
              </span>
            </>
          );
          return (
            <li key={i} className={`journey-step is-${st.state}`} aria-current={st.state === "current" ? "step" : undefined}>
              {st.href && st.state !== "current" ? (
                <a href={st.href} className="journey-link">
                  {body}
                </a>
              ) : (
                <span className="journey-link">{body}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
