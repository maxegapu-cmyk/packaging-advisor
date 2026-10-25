import { listInvites } from "@/lib/auth";
import { requireAdmin } from "../../../_server/session";
import { inviteAction } from "../actions";
import { AdminNav } from "../AdminNav";
import { CreateInvitesForm } from "./CreateInvitesForm";

export default async function InvitesPage() {
  const me = await requireAdmin();
  const invites = listInvites();
  return (
    <main className="page admin-grid">
      <div className="page-head">
        <h1>邀请码 Invite codes</h1>
        <AdminNav current="invites" />
      </div>

      <CreateInvitesForm />

      <section>
        <h2 className="section-h">全部邀请码 All codes</h2>
        <p className="muted" style={{ marginBottom: 10 }}>
          出于安全，邀请码只保存加密后的指纹，这里只显示末四位。 For security only a fingerprint is stored; the last four characters are shown.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>末四位 Ends with</th>
                <th>备注 Label</th>
                <th>角色 Role</th>
                <th>最近使用 Last used</th>
                <th>状态 Status</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((i) => (
                <tr key={i.id}>
                  <td>
                    <code>…{i.codeHint}</code>
                  </td>
                  <td>
                    <form action={inviteAction} className="inline-form">
                      <input type="hidden" name="id" value={i.id} />
                      <input type="hidden" name="op" value="label" />
                      <input type="text" name="label" defaultValue={i.label} aria-label="备注 Label" style={{ width: 180 }} />
                      <button className="btn btn-small btn-quiet" type="submit">
                        保存 Save
                      </button>
                    </form>
                  </td>
                  <td>{i.isAdmin ? "管理员 Admin" : "测试者 Tester"}</td>
                  <td>{i.lastUsedAt ? new Date(i.lastUsedAt).toLocaleString("zh-CN") : "从未 Never"}</td>
                  <td>
                    {i.id === me.id ? (
                      <span className="muted">当前登录 You</span>
                    ) : (
                      <form action={inviteAction}>
                        <input type="hidden" name="id" value={i.id} />
                        <input type="hidden" name="op" value={i.disabled ? "enable" : "disable"} />
                        <button className={i.disabled ? "btn btn-small" : "btn btn-small btn-danger"} type="submit">
                          {i.disabled ? "已停用，重新启用 Disabled — enable" : "停用 Disable"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
