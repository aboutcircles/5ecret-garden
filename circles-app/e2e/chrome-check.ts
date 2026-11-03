// SECURITY: a local run refuses a Google Chrome older than the stable release
// Google serves now, and refuses PLAYWRIGHT_USE_INSTALLED_CHROME=0.
//
// Local runs drive the installed Chrome rather than Playwright's pinned
// Chromium (see playwright.config.ts), which only helps while that Chrome is
// current. Chrome applies an update on a relaunch, and a managed machine can
// hold one back, so the version is read from the browser and compared with the
// one most stable users get. Offline, FLOOR is the minimum. CI skips this.
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';

export const BRAVE =
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';

// Chrome 156.0.8078.73 fixed four bugs a crafted page can reach, CVE-2026-118306 among them.
export const FLOOR = '156.0.8078.73';

const PLATFORM: Record<string, string> = {
  darwin: process.arch === 'arm64' ? 'mac_arm64' : 'mac',
  linux: 'linux',
  win32: 'win64',
};

type Release = { version: string; fraction: number };

export function olderThan(a: string, b: string): boolean {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) < (y[i] ?? 0);
  }
  return false;
}

// The newest version served to at least half of a platform's stable users, never below FLOOR.
export function required(releases: readonly Release[] | null): string {
  const served = (releases ?? [])
    .filter((r) => r.fraction >= 0.5)
    .map((r) => r.version);
  return served.reduce((best, v) => (olderThan(best, v) ? v : best), FLOOR);
}

async function stableReleases(): Promise<Release[] | null> {
  const platform = PLATFORM[process.platform];
  if (!platform) return null;
  const url = `https://versionhistory.googleapis.com/v1/chrome/platforms/${platform}/channels/stable/versions/all/releases?filter=endtime=none`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    return res.ok
      ? ((await res.json()) as { releases: Release[] }).releases
      : null;
  } catch {
    return null;
  }
}

export default async function chromeCheck(): Promise<void> {
  if (process.env.CI) return;
  if (process.env.PLAYWRIGHT_USE_INSTALLED_CHROME === '0') {
    throw new Error(
      "PLAYWRIGHT_USE_INSTALLED_CHROME=0 is refused: it would run Playwright's outdated Chromium without its sandbox."
    );
  }
  const browser = await chromium.launch({
    channel: 'chrome',
    chromiumSandbox: true,
  });
  const installed = browser.version();
  await browser.close();
  const releases = await stableReleases();
  if (!releases) {
    console.warn(
      `[chrome-check] Chrome's stable version could not be read; requiring ${FLOOR}.`
    );
  }
  const minimum = required(releases);
  if (olderThan(installed, minimum)) {
    throw new Error(
      `Google Chrome ${installed} is older than ${minimum}. An old Chrome has security bugs a web ` +
        'page can use to run code on this machine, so the tests refuse to run. Open Chrome, go to ' +
        'Settings > About Chrome, let it update, relaunch it, and run again.'
    );
  }
  // The idb project drives Brave, whose versions Google's list does not cover,
  // so its Chromium is held to FLOOR alone.
  if (existsSync(BRAVE)) {
    const brave = await chromium.launch({
      executablePath: BRAVE,
      chromiumSandbox: true,
    });
    const version = brave.version();
    await brave.close();
    if (olderThan(version, FLOOR)) {
      throw new Error(
        `Brave runs Chromium ${version}, older than ${FLOOR}. Update it in Settings > About Brave, ` +
          'relaunch it, and run again.'
      );
    }
  }
}
