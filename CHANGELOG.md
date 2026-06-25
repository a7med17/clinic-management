# Changelog

## 2026-06-25 — Sprint 1C dashboard real data hydration

- Objective: Hydrate the shared application shell with live dashboard data from existing APIs.
- Reason: Replace the most visible dashboard placeholders with safe real data without adding backend endpoints or building feature modules.
- Files modified: Application shell screen and changelog.
- Files added: Role-aware shell dashboard data hook.
- Database changes: None.
- Backend changes: None.
- Validation/security improvements: The shell never calls Admin APIs for non-admin roles and falls back to existing shell defaults when live dashboard requests fail.
- Testing performed: `npx tsc --noEmit`, `node --test` from backend with 0 discovered tests, direct backend JavaScript syntax check with `node --check`, and `git diff --check`.

## 2026-06-25 — Sprint 1B shell navigation safety

- Objective: Harden shared shell navigation targets without changing tab behavior.
- Reason: Prevent broken shell quick actions, activity links, and notification shortcuts from crashing the app as role shell config evolves.
- Files modified: Application shell screen, app navigator tab invariant checks, and changelog.
- Files added: Shared shell navigation validation helper.
- Database changes: None.
- Backend changes: None.
- Validation/security improvements: Dev-only validation now warns for invalid shell targets, tabs above the five-tab limit, non-final Profile tabs, and Notifications mistakenly added to bottom tabs.
- Testing performed: `npx tsc --noEmit`, `node --test` from backend with 0 discovered tests, direct backend JavaScript syntax check with `node --check`, and `git diff --check`; package-script checks are blocked on current `origin/main` because the expected `typecheck`, `test`, and `syntax` scripts are not defined there.

## 2026-06-25 — Sprint 1A.1 shared application shell

- Objective: Add the first shared authenticated shell skeleton for all clinic roles.
- Reason: Standardize the mobile home experience before building role-specific feature modules.
- Files modified: Role dashboard entry point and changelog.
- Files added: Shared application shell screen and role-based shell configuration.
- Database changes: None.
- Backend changes: None.
- Validation/security improvements: None; existing authenticated navigation and SecureStore session handling remain unchanged.
- Testing performed: `npx tsc --noEmit`, `node --test` from backend with 0 discovered tests, direct backend JavaScript syntax check with `node --check`, and `git diff --check`; package-script checks are blocked on current `origin/main` because the expected `typecheck`, `check`, `test`, and `syntax` scripts are not defined there.

## 2026-06-25 — Sprint 0 Step 4A secure auth session

- Objective: Centralize frontend session persistence and move safe auth identity fields into Expo SecureStore.
- Reason: Remove direct SecureStore calls from feature/auth services, stop using AsyncStorage for the user session snapshot, and reset the app on invalid sessions.
- Files modified: Frontend app bootstrap, navigation auth bootstrap, login screen handoff, auth service, API service, and new session/AuthContext utilities.
- Database changes: None.
- Backend changes: None.
- Validation/security improvements: Bearer tokens are attached from the central session service, `401 Unauthorized` clears the secure session, and logout removes current plus legacy auth keys.
- Testing performed: `npx tsc --noEmit`, direct backend JavaScript syntax check with `node --check`, and `git diff --check`; package-script checks are blocked on latest `main` because the expected `typecheck`, `check`, `test`, and `syntax` scripts are not defined there.

## 2026-06-23 — API contract, security, and booking hardening

- Objective: Align frontend API consumers with existing routes and harden active appointment, billing, laboratory, and authentication workflows.
- Reason: Remove contract drift, prevent privilege escalation and direct-record access, enforce one booking policy, and eliminate reception patient-list N+1 queries.
- Files modified: Backend server, schema, rate-limit middleware, appointment service, affected controllers/routes; frontend auth service, registration, billing, roster, and EHR screens.
- Database changes: Added bootstrap constraints for monetary/lab values and indexes for schedules, appointments, labs, invoices, and audit logs.
- Endpoints added: None.
- Controllers updated: Authentication, appointments, patient portal, reception, billing, lab, admin, and doctor portal.
- Services updated: Added shared appointment availability service; routed registration through the frontend auth service.
- Validation added: Shared date/schedule/duplicate-slot validation, lab update validation, safer search normalization, and stricter admin updates.
- Security improvements: Patient-only public registration, bcrypt-only password changes, auth rate limiting, production CORS allow-listing, safer 5xx responses, and resource-level billing/lab access checks.
- Testing performed: Backend syntax/health checks, rate-limit and CORS behavior checks, TypeScript validation, Android bundle export, and diff validation.

## 2026-06-23 — Architecture comments and conflict-resolution verification

- Objective: Document the application's active architecture and non-obvious business rules for future maintenance.
- Reason: Make security boundaries, role workflows, API contracts, fallbacks, and data ownership easy to inspect.
- Files modified: Backend server/configuration, middleware, routes, controllers, frontend app/navigation/services/UI, active role screens, and legacy screen entry points.
- Database changes: None.
- Endpoints added: None.
- Controllers/services updated: Documentation only; runtime behavior is unchanged.
- Validation/security improvements: None; existing authentication, role, validation, and booking safeguards are now documented.
- Testing performed: `npx tsc --noEmit`, Android Expo bundle export (932 modules), `node --check` on every backend JavaScript module, and `git diff --check`.
