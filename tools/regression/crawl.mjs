/**
 * Exploratory crawl: for every demo account, every sidebar entry and up to two levels of
 * in-page tabs, start from a fresh page and click the first N interactive elements,
 * recording a snapshot after each action.
 */
import { openPage, snapshot, hashSnapshot, login, tick } from './browser.mjs';

const TAB_SELECTOR = '[data-action$="tab"],[data-action="lifecycle-stage"],[data-tab],[data-stage]';
const INTERACTIVE =
  'button,[data-action],[role=button],select,input[type=checkbox],input[type=radio],input[type=search],input[type=text],textarea,[data-req-page-action],[data-flow-view-action],.seg-tab,summary';

function act(i, selector) {
  const roots = ['#appView', '#drawer.show', '#modalRoot.show', '#customizer.show']
    .map((s) => document.querySelector(s))
    .filter(Boolean);
  const list = [];
  roots.forEach((r) =>
    r.querySelectorAll(selector).forEach((e) => {
      if (!list.includes(e)) list.push(e);
    }),
  );
  const el = list[i];
  if (!el) return null;
  const attrs = [...el.attributes]
    .filter((a) => a.name.startsWith('data-'))
    .map((a) => a.name + '=' + a.value)
    .join(' ');
  const label = `${el.tagName}.${el.className || ''} ${attrs} "${(el.textContent || '').trim().slice(0, 30)}"`;
  if (el.tagName === 'SELECT') {
    if (el.options.length) el.selectedIndex = (el.selectedIndex + 1) % el.options.length;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } else if ((el.tagName === 'INPUT' && /text|search/.test(el.type)) || el.tagName === 'TEXTAREA') {
    el.value = '1';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } else el.click();
  return label;
}

function tabSignatures(selector) {
  const sig = (e) =>
    `${e.dataset.action || ''}|${e.dataset.stage || ''}|${e.dataset.tab || ''}|${e.textContent.trim().slice(0, 20)}`;
  const nodes = document.querySelectorAll(
    selector
      .split(',')
      .map((s) => '#appView ' + s)
      .join(','),
  );
  return [...new Set([...nodes].map(sig))];
}

function clickTab(signature, selector) {
  const sig = (e) =>
    `${e.dataset.action || ''}|${e.dataset.stage || ''}|${e.dataset.tab || ''}|${e.textContent.trim().slice(0, 20)}`;
  const nodes = document.querySelectorAll(
    selector
      .split(',')
      .map((s) => '#appView ' + s)
      .join(','),
  );
  const el = [...nodes].find((x) => sig(x) === signature);
  if (el) el.click();
  return !!el;
}

function openNav(index) {
  document.querySelectorAll('[data-nav-group]').forEach((g) => {
    if (!g.closest('.nav-group.is-open')) g.click();
  });
  const el = [...document.querySelectorAll('#sidebar [data-nav], #sidebar [data-action]')][index];
  if (!el) return null;
  const label = `${el.dataset.nav || el.dataset.action}:${el.dataset.tab || ''}:${el.textContent.trim()}`;
  el.click();
  return label;
}

export async function crawl(url, { clicks = 30, screenshots = false, onShot } = {}) {
  const { browser, page, errors, ctx, settle, fresh } = await openPage(url);
  const steps = [];
  try {
    await fresh();
    const roles = await page.evaluate(() =>
      [...document.querySelectorAll('[data-demo-account]')].map((o) => o.dataset.demoAccount),
    );
    for (const role of roles) {
      await fresh();
      await login(page, settle, role);
      const navCount = await page.evaluate(() => {
        document.querySelectorAll('[data-nav-group]').forEach((g) => {
          if (!g.closest('.nav-group.is-open')) g.click();
        });
        return document.querySelectorAll('#sidebar [data-nav], #sidebar [data-action]').length;
      });
      for (let ni = 0; ni < navCount; ni++) {
        const goPath = async (path) => {
          await fresh();
          await login(page, settle, role);
          const label = await page.evaluate(openNav, ni);
          if (!label) return null;
          await settle();
          for (const sig of path) {
            const ok = await page.evaluate(clickTab, sig, TAB_SELECTOR);
            await settle();
            if (!ok) return `${label} [missing ${sig}]`;
          }
          return label;
        };
        const explore = async (path, parentTabs) => {
          const label = await goPath(path);
          if (!label) return;
          ctx.label = `${role} > ${label}${path.length ? ' > ' + path.join(' > ') : ''}`;
          const tabs = await page.evaluate(tabSignatures, TAB_SELECTOR);
          const navSnap = hashSnapshot(await page.evaluate(snapshot));
          if (screenshots) {
            await page.evaluate(() =>
              document.querySelectorAll('*').forEach((e) => {
                e.style.transition = 'none';
                e.style.animation = 'none';
              }),
            );
            onShot(steps.length, await page.screenshot());
          }
          steps.push({ ctx: ctx.label, act: 'nav', snap: navSnap });
          for (let i = 0; i < clicks; i++) {
            await tick(page);
            const label2 = await page.evaluate(act, i, INTERACTIVE);
            if (label2 === null) break;
            await settle();
            steps.push({
              ctx: `${ctx.label} #${i}`,
              act: label2,
              snap: hashSnapshot(await page.evaluate(snapshot)),
            });
          }
          if (path.length < 2) {
            for (const t of tabs) {
              if (!parentTabs.includes(t) && !path.includes(t)) await explore([...path, t], tabs);
            }
          }
        };
        await explore([], []);
      }
    }
  } finally {
    await browser.close();
  }
  return { steps, errors };
}
