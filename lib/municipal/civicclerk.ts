export const certifiedMunicipalQuery = {
  tenant: "mitchellsd",
  body: "Sports & Events Authority",
  date: "2026-08-18"
} as const;

const DEFAULT_BRIDGE_URL = "https://civicclerk-bridge.vercel.app";

type PublishedFile = {
  fileId: number | null;
  type: string | null;
  name: string | null;
  publishOn: string | null;
  kind: string | null;
};

type AgendaAttachment = {
  id: number | null;
  fileName: string | null;
  isLink: boolean;
  downloadUrl: string | null;
  agendaItemId: number | null;
  agendaItemName: string | null;
};

type AgendaItem = {
  id: number | null;
  name: string | null;
  isSection: boolean;
  sortOrder: number | null;
  depth: number;
  attachments: AgendaAttachment[];
};

export type MunicipalMeetingSnapshot = {
  tenant: string;
  category: {
    id: number | null;
    name: string | null;
    isPublic: boolean | null;
  };
  event: {
    id: number | null;
    date: string | null;
    name: string | null;
    description: string | null;
    categoryName: string | null;
    agendaId: number | null;
    agendaName: string | null;
    location: string | null;
    publishedFiles: PublishedFile[];
  };
  minutesFile: PublishedFile | null;
  minutesText: string | null;
  agendaItems: AgendaItem[];
  attachments: AgendaAttachment[];
  provenance: {
    eventsApi: string | null;
    agendaApi: string | null;
    retrievedAt: string | null;
  };
};

export type MunicipalSnapshotResult =
  | { ok: true; data: MunicipalMeetingSnapshot; bridgeUrl: string }
  | { ok: false; error: string; bridgeUrl: string };

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function bool(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function parsePublishedFile(value: unknown): PublishedFile {
  const item = record(value) ?? {};
  return {
    fileId: number(item.fileId),
    type: text(item.type),
    name: text(item.name),
    publishOn: text(item.publishOn),
    kind: text(item.kind)
  };
}

function parseAttachment(value: unknown): AgendaAttachment {
  const item = record(value) ?? {};
  return {
    id: number(item.id),
    fileName: text(item.fileName),
    isLink: bool(item.isLink) ?? false,
    downloadUrl: text(item.downloadUrl),
    agendaItemId: number(item.agendaItemId),
    agendaItemName: text(item.agendaItemName)
  };
}

function parseAgendaItem(value: unknown): AgendaItem {
  const item = record(value) ?? {};
  return {
    id: number(item.id),
    name: text(item.name),
    isSection: bool(item.isSection) ?? false,
    sortOrder: number(item.sortOrder),
    depth: number(item.depth) ?? 0,
    attachments: list(item.attachments).map(parseAttachment)
  };
}

function normalizeSnapshot(value: unknown): MunicipalMeetingSnapshot | null {
  const root = record(value);
  const category = record(root?.category);
  const event = record(root?.event);
  const provenance = record(root?.provenance);
  if (!root || !event) return null;

  return {
    tenant: text(root.tenant) ?? certifiedMunicipalQuery.tenant,
    category: {
      id: number(category?.id),
      name: text(category?.name),
      isPublic: bool(category?.isPublic)
    },
    event: {
      id: number(event.id),
      date: text(event.date),
      name: text(event.name),
      description: text(event.description),
      categoryName: text(event.categoryName),
      agendaId: number(event.agendaId),
      agendaName: text(event.agendaName),
      location: text(event.location),
      publishedFiles: list(event.publishedFiles).map(parsePublishedFile)
    },
    minutesFile: root.minutesFile ? parsePublishedFile(root.minutesFile) : null,
    minutesText: text(root.minutesText),
    agendaItems: list(root.agendaItems).map(parseAgendaItem),
    attachments: list(root.attachments).map(parseAttachment),
    provenance: {
      eventsApi: text(provenance?.eventsApi),
      agendaApi: text(provenance?.agendaApi),
      retrievedAt: text(provenance?.retrievedAt)
    }
  };
}

export async function getCertifiedMunicipalSnapshot(): Promise<MunicipalSnapshotResult> {
  const base = (process.env.CIVICCLERK_BRIDGE_URL || DEFAULT_BRIDGE_URL).replace(/\/+$/, "");
  const params = new URLSearchParams({
    tenant: certifiedMunicipalQuery.tenant,
    body: certifiedMunicipalQuery.body,
    date: certifiedMunicipalQuery.date
  });
  const bridgeUrl = `${base}/api/meeting?${params.toString()}`;

  try {
    const response = await fetch(bridgeUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      headers: { accept: "application/json" }
    });

    if (!response.ok) {
      let detail = `CivicClerk Bridge returned HTTP ${response.status}`;
      try {
        const body = record(await response.json());
        if (text(body?.error)) detail = text(body?.error)!;
      } catch {
        // Keep the status-based error when the response is not JSON.
      }
      return { ok: false, error: detail, bridgeUrl };
    }

    const snapshot = normalizeSnapshot(await response.json());
    if (!snapshot) {
      return { ok: false, error: "CivicClerk Bridge returned an unexpected meeting shape.", bridgeUrl };
    }

    return { ok: true, data: snapshot, bridgeUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Unable to reach CivicClerk Bridge: ${message}`, bridgeUrl };
  }
}
