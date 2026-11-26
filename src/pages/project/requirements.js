/** 需求阶段：需求列表、筛选、详情与抽屉。 */
import { documentId } from '../../store/lifecycle.js';
import { submitStageApproval } from '../../features/stage-approval.js';
import { App } from '../../core/app.js';
import { closeDrawer, modalForm, openDrawer, openModal } from '../../components/overlays.js';
import { showToast } from '../../components/toast.js';
import { $, esc, tag } from '../../core/dom.js';
import { state } from '../../store/state.js';

function reqInit() {
  if (!state.reqRecords) {
    state.reqRecords = [
      {
        id: '1000xxx',
        title: '需求1',
        status: '待开始/进行中',
        priority: '高/中/低',
        creator: '组织架构自动带出',
        category: '下拉选择分类',
        handler: '人员选择',
        start: '日期',
        end: '日期',
        developer: '人员选择',
        cc: '人员选择',
        parent: '—',
        template: '—',
        version: '自动带出',
        created: '日期',
        summary: '请填写需求概要。',
        comments: [],
      },
      {
        id: 'REQ-139',
        title: '设备断线后自动重连',
        status: '已完成',
        priority: '高',
        creator: '王凯',
        category: '业务需求',
        handler: '王凯',
        start: '2026-06-12',
        end: '2026-07-08',
        developer: '孙宁',
        cc: '赵敏',
        parent: '—',
        template: '客户访谈整理',
        version: 'V2.1',
        created: '2026-06-12',
        summary: '设备断线后自动恢复连接，并同步恢复后的设备状态。',
        comments: [{ name: '赵敏', text: '已补充断线重连边界条件。', time: '2026-07-05 14:20' }],
      },
      {
        id: 'REQ-142',
        title: '高并发设备消息上报',
        status: '进行中',
        priority: '高',
        creator: '何盈',
        category: '技术需求',
        handler: '孙宁',
        start: '2026-07-10',
        end: '2026-08-22',
        developer: '孙宁',
        cc: '王凯',
        parent: 'REQ-139',
        template: '需求模板 V2.0',
        version: 'V1.3',
        created: '2026-07-10',
        summary: '支持高并发设备消息稳定上报，并提供异常重试与数据完整性保障。',
        comments: [
          {
            name: '李明',
            text: '请在需求概要中补充峰值并发量和失败重试策略。',
            time: '2026-08-08 10:12',
          },
          { name: '何盈', text: '已同步研发确认方案。', time: '2026-08-08 15:46' },
        ],
      },
      {
        id: 'REQ-146',
        title: '能耗报表按区域筛选',
        status: '待开始',
        priority: '中',
        creator: '何盈',
        category: '客户反馈',
        handler: '何盈',
        start: '2026-08-18',
        end: '2026-09-02',
        developer: '待分配',
        cc: '王凯',
        parent: '—',
        template: '客户反馈整理',
        version: 'V1.0',
        created: '2026-08-11',
        summary: '支持按区域筛选能耗报表，并保留筛选条件和导出结果。',
        comments: [],
      },
    ];
  }
  if (!state.reqCategory) state.reqCategory = '全部';
  if (!state.reqQuery) state.reqQuery = '';
  if (!state.reqStatusFilter) state.reqStatusFilter = '全部';
  if (!state.reqDetailTab) state.reqDetailTab = 'detail';
  if (!state.reqColumns)
    state.reqColumns = ['需求ID', '需求名称', '状态', '优先级', '创建人', '分类'];
}

/** 提交需求：发起需求审核，推送给项目配置的审核角色。成功返回 true。 */
function submitRequirement(record) {
  if (!submitStageApproval('requirements', { recordId: record.id, title: record.title }))
    return false;
  record.status = '待评审';
  return true;
}

export function reqRecord(id) {
  reqInit();
  if (state.reqDraftRecord?.id === id) return state.reqDraftRecord;
  return (
    state.reqRecords.find(function (r) {
      return r.id === id;
    }) || state.reqRecords[0]
  );
}

function reqSelect(name, options, current) {
  return (
    '<select data-req-input="' +
    name +
    '">' +
    options
      .map(function (v) {
        return '<option ' + (v === current ? 'selected' : '') + '>' + esc(v) + '</option>';
      })
      .join('') +
    '</select>'
  );
}

function reqFilterRows() {
  reqInit();
  return state.reqRecords.filter(function (r) {
    var query = state.reqQuery.toLowerCase();
    var hit =
      !query ||
      (r.id + ' ' + r.title + ' ' + r.creator + ' ' + r.category).toLowerCase().indexOf(query) > -1;
    var category = state.reqCategory === '全部' || r.category === state.reqCategory;
    var status = state.reqStatusFilter === '全部' || r.status.indexOf(state.reqStatusFilter) > -1;
    return hit && category && status;
  });
}

function reqField(label, name, value, wide, area) {
  return (
    '<div class="req-form-field ' +
    (wide ? 'full' : '') +
    '"><label>' +
    label +
    '</label>' +
    (area
      ? '<textarea data-req-input="' + name + '">' + esc(value || '') + '</textarea>'
      : '<input data-req-input="' + name + '" value="' + esc(value || '') + '">') +
    '</div>'
  );
}

function reqTab(tab, label) {
  return (
    '<button class="req-form-tab ' +
    (state.reqDetailTab === tab ? 'active' : '') +
    '" data-req-action="detail-tab" data-tab="' +
    tab +
    '">' +
    label +
    '</button>'
  );
}

function reqDetailForm(r) {
  var comments = r.comments || [];
  return (
    '<div class="req-template"><div class="req-template-head">需求填写模板 <span class="mini-note" style="margin-left:auto">支持富文本、在线评论与版本留痕</span></div><div class="req-form-grid">' +
    reqField('需求名称', 'title', r.title, false, false) +
    reqField('版本号', 'version', r.version, false, false) +
    reqField('文档状态', 'status', r.status, false, false) +
    reqField('作者', 'creator', r.creator, false, false) +
    reqField('相关链接', 'link', r.link || '点击添加相关链接', true, false) +
    reqField('需求概要', 'summary', r.summary, true, true) +
    '</div></div><div class="req-comment"><h4>在线评论 <span class="tag gray">' +
    comments.length +
    '</span></h4>' +
    (comments.length
      ? comments
          .map(function (c) {
            return (
              '<div class="req-comment-row"><i class="mini-avatar">' +
              esc(c.name.slice(0, 1)) +
              '</i><div><b>' +
              esc(c.name) +
              '</b><div>' +
              esc(c.text) +
              '</div><small>' +
              esc(c.time) +
              '</small></div></div>'
            );
          })
          .join('')
      : '<div class="req-empty-state" style="padding:12px 0">暂无评论，提交第一条评审意见。</div>') +
    '<div class="req-comment-input"><textarea data-req-input="comment" placeholder="填写在线评论，作为后续评审准备"></textarea><button class="btn" data-req-action="comment">评论</button></div></div>'
  );
}

function reqListPanel(title, items, buttonText, action) {
  return (
    '<div class="req-subpanel"><h4>' +
    title +
    ' <span class="mini-note">共 ' +
    items.length +
    ' 项</span></h4>' +
    (items.length
      ? items
          .map(function (x) {
            return (
              '<div class="req-subrow"><i class="mini-avatar">' +
              esc(x.icon || '链') +
              '</i><div class="grow"><strong>' +
              esc(x.title) +
              '</strong><small>' +
              esc(x.meta || '') +
              '</small></div>' +
              (x.tag ? tag(x.tag, x.type || 'blue') : '') +
              '</div>'
            );
          })
          .join('')
      : '<div class="req-empty-state">暂无数据</div>') +
    (buttonText
      ? '<div style="margin-top:12px"><button class="btn" data-req-action="' +
        action +
        '">' +
        buttonText +
        '</button></div>'
      : '') +
    '</div>'
  );
}

function reqDetailTabBody(r) {
  var tab = state.reqDetailTab;
  if (tab === 'detail') return reqDetailForm(r);
  if (tab === 'children')
    return reqListPanel(
      '子需求',
      [
        {
          icon: '子',
          title: '设备重连后的状态恢复',
          meta: 'REQ-142-01 · 进行中 · 责任人：孙宁',
          tag: '进行中',
          type: 'blue',
        },
        {
          icon: '子',
          title: '重连失败告警提示',
          meta: 'REQ-142-02 · 待开始 · 责任人：待分配',
          tag: '待开始',
          type: 'gray',
        },
      ],
      '＋创建子需求',
      'child',
    );
  if (tab === 'related')
    return reqListPanel(
      '关联需求',
      [
        {
          icon: '关',
          title: '设备状态同步',
          meta: 'REQ-139 · 业务需求 · 已完成',
          tag: '已完成',
          type: 'green',
        },
        {
          icon: '关',
          title: '设备离线告警',
          meta: 'REQ-151 · 技术需求 · 待开始',
          tag: '待开始',
          type: 'gray',
        },
      ],
      '关联需求',
      'related',
    );
  if (tab === 'dependency')
    return (
      '<div class="req-subpanel"><h4>依赖关系</h4><p>查看该需求依赖的上游需求，以及会被本需求影响的下游对象。</p><div class="req-subrow"><i class="mini-avatar">上</i><div class="grow"><strong>REQ-139 · 设备断线后自动重连</strong><small>上游依赖 · 已完成</small></div>' +
      tag('已完成', 'green') +
      '</div><div class="req-subrow"><i class="mini-avatar">下</i><div class="grow"><strong>开发任务 · 高并发消息队列优化</strong><small>下游对象 · 进行中</small></div>' +
      tag('进行中', 'blue') +
      '</div><div class="req-subrow"><i class="mini-avatar">下</i><div class="grow"><strong>测试用例 · TC-0822</strong><small>下游对象 · 待执行</small></div>' +
      tag('待开始', 'gray') +
      '</div></div>'
    );
  if (tab === 'changes')
    return (
      '<div class="req-subpanel"><h4>需求变更</h4><p>变更申请需要经过审批，审批通过后生成新版本并保留原版本。</p><div class="req-subrow"><i class="mini-avatar">变</i><div class="grow"><strong>CHG-202608-004 · 补充并发量指标</strong><small>陈思 · 2026-08-11 · 影响 5 个任务、12 条用例</small></div>' +
      tag('审批中', 'orange') +
      '</div><div style="margin-top:12px"><button class="btn warning" data-req-action="change">＋发起需求变更</button></div></div>'
    );
  return '<div class="req-subpanel"><h4>需求版本</h4><p>点击版本可查看该需求所有版本，支持版本对比和只读回溯。</p><div class="req-subrow req-version-current"><i class="mini-avatar">V</i><div class="grow"><strong>V1.3 · 当前版本</strong><small>何盈 · 2026-08-08 · 已同步开发</small></div><button class="op" data-req-action="version" data-version="V1.3">查看</button></div><div class="req-subrow"><i class="mini-avatar">V</i><div class="grow"><strong>V1.2 · 评审修订版</strong><small>何盈 · 2026-08-06 · 已被 V1.3 替代</small></div><button class="op" data-req-action="version" data-version="V1.2">查看</button></div><div class="req-subrow"><i class="mini-avatar">V</i><div class="grow"><strong>V1.0 · 初始版本</strong><small>王凯 · 2026-07-10 · 原始需求</small></div><button class="op" data-req-action="version" data-version="V1.0">查看</button></div></div>';
}
App.reqDetailTabBody = reqDetailTabBody;

function reqMetaRow(label, content) {
  return '<div class="req-meta-row"><b>' + label + '：</b><span>' + content + '</span></div>';
}

function reqDrawerBody(r) {
  var tabs = [
    ['detail', '详细信息'],
    ['children', '子需求'],
    ['related', '关联需求'],
    ['dependency', '依赖关系'],
    ['changes', '需求变更'],
    ['versions', '需求版本'],
  ];
  return (
    '<div class="req-drawer-layout"><div class="req-form-pane"><div class="req-form-heading"><div><strong>' +
    esc(r.title) +
    '</strong><small>' +
    esc(r.id) +
    ' · ' +
    esc(r.category) +
    '</small></div><span class="tag blue">需求填写</span></div><div class="req-form-tabs">' +
    tabs
      .map(function (x) {
        return reqTab(x[0], x[1]);
      })
      .join('') +
    '</div>' +
    App.reqDetailTabBody(r) +
    '</div><aside class="req-meta-pane"><h4>基础信息</h4>' +
    reqMetaRow('状态', reqSelect('status', ['未开始', '进行中', '已完成'], r.status)) +
    reqMetaRow(
      '父需求',
      '<button class="req-inline-link" data-req-action="detail-tab" data-tab="related">' +
        esc(r.parent || '点击选择链接来源') +
        '</button>',
    ) +
    reqMetaRow('模板来源', esc(r.template || '点击选择模板来源')) +
    reqMetaRow('优先级', reqSelect('priority', ['高', '中', '低'], r.priority)) +
    reqMetaRow('处理人', esc(r.handler || '人员选择')) +
    reqMetaRow('预计开始', esc(r.start || '日期')) +
    reqMetaRow('预计结束', esc(r.end || '日期')) +
    reqMetaRow('开发人员', esc(r.developer || '人员选择')) +
    reqMetaRow('抄送人', esc(r.cc || '人员选择')) +
    reqMetaRow('分类', esc(r.category || '业务需求/客户反馈等')) +
    reqMetaRow('版本', esc(r.version || '自动带出')) +
    reqMetaRow('创建人', esc(r.creator || '自动带出')) +
    reqMetaRow('创建时间', esc(r.created || '日期')) +
    '</aside></div>'
  );
}

function collectRequirement() {
  var r = reqRecord(state.reqSelected);
  var body = $('#drawerBody');
  if (!body) return;
  ['title', 'version', 'status', 'creator', 'link', 'summary', 'priority'].forEach(function (k) {
    var input =
      body.querySelector('.req-meta-pane [data-req-input="' + k + '"]') ||
      body.querySelector('[data-req-input="' + k + '"]');
    if (input) r[k] = input.value;
  });
}

function openRequirementColumns() {
  openModal(
    'req-columns',
    '表头自定义设置',
    '<div class="notice"><i>▦</i><span>最后一列表头用于配置需求列表展示字段，勾选后将保留在当前工作台。</span></div><div class="req-modal-columns"><label><input type="checkbox" checked>需求ID</label><label><input type="checkbox" checked>需求名称</label><label><input type="checkbox" checked>状态</label><label><input type="checkbox" checked>优先级</label><label><input type="checkbox" checked>创建人</label><label><input type="checkbox" checked>分类</label><label><input type="checkbox">处理人</label><label><input type="checkbox">预计开始</label><label><input type="checkbox">预计结束</label><label><input type="checkbox">版本</label></div>',
    '<button class="btn" data-req-action="columns-cancel">取消</button><button class="btn primary" data-req-action="columns-save">保存设置</button>',
  );
}

function collectInlineRequirement() {
  var root = document.querySelector('.req-inline-detail-panel');
  if (!root) return;
  var record = reqRecord(state.reqSelected);
  ['title', 'version', 'creator', 'link', 'summary'].forEach(function (key) {
    var input = root.querySelector('[data-req-input="' + key + '"]');
    if (input) record[key] = input.value;
  });
  ['status', 'priority', 'category'].forEach(function (key) {
    var input = root.querySelector('[data-req-inline-input="' + key + '"]');
    if (input) record[key] = input.value;
  });
}

function reqDrawerFoot() {
  return '<button class="btn" data-req-action="cancel">取消</button><button class="btn" data-req-action="save">保存草稿</button><button class="btn primary" data-req-action="submit">提交评审</button>';
}

function renderRequirements() {
  reqInit();
  var categories = [
    ['全部', '全部需求'],
    ['业务需求', '业务需求'],
    ['技术需求', '技术需求'],
    ['安全需求', '安全需求'],
    ['客户反馈', '客户反馈'],
    ['其他', '其他'],
  ];
  var rows = reqFilterRows();
  var selected =
    rows.find(function (item) {
      return item.id === state.reqSelected;
    }) ||
    rows[0] ||
    state.reqRecords[0];
  state.reqSelected = selected.id;
  var categoryCount = function (category) {
    return category === '全部'
      ? state.reqRecords.length
      : state.reqRecords.filter(function (item) {
          return item.category === category;
        }).length;
  };
  var option = function (values, current) {
    return values
      .map(function (value) {
        return (
          '<option value="' +
          esc(value) +
          '" ' +
          (value === current ? 'selected' : '') +
          '>' +
          esc(value) +
          '</option>'
        );
      })
      .join('');
  };
  var tableRows = rows
    .map(function (item) {
      return (
        '<tr class="' +
        (state.reqSelected === item.id ? 'selected' : '') +
        '" data-req-drawer-action="open" data-req-id="' +
        esc(item.id) +
        '"><td class="req-link">' +
        esc(item.id) +
        '</td><td class="req-link">' +
        esc(item.title) +
        '</td><td><select class="req-inline-select" data-req-inline-field="status" data-req-id="' +
        esc(item.id) +
        '">' +
        option(['待开始', '进行中', '已完成', '待评审'], item.status) +
        '</select></td><td><select class="req-inline-select" data-req-inline-field="priority" data-req-id="' +
        esc(item.id) +
        '">' +
        option(['高', '中', '低'], item.priority) +
        '</select></td><td>' +
        esc(item.creator) +
        '</td><td><select class="req-inline-select" data-req-inline-field="category" data-req-id="' +
        esc(item.id) +
        '">' +
        option(['业务需求', '技术需求', '安全需求', '客户反馈', '其他'], item.category) +
        '</select></td><td><button class="req-column-settings" data-req-page-action="columns">自定义设置</button></td></tr>'
      );
    })
    .join('');
  return (
    '<div class="requirements-reference req-reference-page"><div class="req-page-grid req-page-grid-table-only"><aside class="req-category-nav"><div class="req-category-head">需求分类</div>' +
    categories
      .map(function (item) {
        return (
          '<button class="' +
          (state.reqCategory === item[0] ? 'active' : '') +
          '" data-req-page-action="category" data-category="' +
          item[0] +
          '"><span>' +
          item[1] +
          '</span><span class="req-category-count">' +
          categoryCount(item[0]) +
          '</span></button>'
        );
      })
      .join('') +
    '</aside><section class="req-list-panel"><div class="req-create-row"><button class="btn primary" data-req-drawer-action="create">＋ 新建需求</button><button class="btn req-search-icon" data-req-page-action="focus-search" title="搜索">⌕</button><button class="btn" data-req-page-action="toggle-filters">筛选</button></div><div class="req-searchline"><input class="input" data-req-search placeholder="搜索需求名称 / ID / 创建人" value="' +
    esc(state.reqQuery) +
    '"><span>状态、处理人、分类等条件</span></div>' +
    (state.reqFiltersOpen
      ? '<div class="req-filter-panel"><label>状态</label><select class="input" data-req-filter="status"><option>全部</option><option ' +
        (state.reqStatusFilter === '待开始' ? 'selected' : '') +
        '>待开始</option><option ' +
        (state.reqStatusFilter === '进行中' ? 'selected' : '') +
        '>进行中</option><option ' +
        (state.reqStatusFilter === '已完成' ? 'selected' : '') +
        '>已完成</option><option ' +
        (state.reqStatusFilter === '待评审' ? 'selected' : '') +
        '>待评审</option></select><label>处理人</label><select class="input"><option>全部处理人</option><option>何盈</option><option>王凯</option><option>孙宁</option></select><button class="btn" data-req-page-action="clear-filters">重置</button></div>'
      : '') +
    '<div class="req-list-table-wrap"><table class="req-table"><thead><tr><th>需求ID</th><th>需求名称</th><th>状态</th><th>优先级</th><th>创建人</th><th>分类</th><th><button class="req-column-settings" data-req-page-action="columns">表头自定义设置</button></th></tr></thead><tbody>' +
    (tableRows ||
      '<tr><td colspan="7"><div class="req-empty-state">没有匹配的需求，请调整分类或筛选条件。</div></td></tr>') +
    '</tbody></table></div><div class="req-field-note">全量字段：状态、父需求、模板来源、优先级、处理人、预计开始、预计结束、开发人员、抄送人、分类、版本、创建人、创建时间。表格字段可通过自定义设置调整。</div></section></div></div>'
  );
}
App.renderRequirements = renderRequirements;

function openRequirementDrawer(id, mode) {
  reqInit();
  if (mode === 'create' && id === '1000xxx') {
    state.reqDraftRecord = { ...reqRecord('1000xxx'), id: documentId('REQ'), comments: [] };
    id = state.reqDraftRecord.id;
  }
  state.reqSelected = id || '1000xxx';
  state.reqDrawerMode = mode || 'edit';
  var r = reqRecord(state.reqSelected);
  openDrawer(
    (state.reqDrawerMode === 'create' ? '创建需求 · ' : '需求填写 · ') + r.title,
    reqDrawerBody(r),
    reqDrawerFoot(),
  );
  $('#drawer').classList.add('req-drawer-large');
}

/** 需求抽屉事件 */
export function bindRequirementDrawerEvents() {
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-req-action]');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    var action = el.dataset.reqAction;
    if (action === 'create') {
      openRequirementDrawer('1000xxx', 'create');
      return;
    }
    if (action === 'open') {
      openRequirementDrawer(el.dataset.reqId, 'edit');
      return;
    }
    if (action === 'focus-search') {
      var input = document.querySelector('[data-req-search]');
      if (input) input.focus();
      return;
    }
    if (action === 'filters') {
      state.reqFiltersOpen = !state.reqFiltersOpen;
      App.render();
      return;
    }
    if (action === 'clear-filters') {
      state.reqQuery = '';
      state.reqCategory = '全部';
      state.reqStatusFilter = '全部';
      App.render();
      return;
    }
    if (action === 'category') {
      state.reqCategory = el.dataset.category || '全部';
      App.render();
      return;
    }
    if (action === 'columns') {
      openRequirementColumns();
      return;
    }
    if (action === 'columns-cancel') {
      document.querySelector('#modalRoot').classList.remove('show');
      return;
    }
    if (action === 'columns-save') {
      document.querySelector('#modalRoot').classList.remove('show');
      showToast('需求表头设置已保存');
      return;
    }
    if (action === 'detail-tab') {
      state.reqDetailTab = el.dataset.tab || 'detail';
      openRequirementDrawer(state.reqSelected, state.reqDrawerMode);
      return;
    }
    if (action === 'cancel') {
      closeDrawer();
      return;
    }
    if (action === 'save' || action === 'submit') {
      collectRequirement();
      var isSubmit = action === 'submit';
      const record = reqRecord(state.reqSelected);
      if (isSubmit && !submitRequirement(record)) return;
      if (record === state.reqDraftRecord) {
        state.reqRecords.unshift(record);
        state.reqDraftRecord = null;
      }
      closeDrawer();
      App.render();
      showToast(isSubmit ? '需求已提交，进入评审准备' : '需求草稿已保存');
      return;
    }
    if (action === 'comment') {
      var area = document.querySelector('[data-req-input="comment"]');
      if (area && area.value.trim()) {
        var r = reqRecord(state.reqSelected);
        r.comments = r.comments || [];
        r.comments.push({ name: '何盈', text: area.value.trim(), time: '刚刚' });
        state.reqDetailTab = 'detail';
        openRequirementDrawer(state.reqSelected, state.reqDrawerMode);
        showToast('评论已添加');
      }
      return;
    }
    if (action === 'child') {
      openRequirementDrawer(state.reqSelected, state.reqDrawerMode);
      showToast('已打开子需求创建入口');
      return;
    }
    if (action === 'change') {
      openModal(
        'req-change',
        '发起需求变更',
        modalForm('req-change', [
          { label: '变更原因', required: true, placeholder: '说明为什么需要变更' },
          {
            label: '变更内容',
            required: true,
            area: true,
            wide: true,
            placeholder: '描述变更内容与影响范围',
          },
        ]),
        '<button class="btn" data-action="close-modal">取消</button><button class="btn primary" data-action="modal-save">提交变更申请</button>',
      );
      return;
    }
    if (action === 'version') {
      openModal(
        'req-version',
        '版本快照 · ' + (el.dataset.version || 'V1.3'),
        '<div class="doc-preview"><h3>' +
          esc(reqRecord(state.reqSelected).title) +
          ' · ' +
          esc(el.dataset.version || 'V1.3') +
          '</h3><p><b>版本状态：</b>只读快照</p><p><b>版本内容：</b>' +
          esc(reqRecord(state.reqSelected).summary) +
          '</p><p><b>变更记录：</b>保留该版本的创建人、创建时间和评审意见。</p></div>',
        '<button class="btn" data-action="close-modal">关闭</button>',
      );
      return;
    }
  });
  document.addEventListener('input', function (e) {
    if (e.target.matches('[data-req-search]')) {
      state.reqQuery = e.target.value;
      App.render();
    }
  });
  document.addEventListener('change', function (e) {
    if (e.target.matches('[data-req-filter="status"]')) {
      state.reqStatusFilter = e.target.value;
      App.render();
    }
  });
}

/** 需求列表页交互 */
export function bindRequirementPageEvents() {
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-req-page-action]');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    var action = el.dataset.reqPageAction;
    if (action === 'category') {
      state.reqCategory = el.dataset.category || '全部';
      App.render();
      return;
    }
    if (action === 'focus-search') {
      var input = document.querySelector('[data-req-search]');
      if (input) input.focus();
      return;
    }
    if (action === 'toggle-filters') {
      state.reqFiltersOpen = !state.reqFiltersOpen;
      App.render();
      return;
    }
    if (action === 'clear-filters') {
      state.reqQuery = '';
      state.reqCategory = '全部';
      state.reqStatusFilter = '全部';
      App.render();
      return;
    }
    if (action === 'columns') {
      openRequirementColumns();
      return;
    }
    if (action === 'open') {
      if (e.target.closest('select')) return;
      state.reqSelected = el.dataset.reqId || state.reqSelected;
      state.reqDetailTab = 'detail';
      App.render();
      return;
    }
    if (action === 'detail-tab') {
      state.reqDetailTab = el.dataset.tab || 'detail';
      App.render();
      return;
    }
    if (action === 'create') {
      state.reqSelected = '1000xxx';
      state.reqCategory = '全部';
      state.reqDetailTab = 'detail';
      state.reqDraftMode = true;
      App.render();
      showToast('已进入新建需求');
      return;
    }
    if (action === 'save' || action === 'submit' || action === 'create-and-continue') {
      collectInlineRequirement();
      if (action === 'submit' && !submitRequirement(reqRecord(state.reqSelected))) return;
      if (action === 'create-and-continue') {
        state.reqSelected = '1000xxx';
        state.reqDraftMode = true;
      } else {
        state.reqDraftMode = false;
      }
      App.render();
      showToast(
        action === 'submit'
          ? '需求已提交评审'
          : action === 'save'
            ? '需求草稿已保存'
            : '已保存并进入新建需求',
      );
      return;
    }
    if (action === 'cancel') {
      state.reqDraftMode = false;
      App.render();
      return;
    }
  });
  document.addEventListener('change', function (e) {
    var el = e.target.closest('[data-req-inline-field]');
    if (el) {
      var record = reqRecord(el.dataset.reqId);
      record[el.dataset.reqInlineField] = el.value;
      state.reqSelected = record.id;
      App.render();
      showToast('字段已更新');
      return;
    }
    var meta = e.target.closest('[data-req-inline-input]');
    if (meta) {
      var selected = reqRecord(state.reqSelected);
      selected[meta.dataset.reqInlineInput] = meta.value;
      App.render();
      showToast('基础信息已更新');
    }
  });
}

/** 需求列表打开抽屉 */
export function bindRequirementListEvents() {
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-req-drawer-action]');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.target.closest('select')) return;
    if (el.dataset.reqDrawerAction === 'create') {
      state.reqDetailTab = 'detail';
      openRequirementDrawer('1000xxx', 'create');
      return;
    }
    if (el.dataset.reqDrawerAction === 'open') {
      state.reqDetailTab = 'detail';
      openRequirementDrawer(el.dataset.reqId, 'edit');
    }
  });
}
