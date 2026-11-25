/** Headless browser helpers shared by the crawler and scenario runner. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import puppeteer from 'puppeteer-core';

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];

export function findChrome() {
  const found = CANDIDATES.find((p) => p && fs.existsSync(p));
  if (!found) {
    throw new Error('未找到 Chrome/Chromium，请通过环境变量 CHROME_PATH 指定浏览器路径。');
  }
  return found;
}

// Freeze randomness and drive the clock per user action (window.__regressionTick),
// so both builds produce identical mock data regardless of how often code reads the time.
const DETERMINISM = `(() => {
  const T = 1767225600000; const RealDate = Date;
  class FixedDate extends RealDate {
    constructor(...a) { if (a.length === 0) super(FixedDate.now()); else super(...a); }
    static now() { return T + (window.__regressionTick || 0) * 60000; }
  }
  window.Date = FixedDate;
  let seed = 42;
  Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  window.alert = () => {}; window.confirm = () => true; window.prompt = () => 'x';
  window.open = () => null; window.print = () => {};
})();`;

export async function openPage(url) {
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument(DETERMINISM);
  const errors = [];
  const ctx = { label: '' };
  page.on('pageerror', (e) => errors.push(`${ctx.label} :: ${e.message}`));
  page.on('console', (m) => {
    // Missing static assets are reported separately by servers and are not app errors.
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) {
      errors.push(`${ctx.label} :: console ${m.text()}`);
    }
  });
  const settle = () =>
    page.evaluate(() => new Promise((r) => setTimeout(() => setTimeout(r, 0), 0)));
  const fresh = async () => {
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto(url, { waitUntil: 'load' });
    await settle();
  };
  return { browser, page, errors, ctx, settle, fresh };
}

/** Normalised HTML of each UI region plus any toast messages raised by the last action. */
export function snapshot() {
  const region = (s) => {
    const e = document.querySelector(s);
    return e
      ? e.className + '|' + e.innerHTML.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim()
      : '';
  };
  const toasts = [...document.querySelectorAll('#toastRoot > *')].map((e) => e.textContent);
  document.querySelectorAll('#toastRoot > *').forEach((e) => e.remove());
  return {
    title: document.title,
    crumb: region('#crumb'),
    sidebar: region('#sidebar'),
    app: region('#appView'),
    drawer: region('#drawer'),
    mask: region('#drawerMask'),
    modal: region('#modalRoot'),
    customizer: region('#customizer'),
    toasts,
  };
}

/** Advance the mock clock by one minute; call once before every user action. */
export const tick = (page) =>
  page.evaluate(() => {
    window.__regressionTick = (window.__regressionTick || 0) + 1;
  });

export const hashSnapshot = (snap) => {
  const out = {};
  for (const k of Object.keys(snap)) {
    const v = JSON.stringify(snap[k]);
    out[k] = crypto.createHash('sha1').update(v).digest('hex').slice(0, 12) + ':' + v.length;
  }
  return out;
};

/** 通过登录页切换账号：已登录时先从个人菜单退出。返回 'ok' 或失败原因。 */
export function loginAs(username) {
  const q = (sel) => document.querySelector(sel);
  if (!q('.login-page')) {
    q('[data-profile-action="toggle"]').click();
    q('[data-profile-action="logout"]').click();
    const confirm = q('[data-profile-action="logout-confirm"]');
    if (!confirm) return 'NOT FOUND logout-confirm';
    confirm.click();
  }
  const item = q(`[data-demo-account="${username}"]`);
  if (!item) return 'NOT FOUND account ' + username;
  item.click();
  q('[data-login="submit"]').click();
  return q('.login-page') ? 'LOGIN FAILED ' + username : 'ok';
}

/** 在当前页面登录指定账号。 */
export async function login(page, settle, username) {
  const status = await page.evaluate(loginAs, username);
  await settle();
  return status;
}
