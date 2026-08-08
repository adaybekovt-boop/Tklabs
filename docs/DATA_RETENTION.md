# TK LAB data retention schedule

This document describes application-controlled retention. It does not override an external provider's own policy or legal obligations.

| Data | Default location | Retention / deletion |
| --- | --- | --- |
| Local conversations, artifacts, flow runs, drafts, settings | Browser storage | Until the user clears local workspace/site data or replaces it during restore |
| Workspace Sync snapshot | Cloudflare D1, encrypted at rest | Until explicit Sync deletion, replacement, or account-data deletion |
| D1 account profile | Cloudflare D1 | While the TK LAB account record is active; removed by explicit account-data deletion |
| Legal acceptance evidence | Cloudflare D1 | Kept as auditable acceptance evidence while the account is active; application copy is removed on account-data deletion unless a legal hold is required by the operator |
| Rate-limit / reservation state | Durable Objects | Bounded by the configured usage/reservation window; expired reservations are cleaned and refunded where applicable |
| CSP/security reports | Operational security path | Bounded diagnostic retention; reports must not intentionally contain prompt or attachment content |
| External model/TTS provider processing | External provider | Governed by the provider's current contractual configuration and policy; TK LAB must not promise a shorter period without verified provider configuration |

Account-data deletion revokes application access where possible and deletes D1 identity, legal ledger, and Workspace Sync. It does not delete the user's Google identity account and cannot by itself erase provider-controlled records already governed by a third party.
