import { NextResponse } from "next/server";
import { hasModuleAccess } from "@/lib/adminAuth";
import { getDb } from "@/lib/mongodb";

type SupervisorOption = {
  id: string;
  name: string;
  source: "user" | "worker";
};

export async function GET() {
  if (!(await hasModuleAccess("work-groups")) && !(await hasModuleAccess("workers")) && !(await hasModuleAccess("machines"))) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  const db = await getDb();
  const users = await db
    .collection("users")
    .find({ roles: "supervisor", active: true })
    .project({ name: 1, email: 1 })
    .toArray();
  const workers = await db
    .collection("workers")
    .find({ position: /supervisor/i, status: "active" })
    .project({ firstName: 1, lastName: 1, documentId: 1 })
    .toArray();

  const options: SupervisorOption[] = [
    ...users.map((user) => ({
      id: String(user._id),
      name: `${String(user.name || "Supervisor")} (${String(user.email || "usuario")})`,
      source: "user" as const,
    })),
    ...workers.map((worker) => ({
      id: String(worker._id),
      name: `${String(worker.firstName || "")} ${String(worker.lastName || "")}`.trim() || String(worker.documentId),
      source: "worker" as const,
    })),
  ];

  return NextResponse.json({ ok: true, items: options });
}

