import "server-only";

import { MongoClient, ServerApiVersion, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "asoserlid_v2";

type MongoGlobal = typeof globalThis & {
  _asoserlidMongoClient?: Promise<MongoClient>;
};

export async function getMongoClient() {
  if (!uri) {
    throw new Error("Falta configurar MONGODB_URI en .env.local.");
  }

  const globalForMongo = globalThis as MongoGlobal;

  if (!globalForMongo._asoserlidMongoClient) {
    const client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: false,
      },
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
