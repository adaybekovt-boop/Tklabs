import { expect, test } from "@playwright/test";

const baseURL = `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT || 3100}`;
async function locale(context, value) {
  await context.addCookies([{ name: "tklab-locale", value, url: baseURL }]);
}

async function filmAt(page, progress) {
  await page.evaluate(p => {
    const film = document.querySelector("[data-home-film]");
    window.scrollTo(0, film.getBoundingClientRect().top + scrollY - 80 + (film.offsetHeight - (innerHeight - 80)) * p);
  }, progress);
  await page.waitForTimeout(450);
}

for (const language of ["en", "ru"]) {
  test(`homepage remains readable in ${language} at every target width`, async ({ page, context }) => {
    await locale(context, language);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    for (const [width, height] of [[1920,1080],[1440,900],[1280,800],[1024,768],[834,1112],[659,672],[390,844]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => scrollTo(0, 0));
      await expect(page.locator("h1")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const hero = page.locator(".home-hero");
      const cta = hero.getByRole("link", { name: language === "ru" ? "Открыть Erma" : "Open Erma", exact: true });
      await expect(cta).toHaveAttribute("href", "/playground");
      const rect = await cta.boundingBox();
      expect(rect.height).toBeGreaterThanOrEqual(44);
      expect(rect.y + rect.height).toBeLessThanOrEqual(height);
      if (width >= 600) {
        await expect(page.locator("[data-home-film]")).toHaveAttribute("data-cinematic", "true");
        await filmAt(page, 0.79);
        const stage = await page.locator(".home-film-stage").boundingBox();
        expect(Math.abs(stage.y - 80)).toBeLessThan(3);
        await expect(page.locator("[data-film-caption='3']")).toHaveCSS("opacity", "1");
        for (const progress of [0.96]) {
          await filmAt(page, progress);
          const product = await page.locator(".task-window").boundingBox();
          const rail = await page.locator(".film-footer").boundingBox();
          expect(product.y + product.height).toBeLessThan(rail.y - 15);
        }
      } else {
        await expect(page.locator("[data-home-film]")).not.toHaveAttribute("data-cinematic", "true");
      }
    }
    expect(errors).toEqual([]);
  });
}

test("the same task survives forward and reverse scrub; reduced motion restores the document", async ({ page, context }) => {
  await locale(context, "en");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const prompt = page.locator("[data-film-prompt]");
  await expect(prompt).toHaveCount(1);
  const text = await prompt.textContent();
  for (const progress of [0.18,0.32,0.55,0.68,0.79,0.96,0.32,0]) {
    await filmAt(page, progress);
    expect(await prompt.textContent()).toBe(text);
    const rect = await prompt.boundingBox();
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(1440);
    expect(rect.y + rect.height).toBeLessThan(850);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("[data-home-film]")).not.toHaveAttribute("data-cinematic", "true");
  await expect(page.locator(".film-caption")).toHaveCount(5);
  expect(await page.locator("[data-film-prompt]").evaluate(el => el.style.transform)).toBe("");
  expect(await page.locator("[data-home-motion] [data-motion-reveal]").count()).toBe(0);
});

test("example versions switch by keyboard, without writing to the real archive", async ({ page, context }) => {
  await locale(context, "en");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const before = await page.evaluate(() => localStorage.getItem("tklab.archive.v1"));
  await expect(page.locator('[data-locale-ready="true"]')).toBeVisible();
  const draft = page.getByRole("button", { name: /v1 First draft/ });
  await draft.focus();
  await page.keyboard.press("Enter");
  await expect(draft).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".version-document")).toContainText("encrypted at rest");
  await page.getByRole("button", { name: /v2 Checklist/ }).click();
  await expect(page.locator(".version-document li")).toHaveCount(3);
  expect(await page.evaluate(() => localStorage.getItem("tklab.archive.v1"))).toBe(before);
});

test("locale, theme preference and route return remain functional", async ({ page, context }) => {
  await locale(context, "en");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-locale-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "RU", exact: true }).click();
  await expect(page.locator(".home-hero h1")).toContainText("ОТ ВОПРОСА");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await page.setViewportSize({ width: 1440, height: 900 });
  await filmAt(page, 0.79);
  await expect(page.locator("[data-film-caption='3']")).toHaveCSS("opacity", "1");
  await page.locator(".home-preferences .theme-toggle").click();
  const theme = await page.evaluate(() => localStorage.getItem("tklabs-theme"));
  await page.locator('.home-header a[href="/models"]').click();
  await expect(page).toHaveURL(/\/models$/);
  await expect(page.locator(".erma-home-shell")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("tklabs-theme"))).toBe(theme);
  await page.goBack();
  await expect(page.locator("[data-home-film]")).toHaveAttribute("data-cinematic", "true");
  await filmAt(page, 0.79);
  expect((await page.locator(".home-film-stage").boundingBox()).y).toBeCloseTo(80, 0);
});

test("no JavaScript still exposes the task, sources, release and product entry", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: {width:390,height:844} });
  await locale(context, "en");
  const page = await context.newPage();
  await page.goto(`${baseURL}/`, { waitUntil:"domcontentloaded" });
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator(".task-tool")).toBeVisible();
  await expect(page.locator(".home-release")).toBeVisible();
  await expect(page.locator('.home-hero a[href="/playground"]')).toBeVisible();
  expect(await page.locator(".home-film").getAttribute("data-cinematic")).toBeNull();
  await context.close();
});

test("Open Erma uses the existing sign-in boundary", async ({ page, context }) => {
  await locale(context, "en");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator('.home-hero a[href="/playground"]').click();
  await expect(page).toHaveURL(/\/login$/);
});


test("film planes hand off their space without overlapping readable content", async ({ page, context }, testInfo) => {
  await locale(context, "ru");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.fonts.ready);
  for (const [width,height] of [[1440,900],[659,672]]) {
    await page.setViewportSize({width,height});
    for (const progress of [.18,.28,.35,.43,.50,.56,.62,.68,.74,.79,.85,.91,.97]) {
      await filmAt(page,progress);
      const collisions = await page.evaluate(() => {
        const selectors = ['prompt','answer','tool','model','archive','version'];
        const planes = selectors.map(name => ({name,el:document.querySelector(`[data-film-${name}]`)}))
          .filter(({el}) => +getComputedStyle(el).opacity > .9)
          .map(({name,el}) => ({name,r:el.getBoundingClientRect()}));
        return planes.flatMap((a,i) => planes.slice(i+1).filter(b =>
          Math.min(a.r.right,b.r.right)-Math.max(a.r.left,b.r.left)>4 &&
          Math.min(a.r.bottom,b.r.bottom)-Math.max(a.r.top,b.r.top)>4
        ).map(b=>`${a.name}/${b.name}`));
      });
      expect(collisions,`${width}px at ${progress}`).toEqual([]);
      if ([.56,.97].includes(progress)) await page.screenshot({path:testInfo.outputPath(`${width}-${progress}.png`)});
    }
  }
  await expect(page.getByText('Пример работы · без AI-запроса',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'РАБОТА С ИСТОЧНИКОМ.',exact:true})).toHaveCount(0);
});

test("home and public pages share the same visible light and dark palette", async ({ page, context }) => {
  await locale(context, "en");
  await page.setViewportSize({width:1440,height:900});
  for (const theme of ['light','dark']) {
    await page.goto('/');
    await expect(page.locator('[data-locale-ready="true"]')).toBeVisible();
    if (await page.locator('html').getAttribute('data-theme') !== theme) {
      await page.locator('.home-preferences .theme-toggle').click();
    }
    const home = await page.locator('.erma-home-shell').evaluate(el => ({
      bg:getComputedStyle(el).backgroundColor,
      text:getComputedStyle(el).color,
      action:getComputedStyle(el.querySelector('.home-cta')).backgroundColor
    }));
    const rgb=home.action.match(/\d+/g).map(Number);
    expect(Math.max(...rgb)-Math.min(...rgb)).toBeLessThan(10);
    for (const route of ['/models','/documentation']) {
      await page.goto(route);
      await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
      expect(await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe(home.bg);
      expect(await page.locator('body').evaluate(el=>getComputedStyle(el).color)).toBe(home.text);
    }
  }
});

test("short windows use the readable document instead of a cramped film", async ({page}) => {
  await page.setViewportSize({width:659,height:500});
  await page.goto('/');
  await expect(page.locator('[data-locale-ready="true"]')).toBeVisible();
  await expect(page.locator('[data-home-film]')).not.toHaveAttribute('data-cinematic','true');
  await expect(page.locator('.task-tool')).toBeVisible();
});
