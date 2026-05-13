import { NextRequest, NextResponse } from "next/server";
import { hasAnyRole } from "@/lib/adminAuth";
import { auditSummary, recordAuditLog } from "@/lib/auditStore";
import { createUser, getUserStoreErrorMessage, getUserSummaries } from "@/lib/userStore";

export async function GET() {
  if (!(await hasAnyRole(["administrator"]))) {
    return NextResponse.json({ ok: false, error: "Acceso denegado." }, { status: 403 });
  }

  try {
    const users = await getUserSummaries();
    return NextResponse.json({ ok: true, users });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getUserStoreErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await hasAnyRole(["administrator"]))) {
    return NextResponse.json({ ok: false, error: "Acceso denegado." }, { status: 403 });
  }

  try {
    const user = await createUser(await req.json());
    await recordAuditLog({
      action: "create",
      moduleKey: "users",
      collection: "users",
      recordId: user._id,
      recordLabel: user.email,
      summary: auditSummary("create", `usuario ${user.email}`),
    });
    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getUserStoreErrorMessage(error) }, { status: 400 });
  }
}
