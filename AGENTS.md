# Newsroom repository contract

## Product boundary

Newsroom is the human-facing reporting workspace. It presents evidence and reporting state owned by domain services; it does not silently absorb their authority.

- Transcript Core owns recordings/transcripts and their evidence history.
- Reporting Core owns source-custodied newsroom memory: sources/passages, reporting objects, events, topics, claims, money facts, actions/votes and quotes.
- CivicClerk Bridge owns CivicClerk retrieval and source custody until a source is lawfully registered downstream into Reporting Core.
- Sports adapters own sports-source retrieval.
- Market adapters own market-source retrieval used by recurring updates.
- Atlas is optional and must never be required for Newsroom to function.

## Governing build method

Read `docs/NEWSROOM_BUILD_SPINE_V1.md` before substantial architecture/product work.

The unit of construction is not a feature. It is one completed piece of reporting reality carried end-to-end through:

`Reality → Authority → Operation → Kernel → Projection → Encounter → Proof → Retirement`.

Every material tranche must declare one reality artery and identify canonical nouns, authority owners, read/write membranes, transitional carriers, collision scope and retirement target.

Do not implement feature lists such as `search`, `tags`, `people`, `AI`, `review`, or `folders` until the underlying reality and authority are settled.

## Product Map gate

Read `docs/product-map/00-MAP-CONSTITUTION.md` and the relevant registered screen before changing human-facing behavior.

Implementation must not discover the product screen-by-screen. If a required interaction or state is unmapped, map it before encoding a durable behavior in code.

## Current finish train

The active structural tranche is `newsroom_institutional_root_v1`, recorded in `newsroom.build.yaml` and `docs/tranches/NEWSROOM_INSTITUTIONAL_ROOT_V1.md`.

Until it is complete:

- `transcript_core.workspace_memberships` remains a transitional pilot gate for `/forum`, not whole-Newsroom authority;
- do not expose private Reporting Core through authenticated product APIs without lawful Newsroom workspace/publication custody;
- do not promote transcript-only Collections/Tags into canonical organization.

The queued Transcript → Reporting convergence is defined in `docs/tranches/TRANSCRIPT_REPORTING_CONVERGENCE_V1.md`.

## Evidence and reporting distinctions

Never collapse:

- original source ≠ extraction/transcript;
- machine transcript ≠ human-corrected transcript revision;
- speaker cluster/name ≠ reporting Person identity;
- reporting Topic/Collection ≠ source custody/folder location;
- transcript review ≠ quote verification;
- model interpretation ≠ source-backed claim;
- source relationship ≠ publication output.

When the product word **Collection** is used for reporting organization, its durable target is Reporting Core Topic unless later canon deliberately changes that decision.

Generic durable transcript Tags are not currently admitted; proposed tag examples map to different existing semantics and have not proved one shared primitive.

## Application dependency direction

Prefer:

`route / page → feature presentation → application adapter → governed read/write membrane → canonical authority`.

Pages do not become domain services. UI state must not masquerade as durable reporting state.

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
- Every desk belongs to one coherent Newsroom institution and shared interaction grammar; do not build independent mini-apps.

## AI edit and deployment boundary

GitHub is source control, not the editing filesystem. Complete coherent implementation locally/sandboxed as far as practical, run local build/typecheck/tests, inspect the whole diff, and make remote writes only as checkpoints.

Vercel deployment quota is a scarce resource:

- ordinary iteration produces zero Vercel deployments;
- preview deployments are not the development feedback loop;
- a production deployment is a deliberate release checkpoint requested by the principal;
- the phrase `go ahead` authorizes implementation, not deployment.

## Stop conditions

Stop before implementation/merge when:

- two stores can establish the same durable reporting truth;
- a domain-specific workspace/membership is being used as whole-Newsroom authority;
- presentation code compensates for a missing canonical seam;
- a collection/tag/folder creates a second Topic/story truth;
- model inference is being presented as verified reporting truth;
- private cross-tenant data cannot be scoped lawfully;
- a transitional carrier is becoming the product's conceptual model;
- retirement of replaced state is unnamed.
