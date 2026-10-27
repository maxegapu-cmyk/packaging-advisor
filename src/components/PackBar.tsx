"use client";

import type { Lang } from "@/lib/i18n";
import { FINISH_LABELS, FINISHES, FORM_LABELS, FORM_PRESET, formatSize, MATERIAL_GROUPS, type Finish, type Form } from "@/lib/pack";
import { usePack } from "./Box3D";
import { FormGlyph } from "./pack/FormGlyph";

const T = {
  form: { zh: "盒型", en: "Structure" },
  finish: { zh: "工艺", en: "Finish" },
  saving: { zh: "保存中…", en: "Saving…" },
  saved: { zh: "已保存", en: "Saved" },
};
const one = (p: { zh: string; en: string }, lang: Lang) => (lang === "en" ? p.en : p.zh);
const both = one;

/** Package structure for all three directions on a board: form and finish here; size and combinations in the 3D space. */
export function PackBar({ lang }: { lang: Lang }) {
  const { spec, setSpec, saving } = usePack();
  return (
    <div className="packbar">
      <label className="packbar-formpick">
        <FormGlyph form={spec.form} />
        <span className="sr-only">{both(T.form, lang)}</span>
        <select
          value={spec.form}
          aria-label={both(T.form, lang)}
          onChange={(e) => {
            const f = e.currentTarget.value as Form;
            if (f !== spec.form) setSpec({ ...FORM_PRESET[f], finish: spec.finish });
          }}
        >
          {MATERIAL_GROUPS.map((g) => (
            <optgroup key={g.id} label={both(g.label, lang)}>
              {g.forms.map((f) => (
                <option key={f} value={f}>
                  {both(FORM_LABELS[f], lang)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
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
