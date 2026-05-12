import "server-only";

import { getDb } from "@/lib/mongodb";

type CounterDocument = {
  key: string;
  value: number;
  updatedAt: Date;
};

export async function getNextCode(key: string, prefix: string, startAt = 10001) {
  const db = await getDb();
  await db.collection<CounterDocument>("counters").updateOne(
    { key },
    { $setOnInsert: { key, value: startAt - 1, updatedAt: new Date() } },
    { upsert: true }
  );

  const result = await db.collection<CounterDocument>("counters").findOneAndUpdate(
    { key },
    {
      $inc: { value: 1 },
      $set: { updatedAt: new Date() },
    },
    {
      returnDocument: "after",
    }
  );

  const nextValue = result?.value ?? startAt;
  return `${prefix}${String(nextValue).padStart(7, "0")}`;
}

export async function ensureCounterAtLeast(key: string, value: number) {
  const db = await getDb();
  await db.collection<CounterDocument>("counters").updateOne(
    { key, value: { $lt: value } },
    { $set: { value, updatedAt: new Date() }, $setOnInsert: { key } },
    { upsert: true }
  );
}
