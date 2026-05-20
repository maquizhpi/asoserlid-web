import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(12, "ADMIN_PASSWORD debe tener al menos 12 caracteres.").optional(),
  ADMIN_SESSION_SECRET: z.string().min(32, "ADMIN_SESSION_SECRET debe tener al menos 32 caracteres."),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET debe tener al menos 32 caracteres.").optional(),
  MONGODB_URI: z.string().min(1, "MONGODB_URI es obligatorio."),
  MONGODB_DB: z.string().min(1).optional(),
  MONGODB_WEB_DB: z.string().min(1).optional(),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  CONTACT_RECEIVER: z.string().email().optional(),
  CONTACT_TO: z.string().email().optional(),
  DB_USER: z.string().min(1).optional(),
  DB_PASSWORD: z.string().min(1).optional(),
  DB_CONNECT_STRING: z.string().min(1).optional(),
});

export function getServerEnv() {
  return serverEnvSchema.parse(process.env);
}

export function assertContactEnv() {
  const env = getServerEnv();
  const missing = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "CONTACT_RECEIVER"].filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Faltan variables de contacto: ${missing.join(", ")}`);
  return env;
}

export function assertOracleEnv() {
  const env = getServerEnv();
  const missing = ["DB_USER", "DB_PASSWORD", "DB_CONNECT_STRING"].filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Faltan variables Oracle: ${missing.join(", ")}`);
  return env;
}
