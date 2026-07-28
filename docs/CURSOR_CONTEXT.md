# FoodWave Cursor Context

Last updated: 2026-07-28

This document is the working source of truth for the AI state of the FoodWave repository. It must be updated whenever an approved milestone, slice, or architectural decision changes.

## 1. Project Overview

FoodWave is a multi-tenant SaaS platform for restaurants. It covers customer management, customer visits, loyalty, wallet passes, campaign automation, and customer intelligence.

Technology stack:
- React
- Vite
- TypeScript
- TailwindCSS
- Supabase
- PostgreSQL

Current architecture philosophy:
- Clean Architecture with explicit module boundaries
- Service-first business logic
- Repository Pattern for persistence
- Event-driven automation and projection flow
- Projection Store pattern for Customer Intelligence
- Multi-tenant isolation by organization
- Dependency inversion through contracts and composition roots
- CQRS concepts where read models are projection-backed

Current version:
- v0.4.0

Current milestone:
- Customer Intelligence Engine

Current implementation status:
- Milestone v0.1.0: complete
- Milestone v0.2.0: complete
- Milestone v0.3.0: complete
- Milestone v0.4.0: in progress
- Customer Intelligence slices 1 through 4 are implemented and validated
- Slice 5 has not started

## 2. Technology Stack

Core stack:
- React for UI
- Vite for local development and bundling
- TypeScript in strict mode for application code
- TailwindCSS for styling
- Supabase for authentication, database access, and RLS-backed multi-tenant data access
- PostgreSQL for relational persistence and projection storage

Future technologies may be added only through approved milestones and architecture review.

## 3. Architecture

Clean Architecture:
- Separates contracts, services, repositories, and domain policies so business rules stay independent from infrastructure.

SOLID:
- Keeps modules small, testable, and easier to extend without destabilizing stable capabilities.

Repository Pattern:
- Centralizes persistence access and keeps Supabase usage isolated from business services.

Event Driven Architecture:
- Enables automation, loyalty synchronization, wallet updates, and customer intelligence projection refreshes from domain events.

Projection Store Pattern:
- Customer Intelligence is a materialized read model updated incrementally from historical source tables.

Dependency Inversion:
- Services depend on abstractions, not Supabase or concrete persistence details.

Multi-Tenant design:
- Organization-scoped data access protects tenant isolation across CRM, loyalty, wallet, campaigns, and customer intelligence.

CQRS concepts:
- Historical tables remain the write/source truth.
- Projection-backed read models serve dashboards and downstream consumers.

Why these principles exist:
- To keep the platform modular, scalable, and safe to evolve without duplicating business logic or coupling reads to expensive historical queries.

## 4. Module Map

src/
- app: application shell and top-level UI wiring.
- auth: authentication, onboarding, and tenant selection flows.
- automation: event bus, automation runtime, contracts, registries, and plugins.
- campaigns: campaign orchestration, automation integration, and campaign runtime services.
- crm: customer profile, customer visit, and CRM-facing service layer.
- customerIntelligence: projection store, read model, RFM/segmentation foundation, refresh orchestration, and future intelligence engines.
- dashboard: dashboard-facing service layer and data aggregation.
- google: Google integration services.
- loyalty: points, levels, rewards, wallets, transactions, and reward history.
- marketing: marketing service layer.
- meta: meta integration services.
- notifications: notification service layer.
- restaurants: restaurant domain services.
- settings: settings and configuration services.
- shared: shared config, types, lib, routes, hooks, and contexts.
- wallet: wallet pass, wallet status, and wallet synchronization services.
- analytics: currently a lightweight analytics service surface.
- styles: global styling and theme assets.

Customer Intelligence module responsibilities:
- contracts: public abstractions for projection, refresh, and calculators.
- repositories: Supabase-backed persistence adapters only.
- services: orchestration, projection application, refresh coordination, and dependency graph.
- calculators: deterministic metric calculators.
- rfm: RFM scoring policy.
- segmentation: segment policy and resolver.
- types: snapshot, insight, refresh, and event types.

## 5. Customer Intelligence

Architecture:
- Customer Intelligence is an event-driven Projection Store, not an on-demand analytics engine.

Projection philosophy:
- Historical modules remain the source of truth.
- Customer Intelligence stores the latest known customer intelligence state as a continuously maintained snapshot.
- Reads use the snapshot; normal reads never recalculate intelligence from history.

Current snapshot model:
- One active snapshot per organization_id + customer_id.
- Snapshot state includes RFM, segmentation, churn, CLV placeholders for future slices, and insight summary fields.
- Algorithm version is required and fail-fast enforced.

Projection Store:
- Implemented as a dedicated customerIntelligence module with snapshot repositories and refresh job infrastructure.
- Existing persistence is isolated behind repositories.

Implemented engines:
- Slice 3: RFM engine
- Slice 4: Customer Segmentation engine

Pending engines:
- Slice 5: CLV engine
- Slice 6: Churn engine
- Slice 7: Insights engine
- Slice 8: Automation integration
- Slice 9: Background refresh hardening

Current slice:
- Slice 4 completed and approved

Current status:
- Projection store foundation, persistence, RFM, and segmentation are implemented.
- Active algorithm version resolution is fail-fast.
- No placeholder algorithm versions are permitted.

Current risks:
- Tenant-configurable segmentation and richer churn policies are still pending later slices.
- Visit-source reads may need performance tuning for very large tenants.
- CLV, churn, and insight lifecycle behavior are not yet implemented.

## 6. Milestone History

v0.1.0 - Foundation
- Status: Complete
- Description: authentication, multi-tenant baseline, organizations, CRM, customer visits, and loyalty.

v0.2.0 - Digital Wallet
- Status: Complete
- Description: wallet pass orchestration, Apple Wallet, Google Wallet, QR integration, and wallet sync.

v0.3.0 - Automation Core
- Status: Complete
- Description: event bus, repository layer, contracts, plugins, trigger/action registry, campaign runtime, and campaign engine.

v0.4.0 - Customer Intelligence
- Status: In Progress
- Description: projection store architecture and implementation for customer intelligence.
- Current slice: Slice 4 completed.
- Remaining work: Slice 5 through Slice 9, then release hardening.

## 7. Slice Progress

Slice 1 - Projection Store foundation
- Status: Completed
- Description: module structure, contracts, types, DTOs, repository interfaces, base services, dependency graph.
- Validation: npx tsc --noEmit passed.

Slice 2 - Projection persistence
- Status: Completed
- Description: concrete repositories, snapshot persistence, read model access, refresh interfaces.
- Validation: self architecture audit, npx madge --circular src/customerIntelligence --extensions ts, npx tsc --noEmit passed.

Slice 3 - RFM Engine
- Status: Completed
- Description: recency, frequency, monetary calculation and score aggregation integrated into projection updates.
- Validation: self architecture audit, npx madge --circular src/customerIntelligence --extensions ts, npx tsc --noEmit passed.

Slice 4 - Customer Segmentation Engine
- Status: Completed
- Description: segment resolver and projection-backed segment assignment.
- Validation: self architecture audit, npx madge --circular src/customerIntelligence --extensions ts, npx tsc --noEmit passed.

Slice 5 - CLV Engine
- Status: Pending
- Description: historical value, average ticket, predicted value, and lifetime calculations.

Slice 6 - Churn Engine
- Status: Pending
- Description: churn detection, risk scoring, and threshold evaluation.

Slice 7 - Insights Engine
- Status: Pending
- Description: insight generation, lifecycle, active insights, severity.

Slice 8 - Automation Integration
- Status: Pending
- Description: integration with Automation Core, Campaign Engine, Loyalty, and Wallet.

Slice 9 - Background Refresh
- Status: Pending
- Description: incremental refresh, batch rebuild, retry, checkpoint handling, and idempotency.

## 8. Current Roadmap

Current
↓
Slice 5
↓
Slice 6
↓
Slice 7
↓
Slice 8
↓
Slice 9
↓
Release Hardening
↓
v0.4.0 Release

## 9. Repository Rules

- Supabase only inside repositories.
- No business logic inside repositories.
- Services orchestrate.
- Calculators calculate.
- Policies contain business rules.
- Projection is the official read model for Customer Intelligence.
- Historical tables remain the source of truth.
- Do not duplicate transactional history in the projection store.
- Do not recalculate intelligence during normal reads.
- Do not silently persist snapshots with unknown algorithm versions.

## 10. AI Development Rules

- Think before coding.
- Never redesign approved architecture.
- Never introduce technical debt intentionally.
- Work in vertical slices.
- Implement one business capability per slice.
- Keep each slice stable and compilable before moving forward.
- Stop for approval after each approved slice.

## 11. Validation Pipeline

Every slice must execute:

Self Architecture Audit
↓
npx madge --circular src/customerIntelligence --extensions ts
↓
npx tsc --noEmit
↓
npm run build

If validation fails:
- Stop.
- Fix the current slice.
- Repeat the validation.
- Never continue with unresolved errors.

## 12. Architectural Decisions

2026-07-28 - Customer Intelligence is a Projection Store.
- Reason: the module must serve as a continuously maintained read model instead of an on-demand analytics engine.
- Benefits: low-latency reads, reduced historical query cost, cleaner integration with automation and campaigns.
- Trade-offs: requires event-driven refreshes and more careful projection consistency handling.

2026-07-28 - Fail fast on missing algorithm version.
- Reason: snapshots must never persist without a valid algorithm version.
- Benefits: deterministic projections, auditable snapshots, safer upgrades.
- Trade-offs: refresh flow can fail when version registration is incomplete.

2026-07-28 - RFM and segmentation are separate vertical slices.
- Reason: each slice must implement only one business capability.
- Benefits: smaller stable changes, easier review, lower regression risk.
- Trade-offs: slower overall milestone delivery.

## 13. Known Technical Debt

Technical Debt:
- CLV, churn, insight lifecycle, and background rebuild runtime are not implemented yet.
- Some later-slice projection behaviors are still placeholder contracts only.

Future Improvements:
- Tenant-configurable segmentation rules.
- Better visit-source optimization for high-volume tenants.
- Read-path aggregation helpers for dashboards.

Release Blockers:
- Slice 5 through Slice 9 remain incomplete.
- Database migrations for projection tables must be applied before production use.

## 14. Risks

Architecture:
- Risk of over-expanding the projection module if future slices ignore capability boundaries.

Database:
- Risk of schema drift between designed projection tables and future migration SQL.

Performance:
- Risk of expensive visit-source reads as tenant size grows.

Scalability:
- Risk of rebuild lag or write amplification for very large organizations.

Maintainability:
- Risk of duplicated intelligence ownership if later modules write derived fields outside the projection store.

Security:
- Risk of tenant leakage if RLS policies diverge from the established organization-membership pattern.

## 15. Current Completion

These are working estimates for the current repository state:
- Architecture %: 90%
- Backend %: 48%
- Frontend %: 78%
- Infrastructure %: 55%
- Overall Product %: 74%
- Commercial MVP %: 82%

These percentages should be updated after each completed milestone and whenever the implementation baseline changes materially.