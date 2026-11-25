/** 测试报告与发布版本记录（V37）。 */
import { App } from '../../core/app.js';
import { closeDrawer } from '../../components/overlays.js';
import { showToast } from '../../components/toast.js';
import { esc } from '../../core/dom.js';
import { v35Store } from '../../features/dev-review.js';
import { openTestingReportDrawer } from './testing.js';
import { project, state } from '../../store/state.js';

let v37OldEmergency;
let v37OldClosingSubnav;
let v37OldClosingRender;

function v37Reports() {
  App.testingInit();
  if (!state.v37Reports) state.v37Reports = {};
  var pid = state.projectId;
  if (!state.v37Reports[pid]) state.v37Reports[pid] = {};
  return state.v37Reports[pid];
}

function v37Record(section) {
  var data = v37Reports();
  if (!data[section])
    data[section] = {
      name: App.testingReportInfo(section)[0],
      version: 'V2.6',
      owner: '赵敏',
      conclusion: '',
      status: '草稿',
      history: [],
    };
  return data[section];
}
App.v37Record = v37Record;

function v37ReportBody(section, active) {
  var r = App.v37Record(section),
    info = App.testingReportInfo(section),
    tab = active || state.v37ReportTab || 'detail';
  return (
    '<div class="testing-report-tabs">' +
    [
      ['detail', '详细信息'],
      ['version', '关联版本'],
      ['history', '报告历史'],
    ]
      .map(function (t) {
        return (
          '<button class="testing-report-tab ' +
          (tab === t[0] ? 'active' : '') +
          '" data-v37-report-tab="' +
          t[0] +
          '" data-v37-section="' +
          section +
          '">' +
          t[1] +
          '</button>'
        );
      })
      .join('') +
    '</div>' +
    (tab === 'detail'
      ? '<div class="testing-template"><div class="testing-template-head"><span>' +
        esc(info[0]) +
        ' · ' +
        esc(r.status) +
        '</span><span class="mini-note">在线文档（Mock）</span></div><div style="padding:16px"><div class="req-form-grid"><div class="req-form-field"><label>报告名称</label><input data-v37-report-input="name" value="' +
        esc(r.name) +
        '"></div><div class="req-form-field"><label>负责人</label><input data-v37-report-input="owner" value="' +
        esc(r.owner) +
        '"></div><div class="req-form-field"><label>关联版本</label><input data-v37-report-input="version" value="' +
        esc(r.version) +
        '"></div><div class="req-form-field full"><label>测试结论 / 风险说明</label><textarea style="min-height:150px" data-v37-report-input="conclusion" placeholder="填写测试结论、异常与风险说明">' +
        esc(r.conclusion) +
        '</textarea></div></div></div></div>'
      : tab === 'version'
        ? '<div class="card-pad"><h3 class="section-title">当前报告关联版本</h3><p>当前项目：' +
          esc(project().name) +
          '</p><p>关联版本：' +
          esc(r.version) +
          '</p><p>状态：' +
          esc(r.status) +
          '</p><p class="mini-note">修改版本须返回详细信息并保存；历史记录保留原版本快照。</p></div>'
        : '<div class="card-pad"><h3 class="section-title">报告历史</h3>' +
          (r.history.length
            ? r.history
                .slice()
                .reverse()
                .map(function (h) {
                  return (
                    '<div class="doc-row"><div class="grow"><strong>' +
                    esc(h.name) +
                    ' · ' +
                    esc(h.status) +
                    '</strong><small>' +
                    esc(h.version) +
                    ' · ' +
                    esc(h.owner) +
                    ' · ' +
                    esc(h.at) +
                    '</small><div class="mini-note">' +
                    esc(h.conclusion || '无内容') +
                    '</div></div></div>'
                  );
                })
                .join('')
            : '<div class="empty">尚无保存或提交历史</div>') +
          '</div>')
  );
}
App.v37ReportBody = v37ReportBody;

function v37CollectReport() {
  var r = App.v37Record(state.testingSection);
  document.querySelectorAll('[data-v37-report-input]').forEach(function (e) {
    r[e.dataset.v37ReportInput] = e.value;
  });
  return r;
}
App.v37CollectReport = v37CollectReport;

function v37SaveReport(submit) {
  if ((state.v37ReportTab || 'detail') !== 'detail') {
    state.v37ReportTab = 'detail';
    App.render();
    showToast('请在详细信息中保存报告');
    return;
  }
  var r = App.v37CollectReport();
  if (submit && !r.conclusion.trim()) {
    showToast('请先填写测试结论再提交评审', 'warn');
    return;
  }
  r.status = submit ? '待评审' : '草稿';
  r.history.push({
    name: r.name,
    version: r.version,
    owner: r.owner,
    conclusion: r.conclusion,
    status: r.status,
    at: new Date().toLocaleString('zh-CN', { hour12: false }),
  });
  App.render();
  showToast(submit ? '报告已提交评审（Mock），历史记录已更新' : '报告草稿已保存（Mock）');
}
App.v37SaveReport = v37SaveReport;

function v37EmergencyReview() {
  return (
    '<div class="closing-form-section"><h4>模拟审批操作（演示）</h4><p class="mini-note">模拟审批记录，不引入真实权限模型。仅审批中可处理。</p><div class="v35-row"><button class="btn primary" data-v37-emergency="approve" ' +
    (state.closingEmergencyStatus === '审批中' ? '' : 'disabled') +
    '>模拟审批通过</button><button class="btn danger" data-v37-emergency="reject" ' +
    (state.closingEmergencyStatus === '审批中' ? '' : 'disabled') +
    '>模拟审批驳回</button></div></div>'
  );
}

function v37ReleaseVersions() {
  App.closingInit();
  var r = state.v37Published && state.v37Published[state.projectId],
    d = typeof v35Store !== 'undefined' && v35Store[state.projectId];
  return (
    '<section class="closing-panel"><div class="closing-panel-head"><div><h3>版本发布</h3><p>发布评审 / 文档归档 / 版本发布 · Mock 演示</p></div></div><div class="closing-form"><div class="notice">当前项目：' +
    esc(project().name) +
    '。发布节点独立于结项，正式版本和紧急下发均记录状态。</div><div class="kv-grid"><div class="kv"><label>版本</label><div>V2.6</div></div><div class="kv"><label>代码检视移交</label><div>' +
    (d && d.handoff ? '已移交' : '待移交') +
    '</div></div><div class="kv"><label>文档归档</label><div>' +
    ((state.closingArchiveRecords || []).every(function (x) {
      return x.status === '已归档';
    })
      ? '已归档'
      : '尚有待归档项') +
    '</div></div></div><div class="form-foot"><button class="btn" data-v37-publish="review">提交发布评审</button><button class="btn primary" data-v37-publish="publish" ' +
    (state.v37PublishReview && state.v37PublishReview[state.projectId] === '已通过'
      ? ''
      : 'disabled') +
    '>执行版本发布</button></div><div class="mini-note">发布评审仅为 Mock 审批，未要求真实系统接口；项目结项仍单独处理。</div><p>发布审批：' +
    esc((state.v37PublishReview || {})[state.projectId] || '待提交') +
    ' · 发布状态：' +
    esc(r ? r.status : '待发布') +
    '</p></div></section>'
  );
}
App.v37ReleaseVersions = v37ReleaseVersions;

/** V37 测试报告 / 紧急下发评审 / 发布版本 */
export function initReportVersioning() {
  document.addEventListener('click', function (e) {
    var tab = e.target.closest('[data-v37-report-tab]');
    if (tab) {
      e.preventDefault();
      e.stopPropagation();
      if (state.v37ReportTab === 'detail') App.v37CollectReport();
      state.v37ReportTab = tab.dataset.v37ReportTab;
      var inDrawer = !!tab.closest('#drawer');
      if (inDrawer)
        document.querySelector('#drawerBody').innerHTML = App.v37ReportBody(state.testingSection);
      else App.render();
      return;
    }
    var b = e.target.closest('[data-v37-report-action]');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    var action = b.dataset.v37ReportAction;
    if (action === 'new') {
      var r = App.v37Record(b.dataset.section);
      r.name = App.testingReportInfo(b.dataset.section)[0];
      r.conclusion = '';
      r.status = '草稿';
      openTestingReportDrawer(b.dataset.section);
      return;
    }
    if (action === 'close') {
      closeDrawer();
      return;
    }
    if (action === 'save' || action === 'submit') {
      App.v37SaveReport(action === 'submit');
      closeDrawer();
      return;
    }
  });
  v37OldEmergency = App.closingEmergencyForm;
  App.closingEmergencyForm = function () {
    return v37OldEmergency().replace(
      '<div class="closing-form-actions">',
      v37EmergencyReview() + '<div class="closing-form-actions">',
    );
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-v37-emergency]');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    if (state.closingEmergencyStatus !== '审批中') {
      showToast('请先提交紧急发布审批', 'warn');
      return;
    }
    state.closingEmergencyStatus = b.dataset.v37Emergency === 'approve' ? '已通过' : '已拒绝';
    App.render();
    showToast('模拟审批结果：' + state.closingEmergencyStatus);
  });
  v37OldClosingSubnav = App.closingSubnav;
  App.closingSubnav = function () {
    return v37OldClosingSubnav().replace(
      '</aside>',
      '<button class="' +
        (state.closingSection === 'versions' ? 'active' : '') +
        '" data-closing-page-action="section" data-closing-section="versions">版本发布</button></aside>',
    );
  };
  v37OldClosingRender = App.renderClosing;
  App.renderClosing = function () {
    if (state.closingSection === 'versions')
      return (
        '<div class="closing-reference-page"><div class="closing-stage-layout">' +
        App.closingSubnav() +
        '<main class="closing-main">' +
        App.v37ReleaseVersions() +
        '</main></div></div>'
      );
    return v37OldClosingRender();
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-v37-publish]');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    if (!state.v37PublishReview) state.v37PublishReview = {};
    if (!state.v37Published) state.v37Published = {};
    if (b.dataset.v37Publish === 'review') {
      state.v37PublishReview[state.projectId] = '已通过';
      App.render();
      showToast('发布评审模拟通过');
      return;
    }
    if (state.v37PublishReview[state.projectId] !== '已通过') {
      showToast('请先完成发布评审', 'warn');
      return;
    }
    state.v37Published[state.projectId] = {
      status: '已发布',
      at: new Date().toLocaleString('zh-CN'),
    };
    App.render();
    showToast('版本已模拟发布（Mock）');
  });
}
