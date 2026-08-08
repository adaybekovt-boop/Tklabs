# Trust Architecture recovery drills

Run these drills against non-production/test identities unless a real incident requires otherwise.

## Workspace Sync crypto rotation

- Create a v1-compatible fixture using the legacy root.
- Read it through the current runtime and confirm successful v2 re-seal without changing snapshot revision or plaintext.
- Confirm the v2 row fails closed if AAD revision/account/key-version is altered.
- Confirm a missing legacy root prevents v1 decryption rather than silently corrupting data.

## D1 recovery

- Export a test account, legal acceptance ledger, and encrypted sync row.
- Restore to an isolated D1 database and run ordered migrations.
- Confirm terms status, privacy export, sync restore, sync deletion, and account-data deletion.
- Never restore production user data into developer/local databases.

## Provider outage

- Simulate primary provider failure.
- Verify the UI identifies fallback mode and does not label it NVIDIA/Erma provider output falsely.
- Verify reservations are released and request IDs remain available for diagnosis.

## Legal re-consent

- Change the legal bundle version in a test branch.
- Confirm a previously accepted account is gated until the current bundle is accepted.
- Confirm a new append-only acceptance record includes version, digest, language, and time.
