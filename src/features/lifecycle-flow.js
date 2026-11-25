/** 统一 Mock 生命周期（V47）：阶段流转、角色门禁、项目创建与运营数据。 */
import { App } from '../core/app.js';
import { closeDrawer, openDrawer, openModal } from '../components/overlays.js';
import { showToast } from '../components/toast.js';
import { esc } from '../core/dom.js';
import { projects } from '../data/projects.js';
import { v35Data, v35Latest, v35Store } from './dev-review.js';
import { project, state } from '../store/state.js';

let v47InitialProjects;
let v47PrevBasic;
let v47PrevSidebar;
let v47PrevReady;
let v47PrevCard;
let v47PrevDevelopment;

let v47PrevReviewer;
let v47PrevLifecycle;
let v47PrevOps;
let v47PrevOpsRender;
let v47PrevOpsTabs;
let v47PrevRequirement;
let v47PrevDesign;

const v47Demo = Object.create(null);

export const v47Docs = Object.create(null);

/* V55.4: the built-in thermal demo starts at development; an explicit Mock reset still starts from planning. */
const v47DefaultDemoSteps = { planning: true, requirements: true, design: true };

const v47Stages = ['planning', 'requirements', 'design', 'development', 'testing', 'release'];

const v47Labels = {
  planning: '项目立项',
  requirements: '需求阶段',
  design: '设计阶段',
  development: '开发阶段',
  testing: '测试阶段',
  release: '发布阶段',
};

export function v47Flow() {
  var k = state.projectId;
  if (!v47Demo[k])
    v47Demo[k] = {
      steps: k === 'thermal' ? Object.assign({}, v47DefaultDemoSteps) : {},
      docs: {},
      history: [],
      created: false,
      version: 'V1.0',
      designType: 'II',
    };
  return v47Demo[k];
}

export function v47Note(msg) {
  v47Flow().history.unshift({ at: new Date().toLocaleString('zh-CN'), text: msg });
}

function v47StageDone(k) {
  var f = v47Flow(),
    x = f.steps;
  if (k === 'development') return !!(v35Data().handoff && v35Data().approval);
  if (k === 'testing') return !!App.v38Status().testPass;
  if (k === 'release') return !!App.v38Status().published;
  return !!x[k];
}
App.v47StageDone = v47StageDone;

export function v47Prereq(k) {
  var i = v47Stages.indexOf(k);
  return i === 0 || App.v47StageDone(v47Stages[i - 1]);
}

function v47FormDetails(p) {
  var options = [
    ['name', '项目名称', true, p.name || '', 'text'],
    ['creator', '创建人', true, p.creator || '何盈', 'text'],
    ['createdAt', '创建日期', true, p.createdAt || new Date().toISOString().slice(0, 10), 'date'],
    ['department', '所属部门', true, p.department || '软件一科', 'text'],
    ['flowStatus', '流程状态', true, p.flowStatus || '立项阶段', 'text'],
    ['product', '所属产品', true, p.product || '', 'text'],
    ['parentProject', '所属项目', true, p.parentProject || '', 'text'],
    ['order', '所属订单', false, p.order || '', 'text'],
    [
      'versionTypes',
      '版本类型（多选；选项待业务确认）',
      true,
      p.versionTypes || '需求触发',
      'text',
    ],
    ['softwareCode', '软件编码', true, p.softwareCode || '', 'text'],
    ['softwareType', '软件类型', true, p.softwareType || '', 'text'],
    ['softwareDescription', '软件描述', true, p.softwareDescription || p.goal || '', 'textarea'],
    ['upgradeVersion', '归档或升级版本', true, p.upgradeVersion || '', 'text'],
    ['repo', '仓库路径（GitLab）', true, p.repo || '', 'text'],
    ['version', '版本号（进入测试时必填）', false, p.version || '', 'text'],
  ];
  return (
    '<div class="v47-form">' +
    options
      .map(function (a) {
        var id = a[0],
          required = a[2],
          val = esc(a[3]);
        var locked = ['creator', 'createdAt', 'flowStatus'].includes(id);
        return (
          '<div class="v47-field ' +
          (id === 'softwareDescription' ? 'full' : '') +
          '"><label>' +
          esc(a[1]) +
          (required ? ' *' : '') +
          '</label>' +
          (a[4] === 'textarea'
            ? '<textarea data-v47-field="' +
              id +
              '" ' +
              (required ? 'required' : '') +
              '>' +
              val +
              '</textarea>'
            : '<input data-v47-field="' +
              id +
              '" type="' +
              a[4] +
              '" value="' +
              val +
              '" ' +
              (required ? 'required' : '') +
              ' ' +
              (locked ? 'readonly' : '') +
              '>') +
          '</div>'
        );
      })
      .join('') +
    '</div>'
  );
}
App.v47FormDetails = v47FormDetails;

function v47ReadForm() {
  var p = {};
  document.querySelectorAll('[data-v47-field]').forEach(function (e) {
    p[e.dataset.v47Field] = (e.value || '').trim();
  });
  return p;
}

function v47ProjectModal() {
  openModal(
    'v47-project',
    '新建项目 · 项目基础信息',
    '<div class="notice">依据提供的项目基础信息清单；版本类型未展示的选项留待业务确认，采用文本记录。</div>' +
      App.v47FormDetails(
        {
          creator: '何盈',
          flowStatus: '立项阶段',
          createdAt: new Date().toISOString().slice(0, 10),
        },
        'new',
      ),
    '<button class="btn" data-v47="cancel-modal">取消</button><button class="btn primary" data-v47="create-project">创建项目</button>',
  );
}

function v47CreateProject() {
  var p = v47ReadForm();
  var fields = [
    'name',
    'department',
    'product',
    'parentProject',
    'versionTypes',
    'softwareCode',
    'softwareType',
    'softwareDescription',
    'upgradeVersion',
    'repo',
  ];
  var missing = fields.find(function (k) {
    return !p[k];
  });
  if (missing) {
    showToast(
      '请补全必填字段：' +
        document
          .querySelector('[data-v47-field="' + missing + '"]')
          .closest('.v47-field')
          .querySelector('label').textContent,
      'warn',
    );
    return;
  }
  var id = 'demo-' + Date.now(),
    code =
      'PRJ' +
      new Date().toISOString().slice(0, 10).replace(/-/g, '') +
      '-' +
      String(Object.keys(projects).length + 1).padStart(2, '0');
  projects[id] = Object.assign(
    {
      code: code,
      type: '产品开发',
      owner: '何盈',
      ownerDetail: '何盈 / Mock',
      start: p.createdAt,
      end: '2027-03-31',
      status: '待立项',
      progress: 0,
      health: '健康',
      goal: p.softwareDescription,
      period: '演示项目',
    },
    p,
  );
  v47Demo[id] = {
    steps: {},
    docs: {},
    history: [],
    created: true,
    version: p.version || 'V1.0',
    designType: 'II',
  };
  state.projectId = id;
  state.projectSection = 'basic';
  state.lifecycleStage = 'planning';
  state.view = 'project-basic';
  document.querySelector('#modalRoot').classList.remove('show');
  App.render();
  showToast('项目创建成功；现在可以从立项开始演示');
}

function v47BasicPanel() {
  var p = project();
  return (
    '<section class="card" style="padding:17px;margin-bottom:15px"><div class="card-head"><b>项目基础信息 · 新建表单同步</b><span class="mini-note">同一份项目记录 · Mock</span></div>' +
    App.v47FormDetails(p, 'edit') +
    '<div style="margin-top:12px"><button class="v47-cta" data-v47="save-basic">保存项目基础信息</button></div></section>'
  );
}

function v47StagePanel() {
  var f = v47Flow(),
    cur = state.lifecycleStage,
    k = cur === 'closing' ? 'release' : cur;
  if (!v47Labels[k]) return '';
  var prior = v47Prereq(k),
    done = App.v47StageDone(k),
    steps = v47Stages
      .map(function (n) {
        return (
          '<span class="v47-step ' +
          (App.v47StageDone(n) ? 'ok' : '') +
          '">' +
          esc(v47Labels[n]) +
          ' · ' +
          (App.v47StageDone(n) ? '已完成' : '待完成') +
          '</span>'
        );
      })
      .join('');
  var actions = '';
  if (k === 'planning') {
    actions =
      '<button class="v47-cta" data-v47="approve-stage" data-stage="planning" ' +
      (done ? 'disabled' : '') +
      '>模拟立项审核通过</button>';
  }
  if (k === 'requirements') {
    actions =
      '<button class="v47-btn" data-v47="doc-open" data-doc="requirement">在线编写规格书</button><button class="v47-cta" data-v47="approve-stage" data-stage="requirements" ' +
      (!prior || done ? 'disabled' : '') +
      '>提交并模拟需求审核通过</button>';
  }
  if (k === 'design') {
    actions =
      '<select id="v47DesignType" class="input" style="max-width:105px"><option value="I" ' +
      (f.designType === 'I' ? 'selected' : '') +
      '>I 类</option><option value="II" ' +
      (f.designType === 'II' ? 'selected' : '') +
      '>II 类</option><option value="III" ' +
      (f.designType === 'III' ? 'selected' : '') +
      '>III 类</option><option value="IV" ' +
      (f.designType === 'IV' ? 'selected' : '') +
      '>IV 类</option></select><button class="v47-btn" data-v47="doc-open" data-doc="design">在线编写设计文档</button><button class="v47-cta" data-v47="approve-stage" data-stage="design" ' +
      (!prior || done ? 'disabled' : '') +
      '>模拟设计评审通过</button>';
  }
  if (k === 'development') {
    actions = '<span class="mini-note">以当前检视工作台完成 AI / 人工检视及测试移交后准出</span>';
  }
  if (k === 'testing') {
    actions =
      '<button class="v47-cta" data-v47="demo-testing" ' +
      (!prior || done ? 'disabled' : '') +
      '>填写并模拟整机测试报告审核</button>';
  }
  if (k === 'release') {
    actions =
      '<button class="v47-cta" data-v47="demo-release" ' +
      (!prior || done ? 'disabled' : '') +
      '>模拟发布评审、归档并正式发布</button>';
  }
  return (
    '<div class="v47-gate"><div class="v47-row"><div><b>全链路演示 · ' +
    v47Labels[k] +
    '</b><div class="mini-note">当前项目：' +
    esc(project().name) +
    ' · ' +
    (done ? '本阶段已完成' : prior ? '前置条件已满足' : '前置阶段尚未完成，当前操作受阻') +
    '</div></div><div class="v47-row">' +
    actions +
    '</div></div><div class="v47-steps">' +
    steps +
    '</div></div>'
  );
}
App.v47StagePanel = v47StagePanel;

export function v47DesignKeys() {
  return (
    {
      I: ['architecture', 'summarydesign', 'detaildesign'],
      II: ['summarydesign', 'detaildesign'],
      III: ['detaildesign'],
      IV: [],
    }[v47Flow().designType] || ['summarydesign', 'detaildesign']
  );
}

function v47ApproveStage(k) {
  var f = v47Flow(),
    p = project();
  if (!v47Prereq(k)) {
    showToast('请先完成上一个阶段', 'warn');
    return;
  }
  if (k === 'requirements' && !f.docs.requirement) {
    showToast('请先编写并保存需求规格书', 'warn');
    return;
  }
  if (
    k === 'design' &&
    v47DesignKeys().some(function (n) {
      return !f.docs[n];
    })
  ) {
    showToast('请先完成当前类别要求的全部设计文档', 'warn');
    return;
  }
  f.steps[k] = true;
  if (k === 'planning') {
    state.lifecycleStage = 'requirements';
    state.projectSection = 'lifecycle';
    state.view = 'project-lifecycle';
  }
  v47Note(v47Labels[k] + '审核通过（Mock）');
  p.status = '进行中';
  p.flowStatus = k === 'planning' ? '需求阶段' : k === 'requirements' ? '设计阶段' : '开发阶段';
  p.progress = { planning: 10, requirements: 25, design: 40 }[k];
  App.render();
  showToast(v47Labels[k] + '模拟审核已通过，可进入下一阶段');
}
App.v47ApproveStage = v47ApproveStage;

function v47Test() {
  if (!v47Prereq('testing')) {
    showToast('开发尚未完成检视准出与 Commit 移交', 'warn');
    return;
  }
  var p = project();
  if (!p.version) {
    showToast('请先到项目基本信息填写版本号（进入测试必填）', 'warn');
    return;
  }
  var commit = v35Data().commit,
    r = App.v37Record('system');
  r.name = '整机测试报告';
  r.version = p.version;
  r.owner = '赵敏';
  r.commit = commit;
  r.conclusion = 'Mock 整机功能、异常重连、接口与回归测试均通过，未发现未关闭严重缺陷。';
  r.status = '审核通过';
  r.history.push({
    name: r.name,
    version: r.version,
    owner: r.owner,
    conclusion: r.conclusion,
    status: r.status,
    at: new Date().toLocaleString('zh-CN'),
  });
  v47Flow().steps.testing = true;
  v47Note('整机测试报告审核通过，关联 ' + commit);
  p.progress = 82;
  p.flowStatus = '发布阶段';
  App.render();
  showToast('整机测试报告审核通过，已关联开发准出 Commit');
}
App.v47Test = v47Test;

function v47Release() {
  var z = App.v38Status(),
    p = project();
  if (!v47Prereq('release') || !z.testPass) {
    showToast('整机测试报告未审核通过，无法发布', 'warn');
    return;
  }
  if (!state.v37PublishReview) state.v37PublishReview = {};
  if (!state.v37Published) state.v37Published = {};
  state.v37PublishReview[state.projectId] = {
    status: '已通过',
    commit: z.commit,
    at: new Date().toLocaleString('zh-CN'),
  };
  state.v37Published[state.projectId] = {
    status: '已发布',
    commit: z.commit,
    version: p.version || 'V1.0',
    at: new Date().toLocaleString('zh-CN'),
  };
  v47Flow().steps.release = true;
  v47Note('发布评审通过、文档归档完成、版本已发布（Mock）');
  p.status = '已发布';
  p.flowStatus = '已发布';
  p.progress = 100;
  App.render();
  showToast('模拟版本已发布；项目全链路演示完成');
}
App.v47Release = v47Release;

function v47DocKey(kind) {
  return state.projectId + ':' + kind;
}

function v47DocOpen(kind) {
  var labels = {
    requirement: '软件需求规格书',
    design: '设计说明书',
    architecture: '软件架构设计说明书',
    summarydesign: '概要设计说明书',
    detaildesign: '详细设计说明书',
    review: '项目复盘文档',
    report: '测试报告',
  };
  var id = v47DocKey(kind),
    d =
      v47Docs[id] ||
      (v47Docs[id] = {
        html:
          '<h1>1. ' +
          (labels[kind] || '在线文档') +
          '</h1><h2>1.1 内容</h2><p>请在此填写文档正文。</p>',
        comments: [],
      });
  var comments = d.comments
    .map(function (c, i) {
      return (
        '<div class="v47-comment">' +
        esc(c.text) +
        ' <span class="mini-note">' +
        (c.frozen ? '已冻结' : '可编辑') +
        '</span> ' +
        (!c.frozen
          ? '<button class="v47-btn" data-v47="doc-freeze" data-index="' +
            i +
            '" data-dockind="' +
            kind +
            '">冻结评论</button>'
          : '') +
        '</div>'
      );
    })
    .join('');
  var html =
    '<div class="notice">在线富文本 · 支持正文与 H1/H2/H3、选中文本引用评论及冻结。审批仍由原阶段操作完成。</div><div class="v47-doc"><div class="v47-doc-bar">' +
    [
      ['P', '正文'],
      ['H1', '一级标题'],
      ['H2', '二级标题'],
      ['H3', '三级标题'],
      ['bold', '加粗'],
      ['italic', '斜体'],
    ]
      .map(function (x) {
        return (
          '<button type="button" data-v47="doc-format" data-format="' +
          x[0] +
          '">' +
          x[1] +
          '</button>'
        );
      })
      .join('') +
    '</div><div class="v47-editor" id="v47Editor" contenteditable="true">' +
    d.html +
    '</div><div class="v47-comment"><b>文档在线评论 / 评审讨论</b><div class="mini-note">选中文字后点击引用评论，可关联到文档原文</div><button class="v47-btn" data-v47="doc-quote">引用当前选中文本</button><div id="v47Quoted" class="mini-note"></div><textarea id="v47CommentText" placeholder="输入评论或评审意见"></textarea><button class="v47-btn" data-v47="doc-comment" data-dockind="' +
    kind +
    '">添加评论</button></div>' +
    comments +
    '</div>';
  openDrawer(
    labels[kind] || '在线文档',
    html,
    '<button class="btn" data-v47="doc-save" data-dockind="' +
      kind +
      '">保存文档</button><button class="btn primary" data-v47="doc-save" data-dockind="' +
      kind +
      '" data-close="1">保存并关闭</button>',
  );
}

function v47DocsCollect(kind) {
  var el = document.querySelector('#v47Editor');
  if (el) {
    var d = v47Docs[v47DocKey(kind)];
    d.html = el.innerHTML;
    v47Flow().docs[kind] = d.html;
    v47Note('保存' + kind + '富文本版本');
  }
}

function v47Reset() {
  if (
    !window.confirm(
      '确认重置 Mock 演示数据？将恢复项目、需求/设计文档、开发检视、测试、发布、待办和看板演示状态。此操作不可撤回。',
    )
  )
    return;
  Object.keys(v47Demo).forEach(function (k) {
    delete v47Demo[k];
  });
  Object.keys(v47Docs).forEach(function (k) {
    delete v47Docs[k];
  });
  v47Demo.thermal = {
    steps: {},
    docs: {},
    history: [],
    created: false,
    version: 'V1.0',
    designType: 'II',
  };
  Object.keys(projects).forEach(function (k) {
    delete projects[k];
  });
  Object.keys(v47InitialProjects).forEach(function (k) {
    projects[k] = JSON.parse(JSON.stringify(v47InitialProjects[k]));
  });
  Object.keys(v35Store).forEach(function (k) {
    delete v35Store[k];
  });
  if (state.v37Reports) state.v37Reports = {};
  if (state.v37Published) state.v37Published = {};
  if (state.v37PublishReview) state.v37PublishReview = {};
  [
    'testingCases',
    'testingDefects',
    'releaseProjects',
    'releaseProjectId',
    'closingForms',
    'closingArchiveRecords',
    'v38TestProject',
    'v38ClosingProject',
    'reqRecords',
    'designRecords',
  ].forEach(function (k) {
    state[k] = null;
  });
  state.projectId = 'thermal';
  state.view = 'dashboard';
  state.lifecycleStage = 'planning';
  state.role = 'project';
  state.v39ScenarioName = '未选择';
  App.render();
  showToast('Mock 数据已重置，可重新从项目立项开始演示');
}
App.v47Reset = v47Reset;

/** V47 统一 Mock 生命周期与角色门禁 */
export function initLifecycleFlow() {
  v47InitialProjects = JSON.parse(JSON.stringify(projects));
  v47PrevBasic = App.renderProjectBasic;
  App.renderProjectBasic = function () {
    var html = v47PrevBasic();
    var a = html.indexOf('<div class="grid cols-2">');
    if (a >= 0) html = html.slice(0, a) + v47BasicPanel() + html.slice(a);
    return html;
  };
  v47PrevSidebar = App.renderSidebar;
  App.renderSidebar = function () {
    v47PrevSidebar();
    var sb = document.querySelector('#sidebar');
    if (sb && state.role !== 'supervisor')
      sb.querySelectorAll('[data-action="ops-tab"],[data-nav="ops-review"]').forEach(function (el) {
        el.remove();
      });
    if (sb && !sb.querySelector('[data-v47="reset"]'))
      sb.insertAdjacentHTML(
        'beforeend',
        '<div style="margin-top:auto;padding-top:15px"><button class="v47-reset" data-v47="reset">↺ 重置 Mock 演示数据</button></div>',
      );
  };
  v47PrevReady = App.v35Ready;
  App.v35Ready = function () {
    var r = v47PrevReady(),
      d = v35Data();
    if (d.v47NeedsNewCommit) {
      r.smoke = false;
      r.self = false;
      r.commit = false;
    }
    return r;
  };
  v47PrevCard = App.v35SummaryCard;
  App.v35SummaryCard = function (title, status, note, type, badge) {
    if (type === 'repo' && v35Data().v47NeedsNewCommit) {
      status = '待提交 · 整改新 Commit';
      badge = 'warn';
    }
    return v47PrevCard(title, status, note, type, badge);
  };
  v47PrevDevelopment = App.renderDevelopment;
  App.renderDevelopment = function () {
    if (state.role !== 'reviewer' && state.role !== 'developer')
      return '<div class="notice warn">开发阶段仅研发人员或检视工程师可以查看。请前往个人工作台切换角色。</div>';
    var d = v35Data();
    d.role = state.role === 'reviewer' ? 'reviewer' : 'developer';
    var html = v47PrevDevelopment();
    html = html.replace(
      /<div class="v35-head">[\s\S]*?<\/div><\/div><div class="v35-tabs">[\s\S]*?<\/div>/,
      '',
    );
    return html;
  };

  App.v43OpenAiResults = function () {
    if (state.role !== 'reviewer') {
      showToast('请切换至检视工程师角色后查看 AI 检视资料', 'warn');
      return;
    }
    var d = v35Data(),
      r = v35Latest();
    var names = ['文件一致性', '文件正确性', '方案与代码一致性', '点检项检查'];
    var aiIssues = d.issues.filter(function (issue) {
      return (
        issue.source === 'AI 检视' &&
        (issue.commit === d.commit || issue.recheckedCommit === d.commit)
      );
    });
    function row(title, detail) {
      return (
        '<div class="v47-ai-item"><b>' + esc(title) + '</b><small>' + esc(detail) + '</small></div>'
      );
    }
    // Show example evidence only where a current-Commit AI check actually exists.
    // The illustrative Mock rows below do not imply real GitLab or model execution.
    function detailFor(index, check) {
      if (!check) return row('尚未执行', '当前 Commit 无此项 AI 检视结果，不展示已完成结论。');
      var info = row(
        '检查结果：' + check.result,
        'AI 批次 ' + r.id + ' · ' + (check.detail || '未提供详细说明'),
      );
      if (check.result !== '通过')
        return info + row('待核实', '本项尚未通过，不能标记为 AI 已检视通过。');
      var examples = [
        [
          row('src/device/connection.ts', 'Mock：文件与 Commit 匹配'),
          row('config/reconnect.yaml', 'Mock：文件存在且版本匹配'),
          row('interfaces/device.proto', 'Mock：接口文件核对完成'),
        ],
        [
          row('config/reconnect.yaml', 'Mock：语法与引用检查通过'),
          row('src/device/connection.ts', 'Mock：基础格式、导入关系检查通过'),
          row('interfaces/device.proto', 'Mock：依赖与字段完整性检查通过'),
        ],
        [row('D-009 · 断线重试规则一致', 'Mock：已执行方案与代码一致性检查并通过')],
        [
          row('R-017 · 异常状态回收', 'Mock：通过'),
          row('N-021 · 错误日志追踪标识', 'Mock：通过'),
          row('R-025 · 函数长度阈值', 'Mock：通过'),
          row('R-031 · 重复逻辑', 'Mock：通过'),
          row('N-013 · 接口异常错误码', 'Mock：通过'),
          row('D-009 · 设计与代码一致性', 'Mock：通过'),
        ],
      ];
      var rows = examples[index].join('');
      if (index === 2 && aiIssues.length) {
        rows += aiIssues
          .map(function (issue) {
            return row(
              issue.id + ' · ' + issue.title + ' · ' + issue.status,
              '对应依据：' +
                (issue.evidence || '未提供') +
                '；原 Commit：' +
                issue.commit +
                '；当前 Commit：' +
                d.commit +
                '；整改或复检：' +
                (issue.recheckedAt || issue.verdict || issue.reply || '待处理'),
            );
          })
          .join('');
      }
      return (
        info +
        row('下列是已完成检查的 Mock 明细', '仅用于原型展示，不代表真实文件已接受 AI 检视。') +
        rows
      );
    }
    var notice =
      '<div class="notice">当前 Commit：' +
      esc(d.commit || '未关联') +
      ' · AI 批次：' +
      esc(r ? r.id : '尚未执行') +
      '。点击任一检查项展开该项下一级详情；仅显示当前 Commit 的 AI 检视状态。演示数据（Mock）。</div>';
    var groups = names
      .map(function (name, i) {
        var check =
          r && Array.isArray(r.checks)
            ? r.checks.find(function (item) {
                return item.name === name;
              }) || r.checks[i]
            : null;
        var result = check ? check.result : '未执行';
        return (
          '<div class="v47-ai-group"><button type="button" class="v47-ai-trigger" data-v47="ai-expand" data-ai="' +
          i +
          '" aria-expanded="false"><b>' +
          (i + 1) +
          '. ' +
          esc(name) +
          '</b><span>' +
          esc(result) +
          '　⌄</span></button>' +
          '<div class="v47-ai-body" data-ai-detail="' +
          i +
          '" hidden>' +
          detailFor(i, check) +
          '</div></div>'
        );
      })
      .join('');
    openDrawer('AI 四类检查 · 文件/规则/整改闭环', notice + groups);
  };
  v47PrevReviewer = App.v35Reviewer;
  App.v35Reviewer = function (d) {
    var h = v47PrevReviewer(d);
    h = h.replace(
      /(先保存当前 Commit 的独立抽检结论，再查看 AI 对照结果。)/g,
      '正式检视阶段即可查看四类 AI 检查；三项必检影响准出，不影响查看。',
    );
    h = h.replace(
      /(<button[^>]*data-v35="show-ai-manual"[^>]*?)\sdisabled(?:\s+title="[^"]*")?/g,
      '$1',
    );
    return h;
  };
  v47PrevLifecycle = App.renderLifecycle;
  App.renderLifecycle = function () {
    var html = v47PrevLifecycle();
    if (state.lifecycleStage === 'development')
      html = html.replace(
        /<div class="notice" style="align-items:center;flex-wrap:wrap;margin-bottom:12px;background:#f8fafc;border-color:#e4e7ec;color:#475467">[\s\S]*?data-v39="load">载入场景<\/button><\/div>/,
        '',
      );
    var panel = App.v47StagePanel();
    return html.replace(/(<section class="page"[^>]*>)/, '$1' + panel);
  };
  v47PrevOps = App.ops2Projects;
  App.ops2Projects = function () {
    var html = v47PrevOps();
    var f = Object.entries(projects),
      counts = {};
    f.forEach(function (x) {
      var s = x[1].flowStatus || x[1].status;
      counts[s] = (counts[s] || 0) + 1;
    });

    var charts = '<div class="v47-ops-grid" style="margin-top:16px">';
    charts +=
      '<div class="v47-chart-card"><b>① 项目阶段分布 · 柱状图</b>' +
      ['立项阶段', '需求阶段', '设计阶段', '开发阶段', '测试阶段', '发布阶段', '已发布']
        .map(function (s) {
          var n = f.filter(function (x) {
            return (x[1].flowStatus || '').includes(s);
          }).length;
          return (
            '<div class="v47-bar"><span>' +
            s +
            '</span><div><i style="width:' +
            (n / Math.max(1, f.length)) * 100 +
            '%"></i></div><strong>' +
            n +
            '</strong></div>'
          );
        })
        .join('') +
      '</div>';
    charts +=
      '<div class="v47-chart-card"><b>② 里程碑达成 · 横向柱状图</b>' +
      f
        .slice(0, 6)
        .map(function (x) {
          var n = x[1].progress || 0;
          return (
            '<div class="v47-bar"><span>' +
            esc(x[1].name.slice(0, 8)) +
            '</span><div><i style="width:' +
            n +
            '%"></i></div><b>' +
            n +
            '%</b></div>'
          );
        })
        .join('') +
      '</div>';
    charts +=
      '<div class="v47-chart-card"><b>③ 项目延期趋势 · 折线图（历史 Mock）</b><svg viewBox="0 0 340 125" style="width:100%;max-height:125px;margin-top:8px"><path d="M20 92H330M20 50H330M20 10H330" stroke="#e3eaf4"/><polyline class="v47-line" points="20,55 76,65 132,38 188,52 244,22 310,35"/>' +
      [20, 76, 132, 188, 244, 310]
        .map(function (x, i) {
          return (
            '<text x="' +
            x +
            '" y="119" text-anchor="middle" font-size="10" fill="#667085">' +
            (i + 5) +
            '月</text>'
          );
        })
        .join('') +
      '</svg></div>';
    charts +=
      '<div class="v47-chart-card"><b>④ 需求变更结构 · 堆叠柱状图（历史 Mock）</b>' +
      [
        ['智能温控', 8, 3, 1],
        ['设备云', 5, 2, 1],
        ['边缘网关', 4, 3, 0],
        ['液冷算法', 6, 1, 1],
      ]
        .map(function (x) {
          var total = x[1] + x[2] + x[3];
          return (
            '<div style="padding:10px 0"><small>' +
            x[0] +
            ' · ' +
            total +
            ' 项</small><div class="v47-stack"><i style="width:' +
            (x[1] / total) * 100 +
            '%;background:#3874d5"></i><i style="width:' +
            (x[2] / total) * 100 +
            '%;background:#f79009"></i><i style="width:' +
            (x[3] / total) * 100 +
            '%;background:#98a2b3"></i></div></div>'
          );
        })
        .join('') +
      '<small>蓝：新增　橙：变更　灰：取消</small></div>';
    var risks = f.reduce(function (acc, x) {
      var status = x[1].health || '健康';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    charts +=
      '<div class="v47-chart-card"><b>⑤ 项目风险等级 · 分布条形图</b>' +
      Object.entries(risks)
        .map(function (x) {
          return (
            '<div class="v47-bar"><span>' +
            esc(x[0]) +
            '</span><div><i style="width:' +
            (x[1] / f.length) * 100 +
            '%;background:' +
            (x[0] === '风险' ? '#f79009' : '#42ad90') +
            '"></i></div><b>' +
            x[1] +
            '</b></div>'
          );
        })
        .join('') +
      '</div></div><p class="mini-note">阶段分布、里程碑及风险来自当前 Mock 项目；延期趋势与变更结构为标注的历史演示数据。</p>';
    return html + charts;
  };
  v47PrevOpsRender = App.renderOps2;
  App.renderOps2 = function () {
    if (state.role !== 'supervisor') {
      return '<section class="page ops2-page"><div class="notice warn">运营看板仅部门主管可查看。请返回个人工作台切换角色为「部门主管」。</div><button class="btn primary" data-v47="go-home">返回个人工作台</button></section>';
    }
    return v47PrevOpsRender();
  };
  App.renderOperations = function () {
    return App.renderOps2();
  };
  v47PrevOpsTabs = App.ops2Tabs;
  App.ops2Tabs = function () {
    return state.role === 'supervisor' ? v47PrevOpsTabs() : '';
  };
  document.addEventListener(
    'click',
    function (e) {
      var node = e.target.closest(
        '[data-v47], [data-action="new-project"], [data-v35="switch-role"], [data-v35="view-review"], [data-v35="view-dev"]',
      );
      if (!node) return;
      if (node.dataset.action === 'new-project') {
        e.preventDefault();
        e.stopImmediatePropagation();
        v47ProjectModal();
        return;
      }
      if (node.dataset.v35) {
        e.preventDefault();
        e.stopImmediatePropagation();
        showToast('开发/检视工作台角色请在「个人工作台」切换', 'warn');
        return;
      }
      var a = node.dataset.v47;
      if (!a) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (a === 'reset') {
        App.v47Reset();
        return;
      }
      if (a === 'go-home') {
        state.view = 'dashboard';
        App.render();
        return;
      }
      if (a === 'cancel-modal') {
        document.querySelector('#modalRoot').classList.remove('show');
        return;
      }
      if (a === 'create-project') {
        v47CreateProject();
        return;
      }
      if (a === 'save-basic') {
        var p = v47ReadForm();
        Object.assign(project(), p);
        project().goal = p.softwareDescription;
        v47Note('更新项目基础信息');
        App.render();
        showToast('项目基础信息已保存');
        return;
      }
      if (a === 'approve-stage') {
        App.v47ApproveStage(node.dataset.stage);
        return;
      }
      if (a === 'demo-testing') {
        App.v47Test();
        return;
      }
      if (a === 'demo-release') {
        App.v47Release();
        return;
      }
      if (a === 'doc-open') {
        v47DocOpen(node.dataset.doc);
        return;
      }
      if (a === 'doc-format') {
        var fmt = node.dataset.format,
          el = document.querySelector('#v47Editor');
        if (!el) return;
        el.focus();
        if (fmt === 'P' || /^H[1-3]$/.test(fmt))
          document.execCommand('formatBlock', false, fmt === 'P' ? 'p' : fmt.toLowerCase());
        else document.execCommand(fmt, false, null);
        return;
      }
      if (a === 'doc-quote') {
        var text = window.getSelection().toString().trim();
        document.querySelector('#v47Quoted').textContent = text ? '引用：' + text : '未选择正文';
        return;
      }
      if (a === 'doc-comment') {
        let kind = node.dataset.dockind,
          d = v47Docs[v47DocKey(kind)],
          txt = document.querySelector('#v47CommentText').value.trim(),
          quote = (document.querySelector('#v47Quoted').textContent || '').replace(/^引用：/, '');
        if (!txt) {
          showToast('请填写评论', 'warn');
          return;
        }
        v47DocsCollect(kind);
        d.comments.push({ text: (quote ? '「' + quote + '」 · ' : '') + txt, frozen: false });
        v47DocOpen(kind);
        showToast('评论已添加');
        return;
      }
      if (a === 'doc-freeze') {
        let d = v47Docs[v47DocKey(node.dataset.dockind)];
        v47DocsCollect(node.dataset.dockind);
        d.comments[+node.dataset.index].frozen = true;
        v47DocOpen(node.dataset.dockind);
        showToast('评论已冻结');
        return;
      }
      if (a === 'doc-save') {
        v47DocsCollect(node.dataset.dockind);
        if (node.dataset.close) closeDrawer();
        else showToast('富文本文档已保存');
        return;
      }
      if (a === 'ai-expand') {
        var target = document.querySelector('[data-ai-detail="' + node.dataset.ai + '"]');
        if (target) target.hidden = !target.hidden;
        return;
      }
    },
    true,
  );
  document.addEventListener(
    'change',
    function (e) {
      if (e.target.id === 'v47DesignType') v47Flow().designType = e.target.value;
      if (e.target.id === 'roleSelect') {
        setTimeout(function () {
          if (state.view.startsWith('ops-') && state.role !== 'supervisor') {
            state.view = 'dashboard';
            App.render();
          }
        }, 0);
      }
    },
    true,
  );
  v47PrevRequirement = App.renderRequirements;
  App.renderRequirements = function () {
    return (
      '<div style="margin:0 0 10px"><button class="v47-btn" data-v47="doc-open" data-doc="requirement">打开需求规格书富文本模板（H1/H2/H3 · 评论/冻结）</button></div>' +
      v47PrevRequirement()
    );
  };
  v47PrevDesign = App.renderDesign;
  App.renderDesign = function () {
    return (
      '<div style="margin:0 0 10px"><button class="v47-btn" data-v47="doc-open" data-doc="design">打开设计文档富文本模板（H1/H2/H3 · 评论/冻结）</button></div>' +
      v47PrevDesign()
    );
  };
}
