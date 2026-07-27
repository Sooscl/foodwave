# FoodWave Architecture v1.0

## 1. Vision

FoodWave is a multi-tenant SaaS platform designed to serve modern restaurants with a unified system for customer engagement, operations, loyalty, payments, marketing, analytics, and team collaboration. The platform is intended to help restaurants grow revenue, improve retention, and automate the daily engagement loop between the business and its customers.

FoodWave is not merely a restaurant app. It is a business operating system for hospitality brands that need a connected digital layer across customer relationships, promotions, wallet experiences, and operational visibility. The long-term goal is to become the default digital commerce and engagement layer for restaurant groups and independent operators that need a scalable, intelligent, and secure platform.

The SaaS philosophy of FoodWave is grounded in four commitments:

- Ship value quickly through modular product capabilities
- Preserve security and data integrity by default
- Scale from a single restaurant to multi-location and multi-brand organizations
- Create an extensible platform that can support future AI, wallet, and commerce experiences

The multi-tenant strategy is central to the product vision. Every customer organization is treated as a tenant, with isolated business data, memberships, subscriptions, and operational boundaries. Restaurants become the primary operating units within an organization, while the organization remains the billing and governance boundary.

---

## 2. Core Principles

### 2.1 Multi-tenancy

FoodWave is designed as a true multi-tenant SaaS platform. Each organization is an isolated business context with its own users, restaurants, customers, campaigns, subscriptions, and data governance boundaries. This allows one platform instance to serve many customers while preserving logical separation and future scalability.

### 2.2 Security by Default

Security is not an add-on. It is built into identity, authorization, data access, and workflow design. Authentication is handled by a managed identity provider, while authorization is derived from memberships and explicit business roles. Sensitive write operations are constrained to trusted execution paths, and data access is governed by least privilege.

### 2.3 Scalability

The architecture is designed to scale horizontally and vertically over time. Core services are decoupled into modules so that growth in one capability, such as CRM or analytics, does not force rework across the entire system. The platform can expand from a single restaurant to multi-location chains, franchises, and global operations.

### 2.4 Clean Architecture

The system should remain maintainable by separating concerns across layers: interface, application, domain, and infrastructure. Business rules must not be tightly coupled to Supabase client usage or UI implementation details. This ensures that the platform remains resilient as the product grows.

### 2.5 Domain-Driven Design

The architecture follows a domain-oriented structure. The core domains are organizations, restaurants, customers, wallets, marketing, reservations, analytics, and subscriptions. Each domain owns its own rules and lifecycle, making the system easier to reason about and evolve.

### 2.6 Separation of Concerns

Authentication, authorization, business workflows, analytics, and notifications are treated as distinct concerns. This reduces coupling and supports independent evolution. For example, marketing campaign logic should not be embedded into the wallet service, and onboarding should not be mixed with customer profile presentation.

### 2.7 API-First Mindset

The platform is designed to support future integrations and external clients. Business capabilities should be exposed through clear APIs and service boundaries, whether consumed by the web application, mobile experiences, partner systems, or future automation services.

### 2.8 Event-Ready Architecture

The architecture is intentionally compatible with event-driven extensions. Although events may not be required in the first release, the system should be ready for asynchronous workflows such as notifications, campaign triggers, loyalty updates, AI actions, and downstream integrations.

---

## 3. High Level Architecture

FoodWave is organized into a set of domain modules that collaborate around shared infrastructure. The platform consists of user-facing application services, domain services, and shared platform capabilities.

### 3.1 Authentication

Authentication is responsible for establishing the identity of a user through Supabase Auth. It handles sign-up, sign-in, password resets, session management, and identity verification. Authentication is not the same as authorization. It establishes who the user is, while the access model determines what the user can do.

### 3.2 Profiles

Profiles are the user-facing identity records that represent human users within the platform. A profile stores identity metadata, preferences, and the link between authentication identity and business access. Profiles do not carry authorization authority by themselves; they act as the identity anchor for memberships and permissions.

### 3.3 Organizations

Organizations represent the top-level business entities that own restaurants, subscriptions, campaigns, and team governance. They are the correct level for billing, plan entitlements, and cross-restaurant business structure.

### 3.4 Restaurants

Restaurants are the operational units within an organization. They may represent an individual venue, a brand location, or a group-owned outlet. Restaurants own local operational entities such as customers, reservations, wallet cards, and restaurant-specific memberships.

### 3.5 CRM

The CRM module manages customer records, customer history, segmentation, preferences, and engagement actions. It is the operational heart of customer relationship management for restaurant businesses and should be designed to support future personalization and automation.

### 3.6 Marketing

Marketing manages promotions, campaigns, offer logic, audience targeting, and communication channels. It depends on CRM data and can trigger notifications, loyalty actions, and analytics events.

### 3.7 Wallet

Wallet manages customer-facing digital assets such as cards, loyalty credentials, membership tokens, and payment-adjacent capabilities. It can support both current wallet functionality and future integrations with Apple Wallet and Google Wallet.

### 3.8 Loyalty

Loyalty manages points, rewards, tiers, client benefits, and reward redemption. It depends on customer profiles, wallet entities, and marketing campaigns, and it becomes a central growth engine for customer retention.

### 3.9 Reservations

Reservations manage booking and table/slot operations. The module should support both direct reservations and future integrations with online booking channels. It depends on restaurant configuration and customer identity.

### 3.10 Analytics

Analytics aggregates data from customers, reservations, marketing, wallet, and loyalty operations. It provides dashboards, insights, and reporting for operators and executives. It should be designed as a read-focused, high-volume reporting domain.

### 3.11 Billing

Billing manages subscription lifecycle, plan entitlement, invoices, and usage-based or tiered commercial models. Billing is aligned with the organization level because subscriptions should be attached to the business account rather than a single restaurant.

### 3.12 Notifications

Notifications manage internal and external communication across email, push, in-app, and future channel integrations. They should be triggered by events and remain decoupled from the modules that generate the events.

### 3.13 AI

AI capabilities support future automation for customer service, CRM intelligence, campaign generation, analytics assistance, and content creation. AI should be integrated as a service layer rather than embedded directly inside each domain module.

### 3.14 Module Interaction Model

The modules interact through a shared domain backbone:

- Authentication identifies the user
- Profiles provide the user identity record
- Memberships grant access to organizations and restaurants
- Organizations own plans, restaurants, and top-level governance
- Restaurants own local operational entities such as customers, reservations, and wallet assets
- Marketing, loyalty, CRM, and analytics consume shared business data from the organization and restaurant domains
- Notifications and AI services act as cross-cutting capabilities that respond to domain events

---

## 4. Domain Model

The domain model defines the business entities that form FoodWave’s operational and governance structure.

### 4.1 Profiles

Purpose
- Represent a human user in the system.

Responsibilities
- Hold identity and contact information
- Link the authenticated user to business memberships
- Preserve preferences and account-level metadata

Relationships
- One profile belongs to one authenticated user identity
- One profile can have many organization memberships
- One profile can have many restaurant memberships

Ownership
- Owned by the authenticated user identity and the platform account model

Lifecycle
- Created during onboarding or first registration
- May be updated over time
- Removed only when the user account is deactivated or deleted

### 4.2 Organizations

Purpose
- Represent the business tenant or account that owns the restaurant business context.

Responsibilities
- Own subscriptions and plan entitlements
- Contain restaurants and teams
- Govern business-level operations and reporting

Relationships
- One organization has many restaurants
- One organization has many memberships
- One organization has one active subscription plan model
- One organization can have many campaigns

Ownership
- Owned by the organization administrator or initial owner

Lifecycle
- Created during onboarding
- Evolves through plan changes and growth
- Can be archived or closed at the end of the commercial relationship

### 4.3 Organization Memberships

Purpose
- Link a profile to an organization and define the user’s role in that business context.

Responsibilities
- Grant organization-level access
- Define governance roles such as owner, admin, or member
- Serve as the base for authorization decisions

Relationships
- Many profiles can belong to many organizations through memberships
- Memberships are the authoritative access layer for organization-level resources

Ownership
- Owned by the organization and the profile involved in the relationship

Lifecycle
- Created during onboarding or team invitation
- Updated when roles change
- Removed when access is revoked

### 4.4 Restaurants

Purpose
- Represent a specific venue or operating location within an organization.

Responsibilities
- Own restaurant-local entities such as customers, reservations, wallet cards, and staff access
- Support local operations and analytics
- Serve as the access boundary for restaurant-specific workflows

Relationships
- Many restaurants belong to one organization
- Each restaurant has many restaurant memberships
- Each restaurant has many customers and reservations
- Each restaurant may have wallet-related assets and analytics data

Ownership
- Owned by the parent organization

Lifecycle
- Created during onboarding for the first restaurant
- Expanded over time as new locations are added
- Can be deactivated or closed

### 4.5 Restaurant Memberships

Purpose
- Link a profile to a restaurant and define role-based access at the venue level.

Responsibilities
- Grant access to a specific restaurant’s data and operations
- Define restaurant-level roles such as owner, manager, or staff
- Support future team collaboration and delegation

Relationships
- One profile can belong to many restaurants
- One restaurant can have many associated profiles
- Restaurant memberships are scoped to a single restaurant

Ownership
- Owned by the restaurant and the profile that participates in the relationship

Lifecycle
- Created when a user joins the restaurant team
- Updated when roles change
- Removed when the user leaves the restaurant

### 4.6 Customers

Purpose
- Represent the relationship between a restaurant and a customer.

Responsibilities
- Persist customer identity and interaction history
- Support CRM use cases and segmentation
- Act as the anchor for loyalty, wallet, and marketing use cases

Relationships
- One customer belongs to one restaurant context at the local level
- A customer may participate in multiple campaigns and loyalty events
- A customer may have wallet and reservation history

Ownership
- Owned by the restaurant or organization depending on the scope of the business model

Lifecycle
- Created when a customer first interacts with the system
- Updated as the profile evolves
- Archived or removed according to data retention rules

### 4.7 Wallet Cards

Purpose
- Represent wallet-related assets or customer engagement cards in the system.

Responsibilities
- Store card metadata and status
- Support loyalty and membership-related journeys
- Enable future wallet integrations

Relationships
- Attached to a customer and a restaurant context
- May be connected to loyalty or campaign state

Ownership
- Owned by the restaurant or business context for which the card exists

Lifecycle
- Issued, updated, activated, expired, or revoked

### 4.8 Campaigns

Purpose
- Represent marketing and engagement initiatives.

Responsibilities
- Define offers, schedules, audience targeting, and outcomes
- Connect CRM data with marketing execution
- Support lifecycle tracking and reporting

Relationships
- Belong to an organization and may target multiple restaurants
- Can involve customers, rewards, and notifications

Ownership
- Owned by the organization and the marketing domain

Lifecycle
- Planned, active, paused, completed, or archived

### 4.9 Reservations

Purpose
- Represent bookings or reservation requests for restaurants.

Responsibilities
- Track guest booking activity
- Connect reservations to customers and restaurant operations
- Support future scheduling and capacity workflows

Relationships
- Belong to a restaurant
- Reference a customer
- Can trigger notifications and analytics events

Ownership
- Owned by the restaurant operational context

Lifecycle
- Created, confirmed, modified, canceled, or completed

### 4.10 Plans

Purpose
- Define commercial tiers and product entitlements.

Responsibilities
- Represent Starter, Growth, Pro, and Enterprise offerings
- Define feature access and scaling boundaries

Relationships
- One plan can be assigned to one organization subscription at a time
- Plans are consumed by billing and entitlement logic

Ownership
- Owned by the commercial product model of the platform

Lifecycle
- Static in definition, dynamic in assignment to subscriptions

### 4.11 Subscriptions

Purpose
- Represent the commercial relationship between an organization and FoodWave.

Responsibilities
- Track plan assignment, billing state, and service access
- Enforce entitlement and feature gating

Relationships
- Belong to an organization
- Reference a plan
- Affect access across the organization’s restaurants and team

Ownership
- Owned by the organization and the billing domain

Lifecycle
- Trial, active, suspended, canceled, or expired

### 4.12 Notifications

Purpose
- Support communications across the platform.

Responsibilities
- Deliver messages to users, customers, and partners
- Support internal and external channels
- Decouple message production from delivery mechanics

Relationships
- Triggered by events from CRM, marketing, reservations, loyalty, and billing
- Can be associated with customers, organizations, or restaurants

Ownership
- Owned by the platform notification subsystem

Lifecycle
- Created, queued, delivered, failed, or acknowledged

### 4.13 AI Conversations (Future)

Purpose
- Represent conversations between users and AI assistants for business support.

Responsibilities
- Provide contextual assistance for CRM tasks, campaign ideas, analytics interpretation, and customer support
- Enable future AI-driven operations

Relationships
- Can be associated with an organization, restaurant, or user context
- May reference CRM and marketing data

Ownership
- Owned by the AI service domain

Lifecycle
- Created, active, archived, or retired

---

## 5. Entity Relationships

The entity model is organized around a hierarchical business structure with clear ownership boundaries.

### 5.1 Organization Relationships

Organization
- Has many Restaurants
- Has many Organization Memberships
- Has one Subscription
- Has many Campaigns
- Has many Notifications and Analytics records in scope

Cardinality
- One organization to many restaurants
- One organization to many memberships
- One organization to one active subscription model at a time
- One organization to many campaigns

### 5.2 Restaurant Relationships

Restaurant
- Belongs to one Organization
- Has many Restaurant Memberships
- Has many Customers
- Has many Reservations
- Has many Wallet Cards
- Produces analytics and notification events

Cardinality
- One restaurant to one organization
- One restaurant to many restaurant memberships
- One restaurant to many customers
- One restaurant to many reservations
- One restaurant to many wallet-related assets

### 5.3 Membership Relationships

Organization Membership
- Connects one Profile to one Organization

Restaurant Membership
- Connects one Profile to one Restaurant

Cardinality
- Many profiles can belong to many organizations through memberships
- Many profiles can belong to many restaurants through memberships

### 5.4 Customer and Engagement Relationships

Customer
- Belongs to a restaurant context
- May participate in multiple campaigns and loyalty flows
- May be linked to multiple wallet assets and reservation events

Cardinality
- One customer to many loyalty or engagement events
- One customer to many wallet-related records
- One customer to many reservations

### 5.5 Commercial Relationships

Plan
- Defines the commercial package available to an organization

Subscription
- Belongs to one organization and references one plan

Cardinality
- One plan to many subscriptions over time
- One subscription to one organization

### 5.6 Cross-Cutting Relationships

Notifications and AI services are cross-cutting and may reference multiple domains. They are not independent business entities in the same sense as organizations and restaurants, but they are essential infrastructure capabilities that span the platform.

---

## 6. Authorization Model

Authorization must be explicit, role-based, and derived from membership relationships. It must never be inferred from profile properties.

### 6.1 Authentication

Authentication is the process of proving identity. It answers the question: “Who is this user?”

The system uses a managed authentication provider to establish reliable user identity and session state. Authentication does not itself grant access to business resources.

### 6.2 Authorization

Authorization is the process of determining what an authenticated user is allowed to do. It answers the question: “What can this identity access?”

Authorization is derived from:
- organization memberships
- restaurant memberships
- business context
- plan entitlements

### 6.3 Permissions

Permissions are not stored directly on the profile. They are computed from memberships and the business context in which the user operates. This prevents permission drift and keeps authorization aligned with role assignments.

Permissions are granted according to the relevant scope:
- Organization scope: governance, billing visibility, campaign control
- Restaurant scope: venue operations, customer access, reservation management

### 6.4 Organization Roles

Organization roles define access at the top-level business boundary.

Recommended roles:
- Owner
- Admin
- Member

Responsibilities:
- Owner: full business governance and account ownership
- Admin: operational leadership and delegated administration
- Member: limited access based on business need

### 6.5 Restaurant Roles

Restaurant roles define access at the venue or location level.

Recommended roles:
- Owner
- Admin
- Manager
- Staff

Responsibilities:
- Owner: full control over a specific restaurant
- Admin: broad operational authority
- Manager: day-to-day operations and team oversight
- Staff: limited operational access

### 6.6 Future Partner Roles

Future partner roles may be introduced for external collaborators such as franchise leads, marketplace partners, payment providers, or service integrators. These roles should be represented as explicit memberships or partner access grants rather than overloaded profile roles.

### 6.7 Authorization Design Rule

The platform must enforce one central rule:

- Profile.role must not be used as the source of authorization.

Authorization is always derived from memberships and their associated scope.

---

## 7. Onboarding Architecture

Onboarding is one of the most critical workflows in the platform. It must be treated as a single secure workflow rather than a sequence of disconnected writes.

### 7.1 User Signup

The onboarding journey begins with user signup through the authentication layer. The user creates an account and receives a verified identity in the platform.

### 7.2 Profile Creation

Once the authenticated identity exists, the platform creates or links a profile record. The profile provides the identity context that will be used for later access and business relationships.

### 7.3 Organization Creation

The next step is the creation of the organization, which becomes the tenant container for the business. This is the correct boundary for billing, plan entitlements, and future multi-restaurant growth.

### 7.4 Restaurant Creation

The first restaurant is created within the newly created organization. This establishes the first operating unit and enables the initial business workflow.

### 7.5 Owner Membership

A membership is created that links the new user to the organization and to the first restaurant as the initial owner. This membership is what gives the user the rights to manage the business and its first location.

### 7.6 Onboarding Completion

After the organization, restaurant, and membership records are created, onboarding is marked complete. The user is then granted dashboard access and may begin using the platform.

### 7.7 Dashboard Access

Dashboard access is not granted by a single flag alone. It is the result of successful onboarding and proper authorization through organization and restaurant memberships.

### 7.8 Why Onboarding Must Be One Secure Workflow

Onboarding must be treated as one secure workflow because it spans multiple interdependent records:
- user identity
- profile
- organization
- restaurant
- memberships
- onboarding state

If onboarding is implemented as a loose set of independent writes, it becomes fragile, permission-sensitive, and difficult to recover from when errors occur. A single secure workflow ensures consistency, prevents partial state, and allows the platform to guarantee that the new user lands in a valid, authorized state.

---

## 8. Row Level Security Strategy

The platform must use Row Level Security as a guardrail for data access, not as a convenience layer for application logic. RLS should enforce access boundaries at the database level while the application remains responsible for business workflow orchestration.

### 8.1 RLS Philosophy

The RLS philosophy is simple:
- protect data by context
- enforce access through memberships
- prevent unauthorized reads and writes
- preserve a clear boundary between application logic and data access control

### 8.2 Tables That Use Memberships

The following classes of tables should be protected through membership-based access rules:
- organizations
- organization memberships
- restaurants
- restaurant memberships
- customer records scoped to a restaurant or organization
- campaign records scoped to an organization or restaurant
- wallet records scoped to a restaurant or organization
- reservation records scoped to a restaurant
- analytics views or reporting data scoped to applicable business context

### 8.3 Operations Requiring Privileged Execution

Certain operations are not safe to perform directly from the client because they involve cross-table creation or privileged state changes. These include:
- initial onboarding workflow
- organization creation
- initial restaurant creation
- initial owner membership creation
- subscription activation or plan assignment
- any workflow that creates multiple dependent records atomically

These operations should be executed through a trusted server-side or privileged execution path.

### 8.4 Operations That Are Client-Safe

Client-safe operations are those that operate within an already-authorized context and do not require privileged orchestration. Examples include:
- viewing records the user already has access to
- updating a profile within the user’s own boundaries
- creating a reservation within a restaurant the user can manage
- editing a customer record within a permitted restaurant scope

### 8.5 Why This Matters

RLS should never become the reason onboarding fails. The architecture must ensure that the onboarding path is protected yet reliable, and that trusted execution is available for the workflows that create the foundational business state.

---

## 9. Subscription Model

FoodWave’s subscription model is designed to support the commercial lifecycle of the platform from early-stage operators to enterprise organizations.

### 9.1 Starter

Designed for small businesses or first-time adopters. Provides the essential capabilities needed to begin using the platform with a single restaurant context.

### 9.2 Growth

Designed for restaurants or restaurant groups that need broader operational coverage, stronger engagement, and more advanced automation. Provides access to a wider set of CRM, loyalty, marketing, and analytics capabilities.

### 9.3 Pro

Designed for professional operators that need a more powerful platform for multi-location operations, team collaboration, and advanced reporting. Supports more complex workflows and increased scale.

### 9.4 Enterprise

Designed for large restaurant groups, franchises, or multi-country organizations. Supports advanced governance, global operations, deeper integrations, and broad commercial flexibility.

### 9.5 Feature Gating

Feature gating should be implemented through subscription entitlements rather than hard-coded UI checks. The entitlement model should determine whether a tenant can access:
- advanced analytics
- campaign automation
- deeper loyalty features
- AI capabilities
- high-volume integrations
- advanced team governance

The subscription model should be aligned with the organization-level tenant model so that plan entitlements apply consistently across the business context.

---

## 10. Scalability Roadmap

The architecture is intentionally designed to support expansion beyond a single restaurant and a single market.

### 10.1 Multiple Restaurants

The organization-to-restaurants relationship allows a business to manage multiple venues under a single commercial account.

### 10.2 Franchises

Franchise operations require a more layered governance model. The system should support parent organizations, franchise operators, and venue-level management without forcing a redesign of the core model.

### 10.3 Restaurant Groups

Restaurant groups can be represented by organizations that contain multiple restaurants and sub-groups. This allows the platform to support chain-style operations while maintaining clean boundaries.

### 10.4 Multi-country

The architecture must support multiple countries through a combination of localized data rules, currency handling, language support, and regional compliance awareness. The model should not assume a single market.

### 10.5 Multi-language

The platform should support multi-language experiences both in the product UI and in customer communications. Language should be treated as a product capability, not an afterthought.

### 10.6 Multiple Currencies

Currency should be tied to the restaurant or business context and should be configurable. The platform should be able to support local pricing and reporting while preserving a unified architecture.

### 10.7 White-label

White-label support requires separation of brand presentation from core platform logic. The underlying SaaS layer should be reusable while presentation and customer-facing experience can be customized.

### 10.8 API Integrations

The platform should be designed to integrate with external systems such as POS providers, payment processors, delivery platforms, reservation tools, and marketing services. API-first design and modular services make this feasible.

---

## 11. Future Modules

FoodWave’s architecture should be extensible enough to support a long product roadmap.

### 11.1 GeoPush

GeoPush fits as a location-aware engagement capability that can deliver contextual messages to customers based on proximity and venue presence.

### 11.2 Apple Wallet

Apple Wallet support fits naturally in the wallet domain and extends customer convenience and card-based engagement.

### 11.3 Google Wallet

Google Wallet support follows the same pattern as Apple Wallet and should be treated as a wallet integration capability, not a separate product domain.

### 11.4 Gift Cards

Gift cards fit into the wallet and commerce layer and can later integrate with loyalty, campaign redemption, and customer retention workflows.

### 11.5 Marketplace

The marketplace is a future commerce and partner ecosystem layer that can connect restaurants, service providers, and third-party integrations.

### 11.6 Loyalty Engine

The loyalty engine is a core future module that manages points, rewards, tiers, and personalized benefits across customer journeys.

### 11.7 Marketing Automation

Marketing automation belongs to the marketing domain and can orchestrate campaigns based on CRM events, loyalty milestones, and customer lifecycle triggers.

### 11.8 AI Campaign Generator

The AI campaign generator belongs to the AI and marketing layer and can help create offers, copy, and audience segmentation based on business context.

### 11.9 AI CRM Assistant

The AI CRM assistant fits into the AI domain and can support customer insights, segmentation, follow-up recommendations, and conversation-driven business actions.

### 11.10 Predictive Analytics

Predictive analytics belongs in the analytics domain and can anticipate demand, churn risk, retention opportunities, and campaign effectiveness.

### 11.11 Online Ordering

Online ordering is a future commerce module that can connect the restaurant operation with digital sales channels.

### 11.12 POS Integration

POS integration is a critical backend connector module that allows the platform to exchange operational data with restaurant systems.

### 11.13 Inventory

Inventory is a future operations module that can connect stock management to product availability, ordering, and upsell flows.

### 11.14 Kitchen Display

Kitchen display is a future operations layer that supports kitchen workflow and fulfillment coordination.

---

## 12. Technology Stack

### 12.1 React

React is chosen for the product experience because it supports rich, interactive user experiences with a strong component model and a mature ecosystem. It is appropriate for building dashboards, onboarding flows, and business tools that require responsive UI behavior.

### 12.2 TypeScript

TypeScript provides type safety and improves maintainability for a system that will grow over time. It reduces risk in shared domain and service layers and supports long-term engineering excellence.

### 12.3 Vite

Vite is chosen for fast local development, quick iteration, and a modern frontend build pipeline. It is well suited to a product that values speed and developer productivity.

### 12.4 Tailwind

Tailwind supports rapid UI styling and design consistency. It is well suited to a product that needs a polished user experience without excessive custom CSS complexity.

### 12.5 Supabase

Supabase provides an integrated backend platform with authentication, Postgres, Realtime, storage, and edge capability. It aligns well with the current product’s need for rapid development while offering an architecture that can mature into a production platform.

### 12.6 PostgreSQL

PostgreSQL is the data foundation of the platform. It provides strong relational integrity, reliability, and extensibility for multi-tenant business data and complex authorization patterns.

### 12.7 Edge Functions

Edge Functions provide a suitable execution path for secure or lightweight workflows that need server-side logic without a large infrastructure footprint.

### 12.8 Storage

Storage is suitable for media assets that need to be associated with restaurant, profile, or campaign data.

### 12.9 GitHub

GitHub is the source control and collaboration backbone for engineering execution. It supports versioning, pull requests, review cycles, and release discipline.

### 12.10 Cursor

Cursor is the development environment used for accelerated implementation, code navigation, and iterative engineering work. It serves as a practical interface for maintaining quality and speed during product delivery.

---

## 13. Architectural Decisions

The following architectural decisions define version 1.0 of FoodWave.

### 13.1 Adopt an organization-first tenant model

Decision
- The organization is the primary tenant boundary.

Trade-off
- This adds a layer of abstraction compared to starting with a single restaurant model, but it supports future growth and commercial realism.

### 13.2 Separate authentication from authorization

Decision
- Authentication is handled by identity services, while authorization is derived from memberships.

Trade-off
- This adds some implementation discipline, but it creates a more robust and extensible access model.

### 13.3 Make onboarding a single secure workflow

Decision
- Onboarding is executed as one orchestrated workflow.

Trade-off
- This requires a more deliberate implementation approach, but it avoids partial state and onboarding failures.

### 13.4 Use memberships as the source of permissions

Decision
- Permissions come only from memberships and are never derived from profile.role.

Trade-off
- This requires more explicit role and scope handling, but it makes authorization consistent and future-proof.

### 13.5 Keep the platform modular

Decision
- Core capabilities are separated into business modules.

Trade-off
- This introduces additional boundaries and interface design work, but it improves long-term maintainability and product evolution.

### 13.6 Design for extensibility before full automation

Decision
- The architecture is event-ready and API-first but does not over-commit to advanced automation in v1.0.

Trade-off
- The initial implementation may be simpler than its eventual feature set, but it avoids premature technical debt.

---

## 14. MVP Scope

The MVP should focus on the minimal set of capabilities required to establish a reliable foundation for the SaaS.

### 14.1 What Belongs in MVP

The MVP should include:
- authentication and profile creation
- organization creation
- first restaurant onboarding
- owner membership creation
- basic restaurant-level CRM capabilities
- basic wallet and customer relationship support
- basic notifications
- subscription and plan awareness
- role-based access through memberships

### 14.2 What Belongs After MVP

Post-MVP capabilities should include:
- advanced loyalty engine features
- campaign automation
- deeper analytics
- AI assistants
- multi-restaurant and franchise governance enhancements
- external integrations and marketplace capabilities
- advanced wallet experiences

### 14.3 What Is Intentionally Postponed

The following are intentionally postponed for version 1.0:
- full-scale omnichannel commerce
- complex multi-country governance features
- advanced white-label management
- deep AI automation beyond support use cases
- extensive third-party marketplace integrations

---

## 15. Versioning

FoodWave Architecture v1.0

Version: 1.0

Date: 2026-07-27

Status: Draft for Architecture Phase

Author: Chief Software Architect

Change Log
- 2026-07-27: Initial architecture document created for Sprint 8 and long-term SaaS planning
