# Milestone Name

Milestone 02 - Digital Wallet Integration

Version: v0.2.0
Date: 2026-07-27

## Objectives

- Implement Apple Wallet and Google Wallet pass orchestration.
- Generate unique wallet pass and QR identity per customer and platform.
- Synchronize wallet pass payload automatically after loyalty changes.
- Provide wallet pass download delivery endpoints.
- Integrate wallet actions into CRM with minimal UI changes.
- Keep business logic in services with strict TypeScript safety.

## Modules Completed

- Digital Wallet database schema extension.
- Wallet pass generation and lifecycle service.
- Loyalty-to-wallet synchronization integration.
- Wallet service compatibility facade updates.
- CRM wallet action integration and customer wallet status visibility.

## Architecture Status

- Business logic centralized in services:
  - src/wallet/services/walletPassService.ts
  - src/wallet/services/walletService.ts
  - src/loyalty/services/loyaltyService.ts
- UI layer in src/app/App.tsx only triggers actions and renders service data.
- Type contracts extended in src/shared/types/database.ts.
- No TODO/FIXME markers detected in source scan.
- Strict TypeScript compile gate passes.

## Database Status

- Migration added:
  - supabase/migrations/20260727180000_digital_wallet_passes.sql
- New tables:
  - wallet_passes
  - wallet_pass_sync_events
- Constraints and relations:
  - FK to organizations/customers
  - FK from sync events to wallet passes
  - uniqueness on pass_identifier, qr_token, download_token
- Performance:
  - indexes for organization/customer/status/event query paths
- Security:
  - RLS enabled on new tables
  - organization-scoped policies added

## Testing Status

- TypeScript command:
  - npx tsc --noEmit
- Result:
  - EXIT_CODE:0

## Release Notes

### New Features

- Wallet pass service with pass lifecycle support:
  - create
  - synchronize
  - revoke
  - download by id/token
- Unique QR token and download token per customer pass.
- Automatic synchronization of customer wallet passes when loyalty balances/levels change.
- Customer wallet status API for CRM profile display.
- CRM profile actions for Add to Apple Wallet and Add to Google Wallet.

### Improvements

- Wallet summary uses wallet pass + loyalty data sources instead of static values.
- Existing wallet service API aligned to new wallet pass architecture through a compatibility facade.

### Database Changes

- Added wallet_passes and wallet_pass_sync_events.
- Added constraints, indexes, RLS, and update trigger.

### New Services

- src/wallet/services/walletPassService.ts

### Modified Services

- src/wallet/services/walletService.ts
- src/loyalty/services/loyaltyService.ts

### UI Changes

- src/app/App.tsx:
  - Add to Apple Wallet action
  - Add to Google Wallet action
  - wallet connection status cards
  - pass list/status snippet in CRM profile

### Breaking Changes

- No intentional breaking changes to milestone-level API usage.

### Known Limitations

- Real signed Apple .pkpass generation and official Google Wallet Objects API issuance require external provider credentials/certificates/configuration.
- Supabase CLI is required in the environment to execute and verify migration state using CLI commands.

## Remaining Roadmap

- Implement provider-backed Apple PassKit signing pipeline.
- Implement Google Wallet Objects API issuer integration.
- Add background sync/retry queue for external provider delivery outcomes.
- Add observability dashboards for wallet sync event health.

## Ready For Next Milestone

- Yes, after applying pending migrations and wiring provider credentials/certificates for real-world wallet issuance.
