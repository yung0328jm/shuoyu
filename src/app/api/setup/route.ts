import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { toAuthEmail } from "@/lib/supabase/client";

/** 首次部署：建立管理員帳號（需帶 SETUP_SECRET） */
export async function POST(request: Request) {
  const secret = request.headers.get("x-setup-secret");
  if (!secret || secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  const body = await request.json();
  const { username, name, password } = body;

  if (!username || !password) {
    return NextResponse.json({ error: "缺少帳號或密碼" }, { status: 400 });
  }

  try {
    const admin = createServiceClient();

    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "管理員已存在" }, { status: 409 });
    }

    const { data, error } = await admin.auth.admin.createUser({
      email: toAuthEmail(username),
      password,
      email_confirm: true,
      user_metadata: {
        username,
        name: name ?? "系統管理員",
        department: "管理部",
        role: "admin",
      },
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message ?? "建立失敗" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      username,
      message: "管理員建立成功，請用此帳號登入",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "伺服器錯誤" },
      { status: 500 }
    );
  }
}
