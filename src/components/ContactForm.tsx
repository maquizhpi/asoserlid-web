"use client";

import { useEffect, useState } from "react";

const fieldClass =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#218F93] focus:ring-4 focus:ring-[#33C3C9]/15";

export default function ContactForm({ defaultService }: { defaultService?: string }) {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    telefono: "",
    servicio: defaultService ?? "General",
    mensaje: "",
    aceptaDatos: false,
  });

  useEffect(() => {
    if (defaultService) {
      setForm((current) => ({ ...current, servicio: defaultService }));
    }
  }, [defaultService]);

  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const res = await fetch("/api/contacto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setStatus("ok");
      setForm({
        nombre: "",
        email: "",
        telefono: "",
        servicio: defaultService ?? "General",
        mensaje: "",
        aceptaDatos: false,
      });
      return;
    }

    const data = await res.json().catch(() => ({}));
    setError(data?.error || "No se pudo enviar. Inténtalo más tarde.");
    setStatus("error");
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Nombre
          <input
            required
            name="nombre"
            placeholder="Tu nombre"
            className={fieldClass}
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Email
          <input
            required
            name="email"
            type="email"
            placeholder="correo@empresa.com"
            className={fieldClass}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Teléfono o WhatsApp
          <input
            required
            name="telefono"
            placeholder="0999999999"
            className={fieldClass}
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Servicio requerido
          <input
            required
            name="servicio"
            placeholder="Servicio"
            className={fieldClass}
            value={form.servicio}
            onChange={(e) => setForm({ ...form, servicio: e.target.value })}
          />
        </label>
      </div>

      <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
        Mensaje
        <textarea
          required
          name="mensaje"
          placeholder="Cuéntanos qué espacio necesitas atender, horarios, frecuencia y ciudad."
          className={`${fieldClass} min-h-36 resize-y`}
          value={form.mensaje}
          onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
        />
      </label>

      <label className="mt-4 flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <input
          required
          type="checkbox"
          className="mt-1"
          checked={form.aceptaDatos}
          onChange={(e) => setForm({ ...form, aceptaDatos: e.target.checked })}
        />
        <span>
          Acepto el tratamiento de mis datos personales conforme a la politica de privacidad y proteccion de datos personales.
        </span>
      </label>

      <button
        disabled={status === "sending"}
        className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-[#173C61] px-5 py-3 font-semibold text-white transition hover:bg-[#218F93] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {status === "sending" ? "Enviando..." : "Enviar solicitud"}
      </button>

      {status === "ok" && (
        <p className="mt-4 rounded-md bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          Mensaje enviado. Te responderemos pronto.
        </p>
      )}

      {status === "error" && (
        <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
