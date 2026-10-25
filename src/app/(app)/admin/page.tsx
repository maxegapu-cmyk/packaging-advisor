import { getDb } from "@/lib/db";
import { recentFeedback, testerStats } from "@/lib/projects";
import { requireAdmin } from "../../_server/session";
import { AdminNav } from "./AdminNav";

/** What the 20-person test needs to answer: do testers pick a direction and hand it on? */
export default async function AdminOverview() {
  await requireAdmin();
  const stats = testerStats();
  const feedback = recentFeedback(30);
  const totals = stats.reduce(
    (a, s) => ({ active: a.active + (s.boards > 0 ? 1 : 0), picked: a.picked + (s.picks > 0 ? 1 : 0), handed: a.handed + (s.handoffs > 0 ? 1 : 0) }),
    { active: 0, picked: 0, handed: 0 },
  );
  const recentErrors = getDb()
    .prepare("SELECT created_at, payload FROM events WHERE type IN ('generate_failed','revise_failed') ORDER BY created_at DESC LIMIT 10")
    .all() as { created_at: string; payload: string }[];

  return (
    <main className="page admin-grid">
      <div className="page-head">
        <h1>测试概况 Test overview</h1>
        <AdminNav current="overview" />
      </div>

      <section className="panel">
        <h2 className="section-h">MVP 指标 MVP measure</h2>
        <p>
          测试者 {stats.length} 人 · 已生成方案 {totals.active} 人 · 选定方向 {totals.picked} 人 · 已交给设计师或印厂 {totals.handed} 人
        </p>
        <p className="muted">
          {stats.length} testers · {totals.active} generated a board · {totals.picked} picked a direction · {totals.handed} handed it on. 目标：至少一半测试者选定方向并交出。 Goal: at least half pick a direction and hand it on.
        </p>
      </section>

      <section>
        <h2 className="section-h">每位测试者 Per tester</h2>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>测试者 Tester</th>
                <th>最近使用 Last used</th>
                <th className="num">产品 Products</th>
                <th className="num">方案 Boards</th>
                <th className="num">选定 Picks</th>
                <th className="num">交出 Handed on</th>
                <th className="num">失败 Failures</th>
                <th className="num">反馈 Feedback</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.inviteId}>
                  <td>
                    {s.label || "—"} <span className="muted">…{s.codeHint}</span>
                  </td>
                  <td>{s.lastUsedAt ? new Date(s.lastUsedAt).toLocaleString("zh-CN") : "—"}</td>
                  <td className="num">{s.projects}</td>
                  <td className="num">{s.boards}</td>
                  <td className="num">{s.picks}</td>
                  <td className="num">{s.handoffs}</td>
                  <td className="num">{s.failures}</td>
                  <td className="num">{s.feedback}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="section-h">最新反馈 Latest feedback</h2>
        {feedback.length === 0 ? <p className="muted">还没有反馈。 No feedback yet.</p> : null}
        <table className="table">
          <tbody>
            {feedback.map((f, i) => (
              <tr key={i}>
                <td style={{ whiteSpace: "nowrap" }}>{new Date(f.createdAt).toLocaleString("zh-CN")}</td>
                <td>{f.label}</td>
                <td>{f.projectTitle}</td>
                <td className="num">{f.rating ?? "—"}</td>
                <td>{f.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {recentErrors.length ? (
        <section>
          <h2 className="section-h">最近的失败 Recent failures</h2>
          <table className="table">
            <tbody>
              {recentErrors.map((e, i) => {
                const p = JSON.parse(e.payload || "{}");
                return (
                  <tr key={i}>
                    <td style={{ whiteSpace: "nowrap" }}>{new Date(e.created_at).toLocaleString("zh-CN")}</td>
                    <td>{p.model}</td>
                    <td>
                      {p.error}
                      {p.detail?.length ? <div className="muted" style={{ fontSize: 12 }}>{p.detail.join(" | ")}</div> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}
    </main>
  );
}
