import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ensureDefaultServiceTypes } from "@/lib/operationsStore";

export async function GET() {
  await ensureDefaultServiceTypes();
  const db = await getDb();
  const items = await db
    .collection("service_types")
    .find({ status: "active" })
    .sort({ code: 1, createdAt: 1 })
    .toArray();

  return NextResponse.json({
    ok: true,
    items: items.map((item) => ({ ...item, _id: item._id?.toString() })),
  });
}
