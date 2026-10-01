import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  NEWSROOM_SUPABASE_PUBLISHABLE_KEY,
  NEWSROOM_SUPABASE_URL
} from "@/lib/supabase/config";

let browserClient: SupabaseClient | null = null;

export function getNewsroomBrowserClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createBrowserClient(
      NEWSROOM_SUPABASE_URL,
      NEWSROOM_SUPABASE_PUBLISHABLE_KEY
    );
  }
  return browserClient;
}
