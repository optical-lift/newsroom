# Newsroom repository contract

## Product boundary

Newsroom is the human-facing workspace. It presents evidence and reporting state owned by domain services; it does not silently absorb their authority.

- Transcript Core owns recordings/transcripts and their evidence history.
- CivicClerk Bridge owns CivicClerk retrieval and source custody.
- Sports adapters own sports-source retrieval.
- Market adapters own market-source retrieval used by recurring updates.
- Atlas is optional and must never be required for Newsroom to function.

## Public-repository safety rules

This repository is public. Never commit:

- customer recordings, transcripts, notes, unpublished reporting, or newsroom documents;
- user/member lists or personal contact information;
- API keys, service-role keys, tokens, cookies, database passwords, or secrets;
- production database dumps or logs containing customer data.

Use server-side environment variables for credentials. Public-source adapters may be connected without workspace authentication when they expose only material already public at the source. Private workspace data may not be connected until authentication and server-side authorization are implemented and verified.

## Source-adapter rules

- Keep source-specific retrieval in a narrow adapter under `lib/<domain>`.
- Normalize only the fields Newsroom needs for presentation; do not copy source authority or hidden `raw` payloads into shared Newsroom state.
- A source failure must render as unavailable rather than falling back to invented or stale facts.
- Preserve source identifiers, retrieval provenance, verification state and source links when supplied by the source service.
- Do not add editorial interpretation to source adapters.

## Product rules

- Human-facing first. Do not make chat/AI the primary interface.
- Read-only before write-enabled. Do not publish, message, assign, or mutate source systems without a separately governed feature.
- Preserve source provenance and uncertainty.
- Placeholder data must be explicitly labeled as placeholder/system state, never presented as real reporting facts.
- Keep workspace, publication, member, desk, and access concepts narrow until real integrations prove additional shared semantics.
