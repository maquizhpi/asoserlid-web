"use client";

import { useEffect, useState } from "react";

export default function ContactForm({ defaultService }: { defaultService?: string }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
    service: defaultService ?? "General",
    company: "",
  });

  // 👇 NUEVO: si cambia defaultService desde fuera, sincroniza el campo
  useEffect(() => {
    if (defaultService) {
      setForm((f) => ({ ...f, service: defaultService }));
    }
  }, [defaultService]);

  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setStatus("ok");
      setForm({ name: "", email: "", message: "", service: defaultService ?? "General", company: "" });
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || "No se pudo enviar. Inténtalo más tarde.");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <input name="company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="hidden" tabIndex={-1} autoComplete="off" />
      <input required name="name" placeholder="Nombre" className="w-full border rounded p-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input required name="email" type="email" placeholder="Email" className="w-full border rounded p-2" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <textarea required name="message" placeholder="Mensaje" className="w-full border rounded p-2 min-h-32" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      <input name="service" placeholder="Servicio (opcional)" className="w-full border rounded p-2" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} />
      <button disabled={status === "sending"} className="px-4 py-2 rounded bg-black text-white disabled:opacity-60">
        {status === "sending" ? "Enviando…" : "Enviar"}
      </button>
      {status === "ok" && <p className="text-green-600 text-sm">✅ ¡Mensaje enviado! Te responderemos pronto.</p>}
      {status === "error" && <p className="text-red-600 text-sm">❌ {error}</p>}
    </form>
  );
}
