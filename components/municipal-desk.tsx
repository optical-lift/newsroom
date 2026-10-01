import { certifiedMunicipalQuery, getMunicipalSnapshot, type MunicipalQuery } from "@/lib/municipal/civicclerk";

function displayDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function displayRetrievedAt(value: string | null) {
  if (!value) return "Retrieval time unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
    timeZoneName: "short"
  }).format(date);
}

function LookupForm({ query }: { query: MunicipalQuery }) {
  const isCertified = query.body === certifiedMunicipalQuery.body && query.date === certifiedMunicipalQuery.date;
  return (
    <section className="municipal-lookup" aria-labelledby="municipal-lookup-title">
      <div>
        <p className="eyebrow">Find a Mitchell meeting</p>
        <h2 id="municipal-lookup-title">Meeting lookup</h2>
        <p>Enter the CivicClerk meeting body and meeting date. Newsroom asks the Bridge for that public record; it does not guess if the source cannot resolve it.</p>
      </div>
      <form action="/forum/municipal" method="get" className="lookup-form">
        <label>
          <span>Meeting body</span>
          <input name="body" defaultValue={query.body} maxLength={120} required />
        </label>
        <label>
          <span>Date</span>
          <input name="date" type="date" defaultValue={query.date} required />
        </label>
        <div className="lookup-actions">
          <button type="submit">Load meeting</button>
          {!isCertified && <a href="/forum/municipal">Reset to certified example</a>}
        </div>
      </form>
    </section>
  );
}

export default async function MunicipalDesk({ query }: { query: MunicipalQuery }) {
  const result = await getMunicipalSnapshot(query);

  if (!result.ok) {
    return (
      <>
        <header className="page-header municipal-header">
          <p className="eyebrow">Mitchell Republic · public municipal records</p>
          <div className="title-row">
            <h1>Municipal</h1>
            <span className="status status-source-error">Source unresolved</span>
          </div>
          <p>Read-only access to Mitchell CivicClerk records through the CivicClerk Bridge.</p>
        </header>

        <LookupForm query={query} />

        <section className="source-error-card">
          <p className="eyebrow">No source record loaded</p>
          <h2>{query.body} · {displayDate(query.date)}</h2>
          <p>{result.error}</p>
          <div className="source-links">
            <a href={result.bridgeUrl} rel="noreferrer" target="_blank">Open bridge response ↗</a>
          </div>
        </section>
      </>
    );
  }

  const snapshot = result.data;
  const visibleItems = snapshot.agendaItems.filter((item) => item.name).slice(0, 40);
  const hiddenItemCount = Math.max(0, snapshot.agendaItems.filter((item) => item.name).length - visibleItems.length);
  const meetingLabel = snapshot.event.name || snapshot.category.name || query.body;
  const isCertified = query.body === certifiedMunicipalQuery.body && query.date === certifiedMunicipalQuery.date;

  return (
    <>
      <header className="page-header municipal-header">
        <p className="eyebrow">Mitchell Republic · public municipal records</p>
        <div className="title-row">
          <h1>Municipal</h1>
          <span className="status status-connected">Live source</span>
        </div>
        <p>
          This desk reads Mitchell CivicClerk meetings through the Bridge and presents source state only—no editorial ranking, summary inference or unpublished newsroom material.
        </p>
      </header>

      <LookupForm query={query} />

      <section className="meeting-hero">
        <div>
          <p className="eyebrow">{displayDate(query.date)}{isCertified ? " · certified example" : ""}</p>
          <h2>{meetingLabel}</h2>
          <p>{snapshot.event.location || "Location not supplied in the meeting record."}</p>
        </div>
        <dl className="meeting-ids">
          <div><dt>Event ID</dt><dd>{snapshot.event.id ?? "—"}</dd></div>
          <div><dt>Agenda ID</dt><dd>{snapshot.event.agendaId ?? "—"}</dd></div>
          <div><dt>Category ID</dt><dd>{snapshot.category.id ?? "—"}</dd></div>
        </dl>
      </section>

      <section className="fact-strip" aria-label="Meeting source counts">
        <div><strong>{snapshot.agendaItems.length}</strong><span>agenda items</span></div>
        <div><strong>{snapshot.attachments.length}</strong><span>attachments</span></div>
        <div><strong>{snapshot.event.publishedFiles.length}</strong><span>published files</span></div>
        <div><strong>{snapshot.minutesText ? "Yes" : "No"}</strong><span>readable minutes</span></div>
      </section>

      <div className="municipal-columns">
        <section className="record-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Agenda</p>
              <h2>Meeting record</h2>
            </div>
            <span className="quiet-note">{snapshot.agendaItems.length} structured items</span>
          </div>
          <ol className="agenda-list">
            {visibleItems.map((item, index) => (
              <li key={`${item.id ?? "item"}-${index}`} style={{ paddingLeft: `${Math.min(item.depth, 4) * 14}px` }}>
                <div className="agenda-line">
                  <span className={item.isSection ? "agenda-section" : undefined}>{item.name}</span>
                  {item.id != null && <small>#{item.id}</small>}
                </div>
                {item.attachments.length > 0 && (
                  <div className="inline-attachments">
                    {item.attachments.map((attachment, attachmentIndex) => (
                      attachment.downloadUrl ? (
                        <a href={attachment.downloadUrl} key={`${attachment.id ?? attachmentIndex}`} rel="noreferrer" target="_blank">
                          {attachment.fileName || `Attachment ${attachment.id ?? attachmentIndex + 1}`} ↗
                        </a>
                      ) : (
                        <span key={`${attachment.id ?? attachmentIndex}`}>
                          {attachment.fileName || `Attachment ${attachment.id ?? attachmentIndex + 1}`}
                        </span>
                      )
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
          {hiddenItemCount > 0 && <p className="quiet-note">{hiddenItemCount} additional structured items are present in the bridge response.</p>}
        </section>

        <aside className="source-column">
          <section className="record-panel">
            <p className="eyebrow">Published files</p>
            <h2>Custody</h2>
            <div className="file-stack">
              {snapshot.event.publishedFiles.length ? snapshot.event.publishedFiles.map((file, index) => (
                <div className="file-row" key={`${file.fileId ?? index}`}>
                  <div>
                    <strong>{file.name || file.type || "Published file"}</strong>
                    <span>{file.kind || "other"}</span>
                  </div>
                  <code>{file.fileId ?? "—"}</code>
                </div>
              )) : <p className="muted-copy">No published files were returned.</p>}
            </div>
          </section>

          <section className="record-panel">
            <p className="eyebrow">Source provenance</p>
            <h2>Where this came from</h2>
            <dl className="provenance-list">
              <div><dt>Tenant</dt><dd>{snapshot.tenant}</dd></div>
              <div><dt>Requested body</dt><dd>{query.body}</dd></div>
              <div><dt>Resolved category</dt><dd>{snapshot.category.name || "—"}</dd></div>
              <div><dt>Retrieved</dt><dd>{displayRetrievedAt(snapshot.provenance.retrievedAt)}</dd></div>
            </dl>
            <div className="source-links">
              <a href={result.bridgeUrl} rel="noreferrer" target="_blank">Bridge snapshot ↗</a>
              {snapshot.provenance.agendaApi && <a href={snapshot.provenance.agendaApi} rel="noreferrer" target="_blank">CivicClerk agenda API ↗</a>}
              {snapshot.provenance.eventsApi && <a href={snapshot.provenance.eventsApi} rel="noreferrer" target="_blank">CivicClerk events API ↗</a>}
            </div>
          </section>
        </aside>
      </div>

      <section className="record-panel minutes-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Minutes</p>
            <h2>{snapshot.minutesFile?.name || "Readable minutes"}</h2>
          </div>
          {snapshot.minutesFile?.fileId != null && <span className="quiet-note">File ID {snapshot.minutesFile.fileId}</span>}
        </div>
        {snapshot.minutesText ? (
          <details>
            <summary>Show a source-text excerpt</summary>
            <p className="minutes-excerpt">{snapshot.minutesText.slice(0, 1600)}{snapshot.minutesText.length > 1600 ? "…" : ""}</p>
          </details>
        ) : (
          <p className="muted-copy">The bridge did not return readable minutes text for this meeting.</p>
        )}
      </section>

      <section className="evidence-rule">
        <strong>Source boundary</strong>
        <p>Newsroom chooses what a reporter sees; CivicClerk Bridge still owns meeting resolution, retrieval and source custody. An unresolved query stays unresolved rather than becoming an inferred newsroom fact.</p>
      </section>
    </>
  );
}
