import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Bi, T } from "@/components/Bi";
import { Journey, journeyOf } from "@/components/Journey";
import { BoardView } from "@/components/BoardView";
import { listModelChoices } from "@/lib/llm/providers";
import { plain, UI } from "@/lib/i18n";
import { canAccess, getBoard, getProject, isHandedOff, listBoards, listUploads } from "@/lib/projects";
import { feedbackAction, handoffAction, pickAction, shareAction } from "../../../actions";
import { getLang, requireInvite } from "../../../_server/session";
import { RegenerateButton, ReviseForm } from "./BoardActions";

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const invite = await requireInvite();
  const lang = await getLang();
  const { id } = await params;
  const sp = await searchParams;
  const project = getProject(id);
  if (!canAccess(project, invite)) notFound();

  const versions = listBoards(project.id);
  const current = (sp.v && versions.some((b) => b.id === sp.v) ? getBoard(sp.v) : null) ?? (versions[0] ? getBoard(versions[0].id) : null);
  const uploads = listUploads(project.id);
  const models = listModelChoices();
  const h = await headers();
  const origin = process.env.PUBLIC_URL?.replace(/\/+$/, "") || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  const uploadsStrip = uploads.length ? (
    <div className="uploads-strip">
      <T k="uploads" lang={lang} className="label" />
      {uploads.map((u) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={u.id} src={`/api/uploads/${u.id}`} alt={u.note || u.kind} title={u.note || u.kind} className={u.kind === "reference" ? "is-ref" : undefined} />
      ))}
    </div>
  ) : null;

  if (!current) {
    return (
      <main className="page page-narrow">
        <Journey steps={[{ state: "done" }, { state: "current" }, { state: "todo" }, { state: "todo" }]} lang={lang} />
        <div className="page-head">
          <h1>{project.title}</h1>
        </div>
        <div className="empty">
          {sp.failed ? <T k="failed" lang={lang} as="p" className="notice notice-error" /> : <T k="noBoardYet" lang={lang} as="p" />}
          {uploadsStrip}
          <RegenerateButton projectId={project.id} lang={lang} models={models} primary />
        </div>
      </main>
    );
  }

  const board = current;
  const handedOff = isHandedOff(project.id);
  const states = journeyOf({ boards: versions.length, picked: !!board.picked, handedOff });
  const spaceHref = `/space/${project.id}?v=${board.id}${board.picked ? `&d=${board.picked}` : ""}`;
  const finalHref = `/p/${project.id}/final`;
  return (
    <main className="page board-layout">
      <Journey steps={states.map((state, i) => ({ state, href: i === 2 && board.picked ? spaceHref : i === 3 && board.picked ? finalHref : undefined }))} lang={lang} />
      <div className={`next-bar${board.picked ? " is-picked" : ""}`}>
        {handedOff ? (
          <>
            <Bi p={UI.nextDone} lang={lang} as="p" className="next-bar-text" />
            <a className="btn" href={finalHref}>
              <Bi p={UI.step4} lang={lang} />
            </a>
          </>
        ) : board.picked ? (
          <>
            <p className="next-bar-text">
              <span className="next-bar-label">{plain(UI.next, lang)}</span>
              <Bi p={UI.nextSpace} lang={lang} />
            </p>
            <a className="btn btn-primary" href={spaceHref}>
              <Bi p={UI.step3} lang={lang} />
            </a>
            <a className="btn" href={finalHref}>
              <Bi p={UI.nextHandoff} lang={lang} />
            </a>
          </>
        ) : (
          <p className="next-bar-text">
            <span className="next-bar-label">{plain(UI.next, lang)}</span>
            <Bi p={UI.nextPick} lang={lang} />
          </p>
        )}
      </div>
      <div className="toolbar">
        <Link href="/products" className="btn btn-small btn-quiet">
          <T k="backToProducts" lang={lang} />
        </Link>
        {versions.length > 1 ? (
          <nav className="versions" aria-label={plain(UI.versions, lang)}>
            <T k="versions" lang={lang} className="label" />
            {[...versions].reverse().map((v) => (
              <Link key={v.id} href={`/p/${project.id}?v=${v.id}`} aria-current={v.id === board.id ? "true" : undefined} title={`${v.note} · ${v.modelLabel}`}>
                v{v.version}
              </Link>
            ))}
          </nav>
        ) : null}
        {uploadsStrip}
      </div>

      <BoardView
        board={board.data}
        lang={lang}
        pickedId={board.picked}
        pack={project.pack}
        packSaveUrl={`/api/projects/${project.id}/pack`}
        studioBase={`/space/${project.id}?v=${board.id}`}
        headerExtra={
          <div className="form" style={{ gap: 10, justifyItems: "end" }}>
            <p className="muted" style={{ fontSize: 13 }}>
              v{board.version} · {board.modelLabel}
            </p>
            <RegenerateButton projectId={project.id} lang={lang} models={models} />
          </div>
        }
        directionActions={(d) => (
          <>
            <form action={pickAction}>
              <input type="hidden" name="boardId" value={board.id} />
              <input type="hidden" name="directionId" value={d.id} />
              <button type="submit" className={board.picked === d.id ? "btn btn-primary" : "btn"}>
                <T k={board.picked === d.id ? "picked" : "pickThis"} lang={lang} />
              </button>
            </form>
            <ReviseForm projectId={project.id} boardId={board.id} directionId={d.id} lang={lang} models={models} />
          </>
        )}
      />

      <section className="after-board" id="handoff">
        <div className="share-box">
          <T k="share" lang={lang} as="h2" className="section-h" />
          {board.shareToken ? (
            <>
              <T k="shareOn" lang={lang} as="p" className="hint" />
              <input type="text" readOnly value={`${origin}/s/${board.shareToken}`} aria-label={plain(UI.share, lang)} />
              <form action={shareAction}>
                <input type="hidden" name="boardId" value={board.id} />
                <input type="hidden" name="mode" value="off" />
                <button type="submit" className="btn btn-small btn-quiet">
                  <T k="stopSharing" lang={lang} />
                </button>
              </form>
            </>
          ) : (
            <form action={shareAction}>
              <input type="hidden" name="boardId" value={board.id} />
              <button type="submit" className="btn">
                <T k="share" lang={lang} />
              </button>
            </form>
          )}
        </div>

        <form action={handoffAction} className="feedback-form">
          <input type="hidden" name="boardId" value={board.id} />
          {sp.done === "handoff" ? (
            <T k="handedOffDone" lang={lang} as="p" />
          ) : (
            <button type="submit" className="btn">
              <T k="handedOff" lang={lang} />
            </button>
          )}
        </form>

        <form action={feedbackAction} className="feedback-form">
          <input type="hidden" name="boardId" value={board.id} />
          <T k="sendFeedback" lang={lang} as="h2" className="section-h" />
          {sp.done === "feedback" ? <T k="thanks" lang={lang} as="p" className="notice" /> : null}
          <fieldset className="radio-row" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="label" style={{ marginBottom: 6 }}>
              <T k="rating" lang={lang} />
            </legend>
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n}>
                <input type="radio" name="rating" value={n} /> {n}
              </label>
            ))}
          </fieldset>
          <textarea name="text" maxLength={2000} placeholder={plain(UI.feedbackBox, lang)} aria-label={plain(UI.feedbackBox, lang)} />
          <div>
            <button type="submit" className="btn">
              <T k="submit" lang={lang} />
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
