"use client";

import { useEffect } from "react";

export function HashScroll() {
  useEffect(() => {
    function go() {
      const id = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (!id) return;
      const node = document.getElementById(id);
      node?.scrollIntoView({ block: "start" });
      node?.querySelector<HTMLElement>("input:not([type=hidden]):not([type=file]), textarea")?.focus({ preventScroll: true });
    }
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, []);
  return null;
}
