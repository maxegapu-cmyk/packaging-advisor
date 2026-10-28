"use client";

import { useEffect } from "react";
import { registerShoujin } from "@/lib/fonts";

/** Adds the licensed 瘦金体 face to the page when one is configured (lib/fonts). */
export function InscriptionFont() {
  useEffect(() => {
    void registerShoujin();
  }, []);
  return null;
}
