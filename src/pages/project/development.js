/** 开发阶段：开发报告与仓库信息。 */
import { App } from '../../core/app.js';
import { closeDrawer, modalForm, openDrawer } from '../../components/overlays.js';
import { showToast } from '../../components/toast.js';
import { esc, tag } from '../../core/dom.js';
import { v35Badge, v35Data, v35Latest, v35Pending } from '../../features/dev-review.js';
import { project, state } from '../../store/state.js';

function developmentInit() {
  if (!state.devReports) {
    state.devReports = [
      {
        id: 'ST-001',
        title: '设备断线自动重连 · 自测报告',
        version: 'V2.6',
        status: '已通过',
        owner: '孙宁',
        created: '2026-08-11',
        summary: '断线重连、状态恢复与异常告警测试全部通过。',
        items: [
          ['断线后自动重连', '断开网络 30 秒后恢复', '自动恢复连接', '自动恢复连接', '通过'],
          ['设备状态恢复', '检查重连后的设备状态', '状态与服务端一致', '状态与服务端一致', '通过'],
        ],
      },
      {
        id: 'ST-002',
        title: '高并发消息队列优化 · 自测报告',
        version: 'V2.6',
        status: '待提交',
        owner: '孙宁',
        created: '2026-08-12',
        summary: '已完成主要场景自测，待补充异常重试场景后提交。',
        items: [
          [
            '高并发消息上报',
            '模拟 1000 台设备同时上报',
            '无丢包、无重复',
            '无丢包、无重复',
            '通过',
          ],
          ['异常重试', '断开网络 30 秒', '自动恢复并记录重试次数', '待补充', '待执行'],
        ],
      },
      {
        id: 'ST-003',
        title: '能耗数据筛选接口 · 自测报告',
        version: 'V2.6',
        status: '草稿',
        owner: '李明',
        created: '2026-08-13',
        summary: '待开发完成后填写自测结果。',
        items: [['区域筛选', '选择不同区域查询', '返回对应区域数据', '待填写', '待执行']],
      },
    ];
  }
  if (!state.devReportMode) state.devReportMode = 'edit';
}

function developmentStatusType(status) {
  return status === '已通过' ? 'green' : status === '待提交' ? 'orange' : 'gray';
}

function developmentStatusTag(status) {
  return tag(status, developmentStatusType(status));
}

function developmentReport(id) {
  developmentInit();
  return (
    state.devReports.find(function (item) {
      return item.id === id;
    }) || state.devReports[0]
  );
}

export function developmentCurrentReport() {
  developmentInit();
  if (state.devReportMode === 'create') {
    if (!state.devDraft)
      state.devDraft = {
        id: 'NEW-SELF-TEST',
        title: '新建自测报告',
        version: 'V2.6',
        status: '草稿',
        owner: '孙宁',
        created: '日期',
        summary: '',
        items: [['测试项', '填写测试步骤', '填写预期结果', '填写实际结果', '待执行']],
      };
    return state.devDraft;
  }
  return developmentReport(state.devSelected);
}

function developmentRepoDrawer() {
  openDrawer(
    '代码仓库关联',
    modalForm('development-repo', [
      { label: '代码仓库名称', required: true, value: 'GitLab · thermal/v2.6' },
      { label: '代码仓库地址', required: true, value: project().repo },
      { label: '当前分支', required: true, value: 'release/v2.6' },
      { label: '关联版本', required: true, value: 'V2.6' },
    ]),
    '<button class="btn" data-development-action="close">取消</button><button class="btn primary" data-development-action="save-repo">保存关联</button>',
  );
}

function developmentReportBody(report) {
  return (
    '<div class="development-report-detail"><div class="status-line">' +
    developmentStatusTag(report.status) +
    ' <span class="mini-note">' +
    esc(report.id) +
    ' · ' +
    esc(report.version) +
    '</span></div><div class="form-grid" style="margin-top:14px"><div class="field"><label>报告名称</label><input data-dev-input="title" value="' +
    esc(report.title) +
    '"></div><div class="field"><label>关联版本</label><input data-dev-input="version" value="' +
    esc(report.version) +
    '" readonly></div><div class="field"><label>负责人</label><input data-dev-input="owner" value="' +
    esc(report.owner) +
    '"></div><div class="field"><label>创建时间</label><input data-dev-input="created" value="' +
    esc(report.created) +
    '" readonly></div><div class="field full"><label>自测结论</label><textarea data-dev-input="summary" placeholder="填写本次自测结论">' +
    esc(report.summary || '') +
    '</textarea></div></div><div class="detail-section"><h4>自测项目</h4><div class="card table-wrap"><table class="table"><thead><tr><th>测试项</th><th>测试步骤</th><th>预期结果</th><th>实际结果</th><th>结果</th></tr></thead><tbody>' +
    report.items
      .map(function (item) {
        return (
          '<tr><td>' +
          esc(item[0]) +
          '</td><td>' +
          esc(item[1]) +
          '</td><td>' +
          esc(item[2]) +
          '</td><td>' +
          esc(item[3]) +
          '</td><td>' +
          developmentStatusTag(
            item[4] === '通过' ? '已通过' : item[4] === '待执行' ? '待执行' : '待填写',
          ) +
          '</td></tr>'
        );
      })
      .join('') +
    '</tbody></table></div></div></div>'
  );
}

function developmentReportFoot() {
  if (state.devReportMode === 'create')
    return '<button class="btn" data-development-action="cancel">取消</button><button class="btn" data-development-action="save-report">保存草稿</button><button class="btn primary" data-development-action="submit-report">提交自测报告</button>';
  return '<button class="btn" data-development-action="close">关闭</button><button class="btn" data-development-action="save-report">保存修改</button>';
}

function openDevelopmentReport(id, mode) {
  developmentInit();
  state.devReportMode = mode || 'edit';
  state.devSelected = id || state.devReports[0].id;
  if (state.devReportMode === 'create') state.devDraft = null;
  var report = developmentCurrentReport();
  openDrawer(
    (state.devReportMode === 'create' ? '新建自测报告' : '自测报告详情 · ') + report.title,
    developmentReportBody(report),
    developmentReportFoot(),
  );
}

function collectDevelopmentReport() {
  var body = document.querySelector('#drawerBody');
  var report = developmentCurrentReport();
  if (!body) return;
  body.querySelectorAll('[data-dev-input]').forEach(function (input) {
    report[input.dataset.devInput] = input.value;
  });
}

function saveDevelopmentReport(mode) {
  collectDevelopmentReport();
  var report = developmentCurrentReport();
  if (mode === 'submit') report.status = '已提交';
  if (state.devReportMode === 'create') {
    report.id = 'ST-NEW-' + Date.now();
    state.devReports.unshift(Object.assign({}, report, { items: report.items || [] }));
    state.devSelected = report.id;
    state.devDraft = null;
  }
  closeDrawer();
  App.render();
  showToast(mode === 'submit' ? '自测报告已提交' : '自测报告草稿已保存');
}

function renderDevelopment() {
  var d = v35Data(),
    ready = App.v35Ready(),
    r = v35Latest();
  var nav =
    '<div class="v35-tabs">' +
    (d.role === 'developer'
      ? '<button class="active" data-v35="view-dev">开发工作台</button><button data-v35="switch-role" data-role="reviewer">检视工作台（角色切换）</button>'
      : '<button data-v35="switch-role" data-role="developer">开发工作台</button><button class="active" data-v35="view-review">检视工作台</button>') +
    '</div>';
  var root = '<div class="development-reference-page v35-root">' + App.v35ShellTitle(d) + nav;
  if (d.role === 'reviewer') return root + App.v35Reviewer(d) + '</div>';
  return (
    root +
    '<div class="v35-dev-layout"><section class="v35-ide"><div class="v35-ide-top"><strong>开发工作区 · 在线 IDE / AI 编程工具</strong>' +
    v35Badge('开发空间预留') +
    '</div><div class="v35-ide-area"><div class="v35-ide-empty"><div style="font-size:30px;color:#688bc3">⌘</div><h3>在线 IDE / AI 编程工作区</h3><p>原型预留开发主空间。真实编程服务待后续接入；当前以右侧四张卡片完成代码检视业务演示。</p></div></div></section><aside class="v35-side">' +
    App.v35SummaryCard(
      '冒烟测试',
      ready.stageSmoke
        ? '已记录 · 待提交 Commit'
        : ready.smoke
          ? '已绑定当前版本'
          : '待执行 / 待记录',
      '第 1 步 · 获取方案并填写测试结果',
      'smoke',
      ready.stageSmoke || ready.smoke ? 'ok' : 'warn',
    ) +
    App.v35SummaryCard(
      '自测报告',
      ready.stageSelf ? '已提交 · 待提交 Commit' : ready.self ? '已提交 · ' + d.commit : '待提交',
      '第 2 步 · 当前责任人：' + d.developer,
      'self',
      ready.stageSelf || ready.self ? 'ok' : 'warn',
    ) +
    App.v35SummaryCard(
      '代码仓库关联',
      d.commit ? '当前 ' + d.commit : '未提交 Commit',
      '第 3 步 · ' + d.branch,
      'repo',
      d.commit ? 'ok' : 'warn',
    ) +
    App.v35SummaryCard(
      'AI 检视报告',
      r ? '批次 ' + r.id + ' · ' + r.result : '尚未申请',
      r ? '四类检查 / 批量问题处理 / 历史' : '第 4 步 · 前置完成后主动申请',
      'ai',
      r && r.result === '完成' ? 'ok' : 'warn',
    ) +
    '</aside></div><div class="v35-notice">执行顺序：获取冒烟方案并完成测试、填写冒烟结果 → 提交自测报告 → 提交 Commit → 申请 AI 检视。' +
    (v35Pending().length ? '当前待闭环问题 ' + v35Pending().length + ' 项。' : '') +
    'R2 开发异议即时送检视工程师；R3 正式检视须待问题清空并由开发主动提交。</div></div>'
  );
}
App.renderDevelopment = renderDevelopment;

/** 开发阶段交互 */
export function bindDevelopmentEvents() {
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-development-action]');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    var action = el.dataset.developmentAction;
    if (action === 'edit-repo') {
      developmentRepoDrawer();
      return;
    }
    if (action === 'open-repo') {
      showToast('已打开项目代码仓库');
      return;
    }
    if (action === 'create-report') {
      openDevelopmentReport(null, 'create');
      return;
    }
    if (action === 'open-report') {
      openDevelopmentReport(el.dataset.developmentId, 'edit');
      return;
    }
    if (action === 'cancel' || action === 'close') {
      closeDrawer();
      return;
    }
    if (action === 'save-repo') {
      closeDrawer();
      showToast('代码仓库关联已保存');
      return;
    }
    if (action === 'save-report') {
      saveDevelopmentReport('save');
      return;
    }
    if (action === 'submit-report') {
      saveDevelopmentReport('submit');
      return;
    }
  });
}
