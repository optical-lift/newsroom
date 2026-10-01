import { createBrowserClient } from "@supabase/ssr";
import {
  NEWSROOM_SUPABASE_PUBLISHABLE_KEY,
  NEWSROOM_SUPABASE_URL
} from "@/lib/supabase/config";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getNewsroomBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      NEWSROOM_SUPABASE_URL,
      NEWSROOM_SUPABASE_PUBLISHABLE_KEY
    );
  }
  return browserClient;
}
