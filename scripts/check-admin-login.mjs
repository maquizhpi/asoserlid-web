import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { MongoClient, ServerApiVersion } from "mongodb";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

loadEnvLocal();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "asoserlid_v2";
const email = (process.env.ADMIN_EMAIL || "admin@asoserlid.com").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || process.env.BLOG_ADMIN_PASSWORD;
const scrypt = promisify(scryptCallback);

if (!uri) {
  console.error("Falta MONGODB_URI en .env.local");
  process.exit(1);
}

if (!password) {
  console.error("Falta ADMIN_PASSWORD en .env.local");
  process.exit(1);
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: false,
  },
  serverSelectionTimeoutMS: 10000,
});

try {
  await client.connect();
  const db = client.db(dbName);
  await db.collection("users").createIndex({ email: 1 }, { unique: true });

  const existing = await db.collection("users").findOne({ email });
  if (!existing) {
    const now = new Date();
    await db.collection("users").insertOne({
      name: "Administrador ASOSERLID",
      email,
      passwordHash: await hashPassword(password),
      roles: ["administrator"],
      moduleAccess: [
        "roles",
        "users",
        "workers",
        "worker-intake",
        "worker-documents",
        "labor-history",
        "work-groups",
        "catalogs",
        "service-types",
        "clients",
        "contracts-shifts",
        "supervisor-daily-report",
        "report-approvals",
        "accounting",
        "payment-calculation",
        "exports",
        "machines",
        "supply-products",
        "supply-kits",
        "supply-control",
        "hiring-processes",
        "process-calendar",
        "notifications",
        "dashboard-supervisor",
        "dashboard-accounting",
      ],
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Administrador creado: ${email}`);
  } else {
    const valid = await verifyPassword(password, existing.passwordHash || "");
    console.log(`Administrador encontrado: ${email}`);
    console.log(`Contrasena del .env.local coincide: ${valid ? "si" : "no"}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await client.close();
}

async function hashPassword(value) {
  const salt = randomBytes(16).toString("base64url");
  const hash = await scrypt(value, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt}$${Buffer.from(hash).toString("base64url")}`;
}

async function verifyPassword(value, storedHash) {
  if (!storedHash.startsWith("scrypt$")) {
    console.log("Hash legacy detectado. El sistema web lo migrara a scrypt en el proximo login correcto.");
    return false;
  }

  const [, n, r, p, salt, encodedHash] = storedHash.split("$");
  const expected = Buffer.from(encodedHash, "base64url");
  const actual = await scrypt(value, salt, expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  const envText = readFileSync(envPath, "utf8");

  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index);
    const value = trimmed.slice(index + 1);
    process.env[key] = value;
  }
}
