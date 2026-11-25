/** 统一 Mock 生命周期（V47）：阶段流转、角色门禁、项目创建与运营数据。 */
import { can } from '../domain/permissions.js';
import { flowStore, getDevReview, getFlow } from '../store/lifecycle.js';
import { App } from '../core/app.js';
import { openDrawer, openModal } from '../components/overlays.js';
import { showToast } from '../components/toast.js';
import { esc } from '../core/dom.js';
import { projects } from '../data/projects.js';
import { latestAiRun } from './dev-review.js';
import { getReleaseGate } from './version-anchor.js';
import {
  designDocTypes,
  designKeysFor,
  isStageDone as isStageDoneRule,
  isStagePrereqMet as isStagePrereqMetRule,
} from '../domain/stages.js';
import { project, state } from '../store/state.js';

let baseDevSummaryCard;
let baseRenderDevelopment;

let baseReviewerWorkspace;
let baseOpsProjects;
let baseRenderOps;
let baseOpsTabs;

/* V55.4: the built-in thermal demo starts at development; an explicit Mock reset still starts from planning. */

export function logFlowNote(msg) {
  getFlow().history.unshift({ at: new Date().toLocaleString('zh-CN'), text: msg });
}

/** 当前项目某阶段是否已完成（规则见 domain/stages.js），只读取该阶段需要的数据。 */
export function isStageDone(stage) {
  return isStageDoneRule(stage, {
    get flowSteps() {
      return getFlow().steps;
    },
    get dev() {
      return getDevReview();
    },
    get gate() {
      return getReleaseGate();
    },
  });
}

export function isStagePrereqMet(stage) {
  return isStagePrereqMetRule(stage, isStageDone);
}

function renderProjectFormFields(p) {
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
App.renderProjectFormFields = renderProjectFormFields;

function readProjectForm() {
  var p = {};
  document.querySelectorAll('[data-v47-field]').forEach(function (e) {
    p[e.dataset.v47Field] = (e.value || '').trim();
  });
  return p;
}

function openProjectModal() {
  openModal(
    'v47-project',
    '新建项目 · 项目基础信息',
    '<div class="notice">依据提供的项目基础信息清单；版本类型未展示的选项留待业务确认，采用文本记录。</div>' +
      App.renderProjectFormFields(
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

function createProject() {
  var p = readProjectForm();
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
  flowStore[id] = {
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

export function designKeysForProject() {
  return designKeysFor(getFlow().designType);
}

/** 当前项目设计阶段需要评审的文档类型（含软件规格书），按评审先后排列。 */
export function projectDesignDocTypes() {
  return designDocTypes(getFlow().designType);
}

/** V47 统一 Mock 生命周期与角色门禁 */
export function initLifecycleFlow() {
  baseDevSummaryCard = App.renderDevSummaryCard;
  App.renderDevSummaryCard = function (title, status, note, type, badge) {
    if (type === 'repo' && getDevReview().v47NeedsNewCommit) {
      status = '待提交 · 整改新 Commit';
      badge = 'warn';
    }
    return baseDevSummaryCard(title, status, note, type, badge);
  };
  baseRenderDevelopment = App.renderDevelopment;
  App.renderDevelopment = function () {
    if (!can(state.role, 'dev.workspace'))
      return '<div class="notice warn">开发阶段工作台仅开发工程师和检视工程师可用。</div>';
    var d = getDevReview();
    d.role = state.role === 'reviewer' ? 'reviewer' : 'developer';
    return baseRenderDevelopment();
  };

  App.openAiResultsEvidence = function () {
    if (!can(state.role, 'review.perform')) {
      showToast('仅检视工程师可查看 AI 检视资料', 'warn');
      return;
    }
    var d = getDevReview(),
      r = latestAiRun();
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
  baseReviewerWorkspace = App.renderReviewerWorkspace;
  App.renderReviewerWorkspace = function (d) {
    var h = baseReviewerWorkspace(d);
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
  baseOpsProjects = App.ops2Projects;
  App.ops2Projects = function () {
    var html = baseOpsProjects();
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
      '</div></div>';
    return html + charts;
  };
  baseRenderOps = App.renderOps2;
  App.renderOps2 = function () {
    if (!can(state.role, 'operations.view')) {
      return '<section class="page ops2-page"><div class="notice warn">运营看板仅部门主管可查看。</div><button class="btn primary" data-v47="go-home">返回个人工作台</button></section>';
    }
    return baseRenderOps();
  };
  App.renderOperations = function () {
    return App.renderOps2();
  };
  baseOpsTabs = App.ops2Tabs;
  App.ops2Tabs = function () {
    return can(state.role, 'operations.view') ? baseOpsTabs() : '';
  };
  document.addEventListener(
    'click',
    function (e) {
      var node = e.target.closest('[data-v47], [data-action="new-project"]');
      if (!node) return;
      if (node.dataset.action === 'new-project') {
        e.preventDefault();
        e.stopImmediatePropagation();
        openProjectModal();
        return;
      }
      var a = node.dataset.v47;
      if (!a) return;
      e.preventDefault();
      e.stopImmediatePropagation();
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
        createProject();
        return;
      }
      if (a === 'save-basic') {
        var p = readProjectForm();
        Object.assign(project(), p);
        project().goal = p.softwareDescription;
        logFlowNote('更新项目基础信息');
        App.render();
        showToast('项目基础信息已保存');
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
      if (e.target.id === 'v47DesignType') getFlow().designType = e.target.value;
    },
    true,
  );
}
