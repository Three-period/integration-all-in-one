/** 结项阶段：结项申请、紧急下发与归档。 */
import { App } from '../../core/app.js';
import { closeDrawer, openDrawer, openModal } from '../../components/overlays.js';
import { showToast } from '../../components/toast.js';
import { esc, tag } from '../../core/dom.js';
import { testingOption } from './testing.js';
import { project, state } from '../../store/state.js';

function closingInit() {
  if (!state.closingSection) state.closingSection = 'emergency';
  if (!state.closingEmergencyStatus) state.closingEmergencyStatus = '待审批';
  if (!state.closingForms)
    state.closingForms = {
      ecn: {
        id: 'ECN-202608-001',
        title: '设备结构调整工程变更',
        relatedVersion: 'V2.6',
        status: '草稿',
        changeContent: '填写工程变更内容',
        impactScope: '填写影响范围与受影响模块',
        reason: '填写变更原因',
        approver: '研发总监',
        plannedDate: '2026-08-20',
        creator: '何盈',
        created: '2026-08-16',
      },
      pcn: {
        id: 'PCN-202608-001',
        title: '测试环境配置过程变更',
        relatedVersion: 'V2.6',
        status: '草稿',
        changeContent: '填写过程变更内容',
        impactScope: '填写影响范围与受影响流程',
        reason: '填写变更原因',
        approver: '质量负责人',
        plannedDate: '2026-08-20',
        creator: '何盈',
        created: '2026-08-16',
      },
    };
  if (!state.closingArchiveRecords)
    state.closingArchiveRecords = [
      {
        name: 'ECN-202608-001 · 设备结构调整工程变更',
        type: 'ECN',
        version: 'V2.6',
        status: '已归档',
        owner: '何盈',
        archived: '2026-08-16',
      },
      {
        name: 'PCN-202608-001 · 测试环境配置过程变更',
        type: 'PCN',
        version: 'V2.6',
        status: '已归档',
        owner: '何盈',
        archived: '2026-08-16',
      },
      {
        name: '结项交付物清单 · ' + project().name,
        type: '结项文档',
        version: 'V2.6',
        status: '待归档',
        owner: '王凯',
        archived: '-',
      },
    ];
}
App.closingInit = closingInit;

function closingStatusType(status) {
  return status === '已归档' || status === '已通过'
    ? 'green'
    : status === '审批中' || status === '待审批'
      ? 'orange'
      : status === '已拒绝'
        ? 'red'
        : 'gray';
}

function closingStatusTag(status) {
  return tag(status, closingStatusType(status));
}

function closingSubnav() {
  return (
    '<aside class="closing-subnav"><div class="closing-subnav-head">发布阶段</div><button class="closing-create" data-closing-page-action="create">＋ 新建</button><button class="' +
    (state.closingSection === 'ecn' ? 'active' : '') +
    '" data-closing-page-action="section" data-closing-section="ecn">ECN 表单</button><button class="' +
    (state.closingSection === 'pcn' ? 'active' : '') +
    '" data-closing-page-action="section" data-closing-section="pcn">PCN 表单</button><button class="' +
    (state.closingSection === 'archive' ? 'active' : '') +
    '" data-closing-page-action="section" data-closing-section="archive">文档归档</button></aside>'
  );
}
App.closingSubnav = closingSubnav;

function closingField(label, name, value, kind, values, wide, readonly) {
  var control =
    kind === 'select'
      ? '<select data-closing-input="' +
        name +
        '"' +
        (readonly ? ' disabled' : '') +
        '>' +
        testingOption(values || [], value) +
        '</select>'
      : kind === 'area'
        ? '<textarea data-closing-input="' +
          name +
          '"' +
          (readonly ? ' readonly' : '') +
          '>' +
          esc(value || '') +
          '</textarea>'
        : '<input ' +
          (kind === 'date' ? 'type="date" ' : '') +
          'data-closing-input="' +
          name +
          '" value="' +
          esc(value || '') +
          '"' +
          (readonly ? ' readonly' : '') +
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

function closingCurrentForm(type) {
  App.closingInit();
  return state.closingForms[type];
}

function closingFormPage(type) {
  var form = closingCurrentForm(type);
  var isEcn = type === 'ecn';
  var title = isEcn ? 'ECN 工程变更通知' : 'PCN 过程变更通知';
  var kind = isEcn ? 'ECN' : 'PCN';
  return (
    '<section class="closing-panel"><div class="closing-panel-head"><div><h3>' +
    title +
    '</h3><p>' +
    kind +
    ' 详细表单 · 在线填写与审批留痕</p></div><div class="closing-panel-actions">' +
    closingStatusTag(form.status) +
    '<button class="btn" data-closing-page-action="section" data-closing-section="emergency">返回结项首页</button></div></div><div class="closing-form"><div class="req-form-grid">' +
    closingField('表单编号', 'id', form.id, 'text', null, false, true) +
    closingField('变更名称', 'title', form.title, 'text', null, false, false) +
    closingField(
      '关联版本',
      'relatedVersion',
      form.relatedVersion,
      'select',
      ['V2.6', 'V2.5'],
      false,
      false,
    ) +
    closingField(
      '审批人',
      'approver',
      form.approver,
      'select',
      ['研发总监', '质量负责人', '项目负责人'],
      false,
      false,
    ) +
    closingField('计划生效日期', 'plannedDate', form.plannedDate, 'date', null, false, false) +
    closingField('创建人', 'creator', form.creator, 'text', null, false, true) +
    closingField('变更内容', 'changeContent', form.changeContent, 'area', null, true, false) +
    closingField('影响范围', 'impactScope', form.impactScope, 'area', null, true, false) +
    closingField('变更原因', 'reason', form.reason, 'area', null, true, false) +
    '</div><div class="closing-form-section"><h4>审批记录</h4><div class="timeline"><div class="timeline-item"><b>表单已创建</b><small>' +
    esc(form.created) +
    ' · ' +
    esc(form.creator) +
    '</small></div><div class="timeline-item"><b>待提交审批</b><small>提交后将进入对应审批流程</small></div></div></div><div class="closing-form-actions"><button class="btn" data-closing-page-action="save-form" data-closing-type="' +
    type +
    '">保存草稿</button><button class="btn primary" data-closing-page-action="submit-form" data-closing-type="' +
    type +
    '">提交审批</button></div></div></section>'
  );
}

function closingEmergencyHome() {
  return (
    '<section class="closing-panel"><div class="closing-panel-head"><div><h3>发布管理</h3><p>完成ECN/PCN、发布审批、文档归档与版本发布。</p></div><div class="closing-panel-actions"><button class="btn warning" data-closing-page-action="open-emergency">紧急发布通道</button></div></div><div class="closing-emergency"><div class="closing-emergency-box"><strong>紧急发布通道</strong>用于在紧急场景下发起快速发布申请。填写发布内容并完成审批后，才可执行紧急下发。<div class="closing-emergency-meta"><div><span>审批状态</span><b>' +
    closingStatusTag(state.closingEmergencyStatus) +
    '</b></div><div><span>关联版本</span><b>V2.6</b></div><div><span>当前负责人</span><b>王凯</b></div></div></div><div class="closing-form-section"><h4>结项交付物概览</h4><div class="mini-list" style="padding:0"><div class="mini-list-row"><i class="mini-avatar">文</i><div class="grow"><strong>ECN / PCN 变更文档</strong><small>变更内容与审批记录已纳入归档范围</small></div>' +
    closingStatusTag('已归档') +
    '</div><div class="mini-list-row"><i class="mini-avatar">测</i><div class="grow"><strong>测试报告与版本基线</strong><small>测试阶段交付物，可在归档页统一查看</small></div>' +
    closingStatusTag('待归档') +
    '</div></div></div></div></section>'
  );
}

function closingEmergencyForm() {
  var approved = state.closingEmergencyStatus === '已通过';
  return (
    '<section class="closing-panel"><div class="closing-panel-head"><div><h3>紧急发布申请</h3><p>填写紧急发布单，审批通过后执行紧急下发。</p></div><div class="closing-panel-actions">' +
    closingStatusTag(state.closingEmergencyStatus) +
    '<button class="btn" data-closing-page-action="section" data-closing-section="emergency">返回</button></div></div><div class="closing-form"><div class="req-form-grid">' +
    closingField('发布单编号', 'emergencyId', 'ERP-202608-001', 'text', null, false, true) +
    closingField('关联版本', 'emergencyVersion', 'V2.6', 'select', ['V2.6', 'V2.5'], false, false) +
    closingField(
      '发布负责人',
      'emergencyOwner',
      '王凯',
      'select',
      ['王凯', '何盈', '赵敏'],
      false,
      false,
    ) +
    closingField('预计发布时间', 'emergencyDate', '2026-08-20', 'date', null, false, false) +
    closingField(
      '发布内容',
      'emergencyContent',
      '填写需要紧急下发的内容。',
      'area',
      null,
      true,
      false,
    ) +
    closingField(
      '影响范围',
      'emergencyScope',
      '填写影响范围、风险与回滚方案。',
      'area',
      null,
      true,
      false,
    ) +
    '</div><div class="closing-form-section"><h4>审批说明</h4><div class="notice warn"><i>!</i><span>紧急下发属于高风险操作，必须完成审批后才可执行。</span></div></div><div class="closing-form-actions"><button class="btn" data-closing-page-action="section" data-closing-section="emergency">取消</button><button class="btn" data-closing-page-action="save-emergency">保存草稿</button><button class="btn primary" data-closing-page-action="submit-emergency">提交审批</button><button class="btn warning" data-closing-page-action="dispatch-emergency" ' +
    (approved ? '' : 'disabled') +
    '>紧急下发</button></div></div></section>'
  );
}
App.closingEmergencyForm = closingEmergencyForm;

function closingArchivePage() {
  return (
    '<section class="closing-panel"><div class="closing-panel-head"><div><h3>文档归档</h3><p>统一归档 ECN、PCN、测试报告与结项交付物。</p></div><div class="closing-panel-actions"><button class="btn" data-closing-page-action="archive-all">批量归档</button></div></div><div class="closing-archive-wrap"><table class="closing-archive-table"><thead><tr><th>文档名称</th><th>类型</th><th>关联版本</th><th>归档状态</th><th>归档人</th><th>归档时间</th><th>操作</th></tr></thead><tbody>' +
    state.closingArchiveRecords
      .map(function (item) {
        return (
          '<tr><td>' +
          esc(item.name) +
          '</td><td>' +
          esc(item.type) +
          '</td><td>' +
          esc(item.version) +
          '</td><td>' +
          closingStatusTag(item.status) +
          '</td><td>' +
          esc(item.owner) +
          '</td><td>' +
          esc(item.archived) +
          '</td><td><button class="op" data-closing-page-action="archive-view" data-closing-name="' +
          esc(item.name) +
          '">查看详情</button></td></tr>'
        );
      })
      .join('') +
    '</tbody></table></div></section>'
  );
}

function renderClosing() {
  App.closingInit();
  var body =
    state.closingSection === 'ecn'
      ? closingFormPage('ecn')
      : state.closingSection === 'pcn'
        ? closingFormPage('pcn')
        : state.closingSection === 'archive'
          ? closingArchivePage()
          : state.closingSection === 'emergency-form'
            ? App.closingEmergencyForm()
            : closingEmergencyHome();
  return (
    '<div class="closing-reference-page"><div class="closing-stage-layout">' +
    App.closingSubnav() +
    '<main class="closing-main">' +
    body +
    '</main></div></div>'
  );
}
App.renderClosing = renderClosing;

/** 结项阶段交互 */
export function bindClosingEvents() {
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-closing-page-action]');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    var action = el.dataset.closingPageAction;
    if (action === 'section') {
      state.closingSection = el.dataset.closingSection || 'emergency';
      App.render();
      return;
    }
    if (action === 'create') {
      openModal(
        'closing-create',
        '新建发布相关表单',
        '<div class="notice"><i>＋</i><span>请选择需要创建的变更表单类型。</span></div><div class="grid cols-2"><button class="btn" data-closing-page-action="choose-form" data-closing-type="ecn">新建 ECN 表单</button><button class="btn" data-closing-page-action="choose-form" data-closing-type="pcn">新建 PCN 表单</button></div>',
        '<button class="btn" data-closing-page-action="modal-cancel">取消</button>',
      );
      return;
    }
    if (action === 'choose-form') {
      document.querySelector('#modalRoot').classList.remove('show');
      state.closingSection = el.dataset.closingType || 'ecn';
      App.render();
      return;
    }
    if (action === 'modal-cancel') {
      document.querySelector('#modalRoot').classList.remove('show');
      return;
    }
    if (action === 'open-emergency') {
      state.closingSection = 'emergency-form';
      App.render();
      return;
    }
    if (action === 'save-form' || action === 'submit-form') {
      var type = el.dataset.closingType || 'ecn';
      var form = closingCurrentForm(type);
      document.querySelectorAll('[data-closing-input]').forEach(function (input) {
        if (input.dataset.closingInput in form && !input.readOnly && !input.disabled)
          form[input.dataset.closingInput] = input.value;
      });
      if (action === 'submit-form') form.status = '待审批';
      App.render();
      showToast(action === 'submit-form' ? '变更表单已提交审批' : '变更表单草稿已保存');
      return;
    }
    if (action === 'save-emergency') {
      state.closingEmergencyStatus = '草稿';
      App.render();
      showToast('紧急发布单草稿已保存');
      return;
    }
    if (action === 'submit-emergency') {
      state.closingEmergencyStatus = '审批中';
      App.render();
      showToast('紧急发布单已提交审批');
      return;
    }
    if (action === 'dispatch-emergency') {
      if (state.closingEmergencyStatus !== '已通过') {
        showToast('审批通过后才可紧急下发');
        return;
      }
      showToast('紧急发布已下发');
      return;
    }
    if (action === 'archive-all') {
      state.closingArchiveRecords.forEach(function (r) {
        r.status = '已归档';
        r.archived = new Date().toISOString().slice(0, 10);
        r.owner = '当前操作人';
      });
      App.render();
      showToast('演示归档已完成，归档状态已更新');
      return;
    }
    if (action === 'archive-view') {
      openDrawer(
        '文档详情 · ' + el.dataset.closingName,
        '<div class="doc-preview"><h3>' +
          esc(el.dataset.closingName) +
          '</h3><p><b>归档状态：</b>' +
          esc(
            (
              state.closingArchiveRecords.find(function (r) {
                return r.name === el.dataset.closingName;
              }) || {}
            ).status || '待确认',
          ) +
          '</p><p><b>关联内容：</b>变更记录、审批记录、版本信息与交付物快照。</p></div>',
        '<button class="btn" data-closing-page-action="close-drawer">关闭</button>',
      );
      return;
    }
    if (action === 'close-drawer') {
      closeDrawer();
      return;
    }
  });
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-closing-drawer-action]');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    if (el.dataset.closingDrawerAction === 'close') closeDrawer();
  });
}
