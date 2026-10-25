import Link from "next/link";

export function AdminNav({ current }: { current: "overview" | "models" | "invites" }) {
  const items = [
    { key: "overview", href: "/admin", label: "测试概况 Test overview" },
    { key: "models", href: "/admin/models", label: "模型平台 Model platforms" },
    { key: "invites", href: "/admin/invites", label: "邀请码 Invite codes" },
  ] as const;
  return (
    <nav className="toolbar" aria-label="管理 Admin">
      {items.map((i) => (
        <Link key={i.key} href={i.href} className={i.key === current ? "btn btn-small" : "btn btn-small btn-quiet"} aria-current={i.key === current ? "page" : undefined}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

export function Flash({ msg, err }: { msg?: string; err?: string }) {
  if (err) return <p className="notice notice-error" role="alert">{err}</p>;
  if (msg) return <p className="notice" role="status">{msg}</p>;
  return null;
}
