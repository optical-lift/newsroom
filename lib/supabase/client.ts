import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export type NewsroomSupabaseConfig = {
  url: string;
  publishableKey: string;
  forumTranscriptWorkspaceId: string;
};

export function getNewsroomSupabaseConfig(): NewsroomSupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const forumTranscriptWorkspaceId = process.env.NEXT_PUBLIC_FORUM_TRANSCRIPT_WORKSPACE_ID?.trim();

  if (!url || !publishableKey || !forumTranscriptWorkspaceId) return null;

  return { url, publishableKey, forumTranscriptWorkspaceId };
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const config = getNewsroomSupabaseConfig();
  if (!config) return null;

  if (!browserClient) {
    browserClient = createClient(config.url, config.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  return browserClient;
}
