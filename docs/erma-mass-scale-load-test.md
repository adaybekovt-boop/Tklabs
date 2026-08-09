# Erma Mass Scale — staging load test

Use the load harness only against an explicit preview or staging deployment. Production hosts are blocked by default.

## Staging-only identity mode

Configure the Worker preview/staging environment with:

```text
ERMA_LOAD_TEST_ENABLED=true
ERMA_LOAD_TEST_SECRET=<long random staging-only secret>
```

Do not configure `ERMA_LOAD_TEST_ENABLED=true` on `tklabs.uk`. The server also rejects signed load-test identities on the production host even if the variables are accidentally present.

Use the same secret only in the local load-test process so it can sign synthetic identities. The secret itself is never sent in a request; each virtual-user identifier carries an HMAC signature.

## 100-user burst

```bash
ERMA_LOAD_TEST_URL=https://<preview-host> \
ERMA_LOAD_TEST_CONFIRM=I_UNDERSTAND \
ERMA_LOAD_TEST_SECRET='<same staging secret>' \
ERMA_LOAD_TEST_REQUESTS=100 \
ERMA_LOAD_TEST_CONCURRENCY=100 \
ERMA_LOAD_TEST_VIRTUAL_USERS=100 \
npm run load:erma
```

## 300-user burst

```bash
ERMA_LOAD_TEST_URL=https://<preview-host> \
ERMA_LOAD_TEST_CONFIRM=I_UNDERSTAND \
ERMA_LOAD_TEST_SECRET='<same staging secret>' \
ERMA_LOAD_TEST_REQUESTS=300 \
ERMA_LOAD_TEST_CONCURRENCY=300 \
ERMA_LOAD_TEST_VIRTUAL_USERS=300 \
npm run load:erma
```

## What to inspect

The harness reports HTTP status distribution, success/failure rate, throughput, p50/p95/p99/max latency, actual provider/model distribution, and fallback reasons.

A burst test validates admission/failover behavior; it does not prove a permanent free-tier capacity guarantee. Provider RPM/TPM values in the Worker must match the live limits of the configured provider accounts before the result is used as a capacity claim.
