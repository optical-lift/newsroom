export type DeskStatus = "connected" | "planned" | "architecture-ready";

export type Desk = {
  slug: "transcripts" | "municipal" | "sports" | "markets";
  label: string;
  description: string;
  status: DeskStatus;
  statusLabel: string;
  nextStep: string;
};

export const forumWorkspace = {
  organization: "Forum Communications",
  publication: "Mitchell Republic",
  workspaceSlug: "forum",
  mode: "public-source-pilot" as const,
  desks: [
    {
      slug: "transcripts",
      label: "Transcripts",
      description: "Recordings, searchable transcripts, speaker correction and source playback.",
      status: "architecture-ready",
      statusLabel: "Architecture ready",
      nextStep: "Implement the standalone Transcript Core service before connecting private newsroom recordings."
    },
    {
      slug: "municipal",
      label: "Municipal",
      description: "Meeting records, attachments, source custody and municipal reporting evidence.",
      status: "connected",
      statusLabel: "Public source live",
      nextStep: "Expand the certified CivicClerk slice into meeting/body/date discovery while preserving the Bridge as source authority."
    },
    {
      slug: "sports",
      label: "Sports",
      description: "Schedules, results, statistics, verification state and reporting signals.",
      status: "planned",
      statusLabel: "Source adapter pending",
      nextStep: "Certify one authoritative sports source end-to-end before broadening coverage."
    },
    {
      slug: "markets",
      label: "Markets",
      description: "A shared recurring markets update with one canonical edition for the newsroom.",
      status: "architecture-ready",
      statusLabel: "Update structure ready",
      nextStep: "Define the authoritative source set and run cadence, then connect scheduled edition generation."
    }
  ] satisfies Desk[]
};

export function getDesk(slug: string) {
  return forumWorkspace.desks.find((desk) => desk.slug === slug);
}
