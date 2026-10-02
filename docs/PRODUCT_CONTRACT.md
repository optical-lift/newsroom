# Optical Lift Newsroom — product contract

## Purpose

Optical Lift Newsroom is a private human workspace for reporting/journalism work.

The current real tenant is Forum Communications. Mitchell Republic is a publication/branch context inside that company, and Marshall is the first reporter proving the product. The architecture must permit another company to have its own isolated Newsroom with its own publications and employees without inheriting Forum-specific identity or private reporting.

## Product root

```text
Newsroom company workspace
→ publication / branch
→ authorized member
→ desk/domain bindings
→ reporting encounters
```

A domain-specific workspace such as Transcript Core may be bound beneath this root. It may not become the whole product's institutional authority merely because it was the first private integration.

## Current desks

- Markets — market/grain copy preparation.
- Legal Notices — proof, approval and payment workflow pilot.
- Municipal — CivicClerk meeting records and attachments.
- Transcripts — recorded-source library and transcript workspace.
- Sports — later build.

## Evidence boundary

```text
source/evidence system
        ↓
governed read/processing contract
        ↓
Reporting Core registration/interpretation when warranted
        ↓
Optical Lift Newsroom encounter
        ↓
reporter judgment / reporting work
```

Newsroom owns the human workspace, product orientation and collection of reporter intent. Source/evidence systems remain authoritative for their source custody. Reporting Core owns downstream reporting memory where sources, passages, topics, claims, events, quotes and reporting objects become durable newsroom relationships.

## Current non-goals

- No Brightspot integration yet.
- No automatic publishing.
- No chatbot-first interface.
- No Atlas dependency.
- No private newsroom data in the public repository.
- No speculative enterprise RBAC beyond authority actually required by company/publication/member isolation.
