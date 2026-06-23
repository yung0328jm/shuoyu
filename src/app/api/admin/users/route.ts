import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/route";
import { toAuthEmail } from "@/lib/supabase/client";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { username, name, department, password, role } = body;

  if (!username || !name || !password) {
    return NextResponse.json({ error: "缺少必填欄位" }, { status: 400 });
  }

  try {
    const admin = createServiceClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: toAuthEmail(username),
      password,
      email_confirm: true,
      user_metadata: {
        username,
        name,
        department: department ?? "",
        role: role ?? "employee",
      },
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message ?? "建立失敗" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      id: data.user.id,
      username,
      name,
      department: department ?? "",
      role: role ?? "employee",
      password: "",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "伺服器錯誤" },
      { status: 500 }
    );
  }
}
