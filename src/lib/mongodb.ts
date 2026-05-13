import "server-only";

import { MongoClient, ServerApiVersion, type Db } from "mongodb";
import { getServerEnv } from "@/lib/env";

const env = getServerEnv();
const uri = env.MONGODB_URI;
const dbName = env.MONGODB_DB || "asoserlid_v2";

type MongoGlobal = typeof globalThis & {
  _asoserlidMongoClient?: Promise<MongoClient>;
};

export async function getMongoClient() {
  const globalForMongo = globalThis as MongoGlobal;

  if (!globalForMongo._asoserlidMongoClient) {
    const client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: false,
      },
      tls: true,
      family: 4,
      maxPoolSize: 5,
      minPoolSize: 0,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 10000,
    });

    globalForMongo._asoserlidMongoClient = client.connect().catch((error) => {
      globalForMongo._asoserlidMongoClient = undefined;
      throw error;
    });
  }

  return globalForMongo._asoserlidMongoClient;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(dbName);
}

export function getMongoConnectionErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("tlsv1 alert internal error") ||
    lowerMessage.includes("ssl alert number 80") ||
    lowerMessage.includes("ssl3_read_bytes")
  ) {
    return "MongoDB Atlas rechazo la conexion TLS desde Vercel. Revisa Network Access/IP Access List en Atlas y permite las IP de Vercel o temporalmente 0.0.0.0/0 para confirmar conectividad.";
  }

  if (lowerMessage.includes("server selection timed out") || lowerMessage.includes("etimeout")) {
    return "No se pudo alcanzar MongoDB Atlas desde Vercel. Revisa IP Access List, DNS del cluster y estado del cluster.";
  }

  if (lowerMessage.includes("authentication failed") || lowerMessage.includes("bad auth")) {
    return "MongoDB rechazo el usuario o contrasena. Revisa MONGODB_URI en variables de entorno.";
  }

  return message || "No se pudo conectar con MongoDB.";
}
