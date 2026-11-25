/**
 * Scripted business flows driven only through the UI (data attributes), so they stay
 * valid while the implementation is refactored. A snapshot is recorded after every step.
 */
import { openPage, snapshot, hashSnapshot, loginAs, tick } from './browser.mjs';

const stage = (name) => ({ sel: `[data-action="lifecycle-stage"][data-stage="${name}"]` });
const login = (username) => ({ login: username });
const nav = (name) => ({ nav: name });

/** 审核人在个人工作台「审批中心」处理第一条待审核记录。 */
const decideFirst = (decision, comment, toast) => [
  nav('dashboard'),
  { sel: `[data-approval-action=decide][data-decision=${decision}]` },
  ...(comment ? [{ fill: { '[data-approval-comment]': comment } }] : []),
  { sel: '[data-approval-action=confirm]', toast },
];

const developerSubmitsForReview = (aiMode, smokeResult = '通过') => [
  login('dev'),
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
  login('reviewer'),
  stage('development'),
  { sel: '[data-v5=choose-task]' },
  { sel: '[data-v5=manual-open]' },
  { selectAll: { '#drawer select': '无新增问题' } },
  { sel: '[data-v5=manual-save]' },
  { sel: '[data-v5=approve]', toast: '正式检视通过' },
];

const testerSubmitsReports = [
  login('qa'),
  stage('testing'),
  ...['smoke', 'single', 'long', 'system'].flatMap((kind) => [
    { sel: `[data-testing-section=${kind}]` },
    { sel: '[data-v54-report=new]' },
    { sel: '[data-v54-report=submit]' },
  ]),
  { sel: '[data-approval-action=submit][data-stage=testing]', toast: '已提交测试审核' },
];

const releaseAndClose = [
  login('pjm'),
  nav('project-lifecycle'),
  stage('release'),
  { sel: '[data-approval-action=submit][data-stage=release]', toast: '已提交发布评审' },
  login('director'),
  ...decideFirst('approve', '', '发布评审已通过'),
  login('pjm'),
  nav('project-lifecycle'),
  stage('release'),
  { sel: '[data-closing-section=versions]' },
  { sel: '[data-v52-release=publish]', toast: '版本已发布' },
  stage('closing'),
  { sel: '[data-release-page-action=open-detail]' },
  { sel: '[data-release-drawer-action=submit]' },
];

export const scenarios = [
  {
    name: '冒烟结果未通过时不能申请 AI 检视',
    steps: [
      ...developerSubmitsForReview('pass', '失败').slice(0, -1),
      { check: '[data-v35=request-ai][disabled]' },
      { sel: '[data-action=close-drawer]' },
    ],
  },
  {
    name: '主流程：开发 → 检视 → 测试审核（先退回）→ 发布评审 → 发布 → 结项',
    steps: [
      ...developerSubmitsForReview('pass'),
      { sel: '[data-v5=dev-submit]' },
      { sel: '[data-action=close-drawer]' },
      ...reviewerApproves,
      ...testerSubmitsReports,
      login('testlead'),
      ...decideFirst('reject', '', '退回时请填写审核意见'),
      { fill: { '[data-approval-comment]': '整机报告缺少异常场景' } },
      { sel: '[data-approval-action=confirm]', toast: '测试审核已退回' },
      login('qa'),
      stage('testing'),
      { sel: '[data-approval-action=submit][data-stage=testing]', toast: '已提交测试审核' },
      login('qalead'),
      ...decideFirst('approve', '补充后通过', '测试审核已通过'),
      ...releaseAndClose,
      stage('planning'),
      { check: '.lc-node.kind-end.is-done' },
      { check: '[data-stage=closing].is-done' },
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
      login('reviewer'),
      stage('development'),
      { sel: '[data-v5=choose-task]' },
      { sel: '#appView input[type=checkbox]', nth: 0 },
      { sel: '[data-v5=batch-noissue]' },
      { fill: { '#v5NoIssueReason': '确认为误报' } },
      { sel: '[data-v5=batch-noissue-save]' },
      { sel: '[data-v5=manual-open]' },
      { selectAll: { '#drawer select': '无新增问题' } },
      { sel: '[data-v5=manual-save]' },
      { sel: '[data-v5=approve]', toast: '正式检视通过' },
    ],
  },
  {
    name: '新项目：立项审核 → 未开始阶段只读 → 需求审核（先退回）→ 设计文档逐份审核 → 设计阶段完成',
    steps: [
      login('pjm'),
      nav('portfolio'),
      { sel: '[data-action=open-project][data-project=gateway]' },
      nav('project-lifecycle'),
      stage('requirements'),
      { sel: '[data-req-drawer-action=create]', toast: '仅可查看' },
      stage('planning'),
      { sel: '[data-approval-action=submit][data-stage=planning]', toast: '已提交立项审核' },
      login('director'),
      ...decideFirst('approve', '', '立项审核已通过'),
      login('pm'),
      nav('portfolio'),
      { sel: '[data-action=open-project][data-project=gateway]' },
      nav('project-lifecycle'),
      stage('requirements'),
      { sel: '[data-req-drawer-action=create]' },
      { sel: '[data-req-action=submit]', toast: '已提交需求审核' },
      login('rdlead'),
      ...decideFirst('reject', '请补充验收标准', '需求审核已退回'),
      login('pm'),
      nav('project-lifecycle'),
      stage('requirements'),
      { sel: '[data-req-drawer-action=create]' },
      { sel: '[data-req-action=submit]', toast: '已提交需求审核' },
      login('rdlead'),
      ...decideFirst('approve', '', '需求审核已通过'),
      ...['软件规格书', '概要设计', '详细设计'].flatMap((type) => [
        login('pm'),
        nav('project-lifecycle'),
        stage('design'),
        { sel: `[data-design-category=${type}]` },
        { sel: '[data-design-page-action=create]' },
        { sel: '[data-design-drawer-action=submit]', toast: '已提交设计文档审核' },
        login('director'),
        ...decideFirst('approve', '', '设计文档审核已通过'),
      ]),
      login('pm'),
      nav('project-lifecycle'),
      { check: '[data-stage=design].is-done' },
      { check: '[data-stage=development].is-current' },
    ],
  },
  {
    name: '发布评审退回后重新提交，发布并结项',
    steps: [
      ...developerSubmitsForReview('pass'),
      { sel: '[data-v5=dev-submit]' },
      { sel: '[data-action=close-drawer]' },
      ...reviewerApproves,
      ...testerSubmitsReports,
      login('testlead'),
      ...decideFirst('approve', '', '测试审核已通过'),
      login('pjm'),
      nav('project-lifecycle'),
      stage('release'),
      { sel: '[data-approval-action=submit][data-stage=release]', toast: '已提交发布评审' },
      login('qalead'),
      ...decideFirst('reject', '归档文档不完整', '发布评审已退回'),
      ...releaseAndClose,
    ],
  },
];

function runStep(s) {
  const visible = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
  const fire = (e, type) => e.dispatchEvent(new Event(type, { bubbles: true }));
  if (s.check) return document.querySelector(s.check) ? 'ok' : 'CHECK FAILED ' + s.check;
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
        const step = sc.steps[i];
        let status = await page.evaluate(step.login ? loginAs : runStep, step.login || step);
        await settle();
        const snap = await page.evaluate(snapshot);
        // 预期提示：动作后应出现包含该文字的提示。
        if (status === 'ok' && step.toast && !snap.toasts.some((t) => t.includes(step.toast)))
          status = `EXPECTED TOAST「${step.toast}」，实际「${snap.toasts.join(' / ') || '无'}」`;
        steps.push({
          ctx: ctx.label,
          act: JSON.stringify(step),
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
