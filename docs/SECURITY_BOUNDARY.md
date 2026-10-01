# Public code / private newsroom boundary

The `optical-lift/newsroom` repository is public. Public code and public-source desk surfaces may be visible without a newsroom login. Private newsroom evidence may not be returned unless the source domain authorizes the current user.

## Public

- application source code;
- route structure;
- source-adapter interfaces;
- UI components and styles;
- tests and CI configuration;
- documentation that contains no customer secrets;
- public-source municipal material already public at its authoritative source.

## Private

- authentication/session state;
- Forum member identities and permissions;
- recordings and transcripts;
- unpublished reporting and notes;
- generated Markets Update editions if they contain licensed/private material;
- source credentials and provider API keys;
- service-role credentials.

## Transcript Core rule

Transcript Core already enforces its private boundary through Supabase Auth, `transcript_core.workspace_memberships`, authorization-aware RPCs and Storage RLS. The Newsroom browser receives only a publishable Supabase key; it does not receive a service-role key or provider credential.

A route being publicly reachable does not make the evidence behind it public. `/forum/transcripts` must render an authentication/access state until Transcript Core authorizes that account for the configured Forum workspace.

## Hard gate

Do not bypass a domain's authorization boundary to make a Newsroom page easier to build. Private evidence remains unavailable on auth failure, workspace-membership failure or source-access failure.
