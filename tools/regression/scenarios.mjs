/**
 * Scripted business flows driven only through the UI (data attributes), so they stay
 * valid while the implementation is refactored. A snapshot is recorded after every step.
 */
import { openPage, snapshot, hashSnapshot, tick } from './browser.mjs';

const stage = (name) => ({ sel: `[data-action="lifecycle-stage"][data-stage="${name}"]` });
const asRole = (role) => [{ nav: 'dashboard' }, { role }, { nav: 'project-lifecycle' }];

const developerSubmitsForReview = (aiMode, smokeResult = '通过') => [
  { role: 'developer' },
  { nav: 'project-lifecycle' },
  stage('development'),
  { sel: '[data-v35=open][data-kind=smoke]' },
  { select: { '#v35SmokeResult': smokeResult } },
  { fill: { '#v35SmokeText': '冒烟执行记录' } },
  { sel: '[data-v35=submit-smoke]' },
  { sel: '[data-v35=open][data-kind=self]' },
  { fill: { '#v35SelfEditor': '自测全部通过' } },
  { sel: '[data-v35=submit-self]' },
  { sel: '[data-v35=open][data-kind=repo]' },
  { sel: '[data-v35=generate-commit]' },
  { sel: '[data-v35=save-repo]' },
  { sel: '[data-v35=open][data-kind=ai]' },
  { select: { '#v35AiMode': aiMode } },
  { sel: '[data-v35=request-ai]' },
];

const reviewerApproves = [
  ...asRole('reviewer'),
  stage('development'),
  { sel: '[data-v5=choose-task]' },
  { sel: '[data-v5=manual-open]' },
  { selectAll: { '#drawer select': '无新增问题' } },
  { sel: '[data-v5=manual-save]' },
  { sel: '[data-v5=approve]' },
];

const testerSubmitsReports = [
  ...asRole('tester'),
  stage('testing'),
  ...['smoke', 'single', 'long', 'system'].flatMap((kind) => [
    { sel: `[data-testing-section=${kind}]` },
    { sel: '[data-v54-report=new]' },
    { sel: '[data-v54-report=submit]' },
  ]),
];

const managerApprovesTesting = [
  ...asRole('project'),
  stage('planning'),
  { sel: '[data-v54-stage=testing]' },
];

const closeProject = [
  stage('closing'),
  { sel: '[data-release-page-action=open-detail]' },
  { sel: '[data-release-drawer-action=submit]' },
];

export const scenarios = [
  {
    name: '冒烟结果未通过时不能申请 AI 检视',
    steps: [...developerSubmitsForReview('pass', '失败'), { sel: '[data-action=close-drawer]' }],
  },
  {
    name: '主流程：开发 → AI 检视 → 专业检视 → 测试 → 发布 → 结项',
    steps: [
      ...developerSubmitsForReview('pass'),
      { sel: '[data-v5=dev-submit]' },
      { sel: '[data-action=close-drawer]' },
      ...reviewerApproves,
      ...testerSubmitsReports,
      ...managerApprovesTesting,
      stage('release'),
      { sel: '[data-closing-section=versions]' },
      { sel: '[data-v52-release=review]' },
      { sel: '[data-v52-release=publish]' },
      ...closeProject,
    ],
  },
  {
    name: 'AI 发现问题 → 异议与整改 → 复检 → 关闭异议 → 检视通过',
    steps: [
      ...developerSubmitsForReview('issues'),
      { sel: '[data-v35=ai-section][data-section=issues]' },
      { sel: '#drawer input[type=checkbox]', nth: 1 },
      { sel: '[data-v35=batch-dispute]' },
      { fill: { '#v45DisputeText': '该问题为误报' } },
      { sel: '[data-v35=confirm-dispute-batch]' },
      { sel: '[data-v35=open][data-kind=ai]' },
      { sel: '[data-v35=ai-section][data-section=issues]' },
      { sel: '#drawer input[type=checkbox]', nth: 0 },
      { sel: '[data-v35=batch-fix]' },
      { sel: '[data-action=close-drawer]' },
      { sel: '[data-v35=open][data-kind=smoke]' },
      { fill: { '#v35SmokeText': '复检冒烟通过' } },
      { sel: '[data-v35=submit-smoke]' },
      { sel: '[data-v35=open][data-kind=self]' },
      { fill: { '#v35SelfEditor': '复检自测通过' } },
      { sel: '[data-v35=submit-self]' },
      { sel: '[data-v35=open][data-kind=repo]' },
      { sel: '[data-v35=generate-commit]' },
      { sel: '[data-v35=save-repo]' },
      { sel: '[data-v35=open][data-kind=ai]' },
      { sel: '[data-v35=request-ai]' },
      { sel: '[data-v5=dev-submit]' },
      { sel: '[data-action=close-drawer]' },
      ...asRole('reviewer'),
      stage('development'),
      { sel: '[data-v5=choose-task]' },
      { sel: '#appView input[type=checkbox]', nth: 0 },
      { sel: '[data-v5=batch-noissue]' },
      { fill: { '#v5NoIssueReason': '确认为误报' } },
      { sel: '[data-v5=batch-noissue-save]' },
      { sel: '[data-v5=manual-open]' },
      { selectAll: { '#drawer select': '无新增问题' } },
      { sel: '[data-v5=manual-save]' },
      { sel: '[data-v5=approve]' },
    ],
  },
  {
    name: '新项目：立项 → 需求规格书 → 设计审批拦截 → 设计文档评审 → 设计阶段通过',
    steps: [
      { role: 'project' },
      { nav: 'portfolio' },
      { sel: '[data-action=open-project][data-project=gateway]' },
      { nav: 'project-lifecycle' },
      stage('planning'),
      { sel: '[data-v47=approve-stage][data-stage=planning]' },
      stage('planning'),
      { sel: '[data-v47=approve-stage][data-stage=requirements]' },
      stage('planning'),
      { sel: '[data-v47=doc-open][data-doc=requirement]' },
      { sel: '[data-v47=doc-save][data-close]' },
      stage('planning'),
      { sel: '[data-v47=approve-stage][data-stage=requirements]' },
      stage('planning'),
      { sel: '[data-v54-stage=design]' },
      stage('design'),
      ...['软件规格书', '概要设计', '详细设计'].flatMap((type) => [
        { sel: `[data-design-category=${type}]` },
        { sel: '[data-design-page-action=create]' },
        { sel: '[data-design-drawer-action=submit]' },
        { select: { '#appView select[data-design-inline-field=status]': '评审通过' } },
      ]),
      stage('planning'),
      { sel: '[data-v54-stage=design]' },
      stage('planning'),
    ],
  },
  {
    name: '测试通过后一键发布并结项',
    steps: [
      ...developerSubmitsForReview('pass'),
      { sel: '[data-v5=dev-submit]' },
      { sel: '[data-action=close-drawer]' },
      ...reviewerApproves,
      ...testerSubmitsReports,
      ...managerApprovesTesting,
      stage('planning'),
      { sel: '[data-v47=demo-release]' },
      ...closeProject,
    ],
  },
];

function runStep(s) {
  const visible = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
  const fire = (e, type) => e.dispatchEvent(new Event(type, { bubbles: true }));
  if (s.role) {
    const x = document.querySelector('#roleSelect');
    if (!x) return 'NOT FOUND #roleSelect';
    x.value = s.role;
    fire(x, 'change');
    return 'ok';
  }
  if (s.nav) {
    document.querySelectorAll('[data-nav-group]').forEach((g) => {
      if (!g.closest('.nav-group.is-open')) g.click();
    });
    const e = document.querySelector(`#sidebar [data-nav="${s.nav}"]`);
    if (!e) return 'NOT FOUND nav ' + s.nav;
    e.click();
    return 'ok';
  }
  const setValues = (map, all) => {
    for (const [sel, v] of Object.entries(map)) {
      const list = all ? [...document.querySelectorAll(sel)] : [document.querySelector(sel)];
      if (!list[0]) return 'NOT FOUND ' + sel;
      list.forEach((e) => {
        if (e.isContentEditable) e.innerHTML = v;
        else e.value = v;
        fire(e, 'input');
        fire(e, 'change');
      });
    }
    return 'ok';
  };
  if (s.fill) return setValues(s.fill, false);
  if (s.select) return setValues(s.select, false);
  if (s.selectAll) return setValues(s.selectAll, true);
  const el = [...document.querySelectorAll(s.sel)].filter(visible)[s.nth || 0];
  if (!el) return 'NOT FOUND ' + s.sel;
  el.click();
  return 'ok';
}

export async function runScenarios(url) {
  const results = [];
  const errors = [];
  for (const sc of scenarios) {
    const { browser, page, errors: errs, ctx, settle, fresh } = await openPage(url);
    try {
      await fresh();
      const steps = [];
      for (let i = 0; i < sc.steps.length; i++) {
        ctx.label = `${sc.name} #${i + 1}`;
        await tick(page);
        const status = await page.evaluate(runStep, sc.steps[i]);
        await settle();
        const snap = await page.evaluate(snapshot);
        steps.push({
          ctx: ctx.label,
          act: JSON.stringify(sc.steps[i]),
          status,
          toasts: snap.toasts,
          snap: hashSnapshot(snap),
        });
      }
      results.push({ name: sc.name, steps });
    } finally {
      errors.push(...errs);
      await browser.close();
    }
  }
  return { results, errors };
}
