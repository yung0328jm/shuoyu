import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/route";
import { toAuthEmail } from "@/lib/supabase/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { username, name, department, role, password } = body;

  try {
    const admin = createServiceClient();

    if (password) {
      const { error } = await admin.auth.admin.updateUserById(id, { password });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    if (username) {
      const { error } = await admin.auth.admin.updateUserById(id, {
        email: toAuthEmail(username),
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    const updates: Record<string, string> = {};
    if (username) updates.username = username;
    if (name) updates.name = name;
    if (department !== undefined) updates.department = department;
    if (role) updates.role = role;

    if (Object.keys(updates).length > 0) {
      const { error } = await admin.from("profiles").update(updates).eq("id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "伺服器錯誤" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  if (auth.profile.role !== "admin") {
    return NextResponse.json({ error: "僅管理員可刪除" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const admin = createServiceClient();
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "伺服器錯誤" },
      { status: 500 }
    );
  }
}
