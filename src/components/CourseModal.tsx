"use client";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import useScrollLock, { hardUnlockScroll } from "@/hook/useScrollLock";
import React from "react";


type Props = {
  show: boolean;
  onClose: () => void;
  title: string;
  description: string;
  img?: string;
};

export default function CourseModal({ show, onClose, title, description, img }: Props) {
  useScrollLock(show);

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show, onClose]);

  useEffect(() => () => hardUnlockScroll(), []);

  // Cerrar con ESC
  React.useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show, onClose]);

  // Limpieza “a prueba de balas” cuando se desmonta
  React.useEffect(() => () => hardUnlockScroll(), []);

  if (!show || typeof window === "undefined") return null;

  const modal = (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl max-w-xl w-[92%] p-6 shadow-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-2xl font-bold"
          aria-label="Cerrar"
        >
          ×
        </button>

        {img && (
          <img src={img} alt={title} className="rounded-xl w-full h-56 object-cover mb-4" />
        )}

        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-gray-700 leading-relaxed">{description}</p>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
