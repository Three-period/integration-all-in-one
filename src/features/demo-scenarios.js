/** Mock 演示场景（V39）：一键载入不同阶段的演示数据。 */
import { devReviewStore, getDevReview } from '../store/lifecycle.js';
import { App } from '../core/app.js';
import { showToast } from '../components/toast.js';
import { esc } from '../core/dom.js';

import { state } from '../store/state.js';

let baseRenderLifecycle;

/* V39 可选择的 Mock 演示场景：仅供原型展示，不改真实后端或现有业务规则 */
function renderScenarioPanel() {
  var options = [
    ['fresh', '从头演示 · 开发准备'],
    ['ai-issue', 'AI发现问题 · 待开发处理'],
    ['review', 'AI通过 · 待人工检视'],
    ['handoff', '专业检视通过 · 待测试'],
    ['testpass', '测试完成 · 待发布'],
    ['published', '版本已发布 · 待结项'],
  ];
  return (
    '<div class="notice" style="align-items:center;flex-wrap:wrap;margin-bottom:12px;background:#f8fafc;border-color:#e4e7ec;color:#475467"><span>🎬 <b>Mock 演示场景</b> · 当前：' +
    esc(state.v39ScenarioName || '未选择') +
    '</span><select id="v39ScenarioSelect" class="input" style="max-width:250px;margin-left:auto"><option value="">选择场景（仅当前项目）</option>' +
    options
      .map(function (x) {
        return '<option value="' + x[0] + '">' + x[1] + '</option>';
      })
      .join('') +
    '</select><button class="btn" data-v39="load">载入场景</button></div>'
  );
}

function seedDemoScenario(key) {
  var pid = state.projectId;
  delete devReviewStore[pid];
  if (state.v37Reports) delete state.v37Reports[pid];
  if (state.v37Published) delete state.v37Published[pid];
  if (state.v37PublishReview) delete state.v37PublishReview[pid];
  state.v38TestProject = null;
  state.testingCases = null;
  state.testingDefects = null;
  state.releaseProjectId = null;
  state.releaseProjects = null;
  state.v38ClosingProject = null;
  state.closingForms = null;
  state.closingArchiveRecords = null;
  state.closingEmergencyStatus = '待审批';
  state.v37ReportTab = 'detail';
  var d = getDevReview(),
    at = '2026-11-04 16:30',
    commit = 'mock-thermal-v26-a1';
  d.task = 'TASK-142';
  d.developer = '孙宁';
  d.role = 'developer';
  d.tab = 'dev';
  d.section = 'overview';
  d.reviewMode = 'todos';
  if (key !== 'fresh') {
    d.commit = commit;
    d.commits = [{ commit: commit, owner: '孙宁', at: at }];
    d.smokes = [
      { commit: commit, owner: '孙宁', result: '通过', text: '核心链路冒烟测试通过。', at: at },
    ];
    d.selfTests = [
      { commit: commit, owner: '孙宁', text: '高并发数据上报及异常分支自测完成。', at: at },
    ];
    var names = ['文件一致性', '文件正确性', '方案与代码一致性', '点检项检查'];
    d.runs = [
      {
        id: 'AI-001',
        commit: commit,
        at: at,
        ruleVersion: 'RULE-1.0',
        result: '完成',
        checks: names.map(function (n) {
          return { name: n, result: '通过', detail: '演示数据：完成对应检查。' };
        }),
        owner: '孙宁',
      },
    ];
    d.seq = 1;
  }
  if (key === 'ai-issue')
    d.issues = [
      {
        id: 'ISS-001',
        source: 'AI 检视',
        title: '异常分支缺少状态回收处理',
        commit: commit,
        run: 'AI-001',
        evidence: '规则 R-017 命中（演示）',
        status: '待整改',
        dispute: '',
        reply: '',
      },
    ];
  if (['review', 'handoff', 'testpass', 'published'].includes(key))
    d.formalRequest = { commit: commit, at: at, owner: '孙宁' };
  if (['handoff', 'testpass', 'published'].includes(key)) {
    d.manual = ['高风险必查', 'AI 未有效覆盖', '独立抽检'].map(function (k) {
      return {
        kind: k,
        commit: commit,
        result: '无新增问题',
        text: '演示：检查未发现新增问题',
        at: at,
      };
    });
    d.approval = { commit: commit, at: at, reviewer: '检视工程师' };
    d.handoff = true;
  }
  if (['testpass', 'published'].includes(key)) {
    var r = App.getTestReport('system');
    r.name = '整机测试报告';
    r.version = 'V2.6';
    r.owner = '赵敏';
    r.commit = commit;
    r.conclusion = '演示数据：整机功能、联调与回归测试完成，测试结论通过。';
    r.status = '审核通过';
    r.history = [
      {
        name: r.name,
        version: r.version,
        owner: r.owner,
        conclusion: r.conclusion,
        status: '审核通过',
        at: at,
      },
    ];
    App.testingInit();
    state.testingCases.forEach(function (t) {
      if (t.id === 'TC-1002') t.status = '通过';
    });
  }
  if (key === 'published') {
    if (!state.v37PublishReview) state.v37PublishReview = {};
    if (!state.v37Published) state.v37Published = {};
    state.v37PublishReview[pid] = '已通过';
    state.v37Published[pid] = { status: '已发布', at: at };
  }
  state.lifecycleStage =
    key === 'fresh' || key === 'ai-issue' || key === 'review'
      ? 'development'
      : key === 'handoff'
        ? 'testing'
        : key === 'testpass'
          ? 'release'
          : 'closing';
  if (key === 'handoff') state.testingSection = 'cases';
  if (key === 'testpass') state.closingSection = 'versions';
  state.v39ScenarioName = {
    fresh: '从头演示',
    'ai-issue': 'AI问题待处理',
    review: 'AI通过待人工检视',
    handoff: '检视通过待测试',
    testpass: '测试通过待发布',
    published: '已发布待结项',
  }[key];
  App.render();
  showToast('已载入 ' + state.v39ScenarioName + '（Mock，当前项目）');
}
App.seedDemoScenario = seedDemoScenario;

/** V39 Mock 演示场景 */
export function initDemoScenarios() {
  baseRenderLifecycle = App.renderLifecycle;
  App.renderLifecycle = function () {
    var h = baseRenderLifecycle();
    return h.replace(
      '<div class="stage-block">',
      renderScenarioPanel() + '<div class="stage-block">',
    );
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-v39="load"]');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    var select = document.querySelector('#v39ScenarioSelect'),
      key = select && select.value;
    if (!key) {
      showToast('请选择演示场景', 'warn');
      return;
    }
    App.seedDemoScenario(key);
  });
}
