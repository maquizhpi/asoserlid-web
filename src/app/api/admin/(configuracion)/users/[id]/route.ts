import { NextRequest, NextResponse } from "next/server";
import { hasAnyRole } from "@/lib/adminAuth";
import { auditSummary, recordAuditLog } from "@/lib/auditStore";
import { deleteUser, getUserById, getUserStoreErrorMessage, updateUser } from "@/lib/userStore";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  if (!(await hasAnyRole(["administrator"]))) {
    return NextResponse.json({ ok: false, error: "Acceso denegado." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Usuario no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getUserStoreErrorMessage(error) }, { status: 400 });
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  if (!(await hasAnyRole(["administrator"]))) {
    return NextResponse.json({ ok: false, error: "Acceso denegado." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const user = await updateUser(id, await req.json());
    if (!user) {
      return NextResponse.json({ ok: false, error: "Usuario no encontrado." }, { status: 404 });
    }

    await recordAuditLog({
      action: "update",
      moduleKey: "users",
      collection: "users",
      recordId: user._id,
      recordLabel: user.email,
      summary: auditSummary("update", `usuario ${user.email}`),
    });
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getUserStoreErrorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  if (!(await hasAnyRole(["administrator"]))) {
    return NextResponse.json({ ok: false, error: "Acceso denegado." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const deleted = await deleteUser(id);
    if (!deleted) {
      return NextResponse.json({ ok: false, error: "Usuario no encontrado." }, { status: 404 });
    }

    await recordAuditLog({
      action: "delete",
      moduleKey: "users",
      collection: "users",
      recordId: id,
      summary: auditSummary("delete", "usuario"),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getUserStoreErrorMessage(error) }, { status: 400 });
  }
}
