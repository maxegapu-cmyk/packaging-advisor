"use client";

import { useEffect, useState } from "react";
import { inscriptionEpoch, needInscription, onInscriptionFont } from "@/lib/fonts";

/**
 * Asks for the inscription hand's glyphs for `text` and returns a number that changes when they
 * arrive: put it in the dependencies of whatever draws that text on a canvas.
 */
export function useInscription(text: string): number {
  const [n, setN] = useState(inscriptionEpoch);
  useEffect(() => onInscriptionFont(() => setN(inscriptionEpoch())), []);
  useEffect(() => {
    if (text) needInscription(text);
  }, [text]);
  return n;
}
