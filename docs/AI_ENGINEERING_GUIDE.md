# FoodWave AI Engineering Guide

Version: 1.0  
Last updated: 2026-07-28  
Audience: Engineers, AI agents, and reviewers working in the FoodWave repository

This document is the permanent engineering handbook for FoodWave. It defines how the platform is built, validated, and released. For current milestone status and slice progress, see [CURSOR_CONTEXT.md](./CURSOR_CONTEXT.md). For version history, see [CHANGELOG.md](./CHANGELOG.md).

---

## 1. Purpose

FoodWave is a multi-tenant SaaS platform for restaurants. Engineering work must preserve modular boundaries, tenant isolation, and service-first business logic. This guide exists so that human engineers and AI agents apply the same rules consistently across milestones.

---

## 2. Architecture Principles

### 2.1 Clean Architecture

FoodWave separates concerns across layers:

| Layer | Location | Responsibility |
|---|---|---|
| Contracts | `*/contracts/` | Public abstractions, interfaces, and domain contracts |
| Services | `*/services/` | Orchestration, workflow coordination, cross-repository logic |
| Repositories | `*/repositories/` | Supabase persistence adapters only |
| Policies / Calculators / Resolvers | `*/rfm/`, `*/segmentation/`, `*/calculators/` | Deterministic business rules and metric computation |
| Types | `*/types/` | Domain types, DTOs, enums |
| UI | `src/app/`, module components | Presentation and user interaction only |

Business rules must not live in UI components or repository adapters. See [REPOSITORY_RULES.md](./REPOSITORY_RULES.md) for mandatory persistence rules.

### 2.2 SOLID

- **Single Responsibility**: One business capability per vertical slice. Example: RFM (Slice 3) and Segmentation (Slice 4) are separate slices.
- **Open/Closed**: Extend behavior through contracts, policies, and plugin registries—not by modifying stable modules in place.
- **Liskov Substitution**: Repository interfaces must be swappable without changing service contracts.
- **Interface Segregation**: Module contracts expose only what consumers need. See `src/customerIntelligence/contracts/`.
- **Dependency Inversion**: Services depend on abstractions (`ICustomerIntelligenceSnapshotRepository`), not Supabase clients.

### 2.3 Repository Pattern

All Supabase access is isolated in repository implementations. Services orchestrate; repositories persist.

```
Service → Repository Interface → Supabase Adapter
```

Example module: `src/customerIntelligence/repositories/supabaseCustomerIntelligenceSnapshotRepository.ts`

Full rules: [REPOSITORY_RULES.md](./REPOSITORY_RULES.md)

### 2.4 Event-Driven Architecture (EDA)

Domain events flow through the Automation Core event bus. Source modules emit events on write; downstream consumers (Campaign Engine, Customer Intelligence, Loyalty, Wallet) react asynchronously.

Implemented in v0.3.0:
- `src/automation/engine/internalEventBus.ts`
- `src/automation/engine/automationEngine.ts`
- `src/automation/adapters/eventPublisher.ts`

See [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md) for event flow diagrams.

### 2.5 Projection Store Pattern

Customer Intelligence is a **materialized read model**, not an on-demand analytics engine.

- Historical tables (`customer_visits`, `loyalty_transactions`, etc.) remain the **write model / source of truth**.
- `ci_customer_snapshots` (Designed, not yet migrated) holds the **read model**—one current snapshot per `organization_id + customer_id`.
- Normal reads never recalculate intelligence from history.

Decision record: [ADR-001-projection-store-pattern.md](./adr/ADR-001-projection-store-pattern.md)

### 2.6 Dependency Injection (DI)

Modules compose dependencies through explicit composition roots and dependency graphs:

- `src/customerIntelligence/services/dependencyGraph.ts` — wires repositories, services, calculators, and policies for Customer Intelligence.

Rules:
- Do not instantiate Supabase clients inside services.
- Pass repository implementations into service constructors or factory functions.
- Keep the dependency graph the single wiring point per module.

### 2.7 Multi-Tenant Design

Every business entity is scoped by `organization_id`. Access is enforced through:

- Organization membership (`organization_memberships`)
- Supabase Row Level Security (RLS) on all org-scoped tables
- Service-layer organization context validation

Cross-tenant data access is prohibited at every layer.

### 2.8 CQRS Concepts

FoodWave applies CQRS selectively:

| Concern | Write Model | Read Model |
|---|---|---|
| Customer visits | `customer_visits` | Dashboard aggregates, CRM profile |
| Loyalty | `loyalty_transactions`, `loyalty_wallets` | CRM profile, wallet pass payload |
| Customer Intelligence | Source tables + domain events | `ci_customer_snapshots` (Designed) |
| Campaigns | `campaign_executions`, `campaign_queue` | Campaign health UI, logs |

Reads from projection-backed modules must use the snapshot read service, not source-table aggregation.

---

## 3. Coding Standards

### 3.1 TypeScript

- Strict mode enabled for all application code.
- No `any` unless explicitly justified and documented.
- Shared database types live in `src/shared/types/database.ts`.
- Module-specific types live in `*/types/`.

### 3.2 Naming Conventions

| Artifact | Convention | Example |
|---|---|---|
| Service | `{Domain}{Capability}Service` | `CustomerIntelligenceProjectionService` |
| Repository interface | `I{Entity}Repository` | `ICustomerIntelligenceSnapshotRepository` |
| Supabase repository | `Supabase{Entity}Repository` | `SupabaseCustomerIntelligenceSnapshotRepository` |
| Calculator | `{Metric}Calculator` | `RfmCalculator` |
| Policy | `{Domain}Policy` | `RfmPolicy`, `SegmentPolicy` |
| Contract file | `{domain}Contracts.ts` | `projectionContracts.ts` |

### 3.3 Error Handling

- Services throw typed domain errors (see `src/customerIntelligence/services/errors.ts`).
- Fail-fast on invariant violations (see [ADR-002](./adr/ADR-002-fail-fast-algorithm-version.md)).
- Never silently persist invalid state (e.g., snapshots without algorithm version).

### 3.4 Comments and Documentation

- Code should be self-explanatory.
- Add comments only for non-obvious business logic or architectural constraints.
- Update [CURSOR_CONTEXT.md](./CURSOR_CONTEXT.md) when milestones, slices, or ADRs change.

---

## 4. Folder Responsibilities

```
src/
├── app/                  # Application shell, routing, shared UI components
├── auth/                 # Authentication, onboarding, tenant selection
├── automation/           # Event bus, automation engine, plugin registries
├── campaigns/            # Campaign orchestration, triggers, actions, runtime
├── crm/                  # Customer profiles, visits, CRM services
├── customerIntelligence/ # Projection store, RFM, segmentation (v0.4.0)
├── dashboard/            # Dashboard aggregation services
├── loyalty/              # Points, levels, rewards, wallets, transactions
├── wallet/               # Wallet pass lifecycle, sync, download
├── shared/               # Config, types, lib, routes, hooks, contexts
├── google/               # Google integration services
├── meta/                 # Meta integration services
├── marketing/            # Marketing service layer
├── notifications/        # Notification service layer
├── restaurants/          # Restaurant domain services
├── settings/             # Settings and configuration
├── analytics/            # Lightweight analytics surface
└── styles/               # Global styling and theme assets
```

Each module follows the internal structure:

```
{module}/
├── contracts/       # Public interfaces
├── repositories/    # Persistence adapters (Supabase only here)
├── services/        # Orchestration
├── calculators/     # Metric computation (where applicable)
├── types/           # Domain types
└── index.ts         # Public exports
```

---

## 5. Vertical Slice Methodology

FoodWave delivers capabilities in **vertical slices**—one business capability per slice, stable and compilable before proceeding.

### 5.1 Slice Rules

1. Implement exactly one business capability per slice.
2. Each slice must compile and pass validation before approval.
3. Stop for human approval after each slice.
4. Never skip validation steps.
5. Never redesign approved architecture mid-slice.

### 5.2 Customer Intelligence Slice Map (v0.4.0)

| Slice | Capability | Status |
|---|---|---|
| 1 | Projection Store foundation (contracts, types, interfaces) | **Implemented** |
| 2 | Projection persistence (repositories, read model) | **Implemented** |
| 3 | RFM engine | **Implemented** |
| 4 | Customer Segmentation engine | **Implemented** |
| 5 | CLV engine | **Planned** (next) |
| 6 | Churn engine | **Planned** |
| 7 | Insights engine | **Planned** |
| 8 | Automation integration | **Planned** |
| 9 | Background refresh hardening | **Planned** |

Validation pipeline: [VALIDATION_PIPELINE.md](./VALIDATION_PIPELINE.md)

---

## 6. Architecture Review Process

Before merging a milestone or major slice:

1. **Self Architecture Audit** — verify module boundaries, no Supabase outside repos, no business logic in UI.
2. **Circular dependency check** — `npx madge --circular src/{module} --extensions ts`
3. **TypeScript compile gate** — `npx tsc --noEmit`
4. **Build gate** — `npm run build`
5. **Documentation update** — update CURSOR_CONTEXT, CHANGELOG, and relevant ADRs.
6. **Human approval** — explicit sign-off before next slice or release.

For architectural decisions that affect multiple modules, create an ADR in `docs/adr/`. See [adr/README.md](./adr/README.md).

---

## 7. Release Process

### 7.1 Milestone Release

1. All slices for the milestone are **Implemented** and validated.
2. Database migrations are written, reviewed, and applied in target environments.
3. CHANGELOG updated with version entry.
4. CURSOR_CONTEXT updated with completion status.
5. PROJECT_ROADMAP milestone marked **Completed**.

### 7.2 Version Numbering

FoodWave follows semantic versioning aligned to milestones:

| Version | Milestone |
|---|---|
| v0.1.0 | CRM, Visits, Loyalty |
| v0.2.0 | Digital Wallet |
| v0.3.0 | Automation Core |
| v0.4.0 | Customer Intelligence (In Progress) |
| v0.5.0+ | Planned — see [PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md) |

### 7.3 Pre-Production Checklist

- [ ] All migrations applied in target Supabase environment
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] No unresolved circular dependencies in changed modules
- [ ] CURSOR_CONTEXT and CHANGELOG updated
- [ ] Known limitations documented

---

## 8. Cross-Reference Index

| Document | Purpose |
|---|---|
| [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md) | System architecture, module relationships, diagrams |
| [REPOSITORY_RULES.md](./REPOSITORY_RULES.md) | Mandatory persistence and orchestration rules |
| [VALIDATION_PIPELINE.md](./VALIDATION_PIPELINE.md) | Slice and release validation steps |
| [PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md) | Version roadmap v0.1–v1.0 |
| [CHANGELOG.md](./CHANGELOG.md) | Version history |
| [CURSOR_CONTEXT.md](./CURSOR_CONTEXT.md) | Current AI working context |
| [FoodWave-Architecture-v1.0.md](./FoodWave-Architecture-v1.0.md) | Long-term platform vision and domain model |
| [FoodWave-ERD-v1.0.md](./FoodWave-ERD-v1.0.md) | Entity relationship design |
| [MILESTONE-01.md](./MILESTONE-01.md) | v0.1.0 release record |
| [MILESTONE-02.md](./MILESTONE-02.md) | v0.2.0 release record |
| [MILESTONE-04-Customer-Intelligence-Phase-1-Architecture.md](./MILESTONE-04-Customer-Intelligence-Phase-1-Architecture.md) | CI architecture design |
| [MILESTONE-04-Phase-2-Projection-Store-Database-Design.md](./MILESTONE-04-Phase-2-Projection-Store-Database-Design.md) | CI database design (Designed) |
| [adr/README.md](./adr/README.md) | Architecture Decision Records index |

---

## 9. AI Agent Rules

When working in this repository as an AI agent:

1. Read [CURSOR_CONTEXT.md](./CURSOR_CONTEXT.md) before making changes.
2. Never redesign approved architecture without an ADR.
3. Work in vertical slices; one capability at a time.
4. Never introduce Supabase calls outside repositories.
5. Never recalculate intelligence on read paths.
6. Label work accurately: **Implemented**, **Designed**, **Planned**, **Deprecated**, **Future**.
7. Stop for approval after each slice.
8. Update documentation when milestones or decisions change.
