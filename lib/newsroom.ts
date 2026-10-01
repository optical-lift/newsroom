export type DeskStatus = "connected" | "planned";

export type Desk = {
  slug: "markets" | "municipal" | "transcripts" | "sports";
  label: string;
  description: string;
  status: DeskStatus;
  statusLabel: string;
};

export const forumWorkspace = {
  organization: "Forum Communications",
  publication: "Mitchell Republic",
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
      slug: "municipal",
      label: "Municipal",
      description: "Meeting agendas, minutes, attachments and source records.",
      status: "connected",
      statusLabel: "Available"
    },
    {
      slug: "transcripts",
      label: "Transcripts",
      description: "Recorded interviews and meetings with searchable transcripts.",
      status: "planned",
      statusLabel: "Coming next"
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
