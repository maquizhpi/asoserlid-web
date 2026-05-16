import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCurrentAdminUser } from "@/lib/adminAuth";
import { getDb } from "@/lib/mongodb";
import { changeUserPassword, getUserStoreErrorMessage } from "@/lib/userStore";
import type { Worker } from "@/types/admin";

export async function GET() {
  const user = await getCurrentAdminUser();
  if (!user) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });

  const worker = await findLinkedWorker(user.workerId, user.workerDocumentId, user.email);
  return NextResponse.json({
    ok: true,
    profile: {
      user,
      worker,
    },
  });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentAdminUser();
  if (!user?._id) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });

  try {
    const body = await req.json();
    const currentPassword = String(body?.currentPassword || "");
    const nextPassword = String(body?.nextPassword || "");
    const confirmPassword = String(body?.confirmPassword || "");
    if (nextPassword !== confirmPassword) throw new Error("La confirmacion no coincide con la nueva contrasena.");

    await changeUserPassword(user._id, currentPassword, nextPassword);
    return NextResponse.json({ ok: true, message: "Contrasena actualizada correctamente." });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getUserStoreErrorMessage(error) }, { status: 400 });
  }
}

async function findLinkedWorker(workerId?: string, workerDocumentId?: string, email?: string) {
  const db = await getDb();
  const or: Record<string, unknown>[] = [];
  if (workerId) {
    if (ObjectId.isValid(workerId)) or.push({ _id: new ObjectId(workerId) });
    or.push({ id: workerId });
  }
  if (workerDocumentId) or.push({ documentId: workerDocumentId });
  if (email) or.push({ email: email.toLowerCase() });
  if (!or.length) return null;

  const worker = await db.collection("workers").findOne({ $or: or });
  return worker ? serializeWorker(worker as unknown as Worker & { _id?: { toString(): string }; createdAt?: Date; updatedAt?: Date }) : null;
}

function serializeWorker(worker: Worker & { _id?: { toString(): string }; createdAt?: Date; updatedAt?: Date }) {
  return {
    ...worker,
    _id: worker._id?.toString(),
    createdAt: worker.createdAt?.toISOString(),
    updatedAt: worker.updatedAt?.toISOString(),
  };
}
