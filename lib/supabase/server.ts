import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  NEWSROOM_SUPABASE_PUBLISHABLE_KEY,
  NEWSROOM_SUPABASE_URL
} from "@/lib/supabase/config";

export async function createNewsroomServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    NEWSROOM_SUPABASE_URL,
    NEWSROOM_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot always write cookies. proxy.ts handles refreshes.
          }
        }
      }
    }
  );
}
