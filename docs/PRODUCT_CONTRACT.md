# Optical Lift Newsroom — product contract

## Purpose

Optical Lift Newsroom is a private human workspace that exposes reporting intelligence produced by source-specific systems.

The first client workspace is Forum Communications / Mitchell Republic at `/forum`.

## V1 navigation

- Today — current state of the workspace and connected desks.
- Transcripts — future human surface over Transcript Core.
- Municipal — future human surface over CivicClerk Bridge and municipal reporting services.
- Sports — future human surface over sports-source adapters.
- Markets — future shared recurring markets update and archive.

## Ownership boundary

```text
source/evidence system
        ↓
stable read contract
        ↓
Optical Lift Newsroom
        ↓
human reporter/editor
```

Newsroom owns presentation, navigation, workspace access, and shared human workflow state. Source/evidence services remain authoritative for the records they produce.

## V1 non-goals

- No dependency on Atlas.
- No automatic publishing.
- No CMS replacement.
- No autonomous editorial assignments.
- No chatbot-first UX.
- No private customer data in the public repository.
