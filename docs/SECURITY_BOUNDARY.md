# Public code / private newsroom boundary

The `optical-lift/newsroom` repository is public. The deployed Forum workspace will become private before any real newsroom data is connected.

## Public

- application source code;
- route structure;
- source-adapter interfaces;
- UI components and styles;
- tests and CI configuration;
- documentation that contains no customer secrets.

## Private

- authentication/session state;
- Forum member identities and permissions;
- recordings and transcripts;
- unpublished reporting and notes;
- generated Markets Update editions if they contain licensed/private material;
- source credentials and provider API keys;
- database credentials and service-role keys.

## Hard gate

The shell may be deployed before authentication because it contains no customer data. No real Forum data may be wired into `/forum` until both authentication and server-side authorization are active and tested.
