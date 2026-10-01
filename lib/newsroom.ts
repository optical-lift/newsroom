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
  mode: "mixed-source-pilot" as const,
  desks: [
    {
      slug: "transcripts",
      label: "Transcripts",
      description: "Private recordings, searchable transcripts, source playback and revisioned evidence.",
      status: "connected",
      statusLabel: "Long-recording pilot wired",
      nextStep: "Deploy the existing-schema migration and worker, then prove a real Marshall meeting recording end-to-end before adding speaker correction."
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
      statusLabel: "Parked for later",
      nextStep: "After Markets and Transcript Core are usable, certify the SDHSAA source router with Bound and Athletic.net."
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
