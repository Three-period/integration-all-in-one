import { bugBlank, ensureBugRecords } from '../../store/bugs.js';
import { openFeedbackDetail } from '../../features/test-feedback.js';
/** 项目调整 — 缺陷管理（V1.6）。 */
import { App } from '../../core/app.js';
import { closeDrawer, openDrawer, openModal } from '../../components/overlays.js';
import { commonHead } from '../../components/shell.js';
import { showToast } from '../../components/toast.js';
import { $, esc, tag } from '../../core/dom.js';
import { setView } from '../../core/navigation.js';
import { changeAdjustmentTabs } from './changes.js';
import { adjustmentProjectId, projects as allProjects } from '../../data/projects.js';
import { state } from '../../store/state.js';

let bugAppSurface;

/* V1.6：项目调整—缺陷管理。仅替换缺陷管理内容，变更与风险保持原页面。 */
function bugInit() {
  if (state.bugReady) return;
  state.bugReady = true;
  state.bugQuery = '';
  state.bugStatusFilter = '全部';
  state.bugSeverityFilter = '全部';
  state.bugFiltersOpen = false;
  state.bugTab = 'detail';
  state.bugMode = 'edit';
  state.bugSelected = 'DFT-202608-0198';
  state.bugDraft = null;
  ensureBugRecords();
}

function bugRecord(id) {
  bugInit();
  return (
    state.bugRecords.find(function (r) {
      return r.id === id;
    }) || state.bugRecords[0]
  );
}

function bugCurrent() {
  bugInit();
  if (state.bugMode === 'create') {
    if (!state.bugDraft) state.bugDraft = bugBlank();
    return state.bugDraft;
  }
  return bugRecord(state.bugSelected);
}

function bugSeverities() {
  return ['致命', '严重', '一般', '建议项', '重要'];
}

function bugStatuses() {
  return ['待开始', '进行中', '已完成'];
}

function bugSelect(name, options, current, attr) {
  return (
    '<select ' +
    (attr || '') +
    ' data-bug-input="' +
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

function bugField(label, name, value, wide, area, select, options) {
  var control = area
    ? '<textarea data-bug-input="' +
      esc(name) +
      '" placeholder="请输入' +
      esc(label) +
      '">' +
      esc(value || '') +
      '</textarea>'
    : select
      ? bugSelect(name, options || [], value)
      : '<input data-bug-input="' + esc(name) + '" value="' + esc(value || '') + '" />';
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

function bugSeverityTag(value) {
  return tag(
    value,
    value === '致命' || value === '严重'
      ? 'red'
      : value === '一般' || value === '重要'
        ? 'orange'
        : 'blue',
  );
}

function bugStatusTag(value) {
  return tag(value, value === '已完成' ? 'green' : value === '进行中' ? 'blue' : 'gray');
}

function bugRows() {
  bugInit();
  var query = (state.bugQuery || '').toLowerCase();
  return state.bugRecords.filter(function (r) {
    var hit =
      !query ||
      (r.id + ' ' + r.name + ' ' + r.project + ' ' + r.summary + ' ' + r.resolver)
        .toLowerCase()
        .indexOf(query) > -1;
    var status = state.bugStatusFilter === '全部' || r.status === state.bugStatusFilter;
    var severity = state.bugSeverityFilter === '全部' || r.severity === state.bugSeverityFilter;
    return hit && status && severity;
  });
}

function bugTable() {
  var rows = bugRows();
  if (!rows.length) return '<div class="bug-empty">没有匹配的缺陷记录，请调整筛选条件。</div>';
  return (
    '<div class="table-wrap"><table class="table bug-table"><thead><tr><th>序号</th><th>缺陷编号</th><th>缺陷名称</th><th>所属项目</th><th>审核人</th><th>严重程度</th><th>流程状态</th><th>最近更新时间</th><th>操作</th></tr></thead><tbody>' +
    rows
      .map(function (r, i) {
        return (
          '<tr data-bug-page-action="open" data-bug-id="' +
          esc(r.id) +
          '"><td>' +
          (i + 1) +
          '</td><td class="link">' +
          esc(r.id) +
          '</td><td><span class="bug-title">' +
          esc(r.name || '未命名缺陷') +
          '</span><span class="bug-sub">' +
          esc(r.summary || '—') +
          '</span></td><td>' +
          esc(r.project) +
          '</td><td>' +
          esc(r.reviewer) +
          '</td><td>' +
          bugSeverityTag(r.severity) +
          '</td><td>' +
          (r.testFeedback
            ? esc(r.status)
            : bugSelect(
                'status',
                bugStatuses(),
                r.status,
                'data-bug-inline="status" data-bug-id="' + esc(r.id) + '"',
              )) +
          '</td><td>' +
          esc(r.updated || '—') +
          '</td><td><button class="op" data-bug-page-action="open" data-bug-id="' +
          esc(r.id) +
          '">查看详情</button>' +
          (r.testFeedback
            ? ''
            : '<button class="op" data-bug-page-action="verify" data-bug-id="' +
              esc(r.id) +
              '">提交验证</button>') +
          '</td></tr>'
        );
      })
      .join('') +
    '</tbody></table></div>'
  );
}

function renderBugManagement() {
  bugInit();
  var filters = state.bugFiltersOpen
    ? '<div class="bug-filter-panel"><label>流程状态</label>' +
      bugSelect(
        'filter-status',
        bugStatuses().concat(['待整改', '待检视', '待回归验证', '已关闭', '全部']),
        state.bugStatusFilter,
        'data-bug-filter="status"',
      ) +
      '<label>严重程度</label>' +
      bugSelect(
        'filter-severity',
        bugSeverities().concat(['全部']),
        state.bugSeverityFilter,
        'data-bug-filter="severity"',
      ) +
      '<label>问题解决人</label><select class="input"><option>全部问题解决人</option><option>孙宁</option><option>李明</option><option>问题解决人选择</option></select><button class="btn" data-bug-page-action="reset">重置</button></div>'
    : '';
  return (
    '<div class="bug-reference-page"><div class="bug-toolbar"><button class="btn primary" data-bug-page-action="create">＋ 新建缺陷</button><input class="input bug-search" data-bug-search placeholder="搜索缺陷编号、名称或描述" value="' +
    esc(state.bugQuery || '') +
    '"><button class="btn" data-bug-page-action="filters">筛选</button><button class="btn" data-bug-page-action="add-condition">＋ 添加条件</button><button class="btn" data-bug-page-action="columns">自定义列</button><span class="bug-spacer"></span><span class="mini-note">共 ' +
    bugRows().length +
    ' 条</span></div>' +
    filters +
    '<div class="card bug-table-card">' +
    bugTable() +
    '</div></div>'
  );
}

function bugMetaRow(label, value) {
  return (
    '<div class="req-meta-row"><b>' + label + '：</b><span>' + esc(value || '—') + '</span></div>'
  );
}

function bugDetailPanel(r) {
  var projects = [...new Set([r.project, ...Object.values(allProjects).map((p) => p.name)])];
  var products = [r.product, '设备云平台', '边缘计算网关'];
  return (
    '<div class="bug-detail-note">缺陷编号、审核人、创建人、时间与问题版本按项目权限自动生成或带出；严重缺陷未关闭时会影响发布预检。</div><div class="form-grid">' +
    bugField('缺陷名称', 'name', r.name, false, false, false) +
    bugField('所属项目', 'project', r.project, false, false, true, projects) +
    bugField('严重等级', 'severity', r.severity, false, false, true, bugSeverities()) +
    bugField('产品线', 'product', r.product, false, false, true, products) +
    bugField('期望解决日期', 'expected', r.expected, false, false, false) +
    bugField('流程状态', 'status', r.status, false, false, true, bugStatuses()) +
    bugField('问题解决人', 'resolver', r.resolver, false, false, false) +
    bugField('缺陷摘要', 'summary', r.summary, true, true, false) +
    bugField('缺陷描述', 'description', r.description, true, true, false) +
    bugField('缺陷结论', 'conclusion', r.conclusion, true, true, false) +
    bugField('计划解决日期', 'planned', r.planned, false, false, false) +
    bugField('实际解决日期', 'actual', r.actual, false, false, false) +
    bugField('发往问题版本', 'version', r.version, false, false, false) +
    '</div><div class="detail-section"><h4>在线评论</h4><div class="bug-comment-list">' +
    (r.comments && r.comments.length
      ? r.comments
          .map(function (c) {
            return (
              '<div class="bug-comment"><b>' +
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
    '</div><div class="form-grid"><div class="field full"><label>添加评论</label><textarea data-bug-comment placeholder="填写复现结论、修复说明或验证意见"></textarea></div><div class="change-form-actions full"><button class="btn" data-bug-drawer-action="comment">添加评论</button></div></div></div>'
  );
}

function bugRelationPanel(r) {
  return (
    '<div class="detail-section"><h4>关联关系</h4><p class="mini-note">查看缺陷关联的需求、测试用例、开发任务、构建版本及项目调整记录。</p><div class="bug-relation-list">' +
    (r.relations || [])
      .map(function (x) {
        return (
          '<div class="bug-relation-row"><span class="bug-link-kind">' +
          esc(x.type.slice(0, 1)) +
          '</span><div class="grow"><strong>' +
          esc(x.id) +
          ' · ' +
          esc(x.title) +
          '</strong><small>' +
          esc(x.meta) +
          '</small></div><button class="op" data-bug-drawer-action="link" data-bug-link-type="' +
          esc(x.type) +
          '">打开</button></div>'
        );
      })
      .join('') +
    '</div><div class="detail-section"><h4>验证与闭环</h4><div class="review-box">开发修复并提交构建版本后，由测试人员执行验证；验证不通过可重新打开，验证通过后关闭缺陷。</div></div>'
  );
}

function bugVersionPanel(r) {
  return (
    '<div class="detail-section"><h4>缺陷版本</h4><p class="mini-note">每次保存或提交都会保留缺陷快照，历史版本只读。</p><div class="bug-version-list">' +
    (r.versions || [])
      .map(function (v) {
        return (
          '<div class="bug-version-row ' +
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
          '</small></div><button class="op" data-bug-drawer-action="version" data-bug-version="' +
          esc(v.version) +
          '">查看快照</button></div>'
        );
      })
      .join('') +
    '</div></div><div class="detail-section"><h4>验证记录</h4><div class="timeline"><div class="timeline-item"><b>缺陷已创建</b><small>' +
    esc(r.creator) +
    ' · ' +
    esc(r.created) +
    '</small></div><div class="timeline-item"><b>' +
    esc(r.status === '已完成' ? '验证通过并关闭' : '等待修复或验证') +
    '</b><small>' +
    esc(r.resolver) +
    ' · ' +
    esc(r.updated) +
    '</small></div></div></div>'
  );
}

function bugDrawerBody(r) {
  var tabs = [
    ['detail', '详细信息'],
    ['relations', '关联关系'],
    ['versions', '缺陷版本'],
  ];
  var panel =
    state.bugTab === 'relations'
      ? bugRelationPanel(r)
      : state.bugTab === 'versions'
        ? bugVersionPanel(r)
        : bugDetailPanel(r);
  return (
    '<div class="req-drawer-layout"><div class="req-form-pane"><div class="bug-drawer-head"><div><h3>' +
    esc(r.name || '新建缺陷') +
    '</h3><small>' +
    esc(r.id) +
    ' · ' +
    esc(r.project) +
    '</small></div><div class="bug-drawer-status">' +
    bugSeverityTag(r.severity) +
    ' ' +
    bugStatusTag(r.status) +
    '</div></div><div class="req-form-tabs">' +
    tabs
      .map(function (x) {
        return (
          '<button class="req-form-tab ' +
          (state.bugTab === x[0] ? 'active' : '') +
          '" data-bug-drawer-action="tab" data-bug-tab="' +
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
    bugMetaRow('编号', r.id) +
    bugMetaRow('缺陷名称', r.name) +
    bugMetaRow('所属项目', r.project) +
    bugMetaRow('严重等级', r.severity) +
    bugMetaRow('产品线', r.product) +
    bugMetaRow('期望解决日期', r.expected) +
    bugMetaRow('流程状态', r.status) +
    bugMetaRow('审核人', r.reviewer) +
    bugMetaRow('问题解决人', r.resolver) +
    bugMetaRow('最近更新时间', r.updated) +
    bugMetaRow('滞留时间', r.dwell) +
    bugMetaRow('创建人', r.creator) +
    bugMetaRow('创建时间', r.created) +
    bugMetaRow('计划解决日期', r.planned) +
    bugMetaRow('实际解决日期', r.actual) +
    bugMetaRow('发往问题版本', r.version) +
    '</aside></div>'
  );
}

function bugDrawerFoot(r) {
  return (
    '<button class="btn" data-bug-drawer-action="cancel">取消</button><button class="btn" data-bug-drawer-action="save">保存草稿</button><button class="btn" data-bug-drawer-action="continue">保存并继续创建</button><button class="btn primary" data-bug-drawer-action="verify">提交验证</button>' +
    (r.status !== '已完成'
      ? '<button class="btn warning" data-bug-drawer-action="close-bug">关闭缺陷</button>'
      : '')
  );
}

function openBugDrawer(id, mode) {
  bugInit();
  state.bugMode = mode || 'edit';
  state.bugSelected = id || state.bugSelected;
  state.bugTab = 'detail';
  if (state.bugMode === 'create') state.bugDraft = bugBlank();
  var r = bugCurrent();
  if (r.testFeedback) return openFeedbackDetail(r);
  openDrawer(
    state.bugMode === 'create' ? '新建缺陷' : '缺陷详情 · ' + r.id,
    bugDrawerBody(r),
    bugDrawerFoot(r),
    adjustmentProjectId(r),
  );
  $('#drawer').classList.add('req-drawer-large');
}

function collectBug() {
  var r = bugCurrent(),
    body = $('#drawerBody');
  if (!body) return r;
  body.querySelectorAll('[data-bug-input]').forEach(function (input) {
    var key = input.dataset.bugInput;
    if (key !== 'filter-status' && key !== 'filter-severity') r[key] = input.value;
  });
  if (allProjects[r.projectId]?.name !== r.project)
    r.projectId = adjustmentProjectId({ project: r.project });
  r.updated = '刚刚';
  return r;
}

function saveBug(mode) {
  var r = collectBug();
  if (mode === 'verify') r.status = '进行中';
  if (state.bugMode === 'create') {
    r.id = 'DFT-NEW-' + Date.now();
    r.created = '2026-08-16';
    r.creator = '何盈';
    r.updated = '刚刚';
    r.versions = [
      {
        version: 'V1.0',
        status: '当前版本',
        creator: r.creator,
        time: '刚刚',
        summary: r.summary || '新建缺陷记录',
      },
    ];
    state.bugRecords.unshift(
      Object.assign({}, r, { comments: r.comments || [], relations: r.relations || [] }),
    );
    state.bugSelected = r.id;
    state.bugDraft = null;
  }
  closeDrawer();
  App.render();
  showToast(mode === 'verify' ? '缺陷已提交验证' : '缺陷草稿已保存');
  if (mode === 'continue')
    setTimeout(function () {
      openBugDrawer(null, 'create');
    }, 0);
}

function openBugColumns() {
  openModal(
    'bug-columns',
    '自定义列',
    '<div class="notice"><i>▦</i><span>选择缺陷列表需要展示的字段，设置仅影响当前用户。</span></div><div class="req-modal-columns"><label><input type="checkbox" checked>序号</label><label><input type="checkbox" checked>缺陷编号</label><label><input type="checkbox" checked>缺陷名称</label><label><input type="checkbox" checked>所属项目</label><label><input type="checkbox" checked>审核人</label><label><input type="checkbox" checked>严重程度</label><label><input type="checkbox" checked>流程状态</label><label><input type="checkbox" checked>最近更新时间</label><label><input type="checkbox" checked>操作</label></div>',
    '<button class="btn" data-action="close-modal">取消</button><button class="btn primary" data-action="modal-save">保存设置</button>',
  );
}

function applyBugManagementSurface() {
  if (state.view !== 'project-adjustment' || state.adjustmentTab !== 'defects') return;
  var host = document.querySelector('#appView .project-layout > div');
  if (!host || host.querySelector('.bug-reference-page')) return;
  host.innerHTML =
    commonHead(
      '项目管理 / 项目调整',
      '项目调整',
      '集中管理项目变更、风险与缺陷，所有对象均回写统一项目数据。',
      '<button class="btn" data-action="open-audit">操作记录</button>',
    ) +
    changeAdjustmentTabs() +
    renderBugManagement();
}

const bugManagementObserver = new MutationObserver(function () {
  applyBugManagementSurface();
});

function openBugRelated(type) {
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
  if (type === '用例') {
    state.projectSection = 'lifecycle';
    state.lifecycleStage = 'testing';
    setView('project-lifecycle');
    return;
  }
  if (type === '变更') {
    state.projectSection = 'adjustment';
    state.adjustmentTab = 'changes';
    setView('project-adjustment');
    return;
  }
}

/** V1.6 缺陷管理 */
export function initBugManagement() {
  bugAppSurface = $('#appView');
  if (bugAppSurface)
    bugManagementObserver.observe(bugAppSurface, { childList: true, subtree: true });
  setTimeout(applyBugManagementSurface, 0);
  document.addEventListener('click', function (e) {
    var pageEl = e.target.closest('[data-bug-page-action]');
    if (pageEl) {
      e.preventDefault();
      e.stopPropagation();
      let action = pageEl.dataset.bugPageAction,
        id = pageEl.dataset.bugId;
      if (
        (action === 'open' || action === 'verify') &&
        (e.target.closest('select') || e.target.matches('input[type=checkbox]'))
      )
        return;
      if (action === 'create') {
        openBugDrawer(null, 'create');
        return;
      }
      if (action === 'open') {
        state.bugSelected = id || state.bugSelected;
        state.bugTab = 'detail';
        openBugDrawer(state.bugSelected, 'edit');
        return;
      }
      if (action === 'verify') {
        state.bugSelected = id || state.bugSelected;
        openBugDrawer(state.bugSelected, 'edit');
        showToast('请在详情中补充验证结论');
        return;
      }
      if (action === 'filters') {
        bugInit();
        state.bugFiltersOpen = !state.bugFiltersOpen;
        App.render();
        return;
      }
      if (action === 'reset') {
        state.bugQuery = '';
        state.bugStatusFilter = '全部';
        state.bugSeverityFilter = '全部';
        state.bugFiltersOpen = false;
        App.render();
        return;
      }
      if (action === 'add-condition') {
        showToast('已添加缺陷筛选条件');
        return;
      }
      if (action === 'columns') {
        openBugColumns();
        return;
      }
      return;
    }
    var drawerEl = e.target.closest('[data-bug-drawer-action]');
    if (!drawerEl) return;
    e.preventDefault();
    e.stopPropagation();
    let action = drawerEl.dataset.bugDrawerAction;
    if (action === 'tab') {
      state.bugTab = drawerEl.dataset.bugTab || 'detail';
      var r = bugCurrent();
      $('#drawerBody').innerHTML = bugDrawerBody(r);
      return;
    }
    if (action === 'cancel') {
      closeDrawer();
      return;
    }
    if (action === 'save') {
      saveBug('save');
      return;
    }
    if (action === 'verify') {
      saveBug('verify');
      return;
    }
    if (action === 'continue') {
      saveBug('continue');
      return;
    }
    if (action === 'close-bug') {
      let current = collectBug();
      current.status = '已完成';
      current.dwell = '已关闭';
      current.actual = '刚刚';
      current.updated = '刚刚';
      closeDrawer();
      App.render();
      showToast('缺陷已关闭');
      return;
    }
    if (action === 'comment') {
      var area = document.querySelector('[data-bug-comment]');
      if (area && area.value.trim()) {
        let current = bugCurrent();
        current.comments = current.comments || [];
        current.comments.push({ name: '何盈', time: '刚刚', text: area.value.trim() });
        state.bugTab = 'detail';
        $('#drawerBody').innerHTML = bugDrawerBody(current);
        showToast('评论已添加');
      }
      return;
    }
    if (action === 'link') {
      openBugRelated(drawerEl.dataset.bugLinkType);
      return;
    }
    if (action === 'version') {
      let current = bugCurrent(),
        version =
          (current.versions || []).find(function (v) {
            return v.version === drawerEl.dataset.bugVersion;
          }) || current.versions[0];
      openModal(
        'bug-version',
        '缺陷版本快照 · ' + version.version,
        '<div class="bug-version-snapshot"><h4>' +
          esc(current.name) +
          ' · ' +
          esc(version.version) +
          '</h4><p><b>版本状态：</b>' +
          esc(version.status) +
          '</p><p><b>创建人：</b>' +
          esc(version.creator) +
          '　<b>创建时间：</b>' +
          esc(version.time) +
          '</p><div class="snapshot-block"><b>缺陷内容</b><p>' +
          esc(version.summary || current.description) +
          '</p></div><div class="snapshot-block"><b>验证记录</b><p>该版本内容以只读快照保留，可追溯缺陷描述、修复结论、验证结果与状态变更。</p></div></div>',
        '<button class="btn" data-action="close-modal">关闭</button>',
      );
      return;
    }
  });
  document.addEventListener('input', function (e) {
    if (e.target.matches('[data-bug-search]')) {
      bugInit();
      state.bugQuery = e.target.value;
      App.render();
    }
  });
  document.addEventListener('change', function (e) {
    var filter = e.target.closest('[data-bug-filter]');
    if (filter) {
      bugInit();
      if (filter.dataset.bugFilter === 'status') state.bugStatusFilter = e.target.value;
      if (filter.dataset.bugFilter === 'severity') state.bugSeverityFilter = e.target.value;
      App.render();
      return;
    }
    var inline = e.target.closest('[data-bug-inline]');
    if (inline) {
      var record = bugRecord(inline.dataset.bugId);
      if (record?.id !== inline.dataset.bugId || record.testFeedback) return;
      record.status = e.target.value;
      record.updated = '刚刚';
      state.bugSelected = record.id;
      App.render();
      showToast('缺陷流程状态已更新');
    }
  });
}
