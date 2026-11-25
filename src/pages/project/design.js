/** 设计阶段：设计文档列表、详情抽屉与变更。 */
import { isDesignLocked as isDesignLockedRule } from '../../domain/design.js';
import { projectDesignDocTypes } from '../../features/lifecycle-flow.js';
import { App } from '../../core/app.js';
import { closeDrawer, modalForm, openDrawer, openModal } from '../../components/overlays.js';
import { showToast } from '../../components/toast.js';
import { $, esc, tag } from '../../core/dom.js';
import { state } from '../../store/state.js';

function designInit() {
  if (!state.designRecords) {
    state.designRecords = [
      {
        id: 'DSN-001-V100',
        docType: '软件规格书',
        title: '软件规格书',
        version: 'V1.0.0',
        status: '评审通过',
        template: '需求阶段 / 最终需求文档 V2.1',
        priority: '高',
        handler: '组织架构自动带出',
        start: '2026-07-09',
        end: '2026-08-08',
        developer: '组织架构自动带出',
        creator: '自动带出',
        created: '2026-07-09',
        link: 'REQ-142',
        summary: '定义智能温控平台 V2.6 的核心软件能力、设备接入协议与能耗分析要求。',
        review: '评审通过，文档已锁定。',
        comments: [
          {
            name: '李明',
            text: '已完成软件规格书评审，允许进入开发阶段。',
            time: '2026-08-08 16:20',
          },
        ],
      },
      {
        id: 'DSN-001-V110',
        docType: '软件规格书',
        title: '软件规格书',
        version: 'V1.1.0',
        status: '新变更',
        template: '需求阶段 / 最终需求文档 V2.1',
        priority: '高',
        handler: '组织架构自动带出',
        start: '2026-08-12',
        end: '2026-08-22',
        developer: '组织架构自动带出',
        creator: '自动带出',
        created: '2026-08-12',
        link: 'REQ-142',
        summary: '补充峰值并发量、异常重试和消息完整性要求。',
        review: '变更申请 CHG-202608-004 已提交，等待评审。',
        comments: [],
      },
      {
        id: 'DSN-002-V100',
        docType: '软件架构设计',
        title: '软件架构设计',
        version: 'V1.0.0',
        status: '待评审',
        template: '需求阶段 / 最终需求文档 V2.1',
        priority: '高',
        handler: '组织架构自动带出',
        start: '2026-08-09',
        end: '2026-08-20',
        developer: '组织架构自动带出',
        creator: '自动带出',
        created: '2026-08-09',
        link: 'REQ-139、REQ-142',
        summary: '描述系统分层、设备接入、消息队列与数据服务的整体架构。',
        review: '待研发总监评审。',
        comments: [],
      },
      {
        id: 'DSN-002-V110',
        docType: '软件架构设计',
        title: '软件架构设计',
        version: 'V1.1.0',
        status: '已拒绝',
        template: '需求阶段 / 最终需求文档 V2.1',
        priority: '中',
        handler: '组织架构自动带出',
        start: '2026-08-03',
        end: '2026-08-10',
        developer: '组织架构自动带出',
        creator: '自动带出',
        created: '2026-08-03',
        link: 'REQ-142',
        summary: '架构设计修订版，补充消息可靠性与故障转移方案。',
        review: '需补充高并发场景下的容量评估。',
        comments: [],
      },
      {
        id: 'DSN-003-V100',
        docType: '概要设计',
        title: '概要设计',
        version: 'V1.0.0',
        status: '进行中',
        template: '需求阶段 / 最终需求文档 V2.1',
        priority: '中',
        handler: '组织架构自动带出',
        start: '2026-08-11',
        end: '2026-08-25',
        developer: '组织架构自动带出',
        creator: '自动带出',
        created: '2026-08-11',
        link: 'REQ-139、REQ-146',
        summary: '拆解核心功能模块、接口关系、数据结构和异常处理策略。',
        review: '开发人员正在补充接口定义。',
        comments: [],
      },
      {
        id: 'DSN-003-V110',
        docType: '概要设计',
        title: '概要设计',
        version: 'V1.1.0',
        status: '执行变更',
        template: '需求阶段 / 最终需求文档 V2.1',
        priority: '中',
        handler: '组织架构自动带出',
        start: '2026-08-14',
        end: '2026-08-28',
        developer: '组织架构自动带出',
        creator: '自动带出',
        created: '2026-08-14',
        link: 'REQ-146',
        summary: '根据需求变更补充区域筛选与报表导出模块设计。',
        review: '变更已批准，正在执行新版本设计。',
        comments: [],
      },
      {
        id: 'DSN-004-V100',
        docType: '详细设计',
        title: '详细设计',
        version: 'V1.0.0',
        status: '待开始',
        template: '需求阶段 / 最终需求文档 V2.1',
        priority: '低',
        handler: '组织架构自动带出',
        start: '2026-08-20',
        end: '2026-09-02',
        developer: '组织架构自动带出',
        creator: '自动带出',
        created: '2026-08-20',
        link: 'REQ-142',
        summary: '补充关键类、接口、数据库字段和部署参数的详细设计。',
        review: '待概要设计评审通过后启动。',
        comments: [],
      },
      {
        id: 'DSN-004-V110',
        docType: '详细设计',
        title: '详细设计',
        version: 'V1.1.0',
        status: '已结束',
        template: '需求阶段 / 最终需求文档 V2.1',
        priority: '低',
        handler: '组织架构自动带出',
        start: '2026-07-22',
        end: '2026-08-05',
        developer: '组织架构自动带出',
        creator: '自动带出',
        created: '2026-07-22',
        link: 'REQ-139',
        summary: '已完成设备重连模块的详细设计并完成归档。',
        review: '文档已结束并归档，当前版本只读。',
        comments: [],
      },
    ];
  }
  if (!state.designCategory) state.designCategory = '全部';
  if (!state.designQuery) state.designQuery = '';
  if (!state.designStatusFilter) state.designStatusFilter = '全部';
  if (!state.designTab) state.designTab = 'detail';
}
App.designInit = designInit;

function designStatuses() {
  return ['待评审', '已结束', '已拒绝', '待开始', '进行中', '新变更', '评审通过', '执行变更'];
}

function designTypes() {
  return ['软件规格书', '软件架构设计', '概要设计', '详细设计'];
}

/** 设计文档是否只读（规则见 domain/design.js）。 */
export function isDesignLocked(record) {
  return isDesignLockedRule(record, {
    category: state.designCategory,
    getOrder: projectDesignDocTypes,
    getRecords: function () {
      App.designInit();
      return state.designRecords;
    },
  });
}

function designStatusType(status) {
  if (status === '评审通过' || status === '已结束') return 'green';
  if (status === '待评审' || status === '执行变更') return 'orange';
  if (status === '已拒绝') return 'red';
  if (status === '进行中') return 'blue';
  if (status === '新变更') return 'purple';
  return 'gray';
}

function designStatusTag(status) {
  return tag(status, designStatusType(status));
}

function designOption(values, current) {
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
}

function designRows() {
  App.designInit();
  return state.designRecords.filter(function (record) {
    var query = state.designQuery.toLowerCase();
    var hit =
      !query ||
      (record.id + ' ' + record.title + ' ' + record.version + ' ' + record.handler)
        .toLowerCase()
        .indexOf(query) > -1;
    var type = state.designCategory === '全部' || record.docType === state.designCategory;
    var status = state.designStatusFilter === '全部' || record.status === state.designStatusFilter;
    return hit && type && status;
  });
}
App.designRows = designRows;

function designRecord(id) {
  App.designInit();
  return (
    state.designRecords.find(function (record) {
      return record.id === id;
    }) || state.designRecords[0]
  );
}

function designCurrentRecord() {
  App.designInit();
  if (state.designDrawerMode === 'create') {
    if (!state.designDraft)
      state.designDraft = {
        id: 'NEW-DESIGN',
        docType: '软件规格书',
        title: '新建设计文档',
        version: 'V1.0.0',
        status: '待开始',
        template: '点击选择模板来源',
        priority: '中',
        handler: '组织架构自动带出',
        start: '日期',
        end: '日期',
        developer: '组织架构自动带出',
        creator: '自动带出',
        created: '日期',
        link: 'REQ-142',
        summary: '',
        review: '待填写',
        comments: [],
      };
    return state.designDraft;
  }
  return designRecord(state.designSelected);
}
App.designCurrentRecord = designCurrentRecord;

function designCategoryCount(category) {
  App.designInit();
  return category === '全部'
    ? state.designRecords.length
    : state.designRecords.filter(function (record) {
        return record.docType === category;
      }).length;
}

function designInlineSelect(values, current, id, field, locked) {
  if (locked) return field === 'status' ? designStatusTag(current) : esc(current);
  return (
    '<select class="design-inline-select" data-design-inline-field="' +
    field +
    '" data-design-id="' +
    esc(id) +
    '">' +
    designOption(values, current) +
    '</select>'
  );
}

function designField(label, name, value, wide, kind, locked, values) {
  var readonly = locked ? (kind === 'select' ? ' disabled' : ' readonly') : '';
  var control =
    kind === 'select'
      ? '<select data-design-input="' +
        name +
        '"' +
        readonly +
        '>' +
        designOption(values || [], value) +
        '</select>'
      : kind === 'area'
        ? '<textarea data-design-input="' +
          name +
          '"' +
          readonly +
          '>' +
          esc(value || '') +
          '</textarea>'
        : '<input data-design-input="' +
          name +
          '" value="' +
          esc(value || '') +
          '"' +
          readonly +
          '>';
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

function designDetailPanel(record) {
  var locked = isDesignLocked(record);
  var comments = record.comments || [];
  return (
    '<div class="design-tab-panel"><div class="req-template"><div class="req-template-head">' +
    esc(record.docType) +
    '填写模板 <span class="mini-note" style="margin-left:auto">支持在线编写、评论与版本留痕</span></div><div class="req-form-grid">' +
    designField('文档名称', 'title', record.title, false, 'text', locked) +
    designField('文档类型', 'docType', record.docType, false, 'select', locked, designTypes()) +
    designField('版本号', 'version', record.version, false, 'text', true) +
    designField('文档状态', 'status', record.status, false, 'select', locked, designStatuses()) +
    designField('模板来源', 'template', record.template, false, 'select', locked, [
      '点击选择模板来源',
      '需求阶段 / 最终需求文档 V2.1',
      '需求阶段 / 最终需求文档 V2.0',
    ]) +
    designField('创建人', 'creator', record.creator, false, 'text', true) +
    designField('相关需求', 'link', record.link, true, 'text', locked) +
    designField('文档概要', 'summary', record.summary, true, 'area', locked) +
    designField('评审记录', 'review', record.review, true, 'area', locked) +
    '</div></div>' +
    (locked
      ? '<div class="design-lock-note">当前版本已评审通过或结束归档，内容为只读。如需修改，请进入“变更申请”生成新版本。</div>'
      : '') +
    '<div class="req-comment"><h4>在线评论 <span class="tag gray">' +
    comments.length +
    '</span></h4>' +
    (comments.length
      ? comments
          .map(function (comment) {
            return (
              '<div class="req-comment-row"><i class="mini-avatar">' +
              esc(comment.name.slice(0, 1)) +
              '</i><div><b>' +
              esc(comment.name) +
              '</b><div>' +
              esc(comment.text) +
              '</div><small>' +
              esc(comment.time) +
              '</small></div></div>'
            );
          })
          .join('')
      : '<div class="req-empty-state" style="padding:12px 0">暂无评论，提交第一条评审意见。</div>') +
    '<div class="req-comment-input"><textarea data-design-input="comment" placeholder="填写在线评论，作为后续评审准备"></textarea><button class="btn" data-design-drawer-action="comment">评论</button></div></div></div>'
  );
}
App.designDetailPanel = designDetailPanel;

function designChangePanel(record) {
  return (
    '<div class="design-tab-panel"><div class="design-change-card"><strong>文档变更管理</strong>已评审通过或结束的文档不可直接编辑，任何内容调整都需要提交变更申请，审批通过后生成新的文档版本。</div><div class="req-subpanel"><h4>当前版本</h4><div class="req-subrow"><i class="mini-avatar">V</i><div class="grow"><strong>' +
    esc(record.title) +
    ' · ' +
    esc(record.version) +
    '</strong><small>' +
    esc(record.status) +
    ' · ' +
    esc(record.review || '暂无评审记录') +
    '</small></div>' +
    designStatusTag(record.status) +
    '</div><div class="design-change-actions"><button class="btn warning" data-design-drawer-action="request-change">发起变更申请</button><button class="btn" data-design-drawer-action="tab" data-design-tab="versions">查看历史版本</button></div></div></div>'
  );
}

function designVersionPanel(record) {
  var versions = state.designRecords.filter(function (item) {
    return item.docType === record.docType;
  });
  return (
    '<div class="design-tab-panel"><div class="req-subpanel"><h4>' +
    esc(record.docType) +
    '版本记录 <span class="mini-note">共 ' +
    versions.length +
    ' 个版本</span></h4>' +
    versions
      .map(function (item) {
        return (
          '<div class="req-subrow ' +
          (item.id === record.id ? 'design-version-current' : '') +
          '"><i class="mini-avatar">V</i><div class="grow"><strong>' +
          esc(item.version) +
          (item.id === record.id ? ' · 当前版本' : '') +
          '</strong><small>' +
          esc(item.status) +
          ' · 创建时间：' +
          esc(item.created) +
          '</small></div>' +
          designStatusTag(item.status) +
          '<button class="op" data-design-drawer-action="version" data-design-id="' +
          esc(item.id) +
          '">查看</button></div>'
        );
      })
      .join('') +
    '</div></div>'
  );
}

function designContextPanel(record) {
  var expanded = state.designReqExpanded === true;
  return (
    '<aside class="req-meta-pane"><h4>关联需求文档</h4><div class="design-source-box"><strong>关联需求文档内容展开</strong><button class="design-link-button" data-design-drawer-action="toggle-requirement">' +
    (expanded ? '收起需求文档内容' : '展开需求文档内容') +
    '</button>' +
    (expanded
      ? '<div class="design-context-preview"><strong>需求阶段 · 最终需求文档 V2.1</strong><div>需求名称：高并发设备消息上报</div><div>需求状态：评审通过</div><div>关联范围：功能要求、性能指标、验收标准</div></div>'
      : '') +
    '</div><div class="req-meta-row"><b>来源：</b><span>需求阶段 / 最终定稿的需求文档</span></div><div class="req-meta-row"><b>当前文档：</b><span>' +
    esc(record.docType) +
    ' ' +
    esc(record.version) +
    '</span></div></aside>'
  );
}

function designDrawerBody(record) {
  var tabs = [
    ['detail', '详细信息'],
    ['changes', '变更申请'],
    ['versions', '设计文档版本'],
  ];
  var body =
    state.designTab === 'changes'
      ? designChangePanel(record)
      : state.designTab === 'versions'
        ? designVersionPanel(record)
        : App.designDetailPanel(record);
  return (
    '<div class="req-drawer-layout"><div class="req-form-pane"><div class="req-form-heading"><div><strong>' +
    esc(record.title) +
    '</strong><small>' +
    esc(record.id) +
    ' · ' +
    esc(record.version) +
    '</small></div>' +
    designStatusTag(record.status) +
    '</div><div class="req-form-tabs">' +
    tabs
      .map(function (item) {
        return (
          '<button class="req-form-tab ' +
          (state.designTab === item[0] ? 'active' : '') +
          '" data-design-drawer-action="tab" data-design-tab="' +
          item[0] +
          '">' +
          item[1] +
          '</button>'
        );
      })
      .join('') +
    '</div>' +
    body +
    '</div>' +
    designContextPanel(record) +
    '</div>'
  );
}

function designDrawerFoot() {
  var record = App.designCurrentRecord();
  if (state.designDrawerMode !== 'create' && isDesignLocked(record))
    return '<button class="btn" data-design-drawer-action="close">关闭</button><button class="btn warning" data-design-drawer-action="request-change">发起变更</button>';
  return '<button class="btn" data-design-drawer-action="cancel">取消</button><button class="btn" data-design-drawer-action="save">保存草稿</button><button class="btn primary" data-design-drawer-action="submit">提交评审</button>';
}
App.designDrawerFoot = designDrawerFoot;

function designUpdateDrawer() {
  var body = document.querySelector('#drawerBody');
  if (!body) return;
  var record = App.designCurrentRecord();
  body.innerHTML = designDrawerBody(record);
  var foot = document.querySelector('#drawerFoot');
  if (foot) foot.innerHTML = App.designDrawerFoot();
  var title = document.querySelector('#drawerTitle');
  if (title)
    title.textContent =
      (state.designDrawerMode === 'create' ? '新建设计文档 · ' : '设计文档 · ') + record.title;
}

function openDesignDrawer(id, mode) {
  App.designInit();
  state.designSelected = id || (state.designRecords[0] && state.designRecords[0].id) || '';
  state.designDrawerMode = mode || 'edit';
  state.designTab = 'detail';
  state.designReqExpanded = false;
  if (state.designDrawerMode === 'create') state.designDraft = null;
  var record = App.designCurrentRecord();
  openDrawer(
    (state.designDrawerMode === 'create' ? '新建设计文档 · ' : '设计文档 · ') + record.title,
    designDrawerBody(record),
    App.designDrawerFoot(),
  );
  $('#drawer').classList.add('req-drawer-large');
}

export function collectDesign() {
  var record = App.designCurrentRecord();
  var body = document.querySelector('#drawerBody');
  if (!body) return;
  body.querySelectorAll('[data-design-input]').forEach(function (input) {
    var key = input.dataset.designInput;
    if (key !== 'comment' && !input.disabled) record[key] = input.value;
  });
}

function saveDesign(mode) {
  collectDesign();
  var record = App.designCurrentRecord();
  if (mode === 'submit') record.status = '待评审';
  if (mode === 'create') {
    record.id = 'DSN-NEW-' + Date.now();
    state.designRecords.unshift(Object.assign({}, record, { comments: record.comments || [] }));
    state.designSelected = record.id;
    state.designDraft = null;
  } else {
    designRecord(state.designSelected);
  }
  closeDrawer();
  App.render();
  showToast(
    mode === 'submit'
      ? '设计文档已提交评审'
      : mode === 'create'
        ? '设计文档草稿已保存'
        : '设计文档草稿已保存',
  );
}
App.saveDesign = saveDesign;

function openDesignColumns() {
  openModal(
    'design-columns',
    '表头自定义设置',
    '<div class="notice"><i>▦</i><span>设计文档多维表格支持按项目需要配置展示字段。</span></div><div class="req-modal-columns"><label><input type="checkbox" checked>文档名称</label><label><input type="checkbox" checked>版本号</label><label><input type="checkbox" checked>状态</label><label><input type="checkbox" checked>模板来源</label><label><input type="checkbox" checked>优先级</label><label><input type="checkbox" checked>处理人</label><label><input type="checkbox" checked>预计开始</label><label><input type="checkbox" checked>预计结束</label><label><input type="checkbox" checked>开发人员</label><label><input type="checkbox" checked>创建人</label><label><input type="checkbox" checked>创建时间</label></div>',
    '<button class="btn" data-design-page-action="columns-cancel">取消</button><button class="btn primary" data-design-page-action="columns-save">保存设置</button>',
  );
}

function openDesignChange() {
  openModal(
    'design-change',
    '发起设计变更',
    modalForm('design-change', [
      { label: '变更原因', required: true, placeholder: '说明需要调整的设计内容' },
      {
        label: '变更内容',
        required: true,
        area: true,
        wide: true,
        placeholder: '描述变更内容、影响范围与关联需求',
      },
    ]),
    '<button class="btn" data-design-change-action="cancel">取消</button><button class="btn warning" data-design-change-action="submit">提交变更申请</button>',
  );
}

function renderDesign() {
  App.designInit();
  var categories = [
    ['全部', '全部设计文档'],
    ['软件规格书', '软件规格书'],
    ['软件架构设计', '软件架构设计'],
    ['概要设计', '概要设计'],
    ['详细设计', '详细设计'],
  ];
  var rows = App.designRows();
  var selected =
    rows.find(function (item) {
      return item.id === state.designSelected;
    }) ||
    rows[0] ||
    state.designRecords[0];
  if (selected) state.designSelected = selected.id;
  var tableRows = rows
    .map(function (item) {
      var locked = isDesignLocked(item);
      return (
        '<tr class="' +
        (state.designSelected === item.id ? 'selected' : '') +
        '" data-design-page-action="open" data-design-id="' +
        esc(item.id) +
        '"><td><button class="design-document-link" data-design-page-action="open" data-design-id="' +
        esc(item.id) +
        '">' +
        esc(item.title) +
        '</button></td><td><button class="design-document-link" data-design-page-action="open" data-design-id="' +
        esc(item.id) +
        '">' +
        esc(item.version) +
        '</button></td><td>' +
        designInlineSelect(designStatuses(), item.status, item.id, 'status', locked) +
        '</td><td>' +
        esc(item.template) +
        '</td><td>' +
        designInlineSelect(['高', '中', '低'], item.priority, item.id, 'priority', locked) +
        '</td><td>' +
        esc(item.handler) +
        '</td><td>' +
        esc(item.start) +
        '</td><td>' +
        esc(item.end) +
        '</td><td>' +
        esc(item.developer) +
        '</td><td>' +
        esc(item.creator) +
        '</td><td>' +
        esc(item.created) +
        '</td><td><button class="req-column-settings" data-design-page-action="columns">自定义设置</button></td></tr>'
      );
    })
    .join('');
  return (
    '<div class="design-reference-page"><div class="req-page-grid req-page-grid-table-only"><aside class="req-category-nav"><div class="req-category-head">设计文档</div>' +
    categories
      .map(function (item) {
        return (
          '<button class="' +
          (state.designCategory === item[0] ? 'active' : '') +
          '" data-design-page-action="category" data-design-category="' +
          item[0] +
          '"><span>' +
          item[1] +
          '</span><span class="req-category-count">' +
          designCategoryCount(item[0]) +
          '</span></button>'
        );
      })
      .join('') +
    '</aside><section class="req-list-panel"><div class="req-create-row"><button class="btn primary" data-design-page-action="create">＋ 新建设计文档</button><button class="btn req-search-icon" data-design-page-action="focus-search" title="搜索">⌕</button><button class="btn" data-design-page-action="toggle-filters">筛选</button></div><div class="req-searchline"><input class="input" data-design-search placeholder="搜索文档名称 / 版本号 / 处理人" value="' +
    esc(state.designQuery) +
    '"><span>状态、优先级、文档类型等条件</span></div>' +
    (state.designFiltersOpen
      ? '<div class="req-filter-panel"><label>状态</label><select class="input" data-design-filter="status"><option>全部</option>' +
        designStatuses()
          .map(function (status) {
            return (
              '<option ' +
              (state.designStatusFilter === status ? 'selected' : '') +
              '>' +
              status +
              '</option>'
            );
          })
          .join('') +
        '</select><label>文档类型</label><select class="input" data-design-filter="category"><option>全部</option>' +
        designTypes()
          .map(function (type) {
            return (
              '<option ' +
              (state.designCategory === type ? 'selected' : '') +
              '>' +
              type +
              '</option>'
            );
          })
          .join('') +
        '</select><button class="btn" data-design-page-action="clear-filters">重置</button></div>'
      : '') +
    '<div class="design-table-wrap"><table class="design-table"><thead><tr><th>文档名称</th><th>版本号</th><th>状态</th><th>模板来源</th><th>优先级</th><th>处理人</th><th>预计开始</th><th>预计结束</th><th>开发人员</th><th>创建人</th><th>创建时间</th><th><button class="req-column-settings" data-design-page-action="columns">表头自定义设置</button></th></tr></thead><tbody>' +
    (tableRows ||
      '<tr><td colspan="12"><div class="req-empty-state">没有匹配的设计文档，请调整分类或筛选条件。</div></td></tr>') +
    '</tbody></table></div></section></div></div>'
  );
}
App.renderDesign = renderDesign;

/** 设计阶段交互 */
export function bindDesignEvents() {
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-design-page-action]');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    var action = el.dataset.designPageAction;
    if (action === 'category') {
      state.designCategory = el.dataset.designCategory || '全部';
      App.render();
      return;
    }
    if (action === 'focus-search') {
      var input = document.querySelector('[data-design-search]');
      if (input) input.focus();
      return;
    }
    if (action === 'toggle-filters') {
      state.designFiltersOpen = !state.designFiltersOpen;
      App.render();
      return;
    }
    if (action === 'clear-filters') {
      state.designQuery = '';
      state.designCategory = '全部';
      state.designStatusFilter = '全部';
      App.render();
      return;
    }
    if (action === 'columns') {
      openDesignColumns();
      return;
    }
    if (action === 'columns-cancel') {
      document.querySelector('#modalRoot').classList.remove('show');
      return;
    }
    if (action === 'columns-save') {
      document.querySelector('#modalRoot').classList.remove('show');
      showToast('设计文档表头设置已保存');
      return;
    }
    if (action === 'create') {
      openDesignDrawer(null, 'create');
      return;
    }
    if (action === 'open') {
      if (e.target.closest('select')) return;
      openDesignDrawer(el.dataset.designId, 'edit');
      return;
    }
  });
  document.addEventListener('input', function (e) {
    if (e.target.matches('[data-design-search]')) {
      state.designQuery = e.target.value;
      App.render();
    }
  });
  document.addEventListener('change', function (e) {
    var inline = e.target.closest('[data-design-inline-field]');
    if (inline) {
      var record = designRecord(inline.dataset.designId);
      record[inline.dataset.designInlineField] = inline.value;
      state.designSelected = record.id;
      App.render();
      showToast('设计文档字段已更新');
      return;
    }
    var filter = e.target.closest('[data-design-filter]');
    if (filter) {
      if (filter.dataset.designFilter === 'status') state.designStatusFilter = filter.value;
      if (filter.dataset.designFilter === 'category') state.designCategory = filter.value;
      App.render();
    }
  });
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-design-drawer-action]');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    var action = el.dataset.designDrawerAction;
    if (action === 'tab') {
      state.designTab = el.dataset.designTab || 'detail';
      designUpdateDrawer();
      return;
    }
    if (action === 'toggle-requirement') {
      state.designReqExpanded = !state.designReqExpanded;
      designUpdateDrawer();
      return;
    }
    if (action === 'version') {
      state.designSelected = el.dataset.designId;
      state.designDrawerMode = 'edit';
      state.designTab = 'detail';
      designUpdateDrawer();
      return;
    }
    if (action === 'request-change') {
      openDesignChange();
      return;
    }
    if (action === 'comment') {
      var area = document.querySelector('[data-design-input="comment"]');
      if (area && area.value.trim()) {
        var record = App.designCurrentRecord();
        record.comments = record.comments || [];
        record.comments.push({ name: '何盈', text: area.value.trim(), time: '刚刚' });
        designUpdateDrawer();
        showToast('评论已添加');
      }
      return;
    }
    if (action === 'cancel' || action === 'close') {
      closeDrawer();
      return;
    }
    if (action === 'save') {
      App.saveDesign('save');
      return;
    }
    if (action === 'submit') {
      App.saveDesign('submit');
      return;
    }
  });
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-design-change-action]');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    if (el.dataset.designChangeAction === 'cancel') {
      document.querySelector('#modalRoot').classList.remove('show');
      return;
    }
    if (el.dataset.designChangeAction === 'submit') {
      var record = App.designCurrentRecord();
      record.status = '新变更';
      document.querySelector('#modalRoot').classList.remove('show');
      closeDrawer();
      App.render();
      showToast('设计变更申请已提交');
      return;
    }
  });
}
