# Newsroom Build Spine v1

**Status:** Proposed governing build method for Optical Lift Newsroom  
**Derived from:** Atlas Build Spine and Product Map discipline  
**Purpose:** prevent Newsroom from growing as a cluster of successful pages that later require architectural reconciliation.

## Governing rule

> Never build the next feature. Complete the next piece of reporting reality.

Every material tranche follows:

```text
Reality
→ Authority
→ Operation
→ Kernel
→ Projection
→ Encounter
→ Proof
→ Retirement
```

And every implementation distinguishes:

```text
Canon → Kernel → Product
```

- **Canon** settles what is actually true, what is derived, who owns it, and what distinctions must not collapse.
- **Kernel** provides the durable schema, governed read/write seams, custody, identity, state transitions and authorization.
- **Product** gives the reporter a coherent human encounter over those governed seams.

A page may collect intent. It may not invent missing Canon or Kernel.

## One reality artery per tranche

Every active tranche declares one end-to-end reality artery. Software-category scopes such as `search`, `tags`, `people`, `AI`, or `transcript polish` are not sufficient.

Example:

```text
original recording
→ transcript-core custody
→ derived transcript revision
→ reporting-source registration
→ reporting topic relationship
→ library projection
→ reporter retrieval
```

The artery must name where each material state becomes true and which domain owns it.

## One finish train at a time

Only one material Newsroom finish train should be active unless another task is explicitly orthogonal governance, source archaeology or non-overlapping infrastructure.

Lock concepts, not files. Two changes may touch the same file when they do not decide the same invariant. Two changes may not independently redefine the same invariant merely because they touch different code.

Current high-risk invariants include:

- Newsroom workspace / publication identity;
- member access versus domain-specific membership;
- original source custody;
- transcript revision identity;
- reporting-source identity;
- continuing reporting-topic identity;
- speaker identity versus reporting Person identity;
- machine transcript versus reporter-verified quote;
- review state versus tags/labels.

## Required tranche declaration

Before implementation, record:

- `reality_artery`
- `canonical_nouns`
- `authority_owner`
- `kernel_dependencies`
- `candidate_abstractions`
- `proof_domains`
- `read_membrane`
- `command_membrane`
- `product_surface`
- `transitional_carriers`
- `retirement_target`
- `collision_scope`

No materially relevant field may be silently omitted.

## Product Map gate

Before changing a human-facing Newsroom surface, specify:

```text
system reality
→ encounter justification
→ screen identity
→ purpose
→ required orientation
→ primary information
→ interaction
→ decision meaning
→ state mutation
→ next state
→ uncertainty/failure behavior
→ implementation
```

Implementation does not define the product retroactively.

## Evidence law

Newsroom must preserve these distinctions:

```text
source / evidence
!= extracted content
!= model interpretation
!= identity resolution
!= reporter organization
!= verified reporting fact
!= publication output
```

For recorded audio specifically:

```text
original audio
!= machine transcript
!= human-corrected transcript revision
!= named speaker identity
!= reporting Person identity
!= candidate quote
!= audio-verified quote
```

## Application dependency direction

Preferred direction:

```text
route / page
→ feature presentation
→ application adapter
→ governed read/write membrane
→ canonical domain authority
```

Pages do not become domain services. UI state is not durable reporting truth.

## Abstraction promotion

Use the same promotion discipline as Atlas:

```text
domain-local need
→ truthful local implementation
→ candidate reusable primitive
→ second genuinely different proof
→ shared contract
→ horizontal primitive
```

A generic tag, folder, Person directory, search engine or AI helper must not become universal because one transcript screen wants it.

## Finish-line gates

A tranche advances through:

```text
semantics
→ database/kernel
→ application
→ release
→ human proof
→ retirement
```

No tranche is complete merely because the UI works.

## Deployment discipline

- Ordinary iteration produces zero Vercel deployments.
- Local/sandbox build, typecheck and narrow verification are the default feedback loop.
- GitHub remote writes are checkpoints, not keystrokes.
- Production deployment happens only when the principal explicitly requests the coherent tested checkpoint.
- Preview deployments are not a development loop.

## Stop conditions

Stop before implementation or merge when:

- two domains can establish the same durable truth;
- a product screen is compensating for a missing canonical seam;
- a domain-specific membership is being used as whole-Newsroom authority;
- a collection/tag/folder creates a second story/topic truth;
- machine inference is being promoted to verified reporting truth;
- a source relationship is being stored only in presentation state;
- a transitional carrier is becoming the conceptual model;
- a generic abstraction is being promoted without a second real proof;
- retirement of replaced state is unnamed.

## Governing pre-build test

Before beginning any tranche, answer:

1. What exact piece of reporting reality are we completing?
2. What invariant is this tranche allowed to decide?
3. Which invariants are locked elsewhere?
4. What existing source identity/authority/kernel must be reused?
5. What looks reusable but has only one-domain proof?
6. What is the complete path from source evidence to reporter encounter?
7. What will be retired when the path is complete?

If those answers are not explicit, the tranche is not ready.
