# FoodWave ERD v1.0

## 1. Purpose

This document defines the official entity relationship design for FoodWave v1.0 based exclusively on the approved architecture. It establishes the logical data model for the SaaS platform, including tenants, users, restaurants, customer engagement, subscriptions, notifications, and analytics.

This ERD is intended to be implementation-ready as a blueprint for database design, service contracts, and application architecture.

---

## 2. Design Principles for the ERD

The ERD follows the approved architecture principles:

- Organization-first multi-tenancy
- Membership-based authorization
- Clear ownership boundaries
- Separation of operational and analytical data
- Ability to scale from one restaurant to many restaurants and future franchise structures
- Support for subscriptions, campaigns, loyalty-related engagement, and future AI-driven workflows

---

## 3. Entity Overview

The core data model is organized around the following business entities:

- Organizations
- Profiles
- Organization Memberships
- Restaurants
- Restaurant Memberships
- Customers
- Reservations
- Wallet Cards
- Campaigns
- Subscriptions
- Plans
- Notifications
- Analytics

Each entity is defined below with purpose, primary key, foreign keys, relationships, important fields, ownership, and cardinality.

---

## 4. Entity Definitions

### 4.1 Organizations

Purpose
- Represents the top-level business tenant or account for a FoodWave customer.

Primary Key
- Organization ID

Foreign Keys
- None at the entity level
- May reference a subscription record and plan through derived business relationships

Relationships
- One organization has many restaurants
- One organization has many organization memberships
- One organization has one subscription
- One organization has many campaigns
- One organization may own many notifications and analytics records in scope

Important Fields
- Organization name
- Slug or URL identifier
- Industry or business type
- Status
- Time zone
- Currency
- Locale
- Created at
- Updated at

Ownership
- Owned by the organization administrator or initial owner

Cardinality
- One organization to many restaurants
- One organization to many memberships
- One organization to one subscription
- One organization to many campaigns

---

### 4.2 Profiles

Purpose
- Represents a human user in the system and links an authenticated identity to business access.

Primary Key
- Profile ID

Foreign Keys
- Auth identity reference from the authentication system

Relationships
- One profile may belong to many organization memberships
- One profile may belong to many restaurant memberships
- One profile may initiate or receive many notifications
- One profile may be associated with many analytics events or activity records

Important Fields
- Full name
- Email address
- Avatar URL
- Preferred language
- Preferred timezone
- Status
- Onboarding state
- Created at
- Updated at

Ownership
- Owned by the user identity and the platform account model

Cardinality
- One profile to many organization memberships
- One profile to many restaurant memberships

---

### 4.3 Organization Memberships

Purpose
- Connects a profile to an organization and defines the profile’s role within that tenant.

Primary Key
- Organization Membership ID

Foreign Keys
- Organization ID
- Profile ID

Relationships
- Many profiles can belong to many organizations through organization memberships
- Organization memberships define the authority for organization-level resources

Important Fields
- Role
- Status
- Invited by
- Invitation status
- Joined at
- Revoked at
- Created at
- Updated at

Ownership
- Owned by the organization and the participating profile

Cardinality
- Many profiles to many organizations through membership records
- One organization membership belongs to one organization and one profile

---

### 4.4 Restaurants

Purpose
- Represents a specific restaurant location or operating unit within an organization.

Primary Key
- Restaurant ID

Foreign Keys
- Organization ID

Relationships
- One organization has many restaurants
- One restaurant has many restaurant memberships
- One restaurant has many customers
- One restaurant has many reservations
- One restaurant may have many wallet cards
- One restaurant may produce many analytics records
- Restaurant creation is governed by the organization subscription limit

Important Fields
- Restaurant name
- Slug or public identifier
- Address
- Phone number
- Currency
- Time zone
- Status
- Opening hours
- Created at
- Updated at

Ownership
- Owned by the parent organization

Cardinality
- One restaurant belongs to one organization
- One restaurant has many memberships and customers

---

### 4.5 Restaurant Memberships

Purpose
- Connects a profile to a restaurant and defines the profile’s permissions at the restaurant level.

Primary Key
- Restaurant Membership ID

Foreign Keys
- Restaurant ID
- Profile ID

Relationships
- One restaurant has many restaurant memberships
- One profile may belong to many restaurants through memberships
- Restaurant memberships define authority for restaurant-scoped operations

Important Fields
- Role
- Status
- Assigned by
- Joined at
- Revoked at
- Created at
- Updated at

Ownership
- Owned by the restaurant context and the profile involved

Cardinality
- One restaurant membership belongs to one restaurant and one profile
- One restaurant has many restaurant memberships
- One profile can have many restaurant memberships

---

### 4.6 Customers

Purpose
- Represents a customer associated with a restaurant or a restaurant business context.

Primary Key
- Customer ID

Foreign Keys
- Restaurant ID
- Optional organization ID for cross-restaurant business scope

Relationships
- One restaurant has many customers
- One customer may have many reservations
- One customer may have many wallet cards
- One customer may participate in many campaigns and engagement events

Important Fields
- Customer name
- Email address
- Phone number
- Preferred language
- Loyalty status
- Segment or grouping
- Consent flags
- Created at
- Updated at

Ownership
- Owned by the restaurant or organization business context that manages the relationship

Cardinality
- One restaurant to many customers
- One customer to many reservations and wallet records

---

### 4.7 Reservations

Purpose
- Represents booking or reservation activity for a restaurant.

Primary Key
- Reservation ID

Foreign Keys
- Restaurant ID
- Customer ID
- Optional profile ID for staff or guest reference

Relationships
- One restaurant has many reservations
- One customer can have many reservations
- Reservations may trigger notifications and analytics events

Important Fields
- Reservation date and time
- Party size
- Status
- Notes
- Source channel
- Confirmation status
- Created at
- Updated at

Ownership
- Owned by the restaurant operational context

Cardinality
- One restaurant to many reservations
- One customer to many reservations

---

### 4.8 Wallet Cards

Purpose
- Represents wallet-related assets or customer engagement cards associated with a restaurant or customer context.

Primary Key
- Wallet Card ID

Foreign Keys
- Restaurant ID
- Customer ID
- Optional campaign ID for issued card campaigns

Relationships
- One restaurant has many wallet cards
- One customer may have many wallet cards
- Wallet cards may be linked to campaigns or loyalty events

Important Fields
- Card type
- Card status
- Issued date
- Expiration date
- Metadata
- Activation state
- Created at
- Updated at

Ownership
- Owned by the restaurant or organization business context that issued or manages the card

Cardinality
- One restaurant to many wallet cards
- One customer to many wallet cards

---

### 4.9 Campaigns

Purpose
- Represents marketing or engagement campaigns created by an organization for one or more restaurants.

Primary Key
- Campaign ID

Foreign Keys
- Organization ID
- Optional restaurant ID for restaurant-specific campaigns

Relationships
- One organization has many campaigns
- One campaign may target many restaurants
- One campaign may involve many customers and wallet-related assets
- One campaign may trigger many notifications and analytics records

Important Fields
- Campaign name
- Campaign type
- Audience segment
- Start date
- End date
- Status
- Offer or promotion content
- Created at
- Updated at

Ownership
- Owned by the organization and the marketing domain

Cardinality
- One organization to many campaigns
- One campaign can be scoped to one or many restaurants

---

### 4.10 Subscriptions

Purpose
- Represents the commercial subscription relationship between an organization and FoodWave.

Primary Key
- Subscription ID

Foreign Keys
- Organization ID
- Plan ID

Relationships
- One organization has one subscription
- One subscription belongs to one plan
- Subscriptions gate feature entitlements and restaurant capacity for the organization

Important Fields
- Plan ID
- Restaurant limit
- Active restaurant count
- Billing cycle
- Status
- Start date
- End date
- Billing state
- Renewal state
- Entitlement snapshot
- Created at
- Updated at

Ownership
- Owned by the organization and billing domain

Cardinality
- One organization to one subscription
- One subscription to one plan

---

### 4.11 Plans

Purpose
- Defines the commercial package or tier available to organizations.

Primary Key
- Plan ID

Foreign Keys
- None

Relationships
- One plan can be assigned to many subscriptions over time
- Plans influence feature access and entitlement behavior across an organization

Important Fields
- Plan name
- Plan code
- Description
- Feature set
- Billing model
- Limits and thresholds
- Status
- Created at
- Updated at

Ownership
- Owned by the platform commercial model

Cardinality
- One plan to many subscriptions over time

---

### 4.12 Notifications

Purpose
- Stores notifications generated from business or platform events.

Primary Key
- Notification ID

Foreign Keys
- Organization ID
- Restaurant ID
- Profile ID
- Customer ID
- Optional campaign ID

Relationships
- Notifications may be related to an organization, restaurant, profile, customer, or campaign
- Notifications can be generated by many domain events across the platform

Important Fields
- Type
- Channel
- Subject
- Message body
- Priority
- Delivery status
- Sent at
- Read at
- Created at
- Updated at

Ownership
- Owned by the platform notification subsystem

Cardinality
- One notification belongs to one primary context, but may reference multiple related entities

---

### 4.13 Analytics

Purpose
- Stores analytics events, reporting records, or derived analytics facts for operational insight.

Primary Key
- Analytics ID

Foreign Keys
- Organization ID
- Restaurant ID
- Customer ID
- Profile ID
- Campaign ID
- Reservation ID
- Wallet Card ID
- Optional subscription ID

Relationships
- Analytics data is derived from activity across organizations, restaurants, customers, reservations, campaigns, and wallet records
- Analytics records support dashboards and reporting

Important Fields
- Event type
- Event timestamp
- Metric name
- Metric value
- Source entity type
- Source entity ID
- Context metadata
- Aggregation level
- Created at

Ownership
- Owned by the analytics domain and reporting layer

Cardinality
- Many analytics records can be associated with one organization, restaurant, customer, campaign, or reservation

---

## 5. Relationship Summary

The following relationship structure defines the core ERD backbone.

### 5.1 Organization Hierarchy

Organization
- Has many Restaurants
- Has many Organization Memberships
- Has many Campaigns
- Has one Subscription
- Has many Notifications and Analytics records in scope

### 5.2 Restaurant Operations

Restaurant
- Belongs to one Organization
- Has many Restaurant Memberships
- Has many Customers
- Has many Reservations
- Has many Wallet Cards
- Produces many Notifications and Analytics records

### 5.3 Membership and Access Model

Profile
- Has many Organization Memberships
- Has many Restaurant Memberships

Organization Membership
- Belongs to one Profile
- Belongs to one Organization

Restaurant Membership
- Belongs to one Profile
- Belongs to one Restaurant

### 5.4 Customer and Engagement Model

Customer
- Belongs to one Restaurant context
- Has many Reservations
- Has many Wallet Cards
- May be linked to many Campaigns and Analytics events

### 5.5 Commercial Model

Plan
- Has many Subscriptions over time

Subscription
- Belongs to one Organization
- References one Plan

### 5.6 Cross-Cutting Records

Notifications and Analytics
- Reference multiple business entities but remain scoped to the organization or restaurant context where appropriate

---

## 6. Recommended Ownership Model

The ownership model should be explicit and consistent:

- Organizations own the tenant-level business context
- Restaurants are owned by their parent organization
- Memberships are owned by the tenant or restaurant context and the related profile
- Customers are owned by the restaurant or organization business context that manages them
- Reservations are owned by the restaurant operational context
- Wallet cards are owned by the restaurant or customer engagement context
- Campaigns are owned by the organization marketing domain
- Subscriptions are owned by the billing domain and the organization
- Notifications are owned by the notification system and associated business context
- Analytics are owned by the analytics layer and are derived from business activity

---

## 7. Implementation Notes for Architecture Teams

The ERD is designed to support the following implementation needs:

- Tenant isolation for organizations
- Role-based access through memberships rather than profile properties
- Flexible future expansion to multiple restaurants, franchise structures, and white-label operations
- Event-ready reporting and notification behavior
- Separation between transactional entities and analytical records

This model is intentionally structured so that the business domain remains clear even as the platform evolves into additional modules such as loyalty, AI, integrations, and marketplace services.

---

## 8. Final ERD Summary

The FoodWave v1.0 entity model is centered on a tenant-first structure:

- Organizations are the primary business boundary
- Profiles represent users
- Memberships provide authorization and access
- Restaurants are operational units within an organization
- Customers, reservations, wallet cards, campaigns, subscriptions, notifications, and analytics extend the business domain around those core boundaries

This design provides the foundation for a secure, scalable, and maintainable SaaS platform.

---

# FoodWave ERD v1.0

Version: 1.0

Date: 2026-07-27

Status: Approved for implementation planning

Author: Senior Data Architect

Change Log
- 2026-07-27: Initial ERD document created from the approved FoodWave Architecture v1.0
