export type DeskStatus = "connected" | "planned";

export type Desk = {
  slug: "markets" | "legal-notices" | "municipal" | "transcripts" | "sports";
  label: string;
  description: string;
  status: DeskStatus;
  statusLabel: string;
};

export const forumWorkspace = {
  workspaceSlug: "forum",
  desks: [
    {
      slug: "markets",
      label: "Markets",
      description: "Mitchell market and grain prices, formatted for copy.",
      status: "connected",
      statusLabel: "Live"
    },
    {
      slug: "legal-notices",
      label: "Legal Notices",
      description: "Proof, approval and payment tracking for legal notices.",
      status: "connected",
      statusLabel: "Pilot"
    },
    {
      slug: "municipal",
      label: "Municipal",
      description: "Meeting agendas, minutes, attachments and source records.",
      status: "connected",
      statusLabel: "Available"
    },
    {
      slug: "transcripts",
      label: "Transcripts",
      description: "Upload recordings and work from searchable, timestamped transcripts.",
      status: "connected",
      statusLabel: "Pilot"
    },
    {
      slug: "sports",
      label: "Sports",
      description: "Schedules, results, statistics and reporting signals.",
      status: "planned",
      statusLabel: "Later"
    }
  ] satisfies Desk[]
};

export function getDesk(slug: string) {
  return forumWorkspace.desks.find((desk) => desk.slug === slug);
}
