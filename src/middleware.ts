import { NextResponse, type NextRequest } from "next/server";

/** Pass the current path to server components (used to return to the same page after switching language). */
export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/((?!_next/|api/|favicon).*)"] };
