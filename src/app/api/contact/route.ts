import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { z } from "zod";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "@/lib/rateLimit";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  message: z.string().min(5),
  service: z.string().optional().default("Contacto"),
  company: z.string().optional(),
});

type ContactData = z.infer<typeof schema>;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limited = checkRateLimit(`contact:${ip}`, { limit: 8, windowMs: 10 * 60 * 1000 });
    if (!limited.allowed) {
      return NextResponse.json(
        { ok: false, error: "Demasiados mensajes. Intenta nuevamente en unos minutos." },
        { status: 429, headers: rateLimitHeaders(limited) }
      );
    }

    const body = await req.json();
    const data = schema.parse(body);

    if (data.company && data.company.trim() !== "") {
      return NextResponse.json({ ok: true });
    }

    if (process.env.RESEND_API_KEY) {
      await sendWithResend(data);
    } else {
      await sendWithSmtp(data);
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("CONTACT ERROR:", err);

    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Revisa los campos del formulario." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se pudo enviar el mensaje en este momento. Por favor, contáctanos por teléfono o correo directo.",
      },
      { status: 500 }
    );
  }
}

async function sendWithResend(data: ContactData) {
  const apiKey = requiredEnv("RESEND_API_KEY");
  const from = process.env.CONTACT_FROM || "ASOSERLID <onboarding@resend.dev>";
  const to = requiredEnv("CONTACT_TO");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Contacto web - ${data.service}`,
      reply_to: data.email,
      text: buildText(data),
      html: buildHtml(data),
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Resend error: ${error}`);
  }
}

async function sendWithSmtp(data: ContactData) {
  const user = requiredEnv("SMTP_USER");

  const transporter = nodemailer.createTransport({
    host: requiredEnv("SMTP_HOST"),
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    requireTLS: true,
    auth: {
      user,
      pass: requiredEnv("SMTP_PASS"),
    },
  });

  await transporter.sendMail({
    from: `"Web ASOSERLID" <${user}>`,
    to: requiredEnv("CONTACT_TO"),
    subject: `Contacto web - ${data.service}`,
    replyTo: data.email,
    text: buildText(data),
    html: buildHtml(data),
  });
}

function buildText(data: ContactData) {
  return [
    `Nombre: ${data.name}`,
    `Email: ${data.email}`,
    `Servicio: ${data.service}`,
    "",
    data.message,
  ].join("\n");
}

function buildHtml(data: ContactData) {
  return `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1f2933;line-height:1.55">
      <h2 style="color:#173c61;margin:0 0 16px">Nuevo contacto - ${escapeHtml(data.service)}</h2>
      <p><b>Nombre:</b> ${escapeHtml(data.name)}</p>
      <p><b>Email:</b> ${escapeHtml(data.email)}</p>
      <p><b>Mensaje:</b></p>
      <p style="white-space:pre-wrap">${escapeHtml(data.message)}</p>
    </div>`;
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function escapeHtml(str: string) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
