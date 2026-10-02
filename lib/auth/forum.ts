import { redirect } from "next/navigation";
import { forumWorkspace } from "@/lib/newsroom";
import { createNewsroomServerClient } from "@/lib/supabase/server";

type NewsroomWorkspaceContext = {
  id: string;
  slug: string;
  name: string;
};

type NewsroomPublicationContext = {
  id: string;
  slug: string;
  name: string;
  isDefault?: boolean;
};

export type NewsroomDomainBinding = {
  id: string;
  domainKey: string;
  bindingKind: string;
  externalRef: string;
  metadata: Record<string, unknown>;
};

export type NewsroomCurrentContext = {
  workspace: NewsroomWorkspaceContext;
  membership: {
    id: string;
    state: string;
  };
  publication: NewsroomPublicationContext;
  publications: NewsroomPublicationContext[];
  domainBindings: NewsroomDomainBinding[];
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeContext(value: unknown): NewsroomCurrentContext | null {
  const root = record(value);
  const workspace = record(root.workspace);
  const membership = record(root.membership);
  const publication = record(root.publication);

  const workspaceId = text(workspace.id);
  const workspaceSlug = text(workspace.slug);
  const workspaceName = text(workspace.name);
  const membershipId = text(membership.id);
  const membershipState = text(membership.state);
  const publicationId = text(publication.id);
  const publicationSlug = text(publication.slug);
  const publicationName = text(publication.name);

  if (!workspaceId || !workspaceSlug || !workspaceName || !membershipId || !membershipState || !publicationId || !publicationSlug || !publicationName) {
    return null;
  }

  const publications = Array.isArray(root.publications)
    ? root.publications.flatMap((item) => {
        const row = record(item);
        const id = text(row.id);
        const slug = text(row.slug);
        const name = text(row.name);
        if (!id || !slug || !name) return [];
        return [{ id, slug, name, isDefault: row.isDefault === true }];
      })
    : [];

  const domainBindings = Array.isArray(root.domainBindings)
    ? root.domainBindings.flatMap((item) => {
        const row = record(item);
        const id = text(row.id);
        const domainKey = text(row.domainKey);
        const bindingKind = text(row.bindingKind);
        const externalRef = text(row.externalRef);
        if (!id || !domainKey || !bindingKind || !externalRef) return [];
        return [{
          id,
          domainKey,
          bindingKind,
          externalRef,
          metadata: record(row.metadata)
        }];
      })
    : [];

  return {
    workspace: { id: workspaceId, slug: workspaceSlug, name: workspaceName },
    membership: { id: membershipId, state: membershipState },
    publication: { id: publicationId, slug: publicationSlug, name: publicationName },
    publications,
    domainBindings
  };
}

export async function requireForumContext(publicationSlug?: string) {
  const supabase = await createNewsroomServerClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  const { data, error } = await supabase.rpc("newsroom_current_context_v1", {
    p_workspace_slug: forumWorkspace.workspaceSlug,
    p_publication_slug: publicationSlug ?? null
  });

  const context = normalizeContext(data);
  if (error || !context) {
    redirect("/login?error=unauthorized");
  }

  return { claims: claimsData.claims, context };
}

// Compatibility helper for call sites that only need the authenticated account claims.
// Product entry authority now comes from newsroom_current_context_v1, not Transcript Core membership.
export async function requireForumMember() {
  return (await requireForumContext()).claims;
}

export function forumDomainBinding(
  context: NewsroomCurrentContext,
  domainKey: string,
  bindingKind: string
) {
  return context.domainBindings.find(
    (binding) => binding.domainKey === domainKey && binding.bindingKind === bindingKind
  ) ?? null;
}

export function forumTranscriptWorkspaceBinding(context: NewsroomCurrentContext) {
  return forumDomainBinding(context, "transcript_core", "workspace");
}

export function forumMemberDisplayName(claims: unknown) {
  const bag = record(claims);
  const metadata = record(bag.user_metadata);

  const named = [
    text(metadata.display_name),
    text(metadata.full_name),
    text(metadata.name),
    text(bag.full_name),
    text(bag.name)
  ].find(Boolean);

  if (named) return named;

  const email = text(bag.email);
  if (email) {
    const local = email.split("@")[0] ?? "";
    const first = local.split(/[._-]+/).filter(Boolean)[0] ?? local;
    return first ? `${first[0]?.toUpperCase() ?? ""}${first.slice(1)}` : "Reporter";
  }

  return "Reporter";
}

export function forumMemberFirstName(claims: unknown) {
  return forumMemberDisplayName(claims).split(/\s+/).filter(Boolean)[0] || "Reporter";
}
