import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const DEFAULT = { registrationEnabled: false };

/** 公開讀取：登入頁判斷是否顯示註冊連結 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(DEFAULT);
  }

  try {
    const admin = createServiceClient();
    const { data } = await admin
      .from("app_documents")
      .select("data")
      .eq("id", "app_settings")
      .single();

    const settings = (data?.data ?? DEFAULT) as { registrationEnabled?: boolean };
    return NextResponse.json({
      registrationEnabled: settings.registrationEnabled ?? false,
    });
  } catch {
    return NextResponse.json(DEFAULT);
  }
}
