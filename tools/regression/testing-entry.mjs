// Exercise the visible QA entry and delegated role permissions using normal pointer clicks.
import assert from 'node:assert/strict';
import { loginAs, openPage } from './browser.mjs';
import { runStep } from './scenarios.mjs';

const url = process.argv[2] || 'http://localhost:5173';
const { browser, page: qa, fresh, errors } = await openPage(url);
async function clickDrawer(page, selector) {
  const target = '#drawer.show ' + selector;
  await page.waitForFunction(
    (query) => {
      const button = document.querySelector(query);
      if (!button) return false;
      const box = button.getBoundingClientRect();
      return button.contains(
        document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2),
      );
    },
    { timeout: 5000 },
    target,
  );
  await page.click(target);
}

try {
  await fresh();
  assert.equal(await qa.evaluate(loginAs, 'qa'), 'ok');
  await qa.click('[data-action=open-testing-sample]');
  const entry = '.test-return-bar [data-feedback=open-return]';
  await qa.waitForSelector(entry, { visible: true });
  assert.ok(
    await qa.$eval(entry, (b) => {
      const r = b.getBoundingClientRect(),
        x = r.x + r.width / 2,
        y = r.y + r.height / 2;
      return y > 0 && y < innerHeight && b.contains(document.elementFromPoint(x, y));
    }),
    'Return action must be visible before scrolling the testing page',
  );
  const tab = await browser.newPage();
  await tab.setViewport({ width: 1440, height: 900 });
  tab.on('pageerror', (e) => errors.push(e.message));
  await tab.goto(url);
  for (const user of ['pm', 'pjm', 'dev', 'reviewer', 'director', 'rdlead', 'testlead', 'qalead']) {
    assert.equal(await tab.evaluate(loginAs, user), 'ok');
    assert.equal(await tab.evaluate(runStep, { nav: 'portfolio' }), 'ok');
    await tab.click('[data-action=open-project][data-project=demo-testing-handoff]');
    assert.equal(await tab.evaluate(runStep, { nav: 'project-lifecycle' }), 'ok');
    await tab.click('[data-action=lifecycle-stage][data-stage=testing]');
    await tab.waitForSelector('.test-return-bar button:disabled');
    assert.match(await tab.$eval('.test-return-bar', (e) => e.innerText), /仅测试工程师/);
    await tab.click('[data-testing-section=cases]');
    await tab.waitForSelector('[data-testing-page-action=create-case]:disabled');
    await tab.click('button[data-testing-page-action=open-case]');
    assert.ok(await tab.$('#drawer.show [data-testing-input]:disabled'));
    assert.ok(await tab.$('#drawer.show [data-testing-drawer-action=save]:disabled'));
    await clickDrawer(tab, '.drawer-head [data-action=close-drawer]');
    await tab.waitForSelector('#drawer.show', { hidden: true });
    await tab.click('[data-testing-section=smoke]');
    assert.ok(await tab.$('[data-v54-report=new]:disabled'));
  }
  await qa.bringToFront();
  await qa.click('[data-testing-section=smoke]');
  await qa.click('[data-v54-report=new]');
  await qa.waitForSelector('#drawer.show .v54-report-drawer');
  assert.equal(await qa.$('#drawer.show [data-feedback=open-return]'), null);
  await clickDrawer(qa, '.drawer-head [data-action=close-drawer]');
  await qa.waitForSelector('#drawer.show', { hidden: true });
  await qa.$eval(entry, (el) => el.scrollIntoView({ block: 'center' }));
  await qa.waitForFunction(
    (selector) => {
      const el = document.querySelector(selector);
      const box = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
    },
    { timeout: 5000 },
    entry,
  );
  await qa.click(entry);
  await qa.waitForSelector('#modalRoot.show [data-return-field=phenomenon]', { visible: true });
  for (const [field, value] of Object.entries({
    phenomenon: '模拟重连失败',
    requirement: '修复重试',
    expected: '恢复连接',
  })) {
    await qa.type('[data-return-field=' + field + ']', value);
  }
  await qa.click('[data-feedback=submit]');
  await qa.waitForSelector('[data-stage=development].is-current');
  assert.equal(await qa.$('#drawer.show'), null);
  // A viewer's open testing page becomes read-only again immediately after the return.
  await tab.waitForSelector('body[data-stage-readonly]');
  const dev = tab;
  await dev.bringToFront();
  assert.equal(await dev.evaluate(loginAs, 'dev'), 'ok');
  await dev.waitForSelector('[data-project-notices] [data-action=open-dev-project]');
  assert.ok(
    await dev.evaluate(() => {
      const summary = document.querySelector('[data-widget=summary]').getBoundingClientRect();
      const notices = document.querySelector('[data-widget=notices]').getBoundingClientRect();
      return Math.abs(summary.top - notices.top) < 1 && summary.right < notices.left;
    }),
  );
  await dev.click('[data-project-notices] [data-action=open-dev-project]');
  await dev.waitForSelector('[data-workspace=view-developer].active');
  await dev.click('[data-feedback=view-defect]');
  assert.match(await dev.$eval('#drawerBody', (el) => el.textContent), /模拟重连失败/);
  await clickDrawer(dev, '.drawer-head [data-action=close-drawer]');
  await dev.waitForSelector('#drawer.show', { hidden: true });
  await dev.click('[data-workspace=view-reviewer]');
  await dev.waitForSelector('[data-workspace=view-reviewer].active');
  const version = '[data-feedback=view-version][data-commit="7b91c3e4"]';
  await dev.waitForSelector(version, { visible: true, timeout: 5000 });
  await dev.$eval(version, (el) => el.scrollIntoView({ block: 'center' }));
  await dev
    .waitForFunction(
      (selector) => {
        const el = document.querySelector(selector);
        const r = el.getBoundingClientRect();
        const target = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return el.contains(target);
      },
      { timeout: 5000 },
      version,
    )
    .catch(async (error) => {
      const info = await dev.$eval(version, (el) => {
        const r = el.getBoundingClientRect();
        const target = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return { html: el.outerHTML, rect: r.toJSON(), target: target?.outerHTML.slice(0, 300) };
      });
      throw new Error(JSON.stringify(info), { cause: error });
    });
  await dev.click(version);
  await dev.waitForSelector('#drawer.show [data-commit-link]', { timeout: 5000 });
  assert.ok(await dev.$('#drawerBody a[href="https://gitlab.example.com/ipd/thermal-firmware"]'));
  assert.ok(
    await dev.$(
      '#drawerBody a[href="https://gitlab.example.com/ipd/thermal-firmware/-/commit/7b91c3e4"]',
    ),
  );
  await dev.click('#drawerBody [data-commit-link]');
  await dev.waitForSelector('#modalRoot.show', { visible: true });
  assert.match(await dev.$eval('#modalRoot h3', (el) => el.textContent), /GitLab 提交示例/);
  await qa.reload();
  await qa.click('[data-action=open-testing-sample]');
  await qa.waitForSelector('[data-stage=development].is-current');
  assert.equal(
    await qa.$$eval('.testing-feedback [data-feedback=view-defect]', (els) => els.length),
    1,
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS 测试示例首屏、八种只读角色、报告详情无退回按钮、测试页实际点击退回、缺陷同步、示例链接和刷新恢复',
  );
} finally {
  await browser.close();
}
