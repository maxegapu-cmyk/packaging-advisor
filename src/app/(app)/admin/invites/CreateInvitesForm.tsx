"use client";

import { useActionState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { createInvitesAction } from "../actions";

export function CreateInvitesForm() {
  const [state, action, pending] = useActionState(createInvitesAction, null);
  return (
    <section className="panel">
      <h2 className="section-h">生成邀请码 Create codes</h2>
      <form action={action} className="inline-form">
        <label className="field" style={{ minWidth: 100 }}>
          <span className="label">数量 Count</span>
          <input type="text" inputMode="numeric" name="count" defaultValue="20" />
        </label>
        <label className="field">
          <span className="label">备注前缀 Label prefix</span>
          <input type="text" name="label" placeholder="例如 浙江卖家 e.g. Zhejiang seller" />
        </label>
        <label className="check" style={{ paddingBottom: 8 }}>
          <input type="checkbox" name="admin" /> 管理员 Admin
        </label>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          生成 Create
        </button>
      </form>
      {state?.codes.length ? (
        <div style={{ display: "grid", gap: 8 }}>
          <p>
            <strong>请现在复制保存：离开此页后将无法再次查看完整邀请码。</strong> Copy these now: full codes can&apos;t be shown again after you leave this page.
          </p>
          <pre className="codes">{state.codes.join("\n")}</pre>
          <div>
            <CopyButton text={state.codes.join("\n")} label="全部复制 Copy all" done="已复制 Copied" />
          </div>
        </div>
      ) : null}
    </section>
  );
}
