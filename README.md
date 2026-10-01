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

- `/forum/today`
- `/forum/transcripts`
- `/forum/municipal`
- `/forum/sports`
- `/forum/markets`

The first release is a safe shell only. No private Forum data, recordings, transcripts, notes, credentials, or customer secrets belong in this public repository.

## Local development

```bash
npm install
npm run dev
```

## Production rule

Public code does not make newsroom data public. Real workspace data may be connected only after authentication and server-side authorization are in place.
