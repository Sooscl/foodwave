# FoodWave Onboarding Implementation Plan v1.0

## 1. Objective

This document defines the implementation blueprint for the FoodWave onboarding system based on the approved architecture and ERD. The onboarding flow will be implemented using the approved execution path:

React → Supabase Edge Function → PostgreSQL transaction → RLS

The goal is to create a secure, reliable, and repeatable onboarding experience that supports:

- first user registration
- first organization creation
- first restaurant creation
- automatic owner membership creation
- onboarding completion
- immediate dashboard access

This plan is architecture-focused and implementation-ready, but it does not include SQL or application code.

---

## 2. Architectural Approach

The onboarding system will be implemented as a single orchestrated server-side workflow.

The intended execution model is:

1. React collects onboarding input and calls a Supabase Edge Function.
2. The Edge Function validates the request and invokes the database transaction.
3. PostgreSQL performs the write operations atomically.
4. RLS enforces access after the data exists.
5. React receives a structured success or failure response and continues the user journey.

This approach ensures that onboarding is treated as one business workflow instead of a fragmented set of client-side inserts.

---

## 3. Edge Function Responsibilities

The Edge Function is the control point for onboarding and is responsible for orchestrating the workflow safely.

### 3.1 Request handling

The Edge Function will:
- receive the onboarding payload from React
- authenticate the caller through the Supabase session context
- validate that the request originates from an authenticated user
- normalize and sanitize the input
- call the transactional process in the database

### 3.2 Validation orchestration

The Edge Function will:
- verify required fields are present
- validate business rules before the transaction begins
- reject invalid requests with clear error responses
- ensure the workflow is not executed with incomplete or conflicting state

### 3.3 Transaction coordination

The Edge Function will:
- invoke the database transaction as one logical operation
- ensure that all required writes happen as part of a single atomic unit
- return a structured response after the transaction completes

### 3.4 Error normalization

The Edge Function will:
- translate database-level failures into user-safe error messages
- preserve enough detail for debugging without exposing unsafe internals
- return a deterministic failure structure for React to render

### 3.5 Security boundary

The Edge Function will act as the privileged path for onboarding. It will be the execution boundary that can perform protected creation work that the client must not perform directly.

---

## 4. Database Transaction Steps

The transaction must be treated as a single atomic business operation.

### 4.1 Step 1: Resolve authenticated user context

The transaction must resolve the authenticated user from the current session context.

This step establishes:
- the profile identity for the current user
- the ownership context for the new organization and restaurant

### 4.2 Step 2: Create or confirm the profile

The transaction will ensure that a profile exists for the authenticated user.

The profile record should contain:
- identity metadata
- onboarding status
- user contact details
- basic account state

### 4.3 Step 3: Create the organization

The transaction will create the organization record as the tenant boundary for the new business.

The organization should include:
- business name
- tenant slug or identifier
- locale and currency defaults
- plan initialization context
- status

### 4.4 Step 4: Create the first restaurant

The transaction will create the first restaurant under the newly created organization.

The restaurant should include:
- name
- slug or public identifier
- address or contact metadata where applicable
- currency and timezone defaults
- status

### 4.5 Step 5: Create organization membership for the owner

The transaction will create an organization membership linking the profile to the new organization with the initial owner role.

This membership is the authorization anchor for organization-level access.

### 4.6 Step 6: Create restaurant membership for the owner

The transaction will create a restaurant membership linking the profile to the first restaurant with the initial owner role.

This membership is the authorization anchor for restaurant-level access.

### 4.7 Step 7: Initialize subscription context

The transaction will create or initialize the subscription context for the organization.

This does not require full billing execution in the MVP, but the data model must be prepared for a plan assignment and entitlement state.

### 4.8 Step 8: Mark onboarding as complete

The transaction will update the onboarding state so the profile and organizational context reflect that onboarding has completed successfully.

### 4.9 Step 9: Commit as one unit

If all steps succeed, the transaction commits and the new account becomes active for subsequent access.

---

## 5. Validation Rules

Validation should occur before the database transaction begins and, where necessary, inside the transaction as a safety net.

### 5.1 Authentication validation

The request must:
- come from an authenticated user
- contain a valid user context
- be associated with a real session

### 5.2 Required onboarding fields

The following data must be present:
- organization name
- restaurant name
- owner profile information
- contact or email context
- onboarding intent

### 5.3 Uniqueness validation

The system must validate:
- unique organization slug or identifier
- unique restaurant slug or identifier
- unique profile or identity context where required

### 5.4 Role validation

The onboarding workflow must ensure that:
- the initial owner role is assigned correctly
- the owner receives both organization and restaurant access

### 5.5 Plan and subscription validation

The flow must ensure:
- the plan context is valid for the onboarding journey
- subscription state can be initialized safely

### 5.6 Business rule validation

The onboarding workflow must reject requests where:
- the user is already fully onboarded in an invalid state
- conflicting tenant data exists
- the request would create duplicate ownership relationships

---

## 6. Error Handling

Error handling must be systematic and user-friendly.

### 6.1 Pre-transaction errors

These are validation failures that happen before database writes begin. Examples:
- missing required fields
- invalid email context
- duplicate slug
- unauthenticated request

These should return a clear, structured response with a non-technical error code.

### 6.2 Transaction execution errors

These happen during the database transaction. Examples:
- insert failure
- foreign key violation
- uniqueness conflict
- partial write issue

The transaction must fail safely and return a consistent error response.

### 6.3 Post-transaction errors

These happen after the logical workflow has completed but before the response is finalized. Examples:
- response serialization issue
- downstream notification problem
- analytics publication issue

These should not cause the onboarding to be considered incomplete if the core business state was created successfully, unless the product requirements state that such steps are mandatory.

### 6.4 Error response contract

The Edge Function should return a structured response containing:
- success flag
- error code
- user-friendly message
- optional details for diagnostics

---

## 7. Rollback Behavior

Rollback behavior is essential because onboarding creates several dependent records.

### 7.1 Transaction rollback semantics

If any critical step fails, the database transaction must roll back all pending writes.

This ensures that the system does not end in a partial state such as:
- organization created but no membership
- restaurant created but no owner access
- profile updated without tenant context

### 7.2 What should be rolled back

The transaction should roll back:
- organization creation
- restaurant creation
- organization membership creation
- restaurant membership creation
- onboarding completion flags
- any subscription initialization that depends on the full workflow

### 7.3 What should not be rolled back outside the transaction

Non-critical side effects such as:
- analytics emission
- notification dispatch
- external integrations

should be treated as follow-up actions and should not compromise the integrity of the onboarding transaction.

---

## 8. RLS Interaction

RLS is a security layer, not the orchestration mechanism.

### 8.1 RLS role in onboarding

RLS must allow the onboarding workflow to create the initial business records without blocking the flow.

The Edge Function is the trusted boundary that performs these writes under the appropriate execution context.

### 8.2 Why RLS is not the main implementation path

The client should not be responsible for directly performing the initial write sequence because that would create a risk of:
- permission failures during onboarding
- partial initialization
- inconsistent ownership state

### 8.3 Post-onboarding access model

Once the records exist, RLS will enforce access based on:
- organization membership
- restaurant membership
- role-based authorization rules

### 8.4 RLS expectations after onboarding

After onboarding completes:
- the owner should be able to read and manage the organization and restaurant records
- the owner should see the newly created resources in the dashboard
- non-members should not have access

---

## 9. React Responsibilities

React is responsible for the UX and orchestration of the onboarding experience, not for the database transaction itself.

### 9.1 Form collection

React will collect:
- organization details
- restaurant details
- owner profile information
- plan or subscription choice if applicable

### 9.2 Request construction

React will package the onboarding data into a single request payload and send it to the Edge Function.

### 9.3 Loading and error states

React will render:
- loading state during submission
- validation errors returned from the Edge Function
- success state after onboarding completes

### 9.4 Navigation after success

On success, React will redirect the user to the dashboard or next onboarding step.

### 9.5 Security responsibility

React must not attempt to bypass the protected write path. It should rely on the Edge Function for all onboarding writes.

---

## 10. API Request and Response Contract

The onboarding API should be defined as a structured contract between React and the Edge Function.

### 10.1 Request payload

The request should contain:
- organization name
- organization slug or identifier
- restaurant name
- restaurant slug or identifier
- owner profile details
- optional locale, timezone, and currency
- optional plan selection
- onboarding context metadata

### 10.2 Success response

A successful response should include:
- success flag
- organization identifier
- restaurant identifier
- profile identifier
- membership identifiers if needed
- onboarding completed status
- redirect target or next-step route
- optional metadata for UI state

### 10.3 Failure response

A failure response should include:
- success flag set to false
- error code
- user-facing message
- optional validation details
- optional retry guidance

### 10.4 Error contract design principles

The API contract should be:
- predictable
- stable
- human-readable for the frontend
- sufficiently detailed for debugging

---

## 11. Folder Structure

The implementation should be organized around clear backend and frontend responsibilities.

### 11.1 Proposed top-level structure

- docs
  - onboarding implementation plan
- src
  - auth
  - onboarding
  - organizations
  - restaurants
  - memberships
  - subscriptions
  - shared
- supabase
  - functions
    - onboarding
  - migrations

### 11.2 Suggested module structure

- src/onboarding
  - components
  - hooks
  - services
  - types
  - utils

- src/organizations
  - services
  - types

- src/restaurants
  - services
  - types

- src/memberships
  - services
  - types

- src/subscriptions
  - services
  - types

- supabase/functions/onboarding
  - index.ts
  - handlers
  - validators
  - types
  - errors

This structure keeps the onboarding workflow centralized while allowing shared domain modules to evolve independently.

---

## 12. Order of Implementation

The implementation should be executed in the following order to reduce risk and keep the system coherent.

### Phase 1: Foundation

1. Define onboarding request and response contracts
2. Define validation rules and failure states
3. Define the database transaction boundaries
4. Create the Edge Function entry point and request parsing

### Phase 2: Core transactional workflow

5. Implement profile creation or confirmation
6. Implement organization creation
7. Implement restaurant creation
8. Implement organization membership creation
9. Implement restaurant membership creation
10. Implement onboarding completion state update

### Phase 3: Safety and reliability

11. Add transaction rollback behavior
12. Add structured error handling
13. Add consistency checks and validation guardrails
14. Add logging and diagnostics

### Phase 4: Frontend integration

15. Connect React onboarding form to the Edge Function
16. Implement loading, error, and success UI states
17. Redirect to the dashboard after successful onboarding

### Phase 5: Hardening

18. Add follow-up actions such as notification or analytics events
19. Verify RLS access after onboarding
20. Validate end-to-end onboarding flow with realistic scenarios

---

## 13. Implementation Checklist

### Planning and contract design
- [ ] Confirm onboarding request contract
- [ ] Confirm onboarding response contract
- [ ] Define validation rules for required fields
- [ ] Define error codes and user-facing messages
- [ ] Confirm transaction boundaries

### Backend workflow
- [ ] Create onboarding Edge Function entry point
- [ ] Implement authenticated request handling
- [ ] Implement request validation
- [ ] Implement database transaction orchestration
- [ ] Implement profile creation or confirmation
- [ ] Implement organization creation
- [ ] Implement restaurant creation
- [ ] Implement organization membership creation
- [ ] Implement restaurant membership creation
- [ ] Implement onboarding completion state update
- [ ] Implement transaction rollback behavior
- [ ] Implement structured error handling
- [ ] Implement logging and diagnostics

### Security and access
- [ ] Review RLS behavior for onboarding tables
- [ ] Ensure onboarding writes are allowed through the trusted execution path
- [ ] Verify post-onboarding access for owner users

### Frontend integration
- [ ] Connect onboarding form to the Edge Function
- [ ] Implement loading states
- [ ] Implement error rendering
- [ ] Implement success redirect to dashboard

### Validation and hardening
- [ ] Validate first-user onboarding path
- [ ] Validate first-restaurant creation path
- [ ] Validate owner membership creation path
- [ ] Validate rollback behavior on failure
- [ ] Validate RLS access after onboarding

---

# FoodWave Onboarding Implementation Plan v1.0

Version: 1.0

Date: 2026-07-27

Status: Ready for implementation

Author: Senior Backend Engineer

Change Log
- 2026-07-27: Initial onboarding implementation blueprint created from the approved architecture and ERD
