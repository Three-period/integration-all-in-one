/** 项目调整 — 变更管理（V1.4）。 */
import { App } from '../../core/app.js';
import { closeDrawer, openDrawer, openModal } from '../../components/overlays.js';
import { commonHead } from '../../components/shell.js';
import { showToast } from '../../components/toast.js';
import { $, esc, tag } from '../../core/dom.js';
import { setView } from '../../core/navigation.js';
import { project, state } from '../../store/state.js';

let changeAppSurface;

/* V1.4：项目调整—变更管理。仅替换变更管理内容，风险与缺陷继续使用原页面。 */
function changeBlank() {
  return {
    id: '自动生成',
    name: '',
    project: project().name || '液冷控制算法预研（示例项目）',
    business: 'IDC / SPT',
    reviewer: '组织架构自动带出',
    category: '需求变更',
    target: '需求文档',
    reason: '',
    status: '待开始',
    updated: '-',
    creator: '何盈',
    created: '2026-08-16',
    dwell: '-',
    content: '',
    impact: '',
    comments: [],
    versions: [],
    links: [],
  };
}

function changeInit() {
  if (state.changeReady) return;
  state.changeReady = true;
  state.changeQuery = '';
  state.changeStatusFilter = '全部';
  state.changeCategoryFilter = '全部';
  state.changeTab = 'detail';
  state.changeMode = 'edit';
  state.changeSelected = 'CHG-202608-004';
  state.changeDraft = null;
  state.changeRecords ??= [
    {
      id: 'CHG-202608-004',
      name: '补充并发量指标',
      project: '液冷控制算法预研（示例项目）',
      business: 'IDC / SPT',
      reviewer: '组织架构自动带出',
      category: '需求变更',
      target: '需求文档',
      reason: '补充高并发场景下的消息完整性指标，确保需求与测试口径一致。',
      status: '进行中',
      updated: '2026-08-16 10:24',
      creator: '何盈',
      created: '2026-08-11',
      dwell: '2 天',
      content: '补充高并发消息上报的峰值指标、异常重试与消息完整性要求。',
      impact: '需求范围、软件规格书、开发任务与测试用例需要同步更新。',
      comments: [
        {
          name: '何盈',
          time: '2026-08-16 10:24',
          text: '已完成影响范围梳理，待研发确认实施排期。',
        },
        { name: '王凯', time: '2026-08-15 17:10', text: '请同步更新软件规格书中的接口约束。' },
      ],
      versions: [
        {
          version: 'V1.1',
          status: '当前版本',
          creator: '何盈',
          time: '2026-08-16 10:24',
          summary: '补充高并发场景指标与异常重试要求。',
        },
        {
          version: 'V1.0',
          status: '已替代',
          creator: '陈思',
          time: '2026-08-11 14:30',
          summary: '初始变更申请。',
        },
      ],
      links: [
        { type: '需求', id: 'REQ-142', title: '高并发设备消息上报', stage: '需求阶段' },
        { type: '设计', id: 'DSN-002-V1.0', title: '软件架构设计', stage: '设计阶段' },
      ],
    },
    {
      id: 'CHG-202608-002',
      name: '调整消息队列架构',
      project: '液冷控制算法预研（示例项目）',
      business: 'IDC',
      reviewer: '组织架构自动带出',
      category: '设计变更',
      target: '软件规格书',
      reason: '优化峰值场景下的消息处理能力。',
      status: '评审通过',
      updated: '2026-08-14 16:08',
      creator: '何盈',
      created: '2026-08-08',
      dwell: '已结束',
      content: '将消息队列由单通道调整为分区并行处理。',
      impact: '影响架构设计、开发任务与单板测试用例。',
      comments: [
        { name: '李明', time: '2026-08-14 16:08', text: '设计评审已通过，可进入执行变更。' },
      ],
      versions: [
        {
          version: 'V2.0',
          status: '当前版本',
          creator: '何盈',
          time: '2026-08-14 16:08',
          summary: '完成消息队列分区并行架构调整。',
        },
        {
          version: 'V1.0',
          status: '已替代',
          creator: '何盈',
          time: '2026-08-08 11:20',
          summary: '初始设计变更。',
        },
      ],
      links: [
        { type: '需求', id: 'REQ-142', title: '高并发设备消息上报', stage: '需求阶段' },
        { type: '设计', id: 'DSN-002-V1.0', title: '软件架构设计', stage: '设计阶段' },
      ],
    },
  ];
}

function changeRecord(id) {
  changeInit();
  return (
    state.changeRecords.find(function (r) {
      return r.id === id;
    }) || state.changeRecords[0]
  );
}

function changeCurrent() {
  changeInit();
  if (state.changeMode === 'create') {
    if (!state.changeDraft) state.changeDraft = changeBlank();
    return state.changeDraft;
  }
  return changeRecord(state.changeSelected);
}

function changeStatuses() {
  return ['待开始', '进行中', '待评审', '评审通过', '执行变更', '已结束', '已拒绝'];
}

function changeCategories() {
  return ['需求变更', '设计变更', '成本目标变更', '项目类型变更', '资源变更', '其他变更'];
}

function changeSelect(name, options, current, attr) {
  return (
    '<select ' +
    (attr || '') +
    ' data-change-input="' +
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

function changeField(label, name, value, wide, area, select, options) {
  var control = area
    ? '<textarea data-change-input="' +
      esc(name) +
      '" placeholder="请输入' +
      esc(label) +
      '">' +
      esc(value || '') +
      '</textarea>'
    : select
      ? changeSelect(name, options || [], value)
      : '<input data-change-input="' + esc(name) + '" value="' + esc(value || '') + '" />';
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

function changeStatusTag(value) {
  var cls =
    value === '已结束' || value === '评审通过'
      ? 'green'
      : value === '已拒绝'
        ? 'red'
        : value === '待评审'
          ? 'orange'
          : 'blue';
  return tag(value, cls);
}

function changeCategoryTag(value) {
  var cls = value === '需求变更' ? 'blue' : value === '设计变更' ? 'purple' : 'gray';
  return tag(value, cls);
}

function changeRows() {
  changeInit();
  var query = (state.changeQuery || '').toLowerCase();
  return state.changeRecords.filter(function (r) {
    var hit =
      !query ||
      (r.id + ' ' + r.name + ' ' + r.project + ' ' + r.target + ' ' + r.category)
        .toLowerCase()
        .indexOf(query) > -1;
    var status = state.changeStatusFilter === '全部' || r.status === state.changeStatusFilter;
    var category =
      state.changeCategoryFilter === '全部' || r.category === state.changeCategoryFilter;
    return hit && status && category;
  });
}

function changeTable() {
  var rows = changeRows();
  if (!rows.length) return '<div class="change-empty">没有匹配的变更记录，请调整筛选条件。</div>';
  return (
    '<div class="table-wrap"><table class="table change-table"><thead><tr><th>序号</th><th>变更编号</th><th>变更名称</th><th>所属项目</th><th>审核人</th><th>变更类别</th><th>流程状态</th><th>最近更新时间</th><th>操作</th></tr></thead><tbody>' +
    rows
      .map(function (r, i) {
        return (
          '<tr data-change-page-action="open" data-change-id="' +
          esc(r.id) +
          '"><td>' +
          (i + 1) +
          '</td><td class="link">' +
          esc(r.id) +
          '</td><td><span class="cell-title">' +
          esc(r.name || '未命名变更') +
          '</span><span class="cell-sub">' +
          esc(r.target || '—') +
          '</span></td><td>' +
          esc(r.project) +
          '</td><td>' +
          esc(r.reviewer) +
          '</td><td>' +
          changeCategoryTag(r.category) +
          '</td><td>' +
          changeSelect(
            'status',
            changeStatuses(),
            r.status,
            'data-change-inline="status" data-change-id="' + esc(r.id) + '"',
          ) +
          '</td><td>' +
          esc(r.updated || '—') +
          '</td><td><button class="op" data-change-page-action="open" data-change-id="' +
          esc(r.id) +
          '">查看详情</button><button class="op" data-change-page-action="impact" data-change-id="' +
          esc(r.id) +
          '">影响分析</button></td></tr>'
        );
      })
      .join('') +
    '</tbody></table></div>'
  );
}

export function changeAdjustmentTabs() {
  var tabs = [
    ['changes', '变更管理'],
    ['risks', '风险管理'],
    ['defects', '缺陷管理'],
  ];
  return (
    '<div class="seg-tabs">' +
    tabs
      .map(function (x) {
        return (
          '<button class="seg-tab ' +
          (state.adjustmentTab === x[0] ? 'active' : '') +
          '" data-action="adjust-tab" data-tab="' +
          x[0] +
          '">' +
          x[1] +
          '</button>'
        );
      })
      .join('') +
    '</div>'
  );
}

function renderChangeManagement() {
  changeInit();
  var filters = state.changeFiltersOpen
    ? '<div class="change-filter-panel"><label>流程状态</label>' +
      changeSelect(
        'filter-status',
        changeStatuses().concat(['全部']),
        state.changeStatusFilter,
        'data-change-filter="status"',
      ) +
      '<label>变更类别</label>' +
      changeSelect(
        'filter-category',
        changeCategories().concat(['全部']),
        state.changeCategoryFilter,
        'data-change-filter="category"',
      ) +
      '<label>处理人</label><select class="input"><option>全部处理人</option><option>何盈</option><option>王凯</option><option>组织架构自动带出</option></select><button class="btn" data-change-page-action="reset">重置</button></div>'
    : '';
  return (
    '<div class="change-reference-page"><div class="change-toolbar"><button class="btn primary" data-change-page-action="create">＋ 新建变更</button><input class="input change-search" data-change-search placeholder="搜索变更编号、名称或对象" value="' +
    esc(state.changeQuery || '') +
    '"><button class="btn" data-change-page-action="filters">筛选</button><button class="btn" data-change-page-action="add-condition">＋ 添加条件</button><button class="btn" data-change-page-action="columns">自定义列</button><span class="change-spacer"></span><span class="mini-note">共 ' +
    changeRows().length +
    ' 条</span></div>' +
    filters +
    '<div class="card change-table-card">' +
    changeTable() +
    '</div></div>'
  );
}

function changeMetaRow(label, value) {
  return (
    '<div class="req-meta-row"><b>' + label + '：</b><span>' + esc(value || '—') + '</span></div>'
  );
}

function changeDetailPanel(r) {
  return (
    '<div class="change-detail-note">变更编号由系统自动生成；组织架构、创建人、版本号与时间字段按项目权限自动带出。</div><div class="form-grid">' +
    changeField('变更名称', 'name', r.name, false, false, false) +
    changeField('所属事业部', 'business', r.business, false, false, false) +
    changeField('所属项目', 'project', r.project, false, false, false) +
    changeField('变更类别', 'category', r.category, false, false, true, changeCategories()) +
    changeField('变更对象', 'target', r.target, false, false, false) +
    changeField('流程状态', 'status', r.status, false, false, true, changeStatuses()) +
    changeField('审核人', 'reviewer', r.reviewer, false, false, false) +
    changeField('变更原因', 'reason', r.reason, true, true, false) +
    changeField('变更内容', 'content', r.content, true, true, false) +
    '</div><div class="detail-section"><h4>在线评论</h4><div class="change-comment-list">' +
    (r.comments && r.comments.length
      ? r.comments
          .map(function (c) {
            return (
              '<div class="change-comment"><b>' +
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
    '</div><div class="form-grid"><div class="field full"><label>添加评论</label><textarea data-change-comment placeholder="填写处理意见、评审结论或执行说明"></textarea></div><div class="change-form-actions full"><button class="btn" data-change-drawer-action="comment">添加评论</button></div></div></div>'
  );
}

function changeImpactPanel(r) {
  var impact = [
    ['需求范围', '关联需求、父子需求与需求版本'],
    ['设计与规格', '软件规格书、架构设计及接口约束'],
    ['任务与里程碑', '受影响的开发任务、负责人和计划日期'],
    ['测试验证', '关联用例、测试报告与缺陷闭环'],
    ['发布与资源', '发布计划、版本基线和资源负载'],
  ];
  return (
    '<div class="detail-section"><h4>影响分析</h4><p class="mini-note">变更提交后自动汇总关联对象；关联记录可直接回到对应生命周期页面。</p><div class="change-impact-list">' +
    impact
      .map(function (x) {
        return (
          '<div class="change-impact-item"><strong>' +
          x[0] +
          '</strong><span>' +
          x[1] +
          '</span></div>'
        );
      })
      .join('') +
    '</div></div><div class="detail-section"><h4>关联需求与设计文档</h4><div class="change-link-list">' +
    (r.links || [])
      .map(function (x) {
        return (
          '<div class="change-link-row"><span class="change-link-kind">' +
          esc(x.type.slice(0, 1)) +
          '</span><div class="grow"><strong>' +
          esc(x.id) +
          ' · ' +
          esc(x.title) +
          '</strong><small>' +
          esc(x.stage) +
          '</small></div><button class="op" data-change-drawer-action="link" data-change-link-type="' +
          esc(x.type) +
          '">打开</button></div>'
        );
      })
      .join('') +
    '</div></div><div class="detail-section"><h4>影响结论</h4><div class="review-box">' +
    esc(r.impact || '待补充影响范围与结论。') +
    '</div></div>'
  );
}

function changeVersionPanel(r) {
  return (
    '<div class="detail-section"><h4>变更版本</h4><p class="mini-note">每次保存或提交都会保留版本快照，历史版本只读。</p><div class="change-version-list">' +
    (r.versions || [])
      .map(function (v) {
        return (
          '<div class="change-version-row ' +
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
          '</small></div><button class="op" data-change-drawer-action="version" data-change-version="' +
          esc(v.version) +
          '">查看快照</button></div>'
        );
      })
      .join('') +
    '</div></div><div class="detail-section"><h4>审批记录</h4><div class="timeline"><div class="timeline-item"><b>变更申请已创建</b><small>' +
    esc(r.creator) +
    ' · ' +
    esc(r.created) +
    '</small></div><div class="timeline-item"><b>' +
    esc(r.status === '评审通过' ? '评审通过' : '等待后续审批') +
    '</b><small>' +
    esc(r.reviewer) +
    ' · ' +
    esc(r.updated) +
    '</small></div></div></div>'
  );
}

function changeDrawerBody(r) {
  var tabs = [
    ['detail', '详细信息'],
    ['impact', '影响分析'],
    ['versions', '变更版本'],
  ];
  var panel =
    state.changeTab === 'impact'
      ? changeImpactPanel(r)
      : state.changeTab === 'versions'
        ? changeVersionPanel(r)
        : changeDetailPanel(r);
  return (
    '<div class="req-drawer-layout"><div class="req-form-pane"><div class="change-drawer-head"><div><h3>' +
    esc(r.name || '新建变更') +
    '</h3><small>' +
    esc(r.id) +
    ' · ' +
    esc(r.project) +
    '</small></div><div class="change-drawer-status">' +
    changeCategoryTag(r.category) +
    ' ' +
    changeStatusTag(r.status) +
    '</div></div><div class="req-form-tabs">' +
    tabs
      .map(function (x) {
        return (
          '<button class="req-form-tab ' +
          (state.changeTab === x[0] ? 'active' : '') +
          '" data-change-drawer-action="tab" data-change-tab="' +
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
    changeMetaRow('编号', r.id) +
    changeMetaRow('变更名称', r.name) +
    changeMetaRow('所属事业部', r.business) +
    changeMetaRow('所属项目', r.project) +
    changeMetaRow('变更类别', r.category) +
    changeMetaRow('变更对象', r.target) +
    changeMetaRow('流程状态', r.status) +
    changeMetaRow('审核人', r.reviewer) +
    changeMetaRow('创建人', r.creator) +
    changeMetaRow('创建时间', r.created) +
    changeMetaRow('最近更新', r.updated) +
    changeMetaRow('滞留时间', r.dwell) +
    '</aside></div>'
  );
}

function changeDrawerFoot() {
  return '<button class="btn" data-change-drawer-action="cancel">取消</button><button class="btn" data-change-drawer-action="save">保存草稿</button><button class="btn" data-change-drawer-action="continue">保存并继续创建</button><button class="btn primary" data-change-drawer-action="submit">提交评审</button>';
}

function openChangeDrawer(id, mode) {
  changeInit();
  state.changeMode = mode || 'edit';
  state.changeSelected = id || state.changeSelected;
  state.changeTab = 'detail';
  if (state.changeMode === 'create') state.changeDraft = changeBlank();
  var r = changeCurrent();
  openDrawer(
    state.changeMode === 'create' ? '新建变更' : '变更详情 · ' + r.id,
    changeDrawerBody(r),
    changeDrawerFoot(),
  );
  $('#drawer').classList.add('req-drawer-large');
}

function collectChange() {
  var r = changeCurrent(),
    body = $('#drawerBody');
  if (!body) return r;
  body.querySelectorAll('[data-change-input]').forEach(function (input) {
    var key = input.dataset.changeInput;
    if (key !== 'filter-status' && key !== 'filter-category') r[key] = input.value;
  });
  r.updated = '刚刚';
  return r;
}

function saveChange(mode) {
  var r = collectChange();
  if (mode === 'submit') r.status = '待评审';
  if (state.changeMode === 'create') {
    r.id = 'CHG-NEW-' + Date.now();
    r.created = '2026-08-16';
    r.creator = '何盈';
    r.updated = '刚刚';
    r.versions = [
      {
        version: 'V1.0',
        status: '当前版本',
        creator: r.creator,
        time: '刚刚',
        summary: r.content || '新建变更申请',
      },
    ];
    state.changeRecords.unshift(
      Object.assign({}, r, { comments: r.comments || [], links: r.links || [] }),
    );
    state.changeSelected = r.id;
    state.changeDraft = null;
  }
  closeDrawer();
  App.render();
  showToast(
    mode === 'submit'
      ? '变更申请已提交评审'
      : mode === 'continue'
        ? '变更草稿已保存'
        : '变更草稿已保存',
  );
  if (mode === 'continue')
    setTimeout(function () {
      openChangeDrawer(null, 'create');
    }, 0);
}

function openChangeColumns() {
  openModal(
    'change-columns',
    '自定义列',
    '<div class="notice"><i>▦</i><span>选择变更列表需要展示的字段，设置仅影响当前用户。</span></div><div class="req-modal-columns"><label><input type="checkbox" checked>序号</label><label><input type="checkbox" checked>变更编号</label><label><input type="checkbox" checked>变更名称</label><label><input type="checkbox" checked>所属项目</label><label><input type="checkbox" checked>审核人</label><label><input type="checkbox" checked>变更类别</label><label><input type="checkbox" checked>流程状态</label><label><input type="checkbox" checked>最近更新时间</label><label><input type="checkbox" checked>操作</label></div>',
    '<button class="btn" data-action="close-modal">取消</button><button class="btn primary" data-action="modal-save">保存设置</button>',
  );
}

function applyChangeManagementSurface() {
  if (state.view !== 'project-adjustment' || state.adjustmentTab !== 'changes') return;
  var host = document.querySelector('#appView .project-layout > div');
  if (!host || host.querySelector('.change-reference-page')) return;
  host.innerHTML =
    commonHead(
      '项目管理 / 项目调整',
      '项目调整',
      '集中管理项目变更、风险与缺陷，所有对象均回写统一项目数据。',
      '<button class="btn" data-action="open-audit">操作记录</button>',
    ) +
    changeAdjustmentTabs() +
    renderChangeManagement();
}

const changeManagementObserver = new MutationObserver(function () {
  applyChangeManagementSurface();
});

/** V1.4 变更管理 */
export function initChangeManagement() {
  changeAppSurface = $('#appView');
  if (changeAppSurface)
    changeManagementObserver.observe(changeAppSurface, { childList: true, subtree: true });
  setTimeout(applyChangeManagementSurface, 0);
  document.addEventListener('click', function (e) {
    var pageEl = e.target.closest('[data-change-page-action]');
    if (pageEl) {
      e.preventDefault();
      e.stopPropagation();
      let action = pageEl.dataset.changePageAction,
        id = pageEl.dataset.changeId;
      if (action === 'create') {
        openChangeDrawer(null, 'create');
        return;
      }
      if (action === 'open' || action === 'impact') {
        state.changeSelected = id || state.changeSelected;
        state.changeTab = action === 'impact' ? 'impact' : 'detail';
        openChangeDrawer(state.changeSelected, 'edit');
        return;
      }
      if (action === 'filters') {
        changeInit();
        state.changeFiltersOpen = !state.changeFiltersOpen;
        App.render();
        return;
      }
      if (action === 'reset') {
        state.changeQuery = '';
        state.changeStatusFilter = '全部';
        state.changeCategoryFilter = '全部';
        state.changeFiltersOpen = false;
        App.render();
        return;
      }
      if (action === 'add-condition') {
        showToast('已添加变更筛选条件');
        return;
      }
      if (action === 'columns') {
        openChangeColumns();
        return;
      }
      return;
    }
    var drawerEl = e.target.closest('[data-change-drawer-action]');
    if (!drawerEl) return;
    e.preventDefault();
    e.stopPropagation();
    let action = drawerEl.dataset.changeDrawerAction;
    if (action === 'tab') {
      state.changeTab = drawerEl.dataset.changeTab || 'detail';
      var r = changeCurrent();
      $('#drawerBody').innerHTML = changeDrawerBody(r);
      return;
    }
    if (action === 'cancel') {
      closeDrawer();
      return;
    }
    if (action === 'save') {
      saveChange('save');
      return;
    }
    if (action === 'submit') {
      saveChange('submit');
      return;
    }
    if (action === 'continue') {
      saveChange('continue');
      return;
    }
    if (action === 'comment') {
      var area = document.querySelector('[data-change-comment]');
      if (area && area.value.trim()) {
        let current = changeCurrent();
        current.comments = current.comments || [];
        current.comments.push({ name: '何盈', time: '刚刚', text: area.value.trim() });
        state.changeTab = 'detail';
        $('#drawerBody').innerHTML = changeDrawerBody(current);
        showToast('评论已添加');
      }
      return;
    }
    if (action === 'version') {
      let current = changeCurrent(),
        version =
          (current.versions || []).find(function (v) {
            return v.version === drawerEl.dataset.changeVersion;
          }) || current.versions[0];
      openModal(
        'change-version',
        '版本快照 · ' + version.version,
        '<div class="change-version-snapshot"><h4>' +
          esc(current.name) +
          ' · ' +
          esc(version.version) +
          '</h4><p><b>版本状态：</b>' +
          esc(version.status) +
          '</p><p><b>创建人：</b>' +
          esc(version.creator) +
          '　<b>创建时间：</b>' +
          esc(version.time) +
          '</p><div class="snapshot-block"><b>变更内容</b><p>' +
          esc(version.summary || current.content) +
          '</p></div><div class="snapshot-block"><b>审批记录</b><p>该版本内容已保留只读快照，可追溯变更原因、影响分析与审批结论。</p></div></div>',
        '<button class="btn" data-action="close-modal">关闭</button>',
      );
      return;
    }
    if (action === 'link') {
      var type = drawerEl.dataset.changeLinkType;
      if (type === '需求') {
        state.lifecycleStage = 'requirements';
      } else {
        state.lifecycleStage = 'design';
      }
      state.projectSection = 'lifecycle';
      closeDrawer();
      setView('project-lifecycle');
      return;
    }
  });
  document.addEventListener('input', function (e) {
    if (e.target.matches('[data-change-search]')) {
      changeInit();
      state.changeQuery = e.target.value;
      App.render();
    }
  });
  document.addEventListener('change', function (e) {
    var filter = e.target.closest('[data-change-filter]');
    if (filter) {
      changeInit();
      if (filter.dataset.changeFilter === 'status') state.changeStatusFilter = e.target.value;
      if (filter.dataset.changeFilter === 'category') state.changeCategoryFilter = e.target.value;
      App.render();
      return;
    }
    var inline = e.target.closest('[data-change-inline]');
    if (inline) {
      var record = changeRecord(inline.dataset.changeId);
      record.status = e.target.value;
      record.updated = '刚刚';
      state.changeSelected = record.id;
      App.render();
      showToast('变更流程状态已更新');
    }
  });
}
