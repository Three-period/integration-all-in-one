/** 测试阶段：用例、测试报告与缺陷。 */
import { App } from '../../core/app.js';
import { closeDrawer, openDrawer, openModal } from '../../components/overlays.js';
import { showToast } from '../../components/toast.js';
import { $, esc, tag } from '../../core/dom.js';
import { project, state } from '../../store/state.js';

function testingInit() {
  if (!state.testingSection) state.testingSection = 'cases';
  if (!state.testingQuery) state.testingQuery = '';
  if (!state.testingStatusFilter) state.testingStatusFilter = '全部';
  if (!state.testingPriorityFilter) state.testingPriorityFilter = '全部';
  if (!state.testingCaseMode) state.testingCaseMode = 'edit';
  if (!state.testingCases)
    state.testingCases = [
      {
        id: 'TC-1001',
        name: '设备断线自动重连',
        related: 'REQ-139',
        priority: '高',
        status: '通过',
        owner: '孙宁',
        version: 'V2.6',
        created: '2026-08-11',
        steps: [
          ['断开网络 30 秒', '网络恢复后重新连接', '设备自动恢复在线', '设备自动恢复在线', '通过'],
          ['检查设备状态', '查询设备实时状态', '状态与服务端一致', '状态与服务端一致', '通过'],
        ],
      },
      {
        id: 'TC-1002',
        name: '高并发消息上报',
        related: 'REQ-142',
        priority: '高',
        status: '执行中',
        owner: '赵敏',
        version: 'V2.6',
        created: '2026-08-12',
        steps: [
          ['模拟 1000 台设备同时上报', '持续发送设备消息', '无丢包、无重复', '正在执行', '执行中'],
        ],
      },
      {
        id: 'TC-1003',
        name: '区域筛选与报表导出',
        related: 'REQ-146',
        priority: '中',
        status: '未执行',
        owner: '李明',
        version: 'V2.6',
        created: '2026-08-13',
        steps: [
          ['选择不同区域查询', '进入能耗报表选择区域', '返回对应区域数据', '待执行', '未执行'],
        ],
      },
      {
        id: 'TC-1004',
        name: '异常重试记录',
        related: 'REQ-139',
        priority: '低',
        status: '失败',
        owner: '孙宁',
        version: 'V2.6',
        created: '2026-08-14',
        steps: [
          [
            '模拟服务端短暂不可用',
            '恢复服务后重试请求',
            '记录完整重试次数',
            '未记录重试次数',
            '失败',
          ],
        ],
      },
    ];
  if (!state.testingDefects)
    state.testingDefects = [
      {
        id: 'DFT-0198',
        name: '高并发消息上报偶发重复',
        severity: '严重',
        project: project().name,
        product: '设备接入服务',
        expected: '2026-08-20',
        status: '处理中',
        reviewer: '赵敏',
        solver: '孙宁',
        updated: '2026-08-16 10:24',
        dwell: '2 天',
        creator: '何盈',
        created: '2026-08-14',
        planned: '2026-08-20',
        actual: '-',
        version: 'V2.6',
        summary: '高并发消息上报场景下，少量设备出现重复消息。',
        relations: ['TC-1002 · 高并发消息上报', 'REQ-142 · 消息完整性要求'],
        versions: ['V2.6 · 当前发现', 'V2.5 · 未复现'],
      },
      {
        id: 'DFT-0197',
        name: '区域筛选导出为空',
        severity: '一般',
        project: project().name,
        product: '能耗报表',
        expected: '2026-08-18',
        status: '待处理',
        reviewer: '王凯',
        solver: '李明',
        updated: '2026-08-15 16:08',
        dwell: '3 天',
        creator: '赵敏',
        created: '2026-08-13',
        planned: '2026-08-18',
        actual: '-',
        version: 'V2.6',
        summary: '选择部分区域后导出报表，文件内容为空。',
        relations: ['TC-1003 · 区域筛选与报表导出', 'REQ-146 · 区域报表要求'],
        versions: ['V2.6 · 当前发现'],
      },
      {
        id: 'DFT-0192',
        name: '断线重连后状态延迟',
        severity: '提示',
        project: project().name,
        product: '设备接入服务',
        expected: '2026-08-16',
        status: '已解决',
        reviewer: '赵敏',
        solver: '孙宁',
        updated: '2026-08-12 18:20',
        dwell: '已关闭',
        creator: '孙宁',
        created: '2026-08-10',
        planned: '2026-08-16',
        actual: '2026-08-12',
        version: 'V2.6',
        summary: '网络恢复后设备状态延迟约 5 秒更新。',
        relations: ['TC-1001 · 设备断线自动重连'],
        versions: ['V2.6 · 已解决'],
      },
    ];
  if (!state.testingDefectTab) state.testingDefectTab = 'detail';
  if (!state.testingDefectMode) state.testingDefectMode = 'edit';
}
App.testingInit = testingInit;

function testingSections() {
  return [
    ['cases', '用例管理'],
    ['single', '单板测试报告'],
    ['long', '长运测试报告'],
    ['system', '整机测试报告'],
    ['defects', '缺陷管理'],
  ];
}
App.testingSections = testingSections;

function testingStatusType(status) {
  return status === '通过' || status === '已解决'
    ? 'green'
    : status === '执行中' || status === '处理中'
      ? 'blue'
      : status === '失败' || status === '严重'
        ? 'red'
        : status === '高'
          ? 'orange'
          : status === '待处理' || status === '待执行'
            ? 'orange'
            : 'gray';
}

function testingStatusTag(status) {
  return tag(status, testingStatusType(status));
}

function testingSeverityType(status) {
  return status === '严重' ? 'red' : status === '一般' ? 'orange' : 'gray';
}

function testingSeverityTag(status) {
  return tag(status, testingSeverityType(status));
}

function testingSubnav() {
  return (
    '<aside class="testing-subnav"><div class="testing-subnav-head">测试阶段</div>' +
    App.testingSections()
      .map(function (item) {
        return (
          '<button class="' +
          (state.testingSection === item[0] ? 'active' : '') +
          '" data-testing-page-action="section" data-testing-section="' +
          item[0] +
          '">' +
          item[1] +
          '</button>'
        );
      })
      .join('') +
    '</aside>'
  );
}
App.testingSubnav = testingSubnav;

export function testingOption(values, current) {
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

export function testingCaseRows() {
  App.testingInit();
  var query = (state.testingQuery || '').toLowerCase();
  return state.testingCases.filter(function (item) {
    var hit =
      !query ||
      (item.id + ' ' + item.name + ' ' + item.related + ' ' + item.owner)
        .toLowerCase()
        .indexOf(query) > -1;
    var status = state.testingStatusFilter === '全部' || item.status === state.testingStatusFilter;
    var priority =
      state.testingPriorityFilter === '全部' || item.priority === state.testingPriorityFilter;
    return hit && status && priority;
  });
}

function testingCase(id) {
  App.testingInit();
  return (
    state.testingCases.find(function (item) {
      return item.id === id;
    }) || state.testingCases[0]
  );
}

function testingCurrentCase() {
  App.testingInit();
  if (state.testingCaseMode === 'create') {
    if (!state.testingDraft)
      state.testingDraft = {
        id: 'NEW-CASE',
        name: '新建测试用例',
        related: 'REQ-142',
        priority: '中',
        status: '未执行',
        owner: '赵敏',
        version: 'V2.6',
        created: '日期',
        steps: [['测试项', '填写测试步骤', '填写预期结果', '填写实际结果', '未执行']],
      };
    return state.testingDraft;
  }
  return testingCase(state.testingSelected);
}

function testingCaseField(label, name, value, kind, values, wide) {
  var control =
    kind === 'select'
      ? '<select data-testing-input="' +
        name +
        '">' +
        testingOption(values || [], value) +
        '</select>'
      : kind === 'area'
        ? '<textarea data-testing-input="' + name + '">' + esc(value || '') + '</textarea>'
        : '<input data-testing-input="' + name + '" value="' + esc(value || '') + '">';
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

function testingCaseDrawerBody(record) {
  return (
    '<div class="testing-case-detail"><div class="req-form-heading"><div><strong>' +
    esc(record.name) +
    '</strong><small>' +
    esc(record.id) +
    ' · ' +
    esc(record.version) +
    '</small></div>' +
    testingStatusTag(record.status) +
    '</div><div class="req-template"><div class="req-template-head">测试用例填写</div><div class="req-form-grid">' +
    testingCaseField('用例名称', 'name', record.name, 'text', null, false) +
    testingCaseField(
      '关联需求',
      'related',
      record.related,
      'select',
      ['REQ-142', 'REQ-146', 'REQ-139'],
      false,
    ) +
    testingCaseField('优先级', 'priority', record.priority, 'select', ['高', '中', '低'], false) +
    testingCaseField(
      '执行状态',
      'status',
      record.status,
      'select',
      ['未执行', '执行中', '通过', '失败'],
      false,
    ) +
    testingCaseField('负责人', 'owner', record.owner, 'select', ['赵敏', '孙宁', '李明'], false) +
    testingCaseField('关联版本', 'version', record.version, 'text', null, false) +
    testingCaseField(
      '用例说明',
      'summary',
      record.summary || '填写本用例的测试目标与范围。',
      'area',
      null,
      true,
    ) +
    '</div></div><div class="detail-section"><h4>测试步骤与结果</h4><div class="card table-wrap"><table class="table"><thead><tr><th>测试项</th><th>测试步骤</th><th>预期结果</th><th>实际结果</th><th>结果</th></tr></thead><tbody>' +
    record.steps
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
          testingStatusTag(item[4]) +
          '</td></tr>'
        );
      })
      .join('') +
    '</tbody></table></div></div></div>'
  );
}

function testingCaseDrawerFoot() {
  return '<button class="btn" data-testing-drawer-action="cancel">取消</button><button class="btn" data-testing-drawer-action="save">保存草稿</button><button class="btn primary" data-testing-drawer-action="submit">提交执行</button>';
}

function openTestingCaseDrawer(id, mode) {
  App.testingInit();
  state.testingCaseMode = mode || 'edit';
  state.testingSelected = id || state.testingCases[0].id;
  if (state.testingCaseMode === 'create') state.testingDraft = null;
  var record = testingCurrentCase();
  openDrawer(
    (state.testingCaseMode === 'create' ? '新建测试用例 · ' : '测试用例 · ') + record.name,
    testingCaseDrawerBody(record),
    testingCaseDrawerFoot(),
  );
  $('#drawer').classList.add('req-drawer-large');
}

function collectTestingCase() {
  var body = document.querySelector('#drawerBody');
  var record = testingCurrentCase();
  if (!body) return;
  body.querySelectorAll('[data-testing-input]').forEach(function (input) {
    if (input.dataset.testingInput !== 'version') record[input.dataset.testingInput] = input.value;
  });
}

function saveTestingCase(mode) {
  collectTestingCase();
  var record = testingCurrentCase();
  if (mode === 'submit') record.status = '执行中';
  if (state.testingCaseMode === 'create') {
    record.id = 'TC-NEW-' + Date.now();
    state.testingCases.unshift(Object.assign({}, record, { steps: record.steps || [] }));
    state.testingSelected = record.id;
    state.testingDraft = null;
  }
  closeDrawer();
  App.render();
  showToast(mode === 'submit' ? '测试用例已提交执行' : '测试用例草稿已保存');
}

function openTestingImport() {
  openModal(
    'testing-import',
    '导入测试用例',
    '<div class="notice"><i>⇧</i><span>支持 Excel 模板导入。请下载标准模板后填写用例名称、关联需求、优先级、负责人和测试步骤。</span></div><div class="field"><label>选择文件</label><input class="input" type="file" accept=".xlsx,.xls,.csv"></div>',
    '<button class="btn" data-testing-page-action="modal-cancel">取消</button><button class="btn primary" data-testing-page-action="modal-save">开始导入</button>',
  );
}

function openTestingAi() {
  openModal(
    'testing-ai',
    'AI 推荐用例',
    '<div class="notice"><i>✦</i><span>基于当前关联需求和历史用例，推荐以下测试用例供人工确认。</span></div><div class="testing-ai-list"><label><input type="checkbox" checked> TC-1001 · 设备断线自动重连</label><label><input type="checkbox" checked> TC-1002 · 高并发消息上报</label><label><input type="checkbox"> TC-1003 · 区域筛选与报表导出</label></div>',
    '<button class="btn" data-testing-page-action="modal-cancel">取消</button><button class="btn primary" data-testing-page-action="modal-save">采纳所选用例</button>',
  );
}

function openTestingColumns() {
  openModal(
    'testing-columns',
    '表头自定义设置',
    '<div class="req-modal-columns"><label><input type="checkbox" checked>用例编号</label><label><input type="checkbox" checked>用例名称</label><label><input type="checkbox" checked>关联需求</label><label><input type="checkbox" checked>优先级</label><label><input type="checkbox" checked>执行状态</label><label><input type="checkbox" checked>负责人</label><label><input type="checkbox" checked>操作</label></div>',
    '<button class="btn" data-testing-page-action="modal-cancel">取消</button><button class="btn primary" data-testing-page-action="modal-save">保存设置</button>',
  );
}

function renderTestingCases() {
  var rows = testingCaseRows();
  var html = rows
    .map(function (item) {
      return (
        '<tr class="' +
        (state.testingSelected === item.id ? 'selected' : '') +
        '" data-testing-page-action="open-case" data-testing-id="' +
        esc(item.id) +
        '"><td><input type="checkbox" data-testing-select="' +
        esc(item.id) +
        '"></td><td>' +
        esc(item.id) +
        '</td><td><button class="testing-link" data-testing-page-action="open-case" data-testing-id="' +
        esc(item.id) +
        '">' +
        esc(item.name) +
        '</button></td><td>' +
        esc(item.related) +
        '</td><td>' +
        testingStatusTag(item.priority) +
        '</td><td><select class="req-inline-select" data-testing-inline="status" data-testing-id="' +
        esc(item.id) +
        '">' +
        testingOption(['未执行', '执行中', '通过', '失败'], item.status) +
        '</select></td><td>' +
        esc(item.owner) +
        '</td><td><button class="op" data-testing-page-action="open-case" data-testing-id="' +
        esc(item.id) +
        '">查看</button><button class="op" data-testing-page-action="execute-case" data-testing-id="' +
        esc(item.id) +
        '">执行</button></td></tr>'
      );
    })
    .join('');
  return (
    '<div class="testing-toolbar"><button class="btn primary" data-testing-page-action="create-case">＋ 新建用例</button><button class="btn" data-testing-page-action="import-case">导入用例</button><button class="btn" data-testing-page-action="ai-case">AI 推荐用例</button><button class="btn" data-testing-page-action="columns">表头设置</button><span class="push mini-note">共 ' +
    rows.length +
    ' 条用例</span></div><div class="testing-search-row"><input class="input search" data-testing-search placeholder="搜索用例名称 / 编号 / 负责人" value="' +
    esc(state.testingQuery) +
    '"><select class="input" data-testing-filter="status"><option>全部执行状态</option>' +
    ['未执行', '执行中', '通过', '失败']
      .map(function (v) {
        return (
          '<option ' + (state.testingStatusFilter === v ? 'selected' : '') + '>' + v + '</option>'
        );
      })
      .join('') +
    '</select><select class="input" data-testing-filter="priority"><option>全部优先级</option>' +
    ['高', '中', '低']
      .map(function (v) {
        return (
          '<option ' + (state.testingPriorityFilter === v ? 'selected' : '') + '>' + v + '</option>'
        );
      })
      .join('') +
    '</select><button class="btn" data-testing-page-action="reset">重置</button></div><div class="testing-table-wrap"><table class="testing-table"><thead><tr><th>用例库</th><th>用例编号</th><th>用例名称</th><th>关联需求</th><th>优先级</th><th>执行状态</th><th>负责人</th><th>操作</th></tr></thead><tbody>' +
    (html ||
      '<tr><td colspan="8"><div class="testing-empty">没有匹配的测试用例，请调整筛选条件。</div></td></tr>') +
    '</tbody></table></div><div class="testing-footnote">用例编号按命名规则自动生成；用例名称由创建人填写；关联需求自动带出；优先级支持高 / 中 / 低；执行状态支持未执行 / 执行中 / 通过 / 失败；负责人按组织架构带出；操作支持查看与执行。</div>'
  );
}
App.renderTestingCases = renderTestingCases;

function testingReportInfo(section) {
  var map = {
    single: ['单板测试报告', '记录单板级功能与接口测试结果'],
    long: ['长运测试报告', '记录长时间运行、稳定性与资源占用测试结果'],
    system: ['整机测试报告', '记录整机联调、安装和验收测试结果'],
  };
  return map[section] || map.single;
}
App.testingReportInfo = testingReportInfo;

function testingDefectRows() {
  App.testingInit();
  var query = (state.testingDefectQuery || '').toLowerCase();
  return state.testingDefects.filter(function (item) {
    return (
      !query ||
      (item.id + ' ' + item.name + ' ' + item.solver + ' ' + item.project)
        .toLowerCase()
        .indexOf(query) > -1
    );
  });
}
App.testingDefectRows = testingDefectRows;

function testingDefect(id) {
  App.testingInit();
  return (
    state.testingDefects.find(function (item) {
      return item.id === id;
    }) || state.testingDefects[0]
  );
}

function testingCurrentDefect() {
  App.testingInit();
  if (state.testingDefectMode === 'create') {
    if (!state.testingDefectDraft)
      state.testingDefectDraft = {
        id: 'NEW-DEFECT',
        name: '新建缺陷',
        severity: '一般',
        project: project().name,
        product: '设备接入服务',
        expected: '日期',
        status: '待处理',
        reviewer: '赵敏',
        solver: '李明',
        updated: '刚刚',
        dwell: '0 天',
        creator: '何盈',
        created: '日期',
        planned: '日期',
        actual: '-',
        version: 'V2.6',
        summary: '',
        relations: [],
        versions: ['V2.6 · 当前发现'],
      };
    return state.testingDefectDraft;
  }
  return testingDefect(state.testingDefectSelected);
}

function testingDefectField(label, name, value, kind, wide) {
  var control =
    kind === 'select'
      ? '<select data-testing-defect-input="' +
        name +
        '">' +
        testingOption(
          name === 'severity' ? ['严重', '一般', '提示'] : ['待处理', '处理中', '已解决'],
          value,
        ) +
        '</select>'
      : kind === 'area'
        ? '<textarea data-testing-defect-input="' + name + '">' + esc(value || '') + '</textarea>'
        : '<input data-testing-defect-input="' + name + '" value="' + esc(value || '') + '">';
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

function testingDefectDetail(record) {
  return (
    '<div class="testing-defect-detail"><div class="req-template"><div class="req-template-head">缺陷详细信息</div><div class="req-form-grid">' +
    testingDefectField('缺陷名称', 'name', record.name, 'text', false) +
    testingDefectField('严重等级', 'severity', record.severity, 'select', false) +
    testingDefectField('所属项目', 'project', record.project, 'text', false) +
    testingDefectField('产品线', 'product', record.product, 'text', false) +
    testingDefectField('流程状态', 'status', record.status, 'select', false) +
    testingDefectField('问题解决人', 'solver', record.solver, 'text', false) +
    testingDefectField('期望解决日期', 'expected', record.expected, 'text', false) +
    testingDefectField('发生问题版本', 'version', record.version, 'text', false) +
    testingDefectField('缺陷描述', 'summary', record.summary, 'area', true) +
    '</div></div></div>'
  );
}

function testingDefectRelation(record) {
  return (
    '<div class="testing-relation-box"><h4>关联关系</h4><p>展示缺陷与测试用例、需求文档的追溯关系，点击关联项可继续查看对应详情。</p>' +
    record.relations
      .map(function (item) {
        return (
          '<div class="testing-relation-row"><i class="mini-avatar">关</i><div class="grow"><strong>' +
          esc(item) +
          '</strong><small>已建立关联</small></div><button class="op" data-testing-drawer-action="toast">查看</button></div>'
        );
      })
      .join('') +
    '</div>'
  );
}

function testingDefectVersions(record) {
  return (
    '<div class="testing-relation-box"><h4>缺陷版本</h4><p>保留缺陷在不同产品版本中的发现、修复与验证记录。</p>' +
    record.versions
      .map(function (item) {
        return (
          '<div class="testing-relation-row"><i class="mini-avatar">V</i><div class="grow"><strong>' +
          esc(item) +
          '</strong><small>版本追溯记录</small></div><button class="op" data-testing-drawer-action="toast">查看</button></div>'
        );
      })
      .join('') +
    '</div>'
  );
}

function testingDefectDrawerBody(record) {
  var tabs = [
    ['detail', '详细信息'],
    ['relation', '关联关系'],
    ['versions', '缺陷版本'],
  ];
  var body =
    state.testingDefectTab === 'relation'
      ? testingDefectRelation(record)
      : state.testingDefectTab === 'versions'
        ? testingDefectVersions(record)
        : testingDefectDetail(record);
  return (
    '<div class="req-drawer-layout"><div class="req-form-pane"><div class="req-form-heading"><div><strong>' +
    esc(record.name) +
    '</strong><small>' +
    esc(record.id) +
    ' · ' +
    esc(record.version) +
    '</small></div>' +
    testingSeverityTag(record.severity) +
    '</div><div class="req-form-tabs">' +
    tabs
      .map(function (item) {
        return (
          '<button class="req-form-tab ' +
          (state.testingDefectTab === item[0] ? 'active' : '') +
          '" data-testing-drawer-action="tab" data-testing-defect-tab="' +
          item[0] +
          '">' +
          item[1] +
          '</button>'
        );
      })
      .join('') +
    '</div>' +
    body +
    '</div><aside class="req-meta-pane"><h4>基础信息</h4><div class="req-meta-row"><b>编号：</b><span>' +
    esc(record.id) +
    '</span></div><div class="req-meta-row"><b>所属项目：</b><span>' +
    esc(record.project) +
    '</span></div><div class="req-meta-row"><b>审核人：</b><span>' +
    esc(record.reviewer) +
    '</span></div><div class="req-meta-row"><b>最近更新时间：</b><span>' +
    esc(record.updated) +
    '</span></div><div class="req-meta-row"><b>滞留时间：</b><span>' +
    esc(record.dwell) +
    '</span></div><div class="req-meta-row"><b>创建人：</b><span>' +
    esc(record.creator) +
    '</span></div><div class="req-meta-row"><b>创建时间：</b><span>' +
    esc(record.created) +
    '</span></div><div class="req-meta-row"><b>计划解决日期：</b><span>' +
    esc(record.planned) +
    '</span></div><div class="req-meta-row"><b>实际解决日期：</b><span>' +
    esc(record.actual) +
    '</span></div></aside></div>'
  );
}

function testingDefectDrawerFoot() {
  return '<button class="btn" data-testing-drawer-action="cancel">取消</button><button class="btn" data-testing-drawer-action="save-defect">保存草稿</button><button class="btn primary" data-testing-drawer-action="submit-defect">提交更新</button>';
}

function openTestingDefectDrawer(id, mode) {
  App.testingInit();
  state.testingDefectMode = mode || 'edit';
  state.testingDefectSelected = id || state.testingDefects[0].id;
  if (state.testingDefectMode === 'create') state.testingDefectDraft = null;
  state.testingDefectTab = 'detail';
  var record = testingCurrentDefect();
  openDrawer(
    (state.testingDefectMode === 'create' ? '新建缺陷 · ' : '缺陷详情 · ') + record.name,
    testingDefectDrawerBody(record),
    testingDefectDrawerFoot(),
  );
  $('#drawer').classList.add('req-drawer-large');
}

function collectTestingDefect() {
  var body = document.querySelector('#drawerBody');
  var record = testingCurrentDefect();
  if (!body) return;
  body.querySelectorAll('[data-testing-defect-input]').forEach(function (input) {
    record[input.dataset.testingDefectInput] = input.value;
  });
}

export function renderTestingDefects() {
  var rows = App.testingDefectRows();
  var html = rows
    .map(function (item) {
      return (
        '<tr class="' +
        (state.testingDefectSelected === item.id ? 'selected' : '') +
        '" data-testing-page-action="open-defect" data-testing-defect-id="' +
        esc(item.id) +
        '"><td><button class="testing-link" data-testing-page-action="open-defect" data-testing-defect-id="' +
        esc(item.id) +
        '">' +
        esc(item.id) +
        '</button></td><td>' +
        esc(item.name) +
        '</td><td>' +
        testingSeverityTag(item.severity) +
        '</td><td>' +
        esc(item.project) +
        '</td><td>' +
        testingStatusTag(item.status) +
        '</td><td>' +
        esc(item.solver) +
        '</td><td>' +
        esc(item.expected) +
        '</td><td>' +
        esc(item.updated) +
        '</td><td><button class="op" data-testing-page-action="open-defect" data-testing-defect-id="' +
        esc(item.id) +
        '">查看</button></td></tr>'
      );
    })
    .join('');
  return (
    '<div class="testing-toolbar"><button class="btn primary" data-testing-page-action="create-defect">＋ 新建缺陷</button><button class="btn" data-testing-page-action="defect-filter">筛选</button><span class="push mini-note">共 ' +
    rows.length +
    ' 条缺陷</span></div><div class="testing-search-row"><input class="input search" data-testing-defect-search placeholder="搜索缺陷编号 / 名称 / 解决人" value="' +
    esc(state.testingDefectQuery || '') +
    '"><select class="input"><option>全部流程状态</option><option>待处理</option><option>处理中</option><option>已解决</option></select><select class="input"><option>全部严重等级</option><option>严重</option><option>一般</option><option>提示</option></select><button class="btn" data-testing-page-action="reset-defects">重置</button></div><div class="testing-table-wrap"><table class="testing-table testing-defect-table"><thead><tr><th>缺陷编号</th><th>缺陷名称</th><th>严重等级</th><th>所属项目</th><th>流程状态</th><th>问题解决人</th><th>期望解决日期</th><th>最近更新时间</th><th>操作</th></tr></thead><tbody>' +
    (html || '<tr><td colspan="9"><div class="testing-empty">暂无缺陷记录。</div></td></tr>') +
    '</tbody></table></div>'
  );
}

function renderTesting() {
  App.testingInit();
  var content =
    state.testingSection === 'cases'
      ? App.renderTestingCases()
      : state.testingSection === 'defects'
        ? renderTestingDefects()
        : App.renderTestingReport(state.testingSection);
  return (
    '<div class="testing-reference-page"><div class="testing-stage-layout">' +
    App.testingSubnav() +
    '<main class="testing-main">' +
    content +
    '</main></div></div>'
  );
}
App.renderTesting = renderTesting;

function renderTestingReport(section) {
  var info = App.testingReportInfo(section),
    r = App.v37Record(section);
  return (
    '<div class="testing-report-panel"><div class="testing-report-head"><div><h3>' +
    info[0] +
    '</h3><p>' +
    info[1] +
    ' · ' +
    esc(r.status) +
    ' · 演示数据</p></div><div class="testing-report-actions"><button class="btn primary" data-v37-report-action="new" data-section="' +
    section +
    '">＋ 新建报告</button><button class="btn" data-v37-report-action="save">保存草稿</button><button class="btn" data-v37-report-action="submit">提交评审</button></div></div>' +
    App.v37ReportBody(section) +
    '</div>'
  );
}
App.renderTestingReport = renderTestingReport;

export function openTestingReportDrawer(section) {
  state.testingSection = section;
  state.v37ReportTab = 'detail';
  openDrawer(
    App.testingReportInfo(section)[0] + ' · 报告编辑',
    App.v37ReportBody(section, 'detail'),
    '<button class="btn" data-v37-report-action="close">关闭</button><button class="btn" data-v37-report-action="save">保存草稿</button><button class="btn primary" data-v37-report-action="submit">提交评审</button>',
  );
}

/** 测试阶段交互 */
export function bindTestingEvents() {
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-testing-page-action]');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    var action = el.dataset.testingPageAction;
    if (action === 'section') {
      state.testingSection = el.dataset.testingSection || 'cases';
      App.render();
      return;
    }
    if (action === 'create-case') {
      openTestingCaseDrawer(null, 'create');
      return;
    }
    if (action === 'open-case') {
      if (e.target.closest('select') || e.target.matches('input[type=checkbox]')) return;
      state.testingSelected = el.dataset.testingId;
      openTestingCaseDrawer(state.testingSelected, 'edit');
      return;
    }
    if (action === 'execute-case') {
      var item = testingCase(el.dataset.testingId);
      item.status = '执行中';
      App.render();
      showToast('测试用例已进入执行中');
      return;
    }
    if (action === 'import-case') {
      openTestingImport();
      return;
    }
    if (action === 'ai-case') {
      openTestingAi();
      return;
    }
    if (action === 'columns') {
      openTestingColumns();
      return;
    }
    if (action === 'reset') {
      state.testingQuery = '';
      state.testingStatusFilter = '全部';
      state.testingPriorityFilter = '全部';
      App.render();
      return;
    }
    if (action === 'new-report') {
      openTestingReportDrawer(el.dataset.testingReport || 'single');
      return;
    }
    if (action === 'save-report') {
      showToast('请先打开报告并填写模板');
      return;
    }
    if (action === 'submit-report') {
      showToast('请先完成报告填写');
      return;
    }
    if (action === 'modal-cancel') {
      document.querySelector('#modalRoot').classList.remove('show');
      return;
    }
    if (action === 'modal-save') {
      document.querySelector('#modalRoot').classList.remove('show');
      showToast('设置已保存');
      return;
    }
    if (action === 'create-defect') {
      openTestingDefectDrawer(null, 'create');
      return;
    }
    if (action === 'open-defect') {
      openTestingDefectDrawer(el.dataset.testingDefectId, 'edit');
      return;
    }
    if (action === 'reset-defects') {
      state.testingDefectQuery = '';
      App.render();
      return;
    }
  });
  document.addEventListener('input', function (e) {
    if (e.target.matches('[data-testing-search]')) {
      state.testingQuery = e.target.value;
      App.render();
      return;
    }
    if (e.target.matches('[data-testing-defect-search]')) {
      state.testingDefectQuery = e.target.value;
      App.render();
    }
  });
  document.addEventListener('change', function (e) {
    var inline = e.target.closest('[data-testing-inline]');
    if (inline) {
      var item = testingCase(inline.dataset.testingId);
      item[inline.dataset.testingInline] = inline.value;
      state.testingSelected = item.id;
      App.render();
      showToast('用例字段已更新');
      return;
    }
    var filter = e.target.closest('[data-testing-filter]');
    if (filter) {
      if (filter.dataset.testingFilter === 'status')
        state.testingStatusFilter = filter.value === '全部执行状态' ? '全部' : filter.value;
      if (filter.dataset.testingFilter === 'priority')
        state.testingPriorityFilter = filter.value === '全部优先级' ? '全部' : filter.value;
      App.render();
    }
  });
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-testing-drawer-action]');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    var action = el.dataset.testingDrawerAction;
    if (action === 'tab') {
      state.testingDefectTab = el.dataset.testingDefectTab || 'detail';
      var record = testingCurrentDefect();
      document.querySelector('#drawerBody').innerHTML = testingDefectDrawerBody(record);
      return;
    }
    if (action === 'toast') {
      showToast('已打开关联记录');
      return;
    }
    if (action === 'cancel') {
      closeDrawer();
      return;
    }
    if (action === 'save') {
      saveTestingCase('save');
      return;
    }
    if (action === 'submit') {
      saveTestingCase('submit');
      return;
    }
    if (action === 'save-defect') {
      collectTestingDefect();
      let defect = testingCurrentDefect();
      if (state.testingDefectMode === 'create') {
        defect.id = 'DFT-NEW-' + Date.now();
        state.testingDefects.unshift(Object.assign({}, defect));
        state.testingDefectSelected = defect.id;
        state.testingDefectDraft = null;
      }
      closeDrawer();
      App.render();
      showToast('缺陷草稿已保存');
      return;
    }
    if (action === 'submit-defect') {
      collectTestingDefect();
      let defect = testingCurrentDefect();
      defect.status = '处理中';
      if (state.testingDefectMode === 'create') {
        defect.id = 'DFT-NEW-' + Date.now();
        state.testingDefects.unshift(Object.assign({}, defect));
        state.testingDefectSelected = defect.id;
        state.testingDefectDraft = null;
      }
      closeDrawer();
      App.render();
      showToast('缺陷更新已提交');
      return;
    }
  });
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-testing-report-action]');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    var action = el.dataset.testingReportAction;
    if (action === 'cancel') {
      closeDrawer();
      return;
    }
    if (action === 'save') {
      closeDrawer();
      showToast('测试报告草稿已保存');
      return;
    }
    if (action === 'submit') {
      closeDrawer();
      showToast('测试报告已提交评审');
      return;
    }
  });
}
