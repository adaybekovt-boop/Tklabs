# Erma Alive II — capability architecture

This cycle adds product intelligence around the existing Erma model mesh instead of replacing the public Lite/Core/Pro catalog.

## Runtime model contract

| Product route | Current API model | Role in Alive II |
| --- | --- | --- |
| Erma Lite | `nvidia/nemotron-3-nano-30b-a3b` | Fast chat and low-complexity requests |
| Erma Core | `nvidia/nemotron-3-super-120b-a12b` | General reasoning and tool-oriented work |
| Erma Pro | `deepseek-ai/deepseek-v4-pro` | Heavy analysis/research route |
| Hidden Erma Vision | `moonshotai/kimi-k2.6` | Multimodal image requests only; not user-selectable |

Memory, Attention, and Voice Mode are deliberately implemented outside the base LLM so these capabilities survive provider/model changes.

## Personal Memory

- The browser is the source of truth (`localStorage`).
- Erma cannot silently create a personal memory entry. The user adds, edits, or deletes it in Workspace Vault.
- Chat requests attach at most 24 validated entries.
- The server ranks the bounded packet against the current prompt and injects only a small relevant subset.
- Memory values are rendered as **untrusted contextual data, not instructions**. Commands stored in a memory value do not gain system-level authority.
- The current user message always overrides stale memory.
- Personal Memory is not automatically copied into Workspace Sync in this cycle.

## Attention

The first Attention layer is local and deterministic. It looks for high-confidence conversation patterns such as:

- a recurring topic;
- an explicitly left-open loop;
- a decision that appears to have changed.

The detector does not make another provider request. A notice is shown only when its confidence threshold is met and can be dismissed. This prevents every chat turn from becoming an extra LLM call and reduces privacy/cost impact.

## Voice Mode

Voice Mode wraps the same text-model pipeline:

1. the normal Erma request is generated through Lite/Core/Pro routing;
2. a completed streamed assistant reply emits a local voice event;
3. the existing `/api/tts` route is used when ElevenLabs is configured;
4. browser speech synthesis remains the fallback.

This is not full-duplex realtime audio. A future full-duplex version will require a dedicated streaming speech-to-text/audio transport and interruption/barge-in coordination. It does **not** require replacing the reasoning LLMs.

## Vision

Vision remains a separate hidden provider capability. Text-only Lite/Core/Pro routes are unchanged. The runtime selects the hidden multimodal route only when validated image attachments are present. If multimodal execution is unavailable, the current pipeline fails closed instead of pretending an image was inspected.

## Project support / donation privacy boundary

Primary support URL:

`https://www.donationalerts.com/r/xenonraze`

The payment boundary is intentionally external:

- TK LAB opens DonationAlerts in a separate tab and does not proxy the payment form.
- The amount/name/message fields shown on `/support` are only a local preview and are not submitted by TK LAB.
- TK LAB does not request card numbers, CVV/CVC, banking passwords, or payment credentials.
- TK LAB keeps no donor/payment database in this implementation.
- Donation confirmation and DonationAlerts-style alerts remain the provider's responsibility; TK LAB does not fabricate a `Paid` state.
- Optional direct Kaspi/IBAN fallback remains disabled unless server-only `SUPPORT_*` settings are explicitly configured. Manual transfers are never auto-verified without a signed provider/bank event.
- `SUPPORT_DONATIONALERTS_URL` is host-validated and falls back to the approved `donationalerts.com` URL if a deployment variable points elsewhere.

This architecture protects financial privacy primarily by **data minimization and separation**: sensitive payment data never enters the TK LAB application boundary, rather than by claiming TK LAB encrypts data it never receives.

## Quality gates

`tests/v0.26-erma-alive-ii.test.mjs` covers:

- memory packet limits and untrusted-context rendering;
- Attention positive and negative cases;
- DonationAlerts redirect allowlisting and no-store support endpoint behavior;
- preservation of the public Lite/Core/Pro model mapping;
- hidden Vision mapping;
- Voice Mode integration with the existing TTS pipeline.

The repository's existing `npm run check` remains the release gate for typecheck, lint, secret scanning, policy/trust consistency, integration tests, build, and performance budget.

## Deferred by design

The following require separate infrastructure or explicit user consent and are not silently enabled in this cycle:

- full-duplex realtime speech transport;
- autonomous background/proactive monitoring;
- mutating real-world actions without confirmation-scoped tools;
- automatic synchronization of Personal Memory to server storage;
- payment webhooks or a TK LAB-owned donation ledger.
