export type DeskStatus = "ready-to-connect" | "planned" | "architecture-ready";

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
  mode: "shell" as const,
  desks: [
    {
      slug: "transcripts",
      label: "Transcripts",
      description: "Recordings, searchable transcripts, speaker correction and source playback.",
      status: "architecture-ready",
      statusLabel: "Architecture ready",
      nextStep: "Implement the standalone Transcript Core service before connecting newsroom data."
    },
    {
      slug: "municipal",
      label: "Municipal",
      description: "Meeting records, attachments, source custody and municipal reporting evidence.",
      status: "ready-to-connect",
      statusLabel: "Bridge ready",
      nextStep: "Connect the existing CivicClerk Bridge through a read-only Newsroom adapter after authentication."
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
      status: "planned",
      statusLabel: "Automation pending",
      nextStep: "Recover the Markets Update specification, then build it as a workspace-owned scheduled process."
    }
  ] satisfies Desk[]
};

export function getDesk(slug: string) {
  return forumWorkspace.desks.find((desk) => desk.slug === slug);
}
