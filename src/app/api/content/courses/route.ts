import { NextResponse } from "next/server";
import { getWebDb } from "@/lib/mongodb";

export async function GET() {
  const db = await getWebDb();
  const items = await db
    .collection("courses")
    .find({ status: "active" })
    .sort({ createdAt: 1 })
    .toArray();

  return NextResponse.json({
    ok: true,
    items: items.map((item) => ({ ...item, _id: item._id?.toString() })),
  });
}
