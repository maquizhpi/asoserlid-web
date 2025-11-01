"use client";
import { useEffect } from "react";

let locks = 0; // contador global de modales abiertos

export function lockScroll() {
  locks += 1;
  const html = document.documentElement;
  const body = document.body;

  html.classList.add("modal-open");
  body.classList.add("modal-open");

  // forzar inline por si hay estilos de terceros
  html.style.overflow = "hidden";
  body.style.overflow = "hidden";
}

export function unlockScroll() {
  locks = Math.max(0, locks - 1);
  if (locks > 0) return;

  const html = document.documentElement;
  const body = document.body;

  html.classList.remove("modal-open");
  body.classList.remove("modal-open");

  html.style.overflow = "";
  body.style.overflow = "";
}

export function hardUnlockScroll() {
  locks = 0;
  const html = document.documentElement;
  const body = document.body;

  html.classList.remove("modal-open");
  body.classList.remove("modal-open");

  html.style.overflow = "";
  body.style.overflow = "";
}

/** Hook: bloquea/desbloquea el scroll mientras `enabled` sea true */
export default function useScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    lockScroll();

    const onVisibility = () => {
      if (document.visibilityState !== "visible") hardUnlockScroll();
    };
    const onPageHide = () => hardUnlockScroll();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      unlockScroll();
    };
  }, [enabled]);
}
