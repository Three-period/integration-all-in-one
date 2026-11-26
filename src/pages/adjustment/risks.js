/** 项目调整 — 风险管理（V1.5）。 */
import { App } from '../../core/app.js';
import { closeDrawer, openDrawer, openModal } from '../../components/overlays.js';
import { commonHead } from '../../components/shell.js';
import { showToast } from '../../components/toast.js';
import { $, esc, tag } from '../../core/dom.js';
import { setView } from '../../core/navigation.js';
import { changeAdjustmentTabs } from './changes.js';
import { project, state } from '../../store/state.js';

let riskAppSurface;

/* V1.5：项目调整—风险管理。仅替换风险管理内容，变更与缺陷保持原页面。 */
function riskBlank() {
  return {
    id: '自动生成',
    name: '',
    project: project().name || '液冷控制算法预研（示例项目）',
    level: '中',
    status: '待开始',
    reviewer: '组织架构自动带出',
    updated: '-',
    creator: '何盈',
    created: '2026-08-16',
    dwell: '-',
    description: '',
    action: '',
    consequence: '',
    comments: [],
    relations: [],
    versions: [],
  };
}

function riskInit() {
  if (state.riskReady) return;
  state.riskReady = true;
  state.riskQuery = '';
  state.riskStatusFilter = '全部';
  state.riskLevelFilter = '全部';
  state.riskFiltersOpen = false;
  state.riskTab = 'detail';
  state.riskMode = 'edit';
  state.riskSelected = 'RSK-202608-001';
  state.riskDraft = null;
  state.riskRecords ??= [
    {
      id: 'RSK-202608-001',
      name: '整机联调环境交付延期',
      project: '液冷控制算法预研（示例项目）',
      level: '高',
      status: '进行中',
      reviewer: '组织架构自动带出',
      updated: '2026-08-16 11:20',
      creator: '王凯',
      created: '2026-07-28',
      dwell: '3 天',
      description:
        '供应商联调设备交付延迟，当前整机联调无法完整开展，若再次延期将直接压缩系统测试窗口。',
      action: '启用备用模拟环境完成主流程验证；每日与供应商同步进度；测试团队提前准备回归用例。',
      consequence: '可能影响整机联调、系统测试窗口和版本发布计划。',
      comments: [
        {
          name: '王凯',
          time: '2026-08-16 11:20',
          text: '备用模拟环境已完成基础配置，等待供应商确认最终交付时间。',
        },
        { name: '李明', time: '2026-07-30 16:42', text: '已完成主流程验证用例准备。' },
      ],
      relations: [
        { type: '需求', id: 'REQ-142', title: '高并发设备消息上报', meta: '需求阶段 · 关联需求' },
        { type: '任务', id: 'DEV-038', title: '整机联调环境配置', meta: '开发阶段 · 负责人：孙宁' },
        {
          type: '变更',
          id: 'CHG-202608-004',
          title: '补充并发量指标',
          meta: '项目调整 · 影响范围关联',
        },
      ],
      versions: [
        {
          version: 'V1.1',
          status: '当前版本',
          creator: '王凯',
          time: '2026-08-16 11:20',
          summary: '补充备用环境措施与发布影响。',
        },
        {
          version: 'V1.0',
          status: '已替代',
          creator: '王凯',
          time: '2026-07-28 14:20',
          summary: '创建整机联调环境交付延期风险。',
        },
      ],
    },
    {
      id: 'RSK-202608-002',
      name: '第三方协议接口兼容问题',
      project: '液冷控制算法预研（示例项目）',
      level: '中',
      status: '待开始',
      reviewer: '组织架构自动带出',
      updated: '2026-08-14 09:30',
      creator: '李明',
      created: '2026-08-02',
      dwell: '-',
      description: '第三方协议字段存在版本差异，可能导致设备状态解析失败。',
      action: '提前获取协议样例并完成兼容性验证，必要时增加适配层。',
      consequence: '可能影响设备接入测试和需求验收。',
      comments: [],
      relations: [
        { type: '需求', id: 'REQ-139', title: '设备断线后自动重连', meta: '需求阶段 · 关联需求' },
        {
          type: '设计',
          id: 'DSN-002-V1.0',
          title: '软件架构设计',
          meta: '设计阶段 · 关联设计文档',
        },
      ],
      versions: [
        {
          version: 'V1.0',
          status: '当前版本',
          creator: '李明',
          time: '2026-08-02 09:30',
          summary: '创建第三方协议兼容风险。',
        },
      ],
    },
    {
      id: 'RSK-202608-003',
      name: '测试资源与其他项目冲突',
      project: '液冷控制算法预研（示例项目）',
      level: '低',
      status: '已完成',
      reviewer: '组织架构自动带出',
      updated: '2026-08-12 17:05',
      creator: '赵敏',
      created: '2026-08-04',
      dwell: '已关闭',
      description: '测试周期与设备云平台项目重叠，可能出现测试人员排期冲突。',
      action: '完成跨项目排期调整，并预留回归测试资源。',
      consequence: '当前已完成资源协调，不再影响项目计划。',
      comments: [
        { name: '赵敏', time: '2026-08-12 17:05', text: '资源调配审批已完成，风险关闭。' },
      ],
      relations: [
        { type: '任务', id: 'DEV-041', title: '系统测试计划编排', meta: '测试阶段 · 关联任务' },
      ],
      versions: [
        {
          version: 'V1.0',
          status: '当前版本',
          creator: '赵敏',
          time: '2026-08-12 17:05',
          summary: '资源协调完成，风险关闭。',
        },
      ],
    },
  ];
}

function riskRecord(id) {
  riskInit();
  return (
    state.riskRecords.find(function (r) {
      return r.id === id;
    }) || state.riskRecords[0]
  );
}

function riskCurrent() {
  riskInit();
  if (state.riskMode === 'create') {
    if (!state.riskDraft) state.riskDraft = riskBlank();
    return state.riskDraft;
  }
  return riskRecord(state.riskSelected);
}

function riskStatuses() {
  return ['待开始', '进行中', '已完成'];
}

function riskLevels() {
  return ['高', '中', '低'];
}

function riskSelect(name, options, current, attr) {
  return (
    '<select ' +
    (attr || '') +
    ' data-risk-input="' +
    esc(name) +
    '">' +
    options
      .map(function (v) {
        return (
          '<option value="' +
          esc(v) +
          '" ' +
          (v === current ? 'selected' : '') +
          '>' +
          esc(v) +
          '</option>'
        );
      })
      .join('') +
    '</select>'
  );
}

function riskField(label, name, value, wide, area, select, options) {
  var control = area
    ? '<textarea data-risk-input="' +
      esc(name) +
      '" placeholder="请输入' +
      esc(label) +
      '">' +
      esc(value || '') +
      '</textarea>'
    : select
      ? riskSelect(name, options || [], value)
      : '<input data-risk-input="' + esc(name) + '" value="' + esc(value || '') + '" />';
  return (
    '<div class="field ' +
    (wide ? 'full' : '') +
    '"><label>' +
    label +
    '</label>' +
    control +
    '</div>'
  );
}

function riskLevelTag(value) {
  return tag(value, value === '高' ? 'red' : value === '中' ? 'orange' : 'blue');
}

function riskStatusTag(value) {
  return tag(value, value === '已完成' ? 'green' : value === '进行中' ? 'blue' : 'gray');
}

function riskRows() {
  riskInit();
  var query = (state.riskQuery || '').toLowerCase();
  return state.riskRecords.filter(function (r) {
    var hit =
      !query ||
      (r.id + ' ' + r.name + ' ' + r.project + ' ' + r.description).toLowerCase().indexOf(query) >
        -1;
    var status = state.riskStatusFilter === '全部' || r.status === state.riskStatusFilter;
    var level = state.riskLevelFilter === '全部' || r.level === state.riskLevelFilter;
    return hit && status && level;
  });
}

function riskTable() {
  var rows = riskRows();
  if (!rows.length) return '<div class="risk-empty">没有匹配的风险记录，请调整筛选条件。</div>';
  return (
    '<div class="table-wrap"><table class="table risk-table"><thead><tr><th>序号</th><th>风险编号</th><th>风险名称</th><th>所属项目</th><th>审核人</th><th>风险等级</th><th>流程状态</th><th>最近更新时间</th><th>操作</th></tr></thead><tbody>' +
    rows
      .map(function (r, i) {
        return (
          '<tr data-risk-page-action="open" data-risk-id="' +
          esc(r.id) +
          '"><td>' +
          (i + 1) +
          '</td><td class="link">' +
          esc(r.id) +
          '</td><td><span class="risk-title">' +
          esc(r.name || '未命名风险') +
          '</span><span class="risk-sub">' +
          esc(r.description || '—') +
          '</span></td><td>' +
          esc(r.project) +
          '</td><td>' +
          esc(r.reviewer) +
          '</td><td>' +
          riskLevelTag(r.level) +
          '</td><td>' +
          riskSelect(
            'status',
            riskStatuses(),
            r.status,
            'data-risk-inline="status" data-risk-id="' + esc(r.id) + '"',
          ) +
          '</td><td>' +
          esc(r.updated || '—') +
          '</td><td><button class="op" data-risk-page-action="open" data-risk-id="' +
          esc(r.id) +
          '">查看详情</button><button class="op" data-risk-page-action="relations" data-risk-id="' +
          esc(r.id) +
          '">关联关系</button></td></tr>'
        );
      })
      .join('') +
    '</tbody></table></div>'
  );
}

function renderRiskManagement() {
  riskInit();
  var filters = state.riskFiltersOpen
    ? '<div class="risk-filter-panel"><label>流程状态</label>' +
      riskSelect(
        'filter-status',
        riskStatuses().concat(['全部']),
        state.riskStatusFilter,
        'data-risk-filter="status"',
      ) +
      '<label>风险等级</label>' +
      riskSelect(
        'filter-level',
        riskLevels().concat(['全部']),
        state.riskLevelFilter,
        'data-risk-filter="level"',
      ) +
      '<label>处理人</label><select class="input"><option>全部处理人</option><option>王凯</option><option>李明</option><option>组织架构自动带出</option></select><button class="btn" data-risk-page-action="reset">重置</button></div>'
    : '';
  return (
    '<div class="risk-reference-page"><div class="risk-toolbar"><button class="btn primary" data-risk-page-action="create">＋ 新建风险</button><input class="input risk-search" data-risk-search placeholder="搜索风险编号、名称或描述" value="' +
    esc(state.riskQuery || '') +
    '"><button class="btn" data-risk-page-action="filters">筛选</button><button class="btn" data-risk-page-action="add-condition">＋ 添加条件</button><button class="btn" data-risk-page-action="columns">自定义列</button><span class="risk-spacer"></span><span class="mini-note">共 ' +
    riskRows().length +
    ' 条</span></div>' +
    filters +
    '<div class="card risk-table-card">' +
    riskTable() +
    '</div></div>'
  );
}

function riskMetaRow(label, value) {
  return (
    '<div class="req-meta-row"><b>' + label + '：</b><span>' + esc(value || '—') + '</span></div>'
  );
}

function riskDetailPanel(r) {
  var projects = [r.project, '设备云平台 3.0', '边缘计算网关适配'];
  return (
    '<div class="risk-detail-note">风险编号、审核人、创建人、版本号与时间字段按项目权限自动生成或带出；风险状态变化会同步项目健康度与预警信息。</div><div class="form-grid">' +
    riskField('风险名称', 'name', r.name, false, false, false) +
    riskField('所属项目', 'project', r.project, false, false, true, projects) +
    riskField('风险等级', 'level', r.level, false, false, true, riskLevels()) +
    riskField('流程状态', 'status', r.status, false, false, true, riskStatuses()) +
    riskField('风险描述', 'description', r.description, true, true, false) +
    riskField('解决建议', 'action', r.action, true, true, false) +
    riskField('影响与后果', 'consequence', r.consequence, true, true, false) +
    '</div><div class="detail-section"><h4>在线评论</h4><div class="risk-comment-list">' +
    (r.comments && r.comments.length
      ? r.comments
          .map(function (c) {
            return (
              '<div class="risk-comment"><b>' +
              esc(c.name) +
              '</b><span>' +
              esc(c.time) +
              '</span><p>' +
              esc(c.text) +
              '</p></div>'
            );
          })
          .join('')
      : '<div class="mini-note">暂无评论</div>') +
    '</div><div class="form-grid"><div class="field full"><label>添加评论</label><textarea data-risk-comment placeholder="填写处理意见、评审结论或进展说明"></textarea></div><div class="change-form-actions full"><button class="btn" data-risk-drawer-action="comment">添加评论</button></div></div></div>'
  );
}

function riskRelationPanel(r) {
  return (
    '<div class="detail-section"><h4>关联关系</h4><p class="mini-note">查看风险涉及的需求、设计、任务、缺陷与变更，关联记录可直接跳转到对应页面。</p><div class="risk-relation-list">' +
    (r.relations || [])
      .map(function (x) {
        return (
          '<div class="risk-relation-row"><span class="risk-link-kind">' +
          esc(x.type.slice(0, 1)) +
          '</span><div class="grow"><strong>' +
          esc(x.id) +
          ' · ' +
          esc(x.title) +
          '</strong><small>' +
          esc(x.meta) +
          '</small></div><button class="op" data-risk-drawer-action="link" data-risk-link-type="' +
          esc(x.type) +
          '">打开</button></div>'
        );
      })
      .join('') +
    '</div><div class="detail-section"><h4>风险处置</h4><div class="review-box">风险可在跟踪过程中转为问题、缺陷或变更，并保留本条风险的原始记录与关联关系。</div></div>'
  );
}

function riskVersionPanel(r) {
  return (
    '<div class="detail-section"><h4>风险版本</h4><p class="mini-note">每次保存或提交都会保留风险快照，历史版本只读。</p><div class="risk-version-list">' +
    (r.versions || [])
      .map(function (v) {
        return (
          '<div class="risk-version-row ' +
          (v.status === '当前版本' ? 'current' : '') +
          '"><span class="version-mark">' +
          esc(v.version.replace('V', '')) +
          '</span><div class="grow"><strong>' +
          esc(v.version) +
          ' · ' +
          esc(v.status) +
          '</strong><small>' +
          esc(v.creator) +
          ' · ' +
          esc(v.time) +
          ' · ' +
          esc(v.summary) +
          '</small></div><button class="op" data-risk-drawer-action="version" data-risk-version="' +
          esc(v.version) +
          '">查看快照</button></div>'
        );
      })
      .join('') +
    '</div></div><div class="detail-section"><h4>处理记录</h4><div class="timeline"><div class="timeline-item"><b>风险已创建</b><small>' +
    esc(r.creator) +
    ' · ' +
    esc(r.created) +
    '</small></div><div class="timeline-item"><b>' +
    esc(r.status === '已完成' ? '风险已关闭' : '风险持续跟踪中') +
    '</b><small>' +
    esc(r.reviewer) +
    ' · ' +
    esc(r.updated) +
    '</small></div></div></div>'
  );
}

function riskDrawerBody(r) {
  var tabs = [
    ['detail', '详细信息'],
    ['relations', '关联关系'],
    ['versions', '风险版本'],
  ];
  var panel =
    state.riskTab === 'relations'
      ? riskRelationPanel(r)
      : state.riskTab === 'versions'
        ? riskVersionPanel(r)
        : riskDetailPanel(r);
  return (
    '<div class="req-drawer-layout"><div class="req-form-pane"><div class="risk-drawer-head"><div><h3>' +
    esc(r.name || '新建风险') +
    '</h3><small>' +
    esc(r.id) +
    ' · ' +
    esc(r.project) +
    '</small></div><div class="risk-drawer-status">' +
    riskLevelTag(r.level) +
    ' ' +
    riskStatusTag(r.status) +
    '</div></div><div class="req-form-tabs">' +
    tabs
      .map(function (x) {
        return (
          '<button class="req-form-tab ' +
          (state.riskTab === x[0] ? 'active' : '') +
          '" data-risk-drawer-action="tab" data-risk-tab="' +
          x[0] +
          '">' +
          x[1] +
          '</button>'
        );
      })
      .join('') +
    '</div>' +
    panel +
    '</div><aside class="req-meta-pane"><h4>基础信息</h4>' +
    riskMetaRow('编号', r.id) +
    riskMetaRow('风险名称', r.name) +
    riskMetaRow('所属项目', r.project) +
    riskMetaRow('风险等级', r.level) +
    riskMetaRow('流程状态', r.status) +
    riskMetaRow('审核人', r.reviewer) +
    riskMetaRow('最近更新时间', r.updated) +
    riskMetaRow('创建人', r.creator) +
    riskMetaRow('创建时间', r.created) +
    riskMetaRow('滞留时间', r.dwell) +
    '</aside></div>'
  );
}

function riskDrawerFoot(r) {
  return (
    '<button class="btn" data-risk-drawer-action="cancel">取消</button><button class="btn" data-risk-drawer-action="save">保存草稿</button><button class="btn" data-risk-drawer-action="continue">保存并继续创建</button><button class="btn primary" data-risk-drawer-action="submit">提交评审</button>' +
    (r.status !== '已完成'
      ? '<button class="btn warning" data-risk-drawer-action="close-risk">关闭风险</button>'
      : '')
  );
}

function openRiskDrawer(id, mode) {
  riskInit();
  state.riskMode = mode || 'edit';
  state.riskSelected = id || state.riskSelected;
  state.riskTab = 'detail';
  if (state.riskMode === 'create') state.riskDraft = riskBlank();
  var r = riskCurrent();
  openDrawer(
    state.riskMode === 'create' ? '新建风险' : '风险详情 · ' + r.id,
    riskDrawerBody(r),
    riskDrawerFoot(r),
  );
  $('#drawer').classList.add('req-drawer-large');
}

function collectRisk() {
  var r = riskCurrent(),
    body = $('#drawerBody');
  if (!body) return r;
  body.querySelectorAll('[data-risk-input]').forEach(function (input) {
    var key = input.dataset.riskInput;
    if (key !== 'filter-status' && key !== 'filter-level') r[key] = input.value;
  });
  r.updated = '刚刚';
  return r;
}

function saveRisk(mode) {
  var r = collectRisk();
  if (mode === 'submit') r.status = '待开始';
  if (state.riskMode === 'create') {
    r.id = 'RSK-NEW-' + Date.now();
    r.created = '2026-08-16';
    r.creator = '何盈';
    r.updated = '刚刚';
    r.versions = [
      {
        version: 'V1.0',
        status: '当前版本',
        creator: r.creator,
        time: '刚刚',
        summary: r.description || '新建风险记录',
      },
    ];
    state.riskRecords.unshift(
      Object.assign({}, r, { comments: r.comments || [], relations: r.relations || [] }),
    );
    state.riskSelected = r.id;
    state.riskDraft = null;
  }
  closeDrawer();
  App.render();
  showToast(mode === 'submit' ? '风险已提交评审' : '风险草稿已保存');
  if (mode === 'continue')
    setTimeout(function () {
      openRiskDrawer(null, 'create');
    }, 0);
}

function openRiskColumns() {
  openModal(
    'risk-columns',
    '自定义列',
    '<div class="notice"><i>▦</i><span>选择风险列表需要展示的字段，设置仅影响当前用户。</span></div><div class="req-modal-columns"><label><input type="checkbox" checked>序号</label><label><input type="checkbox" checked>风险编号</label><label><input type="checkbox" checked>风险名称</label><label><input type="checkbox" checked>所属项目</label><label><input type="checkbox" checked>审核人</label><label><input type="checkbox" checked>风险等级</label><label><input type="checkbox" checked>流程状态</label><label><input type="checkbox" checked>最近更新时间</label><label><input type="checkbox" checked>操作</label></div>',
    '<button class="btn" data-action="close-modal">取消</button><button class="btn primary" data-action="modal-save">保存设置</button>',
  );
}

function applyRiskManagementSurface() {
  if (state.view !== 'project-adjustment' || state.adjustmentTab !== 'risks') return;
  var host = document.querySelector('#appView .project-layout > div');
  if (!host || host.querySelector('.risk-reference-page')) return;
  host.innerHTML =
    commonHead(
      '项目管理 / 项目调整',
      '项目调整',
      '集中管理项目变更、风险与缺陷，所有对象均回写统一项目数据。',
      '<button class="btn" data-action="open-audit">操作记录</button>',
    ) +
    changeAdjustmentTabs() +
    renderRiskManagement();
}

const riskManagementObserver = new MutationObserver(function () {
  applyRiskManagementSurface();
});

function openRiskRelated(type) {
  if (type === '需求') {
    state.projectSection = 'lifecycle';
    state.lifecycleStage = 'requirements';
    setView('project-lifecycle');
    return;
  }
  if (type === '设计') {
    state.projectSection = 'lifecycle';
    state.lifecycleStage = 'design';
    setView('project-lifecycle');
    return;
  }
  if (type === '任务') {
    state.projectSection = 'lifecycle';
    state.lifecycleStage = 'development';
    setView('project-lifecycle');
    return;
  }
  if (type === '缺陷') {
    state.projectSection = 'lifecycle';
    state.lifecycleStage = 'testing';
    setView('project-lifecycle');
    return;
  }
  if (type === '变更') {
    state.projectSection = 'adjustment';
    state.adjustmentTab = 'changes';
    setView('project-adjustment');
  }
}

/** V1.5 风险管理 */
export function initRiskManagement() {
  riskAppSurface = $('#appView');
  if (riskAppSurface)
    riskManagementObserver.observe(riskAppSurface, { childList: true, subtree: true });
  setTimeout(applyRiskManagementSurface, 0);
  document.addEventListener('click', function (e) {
    var pageEl = e.target.closest('[data-risk-page-action]');
    if (pageEl) {
      e.preventDefault();
      e.stopPropagation();
      let action = pageEl.dataset.riskPageAction,
        id = pageEl.dataset.riskId;
      if (
        (action === 'open' || action === 'relations') &&
        (e.target.closest('select') || e.target.matches('input[type=checkbox]'))
      )
        return;
      if (action === 'create') {
        openRiskDrawer(null, 'create');
        return;
      }
      if (action === 'open' || action === 'relations') {
        state.riskSelected = id || state.riskSelected;
        state.riskTab = action === 'relations' ? 'relations' : 'detail';
        openRiskDrawer(state.riskSelected, 'edit');
        return;
      }
      if (action === 'filters') {
        riskInit();
        state.riskFiltersOpen = !state.riskFiltersOpen;
        App.render();
        return;
      }
      if (action === 'reset') {
        state.riskQuery = '';
        state.riskStatusFilter = '全部';
        state.riskLevelFilter = '全部';
        state.riskFiltersOpen = false;
        App.render();
        return;
      }
      if (action === 'add-condition') {
        showToast('已添加风险筛选条件');
        return;
      }
      if (action === 'columns') {
        openRiskColumns();
        return;
      }
      return;
    }
    var drawerEl = e.target.closest('[data-risk-drawer-action]');
    if (!drawerEl) return;
    e.preventDefault();
    e.stopPropagation();
    let action = drawerEl.dataset.riskDrawerAction;
    if (action === 'tab') {
      state.riskTab = drawerEl.dataset.riskTab || 'detail';
      var r = riskCurrent();
      $('#drawerBody').innerHTML = riskDrawerBody(r);
      return;
    }
    if (action === 'cancel') {
      closeDrawer();
      return;
    }
    if (action === 'save') {
      saveRisk('save');
      return;
    }
    if (action === 'submit') {
      saveRisk('submit');
      return;
    }
    if (action === 'continue') {
      saveRisk('continue');
      return;
    }
    if (action === 'close-risk') {
      let current = collectRisk();
      current.status = '已完成';
      current.dwell = '已关闭';
      current.updated = '刚刚';
      closeDrawer();
      App.render();
      showToast('风险已关闭');
      return;
    }
    if (action === 'comment') {
      var area = document.querySelector('[data-risk-comment]');
      if (area && area.value.trim()) {
        let current = riskCurrent();
        current.comments = current.comments || [];
        current.comments.push({ name: '何盈', time: '刚刚', text: area.value.trim() });
        state.riskTab = 'detail';
        $('#drawerBody').innerHTML = riskDrawerBody(current);
        showToast('评论已添加');
      }
      return;
    }
    if (action === 'link') {
      openRiskRelated(drawerEl.dataset.riskLinkType);
      return;
    }
    if (action === 'version') {
      let current = riskCurrent(),
        version =
          (current.versions || []).find(function (v) {
            return v.version === drawerEl.dataset.riskVersion;
          }) || current.versions[0];
      openModal(
        'risk-version',
        '风险版本快照 · ' + version.version,
        '<div class="risk-version-snapshot"><h4>' +
          esc(current.name) +
          ' · ' +
          esc(version.version) +
          '</h4><p><b>版本状态：</b>' +
          esc(version.status) +
          '</p><p><b>创建人：</b>' +
          esc(version.creator) +
          '　<b>创建时间：</b>' +
          esc(version.time) +
          '</p><div class="snapshot-block"><b>风险描述</b><p>' +
          esc(version.summary || current.description) +
          '</p></div><div class="snapshot-block"><b>处理记录</b><p>该版本内容以只读快照保留，可追溯风险描述、处置建议、影响后果与状态变更。</p></div></div>',
        '<button class="btn" data-action="close-modal">关闭</button>',
      );
      return;
    }
  });
  document.addEventListener('input', function (e) {
    if (e.target.matches('[data-risk-search]')) {
      riskInit();
      state.riskQuery = e.target.value;
      App.render();
    }
  });
  document.addEventListener('change', function (e) {
    var filter = e.target.closest('[data-risk-filter]');
    if (filter) {
      riskInit();
      if (filter.dataset.riskFilter === 'status') state.riskStatusFilter = e.target.value;
      if (filter.dataset.riskFilter === 'level') state.riskLevelFilter = e.target.value;
      App.render();
      return;
    }
    var inline = e.target.closest('[data-risk-inline]');
    if (inline) {
      var record = riskRecord(inline.dataset.riskId);
      record.status = e.target.value;
      record.updated = '刚刚';
      state.riskSelected = record.id;
      App.render();
      showToast('风险流程状态已更新');
    }
  });
}
