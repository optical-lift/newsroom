# Optical Lift Newsroom

Human-facing newsroom workspace for source-grounded reporting tools operated by Optical Lift.

Newsroom owns the workspace reporters use. It does not replace the systems that own source evidence.

## Product boundary

- **Newsroom** owns workspace navigation, desk presentation, access boundaries, and shared newsroom views.
- **Transcript Core** owns recordings, transcripts, revisions, speaker structure, search, playback, annotations, and export.
- **CivicClerk Bridge** owns CivicClerk meeting and document retrieval with source custody.
- **Sports adapters** own sports schedule/result/stat retrieval.
- **Market-source adapters** own retrieval used by recurring market updates.
- **Atlas is optional.** Newsroom must remain useful and deployable without Atlas.

## Initial Forum workspace

The first workspace is `/forum`, with these desk routes:

- `/forum` — Today
- `/forum/transcripts`
- `/forum/municipal`
- `/forum/sports`
- `/forum/markets`

The Municipal desk is the first live source slice. It reads a certified Mitchell CivicClerk meeting from the existing read-only CivicClerk Bridge and presents meeting identifiers, agenda structure, attachments, published files, minutes availability, and retrieval provenance. The Bridge remains authoritative for CivicClerk retrieval and custody.

The certified pilot query is:

- tenant: `mitchellsd`
- body: `Sports & Events Authority`
- date: `2026-08-18`

Override the bridge host server-side with `CIVICCLERK_BRIDGE_URL` when needed. The default is `https://civicclerk-bridge.vercel.app`.

No private Forum data, recordings, transcripts, notes, credentials, or customer secrets belong in this public repository. Public-source adapters may be connected before workspace authentication; private newsroom sources may not.

## Local development

```bash
npm install
npm run dev
```

## Validation

```bash
npm run typecheck
npm run build
```

## Production rule

Public code does not make newsroom data public. Credentials belong in server-side environment variables. Private workspace data may be connected only after authentication and server-side authorization are implemented and verified.
