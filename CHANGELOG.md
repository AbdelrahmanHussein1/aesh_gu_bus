# Bus Aesh 1.3.0

## Changes

- Unified SMTP delivery for registration OTPs, password resets, ticket confirmations, and supervisor seat-swap notices.
- Transactional PostgreSQL email outbox with retry backoff, restart recovery, sanitized health, and administrator retry access.
- Failed OTP delivery invalidates the unsent code; failed password-reset delivery rolls back the password change.
- Mobile and web booking reliability and UI polish from 1.2.1 are retained, including truthful seat availability and server-issued tickets.
- Removed obsolete email integrations, duplicate Android CI, discovery captures, and generated compiler cache.
- Aligned package, Expo, and native Android release versions. Release archives contain tracked source, including mobile, and exclude local credentials and build downloads.

## Verification and limits

Shared/API builds, mobile/web type checks, Expo dependency checks, and the web production build are checked for this release. Email checks include local SMTP simulation and live development SMTP acceptance for OTP and one-way confirmation. Provider acceptance does not confirm mailbox receipt. Native iOS builds require macOS/Xcode.

Android workflow artifacts currently use the development signing key and are for QA distribution. Configure a private production signing key before store distribution. Paid mobile bookings remain disabled.

Local Android assembly could not start compilation because the Windows JDK failed to establish its loopback connection. Tagged Android CI runs independently on Linux; its result must be checked before distributing the QA artifact.
