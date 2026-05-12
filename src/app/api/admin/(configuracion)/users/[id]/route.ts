import { NextRequest, NextResponse } from "next/server";
import { hasModuleAccess } from "@/lib/adminAuth";
import { deleteUser, getUserStoreErrorMessage, updateUser } from "@/lib/userStore";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, context: RouteContext) {
  if (!(await hasModuleAccess("users"))) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const user = await updateUser(id, await req.json());
    if (!user) {
      return NextResponse.json({ ok: false, error: "Usuario no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getUserStoreErrorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  if (!(await hasModuleAccess("users"))) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const deleted = await deleteUser(id);
    if (!deleted) {
      return NextResponse.json({ ok: false, error: "Usuario no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getUserStoreErrorMessage(error) }, { status: 400 });
  }
}
