import { createBrowserClient } from "@supabase/ssr";

export function isSupabaseEnabled() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/** 帳號轉 Supabase Auth 用的內部 email */
export function toAuthEmail(username: string) {
  return `${username.trim().toLowerCase()}@shuoyu.app`;
}

export function fromAuthEmail(email: string) {
  return email.split("@")[0] ?? email;
}
