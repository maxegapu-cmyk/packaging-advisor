import { listProviders, PRESETS } from "@/lib/llm/providers";
import { requireAdmin } from "../../../_server/session";
import { addModelAction, deleteProviderAction, saveProviderAction, testProviderAction, toggleProviderAction, updateModelAction } from "../actions";
import { AdminNav, Flash } from "../AdminNav";
import { FetchModels, ProviderFields } from "./ProviderFields";

const KIND_LABEL = { openai: "OpenAI 兼容 OpenAI-compatible", anthropic: "Anthropic", demo: "离线演示 Offline demo" } as const;

export default async function ModelsPage({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const providers = listProviders();
  return (
    <main className="page admin-grid">
      <div className="page-head">
        <h1>模型平台 Model platforms</h1>
        <AdminNav current="models" />
      </div>
      <p className="muted" style={{ maxWidth: "60em" }}>
        接入任何提供 API Key 的模型平台。测试者在生成时可以从已启用的模型中自由选择；标记为默认的模型排在第一位。API Key 加密保存，不会发送到浏览器。
        Connect any model platform that issues API keys. Testers choose freely among enabled models; the default comes first. Keys are stored encrypted and never sent to the browser.
      </p>
      <Flash msg={sp.msg} err={sp.err} />

      <section className="provider">
        <h2 className="section-h">添加平台 Add a platform</h2>
        <form action={saveProviderAction} className="form">
          <ProviderFields presets={PRESETS} />
          <div>
            <button className="btn btn-primary" type="submit">
              保存平台 Save platform
            </button>
          </div>
        </form>
      </section>

      {providers.map((p) => (
        <section key={p.id} className="provider">
          <div className="provider-head">
            <div>
              <h2 className="section-h" style={{ marginBottom: 2 }}>
                {p.name} {p.enabled ? null : <span className="tag">已停用 Disabled</span>}
              </h2>
              <p className="muted" style={{ fontSize: 13 }}>
                {KIND_LABEL[p.kind]}
                {p.baseUrl ? ` · ${p.baseUrl}` : ""}
                {p.kind !== "demo" ? ` · Key: ${p.keyHint || "未设置 not set"}` : ""}
              </p>
            </div>
            <div className="toolbar">
              <form action={toggleProviderAction}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="enabled" value={p.enabled ? "0" : "1"} />
                <button className="btn btn-small btn-quiet" type="submit">
                  {p.enabled ? "停用 Disable" : "启用 Enable"}
                </button>
              </form>
              {p.kind !== "demo" ? (
                <form action={deleteProviderAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="btn btn-small btn-danger" type="submit">
                    删除 Delete
                  </button>
                </form>
              ) : null}
            </div>
          </div>

          {p.models.length ? (
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>名称 Label</th>
                    <th>模型 ID Model ID</th>
                    <th>看图 Vision</th>
                    <th>状态 Status</th>
                    <th>操作 Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {p.models.map((m) => (
                    <tr key={m.id}>
                      <td>
                        {m.label} {m.isDefault ? <span className="tag tag-accent">默认 Default</span> : null}
                      </td>
                      <td>
                        <code>{m.model}</code>
                      </td>
                      <td>
                        <form action={updateModelAction}>
                          <input type="hidden" name="id" value={m.id} />
                          <input type="hidden" name="op" value={m.vision ? "vision-off" : "vision-on"} />
                          <button className="btn btn-small btn-quiet" type="submit" title="切换 Toggle">
                            {m.vision ? "能看图 Yes" : "不能 No"}
                          </button>
                        </form>
                      </td>
                      <td>{m.enabled ? "启用 On" : "停用 Off"}</td>
                      <td>
                        <div className="toolbar">
                          {!m.isDefault ? (
                            <form action={updateModelAction}>
                              <input type="hidden" name="id" value={m.id} />
                              <input type="hidden" name="op" value="default" />
                              <button className="btn btn-small btn-quiet" type="submit">
                                设为默认 Make default
                              </button>
                            </form>
                          ) : null}
                          <form action={updateModelAction}>
                            <input type="hidden" name="id" value={m.id} />
                            <input type="hidden" name="op" value={m.enabled ? "disable" : "enable"} />
                            <button className="btn btn-small btn-quiet" type="submit">
                              {m.enabled ? "停用 Disable" : "启用 Enable"}
                            </button>
                          </form>
                          {p.kind !== "demo" ? (
                            <>
                              <form action={testProviderAction}>
                                <input type="hidden" name="id" value={p.id} />
                                <input type="hidden" name="model" value={m.model} />
                                <button className="btn btn-small btn-quiet" type="submit">
                                  测试连接 Test
                                </button>
                              </form>
                              <form action={updateModelAction}>
                                <input type="hidden" name="id" value={m.id} />
                                <input type="hidden" name="op" value="delete" />
                                <button className="btn btn-small btn-danger" type="submit">
                                  删除 Delete
                                </button>
                              </form>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">还没有模型。添加至少一个模型后测试者才能使用这个平台。 No models yet; add at least one so testers can use this platform.</p>
          )}

          {p.kind !== "demo" ? (
            <>
              <form action={addModelAction} className="inline-form">
                <input type="hidden" name="providerId" value={p.id} />
                <label className="field">
                  <span className="label">模型 ID Model ID</span>
                  <input type="text" name="model" required placeholder="例如 e.g. qwen-vl-max" />
                </label>
                <label className="field">
                  <span className="label">显示名称 Label</span>
                  <input type="text" name="label" placeholder="可不填 Optional" />
                </label>
                <label className="check" style={{ paddingBottom: 8 }}>
                  <input type="checkbox" name="vision" /> 能看图 Can see images
                </label>
                <button className="btn" type="submit">
                  添加模型 Add model
                </button>
              </form>
              <FetchModels providerId={p.id} />
              <details>
                <summary>编辑平台 Edit platform</summary>
                <form action={saveProviderAction} className="form" style={{ marginTop: 12 }}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="enabled" value={p.enabled ? "1" : "0"} />
                  <ProviderFields presets={[]} initial={{ name: p.name, kind: p.kind, baseUrl: p.baseUrl }} editing />
                  <div>
                    <button className="btn" type="submit">
                      保存 Save
                    </button>
                  </div>
                </form>
              </details>
            </>
          ) : null}
        </section>
      ))}
    </main>
  );
}
