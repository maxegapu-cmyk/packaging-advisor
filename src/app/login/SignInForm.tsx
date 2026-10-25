"use client";

import { useActionState } from "react";
import { signInAction } from "../actions";

export function SignInForm({ labels }: { labels: { code: string; help: string; submit: string; bad: string } }) {
  const [state, action, pending] = useActionState(signInAction, null);
  return (
    <form action={action} className="form">
      <div className="field">
        <label htmlFor="code">{labels.code}</label>
        <input id="code" name="code" type="text" autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} placeholder="XXXX-XXXX-XXXX" required aria-describedby="code-help" />
        <span id="code-help" className="hint">
          {labels.help}
        </span>
      </div>
      {state?.error ? (
        <p className="notice notice-error" role="alert">
          {labels.bad}
        </p>
      ) : null}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {labels.submit}
      </button>
    </form>
  );
}
