import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  message: z.string().min(5),
  service: z.string().optional().default("Contacto"),
  // honeypot: debe venir vacío
  company: z.string().optional(),
});

export async function POST(req: NextRequest)  {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    // Honeypot anti-spam
    if (data.company && data.company.trim() !== "") {
      return NextResponse.json({ ok: true }); // ignoramos bots
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false, // STARTTLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif">
        <h2>Nuevo contacto – ${escapeHtml(data.service)}</h2>
        <p><b>Nombre:</b> ${escapeHtml(data.name)}</p>
        <p><b>Email:</b> ${escapeHtml(data.email)}</p>
        <p><b>Mensaje:</b></p>
        <p style="white-space:pre-wrap">${escapeHtml(data.message)}</p>
      </div>`;

    await transporter.sendMail({
      from: `"Web ASOSERLID" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_TO,
      subject: `Contacto web – ${data.service}`,
      replyTo: data.email,
      text: `Nombre: ${data.name}\nEmail: ${data.email}\nServicio: ${data.service}\n\n${data.message}`,
      html,
    });

    return NextResponse.json({ ok: true });
    } catch (err: unknown) {
      console.error("CONTACT ERROR:", err);

      let status = 400;
      let msg = "Error";

      if (err instanceof z.ZodError) {
        // Error de validación: 400 con detalle de campos
        msg = JSON.stringify(err.issues);
      } else if (err instanceof Error) {
        // Otros errores (p.ej. SMTP)
        msg = err.message;
        status = 500; // puedes dejar 400 si prefieres
      }

      return NextResponse.json({ ok: false, error: msg }, { status });
    }

}

function escapeHtml(str: string) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
