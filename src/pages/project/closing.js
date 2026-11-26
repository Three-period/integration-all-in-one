/** 结项阶段：结项申请列表、详情抽屉与结项评审。 */
import { getReleaseGate, renderVersionBanner } from '../../features/version-anchor.js';
import { App } from '../../core/app.js';
import { closeDrawer, openDrawer } from '../../components/overlays.js';
import { showToast } from '../../components/toast.js';
import { $, esc, tag } from '../../core/dom.js';
import { project, state } from '../../store/state.js';

function closingInit() {
  if (!state.releaseSection) state.releaseSection = 'closing';
  if (!state.releaseQuery) state.releaseQuery = '';
  if (!state.releaseStatusFilter) state.releaseStatusFilter = '全部';
  if (!state.releaseFilterOpen) state.releaseFilterOpen = false;
  if (state.releaseProjectId !== state.projectId) {
    state.releaseProjectId = state.projectId;
    state.releaseProjects ??= [
      {
        id: 'REL-' + project().code,
        name: project().name,
        expected: project().end,
        actual: '-',
        outputs: '0',
        status: '进行中',
        delivery: '待填写本项目结项交付物',
        owner: project().owner,
        review: '待提交',
      },
    ];
    state.releaseSelected = state.releaseProjects[0].id;
    state.releaseReviewDraft ??= {
      summary: '',
      achievements: '',
      issues: '',
      lessons: '',
      actions: '',
      status: '草稿',
    };
  }
  if (!state.releaseSelected) state.releaseSelected = 'REL-001';
  if (!state.releaseReviewDraft)
    state.releaseReviewDraft = {
      summary: '',
      achievements: '',
      issues: '',
      lessons: '',
      actions: '',
    };
}

function closingStatusType(status) {
  return status === '已结项' || status === '已完成'
    ? 'green'
    : status === '待结项' || status === '待提交'
      ? 'orange'
      : status === '进行中'
        ? 'blue'
        : 'gray';
}

function closingStatusTag(status) {
  return tag(status, closingStatusType(status));
}

function closingSubnav() {
  return (
    '<aside class="release-subnav"><div class="release-subnav-head">结项阶段</div><button class="release-create" data-release-page-action="create">＋ 新建</button><button class="' +
    (state.releaseSection === 'closing' ? 'active' : '') +
    '" data-release-page-action="section" data-release-section="closing">项目结项</button><button class="' +
    (state.releaseSection === 'review' ? 'active' : '') +
    '" data-release-page-action="section" data-release-section="review">项目复盘</button></aside>'
  );
}

function closingRows() {
  closingInit();
  var query = (state.releaseQuery || '').toLowerCase();
  return state.releaseProjects.filter(function (item) {
    var hit =
      !query || (item.id + ' ' + item.name + ' ' + item.owner).toLowerCase().indexOf(query) > -1;
    return (
      hit && (state.releaseStatusFilter === '全部' || item.status === state.releaseStatusFilter)
    );
  });
}

function closingField(label, name, value, kind, wide) {
  var control =
    kind === 'area'
      ? '<textarea data-release-input="' + name + '">' + esc(value || '') + '</textarea>'
      : '<input ' +
        (kind === 'date' ? 'type="date" ' : '') +
        'data-release-input="' +
        name +
        '" value="' +
        esc(value || '') +
        '">';
  return (
    '<div class="req-form-field ' +
    (wide ? 'full' : '') +
    '"><label>' +
    label +
    '</label>' +
    control +
    '</div>'
  );
}

function closingDetailFields(item) {
  return (
    '<div class="req-form-heading"><div><strong>' +
    esc(item.name) +
    '</strong><small>' +
    esc(item.id) +
    ' · 项目结项详情</small></div>' +
    closingStatusTag(item.status) +
    '</div><div class="req-template"><div class="req-template-head">项目结项申请</div><div class="req-form-grid">' +
    closingField('项目名称', 'name', item.name, 'text', false) +
    closingField('预期完成时间', 'expected', item.expected, 'date', false) +
    closingField('实际完成时间', 'actual', item.actual, 'date', false) +
    closingField('交付产出数量', 'outputs', item.outputs, 'text', false) +
    closingField('项目负责人', 'owner', item.owner, 'text', false) +
    closingField('交付物清单', 'delivery', item.delivery, 'area', true) +
    '</div></div><div class="detail-section"><h4>结项校验</h4><div class="notice ' +
    (item.status === '已结项' ? 'success' : 'warn') +
    '"><i>' +
    (item.status === '已结项' ? '✓' : '!') +
    '</i><span>' +
    (item.status === '已结项'
      ? '项目交付物已完成归档，可查看复盘报告。'
      : '请补充实际完成时间、交付物清单，并完成相关审批后提交结项。') +
    '</span></div></div>'
  );
}
/** 结项详情：申请字段与结项版本校验（结项时固化正式发布的版本与 Commit）。 */
function closingDetailBody(item) {
  var z = getReleaseGate();
  return (
    closingDetailFields(item) +
    '<div class="detail-section"><h4>结项版本校验</h4><div class="kv-grid"><div class="kv"><label>正式发布版本</label><div>' +
    esc(z.published ? z.published.version : '—') +
    '</div></div><div class="kv"><label>正式发布 Commit</label><div>' +
    esc(z.published ? z.published.commit : '—') +
    '</div></div></div><p class="mini-note">提交结项时自动固化本次正式发布的版本与 Commit，不允许引用其他版本。</p></div>'
  );
}
App.closingDetailBody = closingDetailBody;

function closingDetailFoot() {
  return '<button class="btn" data-release-drawer-action="cancel">取消</button><button class="btn" data-release-drawer-action="save">保存草稿</button><button class="btn primary" data-release-drawer-action="submit">提交结项</button>';
}

export function closingCurrent() {
  closingInit();
  if (state.releaseMode === 'create') {
    if (!state.releaseDraft)
      state.releaseDraft = {
        id: 'NEW-RELEASE',
        name: project().name,
        expected: project().end,
        actual: '-',
        outputs: '0',
        status: '草稿',
        delivery: '填写交付物清单',
        owner: '王凯',
        review: '待提交',
      };
    return state.releaseDraft;
  }
  return (
    state.releaseProjects.find(function (item) {
      return item.id === state.releaseSelected;
    }) || state.releaseProjects[0]
  );
}

function openClosingDetail(id, mode) {
  closingInit();
  state.releaseMode = mode || 'edit';
  if (state.releaseMode === 'create') state.releaseDraft = null;
  state.releaseSelected = id || state.releaseSelected;
  var item = closingCurrent();
  openDrawer(
    (state.releaseMode === 'create' ? '新建项目结项 · ' : '项目结项 · ') + item.name,
    App.closingDetailBody(item),
    closingDetailFoot(),
  );
  $('#drawer').classList.add('req-drawer-large');
}

function renderClosingList() {
  var rows = closingRows();
  var html = rows
    .map(function (item) {
      return (
        '<tr data-release-page-action="open-detail" data-release-id="' +
        esc(item.id) +
        '"><td>' +
        esc(item.id) +
        '</td><td><button class="release-link" data-release-page-action="open-detail" data-release-id="' +
        esc(item.id) +
        '">' +
        esc(item.name) +
        '</button></td><td>' +
        esc(item.expected) +
        '</td><td>' +
        esc(item.actual) +
        '</td><td>' +
        esc(item.outputs) +
        '</td><td>' +
        closingStatusTag(item.status) +
        '</td><td>' +
        esc(item.delivery) +
        '</td><td><button class="op" data-release-page-action="open-detail" data-release-id="' +
        esc(item.id) +
        '">查看</button></td></tr>'
      );
    })
    .join('');
  return (
    '<section class="release-panel"><div class="release-panel-head"><div><h3>项目结项</h3><p>管理项目结项申请、交付物清单与审批状态。</p></div><div class="release-actions"><button class="btn primary" data-release-page-action="create">＋ 新建结项</button></div></div><div class="release-toolbar"><input class="input search" data-release-search placeholder="搜索项目名称 / 项目编号 / 负责人" value="' +
    esc(state.releaseQuery) +
    '"><button class="btn" data-release-page-action="toggle-filter">筛选</button><select class="input" data-release-filter="status"><option>全部项目状态</option>' +
    ['待结项', '进行中', '已结项']
      .map(function (v) {
        return (
          '<option ' + (state.releaseStatusFilter === v ? 'selected' : '') + '>' + v + '</option>'
        );
      })
      .join('') +
    '</select><button class="btn" data-release-page-action="add-condition">＋ 添加条件</button><span class="push mini-note">共 ' +
    rows.length +
    ' 个项目</span></div>' +
    (state.releaseFilterOpen
      ? '<div class="release-filter-panel"><label>项目名称</label><select class="input"><option>全部项目</option>' +
        state.releaseProjects
          .map(function (item) {
            return '<option>' + esc(item.name) + '</option>';
          })
          .join('') +
        '</select><label>负责人</label><select class="input"><option>全部负责人</option><option>王凯</option><option>陈思</option><option>赵敏</option></select><button class="btn" data-release-page-action="reset">重置</button></div>'
      : '') +
    '<div class="release-table-wrap"><table class="release-table"><thead><tr><th>序号</th><th>项目名称</th><th>预期完成时间</th><th>实际完成时间</th><th>交付产出数量</th><th>结项状态</th><th>交付物清单</th><th>操作</th></tr></thead><tbody>' +
    (html ||
      '<tr><td colspan="8"><div class="release-empty">没有匹配的项目，请调整筛选条件。</div></td></tr>') +
    '</tbody></table></div></section>'
  );
}

function renderClosing() {
  closingInit();
  var body = state.releaseSection === 'review' ? App.renderClosingReview() : renderClosingList();
  return (
    renderVersionBanner() +
    '<div class="release-reference-page"><div class="release-stage-layout">' +
    closingSubnav() +
    '<main class="release-main">' +
    body +
    '</main></div></div>'
  );
}
App.renderClosing = renderClosing;

/** 结项阶段交互 */
export function bindClosingEvents() {
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-release-page-action]');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    var action = el.dataset.releasePageAction;
    if (action === 'section') {
      state.releaseSection = el.dataset.releaseSection || 'closing';
      App.render();
      return;
    }
    if (action === 'create') {
      state.releaseMode = 'create';
      openClosingDetail(null, 'create');
      return;
    }
    if (action === 'open-detail') {
      state.releaseSelected = el.dataset.releaseId || state.releaseSelected;
      openClosingDetail(state.releaseSelected, 'edit');
      return;
    }
    if (action === 'toggle-filter') {
      state.releaseFilterOpen = !state.releaseFilterOpen;
      App.render();
      return;
    }
    if (action === 'reset') {
      state.releaseQuery = '';
      state.releaseStatusFilter = '全部';
      state.releaseFilterOpen = false;
      App.render();
      return;
    }
    if (action === 'add-condition') {
      showToast('已添加项目筛选条件');
      return;
    }
    if (action === 'review-save' || action === 'review-submit') {
      var d = state.releaseReviewDraft;
      document.querySelectorAll('[data-release-input]').forEach(function (input) {
        if (input.dataset.releaseInput in d) d[input.dataset.releaseInput] = input.value;
      });
      if (action === 'review-submit') d.status = '待评审';
      showToast(action === 'review-submit' ? '项目复盘已提交' : '项目复盘草稿已保存');
      return;
    }
  });
  document.addEventListener('input', function (e) {
    if (e.target.matches('[data-release-search]')) {
      state.releaseQuery = e.target.value;
      App.render();
    }
  });
  document.addEventListener('change', function (e) {
    var filter = e.target.closest('[data-release-filter]');
    if (filter) {
      state.releaseStatusFilter = filter.value === '全部项目状态' ? '全部' : filter.value;
      App.render();
    }
  });
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-release-drawer-action]');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    var item = closingCurrent();
    if (el.dataset.releaseDrawerAction === 'cancel') {
      closeDrawer();
      return;
    }
    if (el.dataset.releaseDrawerAction === 'save' || el.dataset.releaseDrawerAction === 'submit') {
      var body = document.querySelector('#drawerBody');
      if (body)
        body.querySelectorAll('[data-release-input]').forEach(function (input) {
          if (input.dataset.releaseInput in item && !input.readOnly)
            item[input.dataset.releaseInput] = input.value;
        });
      if (el.dataset.releaseDrawerAction === 'submit') item.status = '待结项';
      if (state.releaseMode === 'create') {
        item.id = 'REL-NEW-' + Date.now();
        state.releaseProjects.unshift(Object.assign({}, item));
        state.releaseSelected = item.id;
        state.releaseDraft = null;
        state.releaseMode = 'edit';
      }
      closeDrawer();
      App.render();
      showToast(
        el.dataset.releaseDrawerAction === 'submit' ? '结项申请已提交' : '项目结项草稿已保存',
      );
    }
  });
}
