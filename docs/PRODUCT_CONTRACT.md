# Optical Lift Newsroom — product contract

## Purpose

Optical Lift Newsroom is the human workspace that exposes reporting intelligence and evidence produced by source-specific systems.

The first client workspace is Forum Communications / Mitchell Republic at `/forum`.

## V1 navigation

- Today — current state of the workspace and connected desks.
- Transcripts — authenticated human surface over Transcript Core.
- Municipal — public-source human surface over CivicClerk Bridge and municipal reporting services.
- Sports — future human surface over sports-source adapters.
- Markets — Marshall's exact Mitchell market block, with live collection/edition automation still to be connected.

## Ownership boundary

```text
source/evidence system
  → narrow domain contract
  → Newsroom human surface
  → reporter/editor
```

Newsroom does not silently absorb source authority.

- Transcript Core owns original audio custody, transcripts, revisions, timestamped segments and speaker structure.
- CivicClerk Bridge owns CivicClerk retrieval and source custody.
- Sports adapters own sports-source retrieval and verification state.
- Market adapters own market-source retrieval used by recurring editions.
- Atlas is optional and is not required for any Newsroom desk.

## Access boundary

Public and private desks may coexist in the same Newsroom shell.

- Public-source desks may render already-public evidence without a workspace login.
- Private desks must authenticate and authorize at the owning domain before returning evidence.
- Newsroom does not receive or expose provider/service-role secrets in browser code.

## Human-first rule

Newsroom is not a chatbot. A reporter should open a desk and see the source state, evidence, missing pieces and next useful reporting information without having to prompt an AI system.
