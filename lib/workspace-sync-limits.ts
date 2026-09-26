// D1 limits each row to 2,000,000 bytes. AES-GCM adds a 16-byte tag and
// base64 expands ciphertext by 4/3, so leave room for the remaining columns.
// Keep this plaintext byte limit shared by browser and server; counting
// characters underestimates UTF-8 storage for Russian text and emoji.
export const MAX_WORKSPACE_SYNC_PAYLOAD_BYTES = 1_490_000;

export function workspaceSyncPayloadBytes(payload: string) {
  return new TextEncoder().encode(payload).byteLength;
}
