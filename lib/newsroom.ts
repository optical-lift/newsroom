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
      statusLabel: "Custody spine defined",
      nextStep: "Provision the dedicated Newsroom auth/database/storage boundary, then prove private original-audio custody before transcription is connected."
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
      description: "Marshall's exact eight-value Mitchell markets block, shared as one canonical newsroom edition.",
      status: "architecture-ready",
      statusLabel: "Mitchell spec recovered",
      nextStep: "Connect MarketWatch, CHS Farmers Alliance Mitchell cash bids, POET Mitchell and HPP cash bids; then shadow-run the 8/8 block before scheduling it."
    }
  ] satisfies Desk[]
};

export function getDesk(slug: string) {
  return forumWorkspace.desks.find((desk) => desk.slug === slug);
}
