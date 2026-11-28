/** 统一 Mock 生命周期（V47）：阶段流转、角色门禁、项目创建与运营数据。 */
import { documentId, flowStore, getDevReview, getFlow } from '../store/lifecycle.js';
import { App } from '../core/app.js';
import { openDrawer, openModal } from '../components/overlays.js';
import { showToast } from '../components/toast.js';
import { esc } from '../core/dom.js';
import { ACCOUNTS } from '../data/accounts.js';
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
    testPathField('needsSingleTest', '是否需要单板测试', p.needsSingleTest) +
    testPathField('needsLongTest', '是否需要长运测试', p.needsLongTest) +
    '</div>'
  );
}
App.renderProjectFormFields = renderProjectFormFields;

/** 测试路径：是否需要单板 / 长运测试，未选择时默认需要。 */
function testPathField(key, label, value) {
  return (
    '<div class="v47-field"><label>' +
    label +
    '</label><select data-v47-field="' +
    key +
    '">' +
    '<option value="是"' +
    (value !== '否' ? ' selected' : '') +
    '>是</option>' +
    '<option value="否"' +
    (value === '否' ? ' selected' : '') +
    '>否</option></select></div>'
  );
}

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
    App.renderProjectFormFields(
      {
        creator: state.user.name,
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
  const id = documentId('demo');
  const prefix = 'PRJ' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-';
  const usedCodes = new Set(Object.values(projects).map((row) => row.code));
  let sequence = Object.keys(projects).length + 1;
  let code = prefix + String(sequence).padStart(2, '0');
  while (usedCodes.has(code)) code = prefix + String(++sequence).padStart(2, '0');
  projects[id] = Object.assign(
    {
      code: code,
      type: '产品开发',
      owner: p.creator,
      ownerDetail: p.creator,
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
    creationNotice: {
      recipient: ACCOUNTS.find((account) => account.role === 'developer').username,
      creator: state.user.name,
      at: new Date().toISOString(),
    },
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
  App.openAiResultsEvidence = function () {
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
    openDrawer(
      'AI 四类检查 · 文件/规则/整改闭环',
      '<h4>AI 执行记录</h4>' +
        (d.runs
          .filter((x) => x.commit === d.commit)
          .slice()
          .reverse()
          .map((x) => row(x.id, [x.commit, x.result, x.at].filter(Boolean).join(' · ')))
          .join('') || row('未执行', '当前版本暂无批次')) +
        notice +
        groups,
    );
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
