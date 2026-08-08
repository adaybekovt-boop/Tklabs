# Optional Workspace Sync

Workspace sync is deliberately opt-in. TK LAB remains local-first and Workspace Vault remains the independent manual backup/restore mechanism.

## Server contract

`WORKSPACE_SYNC_SECRET` must contain at least 32 characters. When it is absent or invalid, `/api/account/workspace-sync` returns 503 and performs no write. Snapshot payloads are encrypted with AES-GCM using a key derived from the server secret and normalized account email. D1 stores ciphertext, IV, SHA-256 checksum, revision, and update time.

GET decrypts the snapshot only for the authenticated account. PUT requires a trusted origin, a bounded JSON body, and an expected revision. A revision mismatch returns 409 so one device cannot silently overwrite a newer snapshot from another device.

## Client contract

Only an allowlist of local workspace keys is synchronized: conversation archive/settings, artifact store, response mode, workspace tab, theme, and per-session draft keys. The user must explicitly upload the current device. Downloading a remote snapshot does not apply it automatically; restore requires a second confirmation action.
