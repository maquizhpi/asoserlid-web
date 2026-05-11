import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

type ContactPayload = {
  nombre?: string;
  email?: string;
  telefono?: string;
  servicio?: string;
  mensaje?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ContactPayload;

    const nombre = body.nombre?.trim();
    const email = body.email?.trim();
    const telefono = body.telefono?.trim();
    const servicio = body.servicio?.trim();
    const mensaje = body.mensaje?.trim();

    if (!nombre || !email || !telefono || !servicio || !mensaje) {
      return NextResponse.json(
        { ok: false, error: "Todos los campos son obligatorios." },
        { status: 400 }
      );
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const receiver = process.env.CONTACT_RECEIVER;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !receiver) {
      return NextResponse.json(
        { ok: false, error: "Faltan variables de entorno para enviar el correo." },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: process.env.SMTP_SECURE === "true",
      requireTLS: true,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: `"ASOSERLID Web" <${smtpUser}>`,
      to: receiver,
      subject: "Nuevo mensaje desde la pagina web de ASOSERLID",
      replyTo: email,
      text: [
        "Nuevo mensaje desde la pagina web de ASOSERLID",
        "",
        `Nombre del cliente: ${nombre}`,
        `Correo del cliente: ${email}`,
        `Telefono o WhatsApp: ${telefono}`,
        `Servicio requerido: ${servicio}`,
        "",
        "Mensaje:",
        mensaje,
      ].join("\n"),
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; color: #1f2933; line-height: 1.6;">
          <h2 style="color: #173c61;">Nuevo mensaje desde la pagina web de ASOSERLID</h2>
          <p><strong>Nombre del cliente:</strong> ${escapeHtml(nombre)}</p>
          <p><strong>Correo del cliente:</strong> ${escapeHtml(email)}</p>
          <p><strong>Telefono o WhatsApp:</strong> ${escapeHtml(telefono)}</p>
          <p><strong>Servicio requerido:</strong> ${escapeHtml(servicio)}</p>
          <p><strong>Mensaje:</strong></p>
          <p style="white-space: pre-wrap;">${escapeHtml(mensaje)}</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true, message: "Mensaje enviado correctamente." });
  } catch (error) {
    console.error("Error enviando formulario de contacto:", error);

    if (isOutlookBasicAuthError(error)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Outlook rechazo el envio porque la autenticacion basica SMTP esta deshabilitada para esta cuenta. Debes usar OAuth/Microsoft Graph o un proveedor de correo transaccional.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "No se pudo enviar el mensaje. Intentalo mas tarde." },
      { status: 500 }
    );
  }
}

function isOutlookBasicAuthError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes("5.7.139") ||
    error.message.toLowerCase().includes("basic authentication is disabled")
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
