"use client";

import { setLibrary, type Library } from "@/lib/materials";

/**
 * Puts the material library in force in the browser, for server-rendered pages whose 3D models
 * render on the client. Place it before them: it sets the library as it renders.
 */
export function LibraryInForce({ library }: { library: Library }) {
  setLibrary(library);
  return null;
}
