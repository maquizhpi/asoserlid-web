import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import type { GalleryImage } from "@/types/admin";

export async function GET() {
  try {
    const db = await getDb();
    const items = await db.collection<GalleryImage>("gallery_images").find({ status: "active" }).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ ok: true, items: items.map((item) => ({ ...item, _id: item._id?.toString() })) });
  } catch {
    return NextResponse.json({ ok: true, items: [] });
  }
}
