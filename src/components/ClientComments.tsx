const comments = [
  {
    name: "Cliente institucional",
    role: "Servicio de limpieza profesional",
    text: "El equipo de ASOSERLID mantiene una comunicación clara y cumple los protocolos acordados para nuestras instalaciones.",
  },
  {
    name: "Área administrativa",
    role: "Mantenimiento y desinfección",
    text: "Valoramos la puntualidad, la presentación del personal y el seguimiento posterior a cada jornada de trabajo.",
  },
  {
    name: "Cliente corporativo",
    role: "Limpieza de oficinas",
    text: "La atención es ordenada y confiable. Los espacios quedan listos para recibir a colaboradores y visitantes.",
  },
];

export default function ClientComments() {
  return (
    <section className="mt-12 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#218F93]">
          Comentarios de clientes
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[#173C61]">
          Opiniones sobre nuestro servicio
        </h2>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {comments.map((comment) => (
          <article key={comment.name} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm leading-relaxed text-slate-700">“{comment.text}”</p>
            <div className="mt-4">
              <p className="font-bold text-[#173C61]">{comment.name}</p>
              <p className="text-xs font-medium text-slate-500">{comment.role}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
