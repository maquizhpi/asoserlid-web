"use client";

import { useEffect, useState } from "react";

type NoticeTone = "info" | "success" | "error" | "warning";

type NoticePayload = {
  title?: string;
  message: string;
  tone?: NoticeTone;
};

type ConfirmPayload = NoticePayload & {
  confirmLabel?: string;
  cancelLabel?: string;
  resolve: (confirmed: boolean) => void;
};

declare global {
  interface WindowEventMap {
    "asoserlid:notice": CustomEvent<NoticePayload>;
    "asoserlid:confirm": CustomEvent<ConfirmPayload>;
  }
}

export function notifySystem(message: string, options: Omit<NoticePayload, "message"> = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("asoserlid:notice", { detail: { message, ...options } }));
}

export function confirmSystem(message: string, options: Omit<ConfirmPayload, "message" | "resolve"> = {}) {
  if (typeof window === "undefined") return Promise.resolve(false);
  return new Promise<boolean>((resolve) => {
    window.dispatchEvent(new CustomEvent("asoserlid:confirm", { detail: { message, resolve, ...options } }));
  });
}

export default function SystemNotifier() {
  const [notice, setNotice] = useState<NoticePayload | null>(null);
  const [confirm, setConfirm] = useState<ConfirmPayload | null>(null);

  useEffect(() => {
    const onNotice = (event: WindowEventMap["asoserlid:notice"]) => setNotice(event.detail);
    const onConfirm = (event: WindowEventMap["asoserlid:confirm"]) => setConfirm(event.detail);

    window.addEventListener("asoserlid:notice", onNotice);
    window.addEventListener("asoserlid:confirm", onConfirm);
    return () => {
      window.removeEventListener("asoserlid:notice", onNotice);
      window.removeEventListener("asoserlid:confirm", onConfirm);
    };
  }, []);

  const active = confirm || notice;
  if (!active) return null;

  const tone = active.tone || (confirm ? "warning" : "info");
  const title = active.title || defaultTitle(tone, Boolean(confirm));

  function closeNotice() {
    setNotice(null);
  }

  function closeConfirm(confirmed: boolean) {
    confirm?.resolve(confirmed);
    setConfirm(null);
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 px-4">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className={`mt-1 h-3 w-3 rounded-full ${toneClass(tone)}`} />
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[#173C61]">{title}</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{active.message}</p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          {confirm ? (
            <>
              <button type="button" onClick={() => closeConfirm(false)} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                {confirm.cancelLabel || "Cancelar"}
              </button>
              <button type="button" onClick={() => closeConfirm(true)} className="rounded-md bg-[#173C61] px-4 py-2 text-sm font-bold text-white hover:bg-[#218F93]">
                {confirm.confirmLabel || "Confirmar"}
              </button>
            </>
          ) : (
            <button type="button" onClick={closeNotice} className="rounded-md bg-[#173C61] px-4 py-2 text-sm font-bold text-white hover:bg-[#218F93]">
              Entendido
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function defaultTitle(tone: NoticeTone, isConfirm: boolean) {
  if (isConfirm) return "Confirma la accion";
  return {
    info: "Informacion",
    success: "Accion completada",
    error: "No se pudo completar",
    warning: "Revisa esta accion",
  }[tone];
}

function toneClass(tone: NoticeTone) {
  return {
    info: "bg-[#218F93]",
    success: "bg-emerald-600",
    error: "bg-red-600",
    warning: "bg-amber-500",
  }[tone];
}
