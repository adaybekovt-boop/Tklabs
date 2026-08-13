import assert from "node:assert/strict";
import test from "node:test";

test("repeated start/cancel cycles cannot grow reward session storage without bound", async () => {
  const originalNow = Date.now;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalRateLimitSecret = process.env.RATE_LIMIT_SECRET;
  const originalRewardedAdsEnabled = process.env.REWARDED_ADS_ENABLED;
  let now = 1_800_000_000_000;

  Date.now = () => now;
  process.env.NODE_ENV = "development";
  process.env.RATE_LIMIT_SECRET = "rewarded-ads-attempt-cap-secret";
  process.env.REWARDED_ADS_ENABLED = "true";
  globalThis.__tklabsCloudflareEnv = {};

  try {
    const access = await import(`../lib/demo-rate-limit-access.ts?reward-attempt-cap=${Math.random()}`);
    const policy = await import(`../lib/rewarded-ads.ts?reward-attempt-cap=${Math.random()}`);
    const identifier = `account:reward-attempt-cap-${crypto.randomUUID()}@example.com`;

    for (let index = 0; index < 3; index += 1) {
      const reservation = await access.reserveDemoRequest(identifier);
      await access.commitDemoRequest(identifier, reservation.reservationId);
    }

    for (let index = 0; index < policy.REWARD_AD_SESSION_ATTEMPT_LIMIT; index += 1) {
      const started = await access.startDemoRewardAd(identifier);
      assert.equal(started.allowed, true, `start #${index + 1} should be allowed below the attempt cap`);
      const cancelled = await access.cancelDemoRewardAd(identifier, started.sessionId);
      assert.equal(cancelled.cancelled, true);
      now += 1;
    }

    const overCap = await access.startDemoRewardAd(identifier);
    assert.equal(overCap.allowed, false, "a start/cancel loop must stop once it hits the attempt cap");
    assert.equal(overCap.error, "too_many_attempts");
  } finally {
    Date.now = originalNow;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalRateLimitSecret === undefined) delete process.env.RATE_LIMIT_SECRET;
    else process.env.RATE_LIMIT_SECRET = originalRateLimitSecret;
    if (originalRewardedAdsEnabled === undefined) delete process.env.REWARDED_ADS_ENABLED;
    else process.env.REWARDED_ADS_ENABLED = originalRewardedAdsEnabled;
    delete globalThis.__tklabsCloudflareEnv;
  }
});

test("two timed ad sessions credit one refundable bonus request and enforce the daily cap", async () => {
  const originalNow = Date.now;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalRateLimitSecret = process.env.RATE_LIMIT_SECRET;
  const originalRewardedAdsEnabled = process.env.REWARDED_ADS_ENABLED;
  let now = 1_800_000_000_000;

  Date.now = () => now;
  process.env.NODE_ENV = "development";
  process.env.RATE_LIMIT_SECRET = "rewarded-ads-test-rate-limit-secret";
  process.env.REWARDED_ADS_ENABLED = "true";
  globalThis.__tklabsCloudflareEnv = {};

  try {
    const access = await import(`../lib/demo-rate-limit-access.ts?reward-ledger=${Math.random()}`);
    const policy = await import("../lib/rewarded-ads.ts");
    const identifier = `account:reward-test-${crypto.randomUUID()}@example.com`;

    for (let index = 0; index < 3; index += 1) {
      const reservation = await access.reserveDemoRequest(identifier);
      assert.equal(reservation.allowed, true);
      assert.ok(reservation.reservationId);
      await access.commitDemoRequest(identifier, reservation.reservationId);
    }
    assert.equal((await access.reserveDemoRequest(identifier)).allowed, false);

    const first = await access.startDemoRewardAd(identifier);
    assert.equal(first.allowed, true);
    assert.ok(first.sessionId);
    assert.ok(first.eligibleAt);
    const tooEarly = await access.completeDemoRewardAd(identifier, first.sessionId);
    assert.equal(tooEarly.completed, false);
    assert.equal(tooEarly.error, "too_early");

    now = first.eligibleAt;
    const firstComplete = await access.completeDemoRewardAd(identifier, first.sessionId);
    assert.equal(firstComplete.completed, true);
    assert.equal(firstComplete.credited, false);
    assert.equal(firstComplete.adsCompleted, 1);
    const firstReplay = await access.completeDemoRewardAd(identifier, first.sessionId);
    assert.equal(firstReplay.completed, true);
    assert.equal(firstReplay.adsCompleted, 1, "replaying complete must not add another view");

    now += policy.REWARD_AD_COOLDOWN_MS;
    const replaced = await access.startDemoRewardAd(identifier);
    now += 1;
    const second = await access.startDemoRewardAd(identifier);
    assert.equal(replaced.allowed, true);
    assert.equal(second.allowed, true, "a stale active session should restart instead of blocking for ten minutes");
    assert.equal(second.sessionId, replaced.sessionId, "restarts must reuse storage instead of creating cancelled-session spam");
    assert.ok(second.eligibleAt > replaced.eligibleAt);
    now = replaced.eligibleAt;
    assert.equal((await access.completeDemoRewardAd(identifier, replaced.sessionId)).error, "too_early");
    now = second.eligibleAt;
    const secondComplete = await access.completeDemoRewardAd(identifier, second.sessionId);
    assert.equal(secondComplete.credited, true);
    assert.equal(secondComplete.bonusRequests, 1);

    const refundable = await access.reserveDemoRequest(identifier);
    assert.equal(refundable.allowed, true);
    assert.equal(refundable.bonusRemaining, 0);
    const released = await access.releaseDemoRequest(identifier, refundable.reservationId);
    assert.equal(released.released, true);
    assert.equal(released.bonusRemaining, 1, "a failed Erma request must return the ad-earned bonus");
    const firstBonus = await access.reserveDemoRequest(identifier);
    await access.commitDemoRequest(identifier, firstBonus.reservationId);

    async function completeNextAd(expectedCredit) {
      now += policy.REWARD_AD_COOLDOWN_MS;
      const started = await access.startDemoRewardAd(identifier);
      assert.equal(started.allowed, true);
      now = started.eligibleAt;
      const completed = await access.completeDemoRewardAd(identifier, started.sessionId);
      assert.equal(completed.completed, true);
      assert.equal(completed.credited, expectedCredit);
      return completed;
    }

    await completeNextAd(false);
    await completeNextAd(true);
    const secondBonus = await access.reserveDemoRequest(identifier);
    await access.commitDemoRequest(identifier, secondBonus.reservationId);
    await completeNextAd(false);
    const sixth = await completeNextAd(true);
    assert.equal(sixth.adsCompleted, policy.REWARD_AD_DAILY_LIMIT);
    assert.equal(sixth.adsRemaining, 0);
    const thirdBonus = await access.reserveDemoRequest(identifier);
    await access.commitDemoRequest(identifier, thirdBonus.reservationId);
    const capped = await access.startDemoRewardAd(identifier);
    assert.equal(capped.allowed, false);
    assert.equal(capped.error, "daily_limit");
  } finally {
    Date.now = originalNow;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalRateLimitSecret === undefined) delete process.env.RATE_LIMIT_SECRET;
    else process.env.RATE_LIMIT_SECRET = originalRateLimitSecret;
    if (originalRewardedAdsEnabled === undefined) delete process.env.REWARDED_ADS_ENABLED;
    else process.env.REWARDED_ADS_ENABLED = originalRewardedAdsEnabled;
    delete globalThis.__tklabsCloudflareEnv;
  }
});
