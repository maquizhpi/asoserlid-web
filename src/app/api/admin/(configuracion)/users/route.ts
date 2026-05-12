import { NextRequest, NextResponse } from "next/server";
import { hasModuleAccess } from "@/lib/adminAuth";
import { createUser, getUsers, getUserStoreErrorMessage } from "@/lib/userStore";

export async function GET() {
  if (!(await hasModuleAccess("users"))) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const users = await getUsers();
    return NextResponse.json({ ok: true, users });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getUserStoreErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await hasModuleAccess("users"))) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const user = await createUser(await req.json());
    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getUserStoreErrorMessage(error) }, { status: 400 });
  }
}
