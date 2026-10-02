# Active Structural Tranche — Newsroom Institutional Root v1

**Kind:** structural consolidation  
**State:** semantics selected; database/application implementation staged; release held

## Reality artery

```text
authenticated human
→ Newsroom company workspace membership
→ publication / branch context
→ authorized domain bindings
→ desk-specific governed reads/commands
→ coherent Newsroom encounter
```

This tranche exists because the current pilot uses Transcript Core workspace membership as whole-application authority. That is a transitional carrier, not the final Newsroom institution.

## canonical_nouns

- Authenticated User — Supabase account/custody key, not the institutional membership itself.
- Newsroom Workspace — company/tenant using Newsroom; Forum Communications is the first real instance.
- Publication — a publication/branch inside that workspace; Mitchell Republic is the first real instance.
- Workspace Membership — one user's membership in the Newsroom company.
- Publication Access/Assignment — the publication context(s) that member may enter.
- Domain Binding — a publication/workspace's lawful binding to a domain-specific source system, such as a Transcript Core workspace.
- Transcript Core Workspace — transcript-domain access/custody only; not whole-Newsroom identity.

## authority_owner

- Newsroom institutional membership owns whether the human may enter a Newsroom workspace.
- Publication assignment owns whether the member may enter that publication context.
- Transcript Core membership continues to own transcript-domain authorization.
- CivicClerk/source adapters continue to own their source retrieval constraints.
- Reporting Core may not be exposed until its custody is scoped to the Newsroom institution/publication and the calling member is authorized through the Newsroom root.

## kernel_dependencies

- Supabase Auth
- current Transcript Core workspace membership
- current `/forum` authenticated shell
- existing private Reporting Core

## candidate_abstractions

- shared Newsroom domain-binding contract, only if Transcripts plus at least one genuinely different desk prove the same function;
- publication-scoped data authority, without prematurely creating generic enterprise RBAC.

## proof_domains

- Transcripts proves a private domain workspace must bind beneath Newsroom membership.
- Municipal/Markets provide the second independent proof that Newsroom navigation cannot be rooted in Transcript Core membership alone.

## read_membrane

Staged read contract:

```text
newsroom_current_context_v1(workspace_slug, publication_slug?)
→ member
→ workspace
→ selected/default publication
→ authorized publication list
→ bounded domain bindings needed by the current encounter
```

The app should not reconstruct institutional access from arbitrary domain tables.

## command_membrane

V1 may be read-mostly for institutional setup. Any membership/publication administration must be separately governed and is not part of this reporter-facing tranche unless explicitly required.

## product_surface

- `/forum` company/employee landing
- shared Newsroom rail
- all desks that need current publication identity

The visible product should say Forum Communications / Mitchell Republic because those are governed context, not hard-coded theme strings.

## transitional_carriers

- Production `FORUM_WORKSPACE_ID` currently points to a Transcript Core workspace. In the staged application it is reduced to a transcript-client compatibility carrier and must match the governed publication binding before the desk opens.
- Production `requireForumMember()` checks `transcript_core_is_workspace_member` for product entry. The staged application replaces that root gate with `newsroom_current_context_v1`.
- Production company/publication labels are application constants. The staged application renders them from governed context.
- Reporting Core currently has no tenant/publication scope and no authenticated membrane; this tranche does not expose it.

## retirement_target

- retire Transcript Core membership as the root `/forum` authorization gate;
- retire hard-coded Forum-specific company/publication labels from generic Newsroom composition;
- keep Transcript Core membership only as one downstream domain authorization check/binding;
- carry `FORUM_WORKSPACE_ID` as explicit bounded debt until the Transcript Studio client accepts the publication binding directly.

## collision_scope

Do not:

- make `transcript_core.workspaces` the canonical Newsroom company identity;
- create a second unrelated member system per desk;
- expose Reporting Core globally because there is only one current reporter;
- infer publication access from a transcript membership;
- build broad owner/admin/manager role semantics without an actual authority need.

## proof requirements

1. Marshall can enter Forum Communications / Mitchell Republic through the Newsroom root.
2. Transcript access still fails closed if his Transcript Core binding is absent even when Newsroom membership exists.
3. A hypothetical second Newsroom workspace cannot read Forum private reporting state.
4. A member without Mitchell Republic publication access cannot enter that publication merely because they belong to the same company workspace.
5. Existing Markets/Municipal behavior still resolves through the same Newsroom context without becoming dependent on Transcript Core.

## finish gates

- Semantics: **selected**
- Database/kernel: **staged, not released**
- Application: **staged against current production main, not released**
- Release: held
- Human proof: pending
- Retirement: partial; root authority/hard-coded labels are staged for retirement, transcript-client compatibility ID remains bounded debt
