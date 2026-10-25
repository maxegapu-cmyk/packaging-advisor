"use client";

import type { Lang } from "@/lib/i18n";
import { FINISH_LABELS, FINISHES, FORM_LABELS, FORM_PRESET, FORMS, formatSize, type Finish } from "@/lib/pack";
import { usePack } from "./Box3D";
import { FormGlyph } from "./pack/FormGlyph";

const T = {
  form: { zh: "盒型", en: "Structure" },
  finish: { zh: "工艺", en: "Finish" },
  saving: { zh: "保存中…", en: "Saving…" },
  saved: { zh: "已保存", en: "Saved" },
};
const one = (p: { zh: string; en: string }, lang: Lang) => (lang === "en" ? p.en : p.zh);
const both = (p: { zh: string; en: string }, lang: Lang) => (lang === "bi" ? `${p.zh} ${p.en}` : one(p, lang));

/** Package structure for all three boxes on a board: form and finish here, exact size in the 3D space. */
export function PackBar({ lang }: { lang: Lang }) {
  const { spec, setSpec, saving } = usePack();
  return (
    <div className="packbar">
      <div className="packbar-forms" role="radiogroup" aria-label={both(T.form, lang)}>
        {FORMS.map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={spec.form === f}
            title={both(FORM_LABELS[f], lang)}
            className={spec.form === f ? "packbar-form is-active" : "packbar-form"}
            onClick={() => f !== spec.form && setSpec({ ...FORM_PRESET[f], finish: spec.finish })}
          >
            <FormGlyph form={f} />
            <span>{one(FORM_LABELS[f], lang)}</span>
          </button>
        ))}
      </div>
      <label className="packbar-finish">
        <span>{one(T.finish, lang)}</span>
        <select value={spec.finish} onChange={(e) => setSpec({ ...spec, finish: e.currentTarget.value as Finish })}>
          {FINISHES.map((f) => (
            <option key={f} value={f}>
              {both(FINISH_LABELS[f], lang)}
            </option>
          ))}
        </select>
      </label>
      <span className="packbar-size">{formatSize(spec)}</span>
      {saving === "saving" || saving === "saved" ? <span className="packbar-save">{both(saving === "saving" ? T.saving : T.saved, lang)}</span> : null}
    </div>
  );
}
