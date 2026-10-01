# Public code / private newsroom boundary

The `optical-lift/newsroom` repository is public. The deployed Newsroom is private.

## Access

- `/login` is the only unauthenticated human-facing route.
- `/` redirects into the protected Forum workspace.
- `/forum` and every desk require a valid Supabase Auth session.
- Server-side authorization also requires membership in the Forum / Mitchell Republic workspace.
- The current pilot reuses the existing Transcript Core workspace membership as the Forum access list rather than creating a second member table.

## Public repository content

- application source code;
- route structure;
- public source adapters;
- UI components and styles;
- tests and CI configuration;
- Supabase project URL, publishable browser key and opaque Forum workspace UUID.

Those Supabase browser values are public client configuration, not privileged credentials.

## Never commit

- service-role keys;
- provider secrets or API keys;
- private recordings or transcripts;
- unpublished reporting or notes;
- session tokens;
- production data dumps or private logs.

Authorization is enforced by Supabase Auth plus the existing workspace-membership RPC and downstream RLS/RPC rules. A public source being displayed inside Newsroom does not make the Newsroom workspace public.
