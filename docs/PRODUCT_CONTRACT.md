# Optical Lift Newsroom — product contract

## Purpose

Optical Lift Newsroom is a private human workspace that automates real reporting work. The current pilot is for Marshall at the Mitchell Republic.

The workspace lives at `/forum` and requires an authorized login.

## Current desks

- Markets — live Mitchell eight-value market/grain block.
- Municipal — CivicClerk meeting records and attachments.
- Transcripts — next build.
- Sports — later build.

## Boundary

```text
source/evidence system
        ↓
stable read or processing contract
        ↓
Optical Lift Newsroom
        ↓
reporter
```

Newsroom owns the private human workspace and presentation. Source/evidence systems remain authoritative for their records.

## Current non-goals

- No Brightspot integration yet.
- No broader Forum rollout yet.
- No automatic publishing.
- No chatbot-first interface.
- No Atlas dependency.
- No private newsroom data in the public repository.
