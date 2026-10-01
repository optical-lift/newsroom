import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  NEWSROOM_SUPABASE_PUBLISHABLE_KEY,
  NEWSROOM_SUPABASE_URL
} from "@/lib/supabase/config";

export async function refreshNewsroomSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    NEWSROOM_SUPABASE_URL,
    NEWSROOM_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  await supabase.auth.getClaims();
  return response;
}
