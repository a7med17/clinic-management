# Final QA, Security, and Submission Report

## Completed modules

- Authentication, registration, profile retrieval, password change, logout
- Admin dashboard and user/staff management
- Doctor dashboard, appointments, patients, laboratory workflow
- Patient dashboard, booking, records, laboratory results
- Reception patient, appointment, waiting-room, billing and payment workflows
- Pharmacy medicine and inventory workflows
- Laboratory test/result workflows

## Database summary

The schema defines users, patients, doctors, doctor schedules, appointments, invoices, invoice items, payments, medicines, lab tests, and audit logs. It includes foreign keys, constrained role/status values, indexes, and a partial unique `(doctor_id, appointment_date)` index for active appointments.

## Security measures verified

- Passwords are written with bcrypt and auth/user responses select safe fields only.
- Legacy plaintext password comparison was removed.
- JWTs require a configured secret of at least 32 characters.
- Protected routes require a valid bearer token; role middleware returns 403 for unauthorized roles.
- Every protected request refreshes the user’s current role and `is_active` status, so deactivated users and role changes take effect immediately.
- Tokens are stored in Expo SecureStore, not AsyncStorage.
- `.env` patterns are ignored by Git; tracked-file review found no environment files.
- Appointment access is scoped to the signed-in patient or doctor where applicable.

## QA checklist

| Check | Result |
| --- | --- |
| Frontend TypeScript compilation | Passed |
| Backend JavaScript syntax validation | Passed |
| Public API health endpoint | Ready for smoke test |
| Missing-token protected endpoint response | Returns 401 |
| Invalid/expired JWT response | Returns 401 |
| Inactive user login | Rejected by login query |
| Deactivated user with old token | Rejected by auth middleware |
| Role mismatch | Rejected with 403 by role middleware |
| Appointment double-booking | Protected by database unique index; controller maps conflict to 409 |

## Bugs found and fixes applied

1. Plaintext password fallback could authenticate legacy unencrypted records. Removed; passwords must be bcrypt hashes.
2. A deactivated account could continue using a previously issued JWT. Auth middleware now checks current account status and role on every protected request.
3. Patient booking payloads could name another patient, and appointment detail/update endpoints were not ownership-scoped. Added ownership checks.
4. A default JWT secret made a misconfigured deployment unsafe. Authentication now fails closed until a proper secret is supplied.
5. The token was stored in AsyncStorage. It now uses Expo SecureStore and existing sessions are validated on app launch.
6. README contained outdated plaintext demo credentials and claimed an unconfigured database had a demo fallback. Documentation now reflects actual behavior.

## Remaining limitations / future enhancements

- A configured Supabase test environment is needed to execute full live CRUD and database-constraint tests for every role.
- Add automated API/mobile end-to-end coverage, rate limiting, password recovery, and complete pagination.
- The login screen’s password-recovery control remains a non-functional UI placeholder and should be hidden or wired before public release.
