// Run against the dev or preview server: node tools/regression/cross-tab.mjs <url>
import assert from 'node:assert/strict';
import { loginAs, openPage, tick } from './browser.mjs';
import { runStep, scenarios } from './scenarios.mjs';

const url = process.argv[2] || 'http://localhost:5173';
for (const scenario of scenarios) {
  const { browser, page: first, fresh, errors } = await openPage(url);
  try {
    await fresh();
    const pages = new Map();
    for (const user of new Set(
      scenario.steps.filter((step) => step.login).map((step) => step.login),
    )) {
      const tab = pages.size ? await browser.newPage() : first;
      if (pages.size) {
        tab.on('pageerror', (error) => errors.push(error.message));
        await tab.goto(url, { waitUntil: 'load' });
      }
      assert.equal(await tab.evaluate(loginAs, user), 'ok');
      pages.set(user, tab);
    }
    let page;
    for (const step of scenario.steps) {
      if (process.env.TRACE_STEPS) console.log(step);
      if (step.login) {
        page = pages.get(step.login);
        continue;
      }
      await tick(page);
      // Keep the approver on the dashboard: the arriving request must appear by itself.
      if (step.nav === 'dashboard' && (await page.$('.approval-widget, [data-widget="approvals"]')))
        continue;
      if (step.sel) {
        await page.waitForFunction(
          (sel) =>
            [...document.querySelectorAll(sel)].some(
              (el) => el.getClientRects().length && !el.disabled,
            ),
          { timeout: 4000 },
          step.sel,
        );
      }
      await page.evaluate(() => document.querySelector('#toastRoot').replaceChildren());
      assert.equal(await page.evaluate(runStep, step), 'ok', JSON.stringify(step));
      if (step.toast) {
        await page.waitForFunction(
          (msg) => document.querySelector('#toastRoot').textContent.includes(msg),
          { timeout: 4000 },
          step.toast,
        );
      }
      // Let both delivered storage events and queued UI actions finish before the next click.
      await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 20)));
    }
    assert.deepEqual(errors, []);
    console.log('PASS', scenario.name, '(' + pages.size + ' tabs)');
  } finally {
    await browser.close();
  }
}

// Two configured approvers decide on the very same newly created project. The
// other account must see the task without navigating, and only one decision may win.
const { browser, page: manager, fresh, errors } = await openPage(url);
try {
  await fresh();
  assert.equal(await manager.evaluate(loginAs, 'pjm'), 'ok');
  const approvers = [];
  for (const username of ['director', 'rdlead']) {
    const tab = await browser.newPage();
    tab.on('pageerror', (error) => errors.push(error.message));
    await tab.goto(url);
    assert.equal(await tab.evaluate(loginAs, username), 'ok');
    approvers.push(tab);
  }
  assert.equal(await manager.evaluate(runStep, { nav: 'portfolio' }), 'ok');
  await manager.click('[data-action=new-project]');
  const title = '跨标签页立项验收';
  await manager.evaluate((name) => {
    for (const field of document.querySelectorAll('#modalRoot [data-v47-field][required]')) {
      if (!field.readOnly) field.value = field.dataset.v47Field === 'name' ? name : '演示值';
    }
  }, title);
  await manager.click('[data-v47=create-project]');
  const additional = '[data-approver-stage=planning][data-approver-role=rdManager]';
  await manager.waitForSelector(additional, { visible: true });
  await manager.bringToFront();
  await manager.$eval(additional, (el) => el.scrollIntoView({ block: 'center' }));
  await manager.click(additional);
  await manager.waitForFunction(() =>
    document.querySelector('#toastRoot').textContent.includes('审核角色已更新'),
  );
  await manager.$eval('[data-approval-action=submit][data-stage=planning]', (el) =>
    el.scrollIntoView({ block: 'center' }),
  );
  await manager.click('[data-approval-action=submit][data-stage=planning]');
  const approve = '[data-approval-action=decide][data-decision=approve]';
  for (const tab of approvers) {
    await tab.waitForFunction(
      (name) => document.querySelector('.approval-widget')?.textContent.includes(name),
      {},
      title,
    );
    await tab.click(approve);
    await tab.waitForSelector('[data-approval-action=confirm]', { visible: true });
  }
  await Promise.all(approvers.map((tab) => tab.click('[data-approval-action=confirm]')));
  await manager.waitForSelector('.approval-last');
  await manager.evaluate(runStep, { nav: 'project-lifecycle' });
  await manager.waitForSelector('[data-stage=requirements].is-current');
  const records = await manager.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.startsWith('rd-platform:workflow:'));
    return JSON.parse(localStorage.getItem(key)).approvalRequests;
  });
  assert.equal(records.length, 1);
  assert.equal(records[0].decisions.length, 1);
  await manager.reload();
  assert.equal(await manager.evaluate(runStep, { nav: 'portfolio' }), 'ok');
  await manager.waitForFunction(
    (name) => document.querySelector('#appView').textContent.includes(name),
    {},
    title,
  );
  assert.deepEqual(errors, []);
  console.log('PASS 新建项目、双主管同时审批、自动回写与刷新恢复');

  // Delete the actual project created above, while a second role is viewing its detail.
  const other = approvers[0];
  const id = records[0].projectId;
  await other.evaluate(runStep, { nav: 'portfolio' });
  assert.equal(await other.$('[data-action="delete-project"]'), null);
  await other.click(`[data-action="open-project"][data-project="${id}"]`);
  await other.waitForFunction(
    (name) => document.querySelector('#crumb').textContent.includes(name),
    {},
    title,
  );
  const remove = `[data-action="delete-project"][data-project="${id}"]`;
  await manager.click(remove);
  await manager.waitForFunction(
    (name) => document.querySelector('#modalRoot.show').textContent.includes(name),
    {},
    title,
  );
  await manager.click('#modalRoot [data-action=close-modal]');
  assert.ok(await manager.$(remove));
  await manager.click('[data-action=toggle-project-view]');
  await manager.click(remove);
  await manager.click('#modalRoot [data-action=confirm-delete-project]');
  await manager.waitForFunction((sel) => !document.querySelector(sel), {}, remove);
  await other.waitForFunction(() =>
    document.querySelector('#crumb').textContent.includes('项目集'),
  );
  await manager.reload();
  await manager.evaluate(runStep, { nav: 'portfolio' });
  assert.equal(await manager.$(remove), null);
  const remaining = await manager.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.startsWith('rd-platform:workflow:'));
    return JSON.parse(localStorage.getItem(key));
  });
  assert.equal(JSON.stringify(remaining).includes(id), false);
  assert.deepEqual(Object.keys(remaining.projects).sort(), [
    'algorithm',
    'cloud',
    'gateway',
    'thermal',
  ]);
  for (const seed of Object.keys(remaining.projects)) {
    await manager.click(`[data-action="delete-project"][data-project="${seed}"]`);
    await manager.click('#modalRoot [data-action=confirm-delete-project]');
    await manager.waitForFunction(
      (pid) => !document.querySelector(`[data-action="delete-project"][data-project="${pid}"]`),
      {},
      seed,
    );
  }
  await manager.reload();
  await manager.evaluate(runStep, { nav: 'portfolio' });
  await manager.waitForFunction(() =>
    document.querySelector('#appView').textContent.includes('暂无项目'),
  );
  await manager.click('[data-action=new-project]');
  await manager.waitForSelector('#modalRoot.show [data-v47=create-project]');
  // A deletion also withdraws a live approval with its confirmation modal open.
  const replacement = '重新建项并撤销待办';
  await manager.evaluate((name) => {
    for (const field of document.querySelectorAll('#modalRoot [data-v47-field][required]')) {
      if (!field.readOnly) field.value = field.dataset.v47Field === 'name' ? name : '验收值';
    }
  }, replacement);
  await manager.click('[data-v47=create-project]');
  await other.evaluate(runStep, { nav: 'dashboard' });
  await manager.waitForSelector('[data-approval-action=submit][data-stage=planning]', {
    visible: true,
  });
  await manager.click('[data-approval-action=submit][data-stage=planning]');
  await other.waitForSelector(approve, { visible: true });
  await other.click(approve);
  await other.waitForSelector('#modalRoot.show [data-approval-action=confirm]', { visible: true });
  await manager.evaluate(runStep, { nav: 'portfolio' });
  await manager.click('[data-action=delete-project]');
  await manager.click('#modalRoot [data-action=confirm-delete-project]');
  await other.waitForFunction(
    () => !document.querySelector('#modalRoot.show, [data-approval-action=decide]'),
  );
  await manager.waitForFunction(() =>
    document.querySelector('#appView').textContent.includes('暂无项目'),
  );
  assert.deepEqual(errors, []);
  console.log('PASS 经理删除、取消与权限隔离、跨页退出、关联记录清理、刷新及空项目集');
} finally {
  await browser.close();
}
