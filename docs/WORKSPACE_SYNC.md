# Workspace Sync

Workspace Sync is an optional TK LAB feature. Local-first storage remains the default and there is no automatic background sync.

## Crypto v2

New snapshots use AES-GCM-256 with a 96-bit random IV. The encryption key and a separate HMAC-SHA-256 integrity key are derived with HKDF-SHA-256 from a server-only root secret and normalized account identity. AES-GCM additional authenticated data binds the account, snapshot revision, and key version.

`WORKSPACE_SYNC_KEY_VERSION = 2`. Production may set a separate `WORKSPACE_SYNC_SECRET_V2`; when it is absent the v2 derivation uses the existing `WORKSPACE_SYNC_SECRET` to support an in-place migration. Existing v1 rows remain readable with the legacy derivation and are re-sealed as v2 after a successful authenticated read.

The `checksum` database column is retained for migration compatibility. For v2 rows it stores a keyed integrity identifier over AAD + IV + ciphertext rather than a plaintext SHA-256 digest.

This is server-side encryption at rest, not end-to-end encryption. Plaintext reaches the authenticated TK LAB Worker before encryption and may be decrypted there for restore/export.

## Deployment

1. Apply `drizzle/0001_workspace_sync.sql`.
2. Apply `drizzle/0003_workspace_crypto_v2.sql` after the legal-ledger migration in normal ordered migration flow.
3. Configure `WORKSPACE_SYNC_SECRET` with a random server-only value of at least 32 characters.
4. Optionally configure a distinct `WORKSPACE_SYNC_SECRET_V2` before rotating away from the legacy root. Do not remove a legacy root while v1 rows still exist.
5. Deploy and verify a read/write/delete round trip with a non-production test account.
