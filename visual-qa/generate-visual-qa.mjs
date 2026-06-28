import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'visual-qa');
const SHOTS_DIR = path.join(OUTPUT_DIR, 'screenshots');
const PDF_PATH = path.join(OUTPUT_DIR, 'fitness_desk_visual_qa_desktop_mobile.pdf');
const REPORT_PATH = path.join(OUTPUT_DIR, 'report.json');
const BASE_URL = process.env.VISUAL_QA_BASE_URL ?? 'http://127.0.0.1:5173/Fitness-Desk/';
const WORKOUT_QA_HASHES = {
  push: '/workout?date=2026-07-04',
  pull: '/workout?date=2026-07-05',
  legs: '/workout?date=2026-07-06',
  core: '/workout?date=2026-07-09',
  activeToday: '/workout?date=2026-06-29'
};

const VIEWPORTS = {
  desktop: { width: 1440, height: 1100 },
  mobile: { width: 430, height: 932, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
};

const report = {
  baseUrl: BASE_URL,
  captured: [],
  skipped: [],
  notes: [],
  generatedAt: new Date().toISOString()
};

await fs.mkdir(SHOTS_DIR, { recursive: true });
const existingShots = await fs.readdir(SHOTS_DIR).catch(() => []);
await Promise.all(existingShots.map((file) => fs.rm(path.join(SHOTS_DIR, file), { force: true })));
await fs.rm(PDF_PATH, { force: true }).catch(() => undefined);
await fs.rm(REPORT_PATH, { force: true }).catch(() => undefined);

const browser = await chromium.launch({ headless: true });

try {
  const desktopContext = await browser.newContext({ viewport: VIEWPORTS.desktop });
  const mobileContext = await browser.newContext({
    viewport: { width: VIEWPORTS.mobile.width, height: VIEWPORTS.mobile.height },
    isMobile: VIEWPORTS.mobile.isMobile,
    hasTouch: VIEWPORTS.mobile.hasTouch,
    deviceScaleFactor: VIEWPORTS.mobile.deviceScaleFactor
  });

  const desktopPage = await desktopContext.newPage();
  const mobilePage = await mobileContext.newPage();

  await captureRoute({
    page: desktopPage,
    name: 'Today page',
    viewport: 'desktop',
    size: '1440 × 1100',
    hash: '/',
    fullPage: true
  });

  await captureRoute({
    page: mobilePage,
    name: 'Today page',
    viewport: 'mobile',
    size: '430 × 932',
    hash: '/',
    fullPage: true
  });

  await captureRoute({
    page: desktopPage,
    name: 'Plan page',
    viewport: 'desktop',
    size: '1440 × 1100',
    hash: '/plan',
    fullPage: true
  });

  await captureRoute({
    page: mobilePage,
    name: 'Plan page',
    viewport: 'mobile',
    size: '430 × 932',
    hash: '/plan',
    fullPage: true
  });

  await captureRoute({
    page: desktopPage,
    name: 'Workout start screen',
    viewport: 'desktop',
    size: '1440 × 1100',
    hash: WORKOUT_QA_HASHES.push,
    fullPage: true
  });

  await captureRoute({
    page: mobilePage,
    name: 'Workout start screen',
    viewport: 'mobile',
    size: '430 × 932',
    hash: WORKOUT_QA_HASHES.push,
    fullPage: true
  });

  const desktopActiveState = await createActiveWorkoutState(desktopPage, WORKOUT_QA_HASHES.activeToday);

  await captureDemoModal({
    page: desktopPage,
    name: 'Exercise demo modal',
    viewport: 'desktop',
    size: '1440 × 1100',
    hash: WORKOUT_QA_HASHES.push,
    buttonLabel: 'Open demo for Lateral Raise Machine or Cable Lateral Raise'
  });

  await captureDemoModal({
    page: mobilePage,
    name: 'Exercise demo modal',
    viewport: 'mobile',
    size: '430 × 932',
    hash: WORKOUT_QA_HASHES.push,
    buttonLabel: 'Open demo for Lateral Raise Machine or Cable Lateral Raise'
  });

  await captureDemoModal({
    page: desktopPage,
    name: 'Pull demo modal',
    viewport: 'desktop',
    size: '1440 × 1100',
    hash: WORKOUT_QA_HASHES.pull,
    buttonLabel: 'Open demo for Lat Pulldown, Wide or Neutral Grip'
  });

  await captureDemoModal({
    page: desktopPage,
    name: 'Legs core demo modal',
    viewport: 'desktop',
    size: '1440 × 1100',
    hash: WORKOUT_QA_HASHES.legs,
    buttonLabel: 'Open demo for Cable Crunch'
  });

  await captureDemoModal({
    page: desktopPage,
    name: 'Core stability demo modal',
    viewport: 'desktop',
    size: '1440 × 1100',
    hash: WORKOUT_QA_HASHES.core,
    buttonLabel: 'Open demo for Pallof Press or Plank'
  });

  if (desktopActiveState) {
    await captureRoute({
      page: desktopPage,
      name: 'Workout active/player screen',
      viewport: 'desktop',
      size: '1440 × 1100',
      hash: desktopActiveState.hash,
      fullPage: true
    });

    await captureRoute({
      page: mobilePage,
      name: 'Workout active/player screen',
      viewport: 'mobile',
      size: '430 × 932',
      hash: desktopActiveState.hash,
      fullPage: true
    });
  } else {
    report.skipped.push({
      name: 'Workout active/player screen',
      reason: 'Could not enter active workout mode from the dedicated QA current-day route.'
    });
  }

  await captureRoute({
    page: desktopPage,
    name: 'Body page',
    viewport: 'desktop',
    size: '1440 × 1100',
    hash: '/body',
    fullPage: true
  });

  await captureRoute({
    page: mobilePage,
    name: 'Body page',
    viewport: 'mobile',
    size: '430 × 932',
    hash: '/body',
    fullPage: true
  });

  await captureRoute({
    page: desktopPage,
    name: 'Progress page',
    viewport: 'desktop',
    size: '1440 × 1100',
    hash: '/progress',
    fullPage: true
  });

  await captureRoute({
    page: mobilePage,
    name: 'Progress page',
    viewport: 'mobile',
    size: '430 × 932',
    hash: '/progress',
    fullPage: true
  });

  await buildPdf(browser, report.captured);

  await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  await desktopContext.close();
  await mobileContext.close();
} finally {
  await browser.close();
}

async function captureRoute({ page, name, viewport, size, hash, fullPage = false }) {
  await openHashRoute(page, hash);
  const filename = `${slugify(name)}_${viewport}.jpg`;
  const screenshotPath = path.join(SHOTS_DIR, filename);
  await page.evaluate(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
  if (viewport === 'mobile' && fullPage) {
    await page.evaluate(() => {
      document.body.classList.add('qa-mobile-fullpage-capture');
    });
  } else {
    await page.evaluate(() => {
      document.body.classList.remove('qa-mobile-fullpage-capture');
    });
  }
  await page.waitForTimeout(150);
  await page.screenshot({ path: screenshotPath, fullPage, type: 'jpeg', quality: 88 });
  if (viewport === 'mobile' && fullPage) {
    await page.evaluate(() => {
      document.body.classList.remove('qa-mobile-fullpage-capture');
    });
  }
  report.captured.push({
    screenName: name,
    route: `${BASE_URL}#${hash.startsWith('/') ? hash : `/${hash}`}`,
    viewport,
    viewportSize: size,
    screenshotPath,
    capturedAt: new Date().toISOString(),
    appReady: true,
    notes: fullPage ? 'Full-page capture.' : 'Viewport capture.'
  });
}

async function captureDemoModal({ page, name, viewport, size, hash, buttonLabel }) {
  await openHashRoute(page, hash);
  const demoButton = page.getByRole('button', { name: buttonLabel }).first();
  await demoButton.scrollIntoViewIfNeeded().catch(() => undefined);
  const visible = await demoButton.isVisible().catch(() => false);
  if (!visible) {
    report.skipped.push({
      screenName: name,
      viewport,
      route: `${BASE_URL}#${hash.startsWith('/') ? hash : `/${hash}`}`,
      reason: 'Demo button was not visible for this state.'
    });
    return;
  }
  await demoButton.click();
  await page.getByTestId('exercise-demo-modal').waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(250);
  await waitForImages(page);

  const filename = `${slugify(name)}_${viewport}.jpg`;
  const screenshotPath = path.join(SHOTS_DIR, filename);
  await page.screenshot({ path: screenshotPath, type: 'jpeg', quality: 88, fullPage: false });
  report.captured.push({
    screenName: name,
    route: `${BASE_URL}#${hash.startsWith('/') ? hash : `/${hash}`}`,
    viewport,
    viewportSize: size,
    screenshotPath,
    capturedAt: new Date().toISOString(),
    appReady: true,
    notes: 'Modal open state.'
  });

  const closeButton = page.locator('[data-modal-close="true"]').first();
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click().catch(() => undefined);
  } else {
    await page.keyboard.press('Escape').catch(() => undefined);
  }
  await page.waitForTimeout(150);
}

async function isStartWorkoutScreen(page) {
  return await page.getByRole('button', { name: /Start Session/i }).first().isVisible().catch(() => false);
}

async function isActiveWorkoutScreen(page) {
  const saveSetVisible = await page.getByRole('button', { name: /^Save Set$/i }).first().isVisible().catch(() => false);
  if (saveSetVisible) return true;
  return await page.getByText(/Exercise \d+ of \d+/).first().isVisible().catch(() => false);
}

async function createActiveWorkoutState(page, startHash) {
  await openHashRoute(page, startHash, { tolerateErrors: true });
  if (await isActiveWorkoutScreen(page)) {
    report.notes.push(`Reused existing active workout state from ${startHash} for QA capture.`);
    return { hash: startHash, iso: null };
  }

  const startButton = page.getByRole('button', { name: /Start Session/i }).first();
  const visible = await startButton.isVisible().catch(() => false);
  if (!visible) {
    report.notes.push(`No Start Session button was available on ${startHash} to create an active workout state.`);
    return null;
  }

  await startButton.scrollIntoViewIfNeeded().catch(() => undefined);
  await startButton.click();
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForFunction(
    () => {
      const text = document.body.innerText;
      return /Save Set|Run logger|Session completed/i.test(text);
    },
    null,
    { timeout: 7000 }
  ).catch(() => undefined);
  await page.waitForTimeout(1200);
  const active = await isActiveWorkoutScreen(page);
  if (!active) {
    report.notes.push('Tried to enter active workout mode through the UI, but the active player did not appear.');
    return null;
  }

  report.notes.push(`Created or resumed active workout state from ${startHash} for QA capture.`);
  return { hash: startHash, iso: null };
}

async function openHashRoute(page, hash, options = {}) {
  const url = `${BASE_URL}#${hash.startsWith('/') ? hash : `/${hash}`}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await ensureQaCaptureStyles(page);
  await page.locator('[data-app-ready="true"]').waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined);
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.evaluate(() => document.fonts?.ready ?? Promise.resolve());
  await page.waitForFunction(() => document.querySelectorAll('.animate-pulse').length === 0, null, { timeout: 8000 }).catch(() => undefined);
  await page.waitForTimeout(350);
  const lingeringModalClose = page.locator('[data-modal-close="true"]').first();
  if (await lingeringModalClose.isVisible().catch(() => false)) {
    await lingeringModalClose.click().catch(() => undefined);
    await page.waitForTimeout(150);
  }
  await waitForImages(page);

  if (!options.tolerateErrors) {
    await page.locator('[data-app-ready="true"]').waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined);
  }
}

async function waitForImages(page) {
  await page.evaluate(async () => {
    const pending = Array.from(document.images).filter((img) => !img.complete);
    await Promise.all(
      pending.map(
        (img) =>
          new Promise((resolve) => {
            const done = () => resolve();
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
            setTimeout(done, 2500);
          })
      )
    );
  });
}

async function ensureQaCaptureStyles(page) {
  await page.evaluate(() => {
    if (document.getElementById('qa-capture-styles')) return;

    const style = document.createElement('style');
    style.id = 'qa-capture-styles';
    style.textContent = `
      body.qa-mobile-fullpage-capture .app-shell {
        position: relative !important;
        padding-bottom: calc(var(--mobile-page-bottom) + 24px) !important;
      }

      body.qa-mobile-fullpage-capture .fd-shell-mobile-nav,
      body.qa-mobile-fullpage-capture .mobile-tabbar {
        position: absolute !important;
        inset: auto 0 0 0 !important;
      }

      body.qa-mobile-fullpage-capture .fd-shell-root,
      body.qa-mobile-fullpage-capture .app-shell-root {
        padding-bottom: calc(var(--mobile-page-bottom) + 24px) !important;
      }
    `;
    document.head.appendChild(style);
  });
}

async function buildPdf(browser, captures) {
  const pdfPage = await browser.newPage();
  const sections = await Promise.all(
    captures.map(async (capture) => {
      const buffer = await fs.readFile(capture.screenshotPath);
      const mime = capture.screenshotPath.endsWith('.jpg') ? 'image/jpeg' : 'image/png';
      const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
      return `
        <section class="sheet">
          <div class="label">
            <div class="name">${escapeHtml(capture.screenName)}</div>
            <div class="meta">${escapeHtml(capture.viewport)} · ${escapeHtml(capture.viewportSize)}</div>
          </div>
          <div class="frame">
            <img src="${dataUrl}" alt="${escapeHtml(capture.screenName)} ${escapeHtml(capture.viewport)} screenshot" />
          </div>
        </section>
      `;
    })
  );

  await pdfPage.setContent(
    `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 12mm; }
          body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f4f1ea; color: #061414; }
          .deck { display: flex; flex-direction: column; gap: 18px; }
          .sheet { break-inside: avoid; page-break-inside: avoid; }
          .label { margin-bottom: 12px; }
          .name { font-size: 18px; font-weight: 700; }
          .meta { margin-top: 4px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #6f776f; }
          .frame { border: 1px solid rgba(6, 20, 20, 0.14); border-radius: 18px; background: white; padding: 10px; overflow: hidden; display: flex; align-items: flex-start; justify-content: center; }
          img { display: block; width: 100%; height: auto; border-radius: 12px; object-fit: contain; object-position: top center; }
        </style>
      </head>
      <body><main class="deck">${sections.join('')}</main></body>
    </html>`,
    { waitUntil: 'load' }
  );

  await pdfPage.pdf({
    path: PDF_PATH,
    printBackground: true,
    preferCSSPageSize: true
  });

  await pdfPage.close();
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
