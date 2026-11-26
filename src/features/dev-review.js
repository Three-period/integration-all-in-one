/** 开发阶段与 AI 代码检视（V35/V44-V46）：冒烟、自测、Commit、AI 检视与裁定。 */
import { getDevPrep, getDevReview } from '../store/lifecycle.js';
import { App } from '../core/app.js';
import { closeDrawer, openDrawer, openModal } from '../components/overlays.js';
import { showToast } from '../components/toast.js';
import { esc } from '../core/dom.js';
import {
  aiRequestCheck,
  devReadiness,
  findCurrentRecord as findCurrentRecordRule,
  isAiReviewClear as isAiReviewClearRule,
  isFormalReviewReady as isFormalReviewReadyRule,
  latestRun,
  pendingIssues as pendingIssuesRule,
} from '../domain/dev-review.js';
import { isRecheckRun as isRecheckRunRule } from '../domain/review-gates.js';
import { syncHandoff } from './version-anchor.js';
import { state } from '../store/state.js';

/* V35: Same-task, same-developer, same-commit mock lifecycle for development & review. */

export function logDevEvent(t) {
  var d = getDevReview();
  d.log.unshift({
    text: t,
    at: new Date().toLocaleString('zh-CN', { hour12: false }),
    commit: d.commit || '—',
  });
}

export function escText(s) {
  return esc(s == null ? '' : s);
}

export function nowStamp() {
  return new Date().toLocaleString('zh-CN', { hour12: false });
}

function findCurrentRecord(list) {
  return findCurrentRecordRule(getDevReview(), list);
}

/** 当前项目提交 AI 检视的准入状态（规则见 domain/dev-review.js）。 */
export function getDevReadiness() {
  var dev = getDevReview();
  return devReadiness(dev, getDevPrep());
}

function getPrepReadiness() {
  var p = getDevPrep();
  return { smoke: !!p.smoke, self: !!p.self };
}

export function latestAiRun() {
  return latestRun(getDevReview());
}

export function pendingIssues() {
  return pendingIssuesRule(getDevReview());
}

/* V46: a new Commit with acknowledged fixes is a reinspection, not another first inspection. */
export function isRecheckRun() {
  return isRecheckRunRule(getDevReview());
}

function renderAiModePicker() {
  var repeat = isRecheckRun();
  return (
    '<div class="v35-field"><label>模拟 AI 执行结果（仅演示）</label><select id="v35AiMode">' +
    (repeat
      ? '<option value="pass">自动复检通过（默认：关闭已整改问题）</option><option value="issues">异常演示：复检仍存在问题</option><option value="fail">AI 执行失败 / 无法判断</option>'
      : '<option value="issues">首次检视：生成待整改问题（默认）</option><option value="pass">四类检查通过（无问题）</option><option value="fail">AI 执行失败 / 无法判断</option>') +
    '</select><div class="v35-mini">' +
    (repeat
      ? '已识别到新 Commit 对应的待复检问题；默认自动模拟复检成功。若需演示复检失败，可切换异常场景。'
      : '首次检视默认返回 Mock 问题；整改完成后使用新 Commit 再次申请将自动切换为复检。') +
    '</div></div>'
  );
}

function isAiReviewClear() {
  return isAiReviewClearRule(getDevReview());
}

export function isFormalReviewReady() {
  return isFormalReviewReadyRule(getDevReview());
}

export function devBadge(label, cl) {
  return '<span class="v35-badge ' + (cl || '') + '">' + escText(label) + '</span>';
}

export function devButton(label, act, attrs, cl) {
  return (
    '<button class="btn ' +
    (cl || '') +
    '" data-v35="' +
    act +
    '" ' +
    (attrs || '') +
    '>' +
    label +
    '</button>'
  );
}

function renderDevSummaryCard(title, status, note, type, badge) {
  if (type === 'repo' && getDevReview().v47NeedsNewCommit) {
    status = '待提交 · 整改新 Commit';
    badge = 'warn';
  }
  return (
    '<section class="v35-card" data-v35="open" data-kind="' +
    type +
    '" role="button" tabindex="0" aria-label="打开' +
    title +
    '详情"><div class="v35-card-head"><strong>' +
    title +
    '</strong>' +
    devBadge(badge === 'ok' ? '已就绪' : '待处理', badge) +
    '</div><div style="font-size:11px;font-weight:650">' +
    escText(status) +
    '</div><div class="v35-card-note">' +
    escText(note) +
    '</div><div class="v35-card-foot"><span class="v35-mini">点击查看 / 操作</span>' +
    devButton('打开详情', 'open', 'data-kind="' + type + '"', 'primary') +
    '</div></section>'
  );
}
App.renderDevSummaryCard = renderDevSummaryCard;

export function devPanel(title, body, actions) {
  return (
    '<section class="v35-panel"><div class="v35-panel-head"><h3>' +
    title +
    '</h3>' +
    (actions || '') +
    '</div><div class="v35-panel-body">' +
    body +
    '</div></section>'
  );
}

function openDevDrawer(title, body, foot) {
  openDrawer(
    title,
    '<div class="v35-root">' + body + '</div>',
    '<div class="v35-drawer-foot">' + (foot || devButton('关闭', 'close')) + '</div>',
  );
}

function openRepoDrawer() {
  var d = getDevReview();
  openDevDrawer(
    '代码仓库关联 · 当前版本',
    devPanel(
      'GitLab / 分支 / Commit',
      '<div class="v35-notice">GitLab 提交为 Mock 数据。必须先获取冒烟方案、填写冒烟结果并提交自测报告，再提交新 Commit；提交时统一绑定这两项记录。旧版本记录保留历史，不替代新版本。</div><div class="v35-field"><label>代码仓库 URL</label><input id="v35Repo" value="' +
        escText(d.repo) +
        '"></div><div class="v35-field"><label>当前分支</label><input id="v35Branch" value="' +
        escText(d.branch) +
        '"></div><div class="v35-field"><label>当前 Commit（输入新的提交 SHA / 版本号）</label><input id="v35Commit" placeholder="例如 a7d42f1" value="' +
        escText(d.commit) +
        '"></div><div class="v35-row">' +
        devButton(
          '模拟新 Commit',
          'generate-commit',
          getPrepReadiness().self ? '' : 'disabled title="须先完成冒烟、自测"',
          'primary',
        ) +
        devButton(
          '提交 Commit / 保存关联',
          'save-repo',
          getPrepReadiness().self ? '' : 'disabled title="须先完成冒烟、自测"',
        ) +
        devButton('打开仓库（Mock）', 'repo-link') +
        '</div>',
    ) +
      devPanel(
        'Commit 历史',
        '<div class="v35-list">' +
          (d.commits.length
            ? d.commits
                .map(function (x) {
                  return (
                    '<div class="v35-list-item">' +
                    devBadge(
                      x.commit === d.commit ? '当前' : '历史',
                      x.commit === d.commit ? 'ok' : '',
                    ) +
                    ' <b>' +
                    escText(x.commit) +
                    '</b> · ' +
                    escText(x.owner) +
                    ' <span class="v35-mini">' +
                    escText(x.at) +
                    '</span></div>'
                  );
                })
                .join('')
            : '<div class="v35-empty">尚无模拟 Commit</div>') +
          '</div>',
      ),
  );
}

function openSelfTestDrawer() {
  var d = getDevReview(),
    record = getDevPrep().self || findCurrentRecord(d.selfTests);
  openDevDrawer(
    '自测报告 · 在线编写',
    devPanel(
      '自测报告正文',
      '<div class="v35-notice">当前责任人 ' +
        escText(d.developer) +
        ' · 自测报告在提交 Commit 前完成，提交后再关联当前版本。</div><div class="v35-field"><label>自测结论（支持在线编辑）</label><div id="v35SelfEditor" contenteditable="true" style="border:1px solid #d6deeb;min-height:130px;padding:12px;line-height:1.7;border-radius:5px" aria-label="自测报告在线编辑">' +
        escText(record ? record.text : d.selfText) +
        '</div><div class="v35-row">' +
        devButton('引用选中文字', 'self-quote') +
        devButton(d.selfFrozen ? '解冻评论' : '冻结评论', 'self-freeze') +
        '</div><div class="v35-field" style="margin-top:10px"><label>在线评论（Mock）</label><textarea id="v35SelfComment" placeholder="选中文字后引用，再填写评论" ' +
        (d.selfFrozen ? 'disabled' : '') +
        '></textarea></div>' +
        devButton('添加评论', 'self-comment', d.selfFrozen ? 'disabled' : '') +
        '<div class="v35-list" style="margin-top:9px">' +
        d.selfComments
          .map(function (c) {
            return (
              '<div class="v35-list-item"><b>' +
              escText(c.owner) +
              ' · ' +
              escText(c.at) +
              '</b><p>引用：' +
              escText(c.quote || '全文') +
              '</p><p>' +
              escText(c.text) +
              '</p></div>'
            );
          })
          .join('') +
        '</div></div><div class="v35-row">' +
        devButton('保存草稿', 'save-self') +
        devButton(
          '提交自测报告',
          'submit-self',
          getDevPrep().smoke ? '' : 'disabled title="须先完成冒烟测试"',
          'primary',
        ) +
        '</div>',
    ) +
      devPanel(
        '自测报告版本历史',
        d.selfTests.length
          ? d.selfTests
              .slice()
              .reverse()
              .map(function (x) {
                return (
                  '<div class="v35-list-item"><b>' +
                  escText(x.commit) +
                  '</b> ' +
                  devBadge(
                    x.commit === d.commit ? '当前版本' : '历史版本',
                    x.commit === d.commit ? 'ok' : '',
                  ) +
                  ' · ' +
                  escText(x.owner) +
                  ' · ' +
                  escText(x.at) +
                  '<p>' +
                  escText(x.text) +
                  '</p></div>'
                );
              })
              .join('')
          : '<div class="v35-empty">尚无已提交自测报告</div>',
      ),
  );
}

function openSmokeDrawer() {
  var d = getDevReview(),
    record = getDevPrep().smoke || findCurrentRecord(d.smokes);
  openDevDrawer(
    '冒烟测试 · 执行记录',
    devPanel(
      '平台测试方案（Mock）',
      '<div class="v35-notice">依据规格书，测试组提前确定测试路径。此处记录第 1 步冒烟测试，完成后才允许填写自测报告；提交 Commit 时关联同一责任人与当前版本。</div><div class="v35-list"><div class="v35-list-item"><strong>SMK-01 基础启动与服务可用性</strong><p>预期：应用正常启动，核心服务可用。</p></div><div class="v35-list-item"><strong>SMK-02 核心功能链路</strong><p>预期：设备连接、数据上报与断线恢复基本可用。</p></div></div><div class="v35-field"><label>执行结果</label><select id="v35SmokeResult"><option ' +
        ((record ? record.result : d.smokeResult) === '通过' ? 'selected' : '') +
        '>通过</option><option ' +
        ((record ? record.result : d.smokeResult) === '失败' ? 'selected' : '') +
        '>失败</option><option ' +
        ((record ? record.result : d.smokeResult) === '待确认' ? 'selected' : '') +
        '>待确认</option></select></div><div class="v35-field"><label>执行记录 / 测试结论</label><textarea id="v35SmokeText">' +
        escText(record ? record.text : d.smokeText) +
        '</textarea></div><div class="v35-row">' +
        devButton('提交冒烟测试记录', 'submit-smoke', '', 'primary') +
        '</div><div class="v35-notice warn">冒烟结果为“通过”才能申请 AI 检视；“失败”或“待确认”需修复后重新执行冒烟。</div>',
    ) +
      devPanel(
        '历史冒烟记录',
        d.smokes.length
          ? d.smokes
              .slice()
              .reverse()
              .map(function (x) {
                return (
                  '<div class="v35-list-item"><b>' +
                  escText(x.commit) +
                  '</b> · ' +
                  escText(x.owner) +
                  ' · ' +
                  devBadge(x.result, x.result === '通过' ? 'ok' : 'bad') +
                  '<p>' +
                  escText(x.text) +
                  '</p></div>'
                );
              })
              .join('')
          : '<div class="v35-empty">暂无记录</div>',
      ),
  );
}

function renderCheckCard(c) {
  return (
    '<div class="v35-list-item"><strong>' +
    escText(c.name) +
    ' ' +
    devBadge(c.result, c.result === '通过' ? 'ok' : c.result === '失败' ? 'bad' : 'warn') +
    '</strong><p>' +
    escText(c.detail) +
    '</p></div>'
  );
}

function openAiReviewDrawer() {
  var d = getDevReview(),
    r = latestAiRun(),
    ready = getDevReadiness(),
    check = aiRequestCheck(ready),
    can = check.ok;
  var tabs =
    '<div class="v35-section-tabs">' +
    [
      ['overview', '检视概览'],
      ['issues', '问题处理'],
      ['history', '历史与反馈'],
    ]
      .map(function (x) {
        return (
          '<button data-v35="ai-section" data-section="' +
          x[0] +
          '" class="' +
          (d.section === x[0] ? 'active' : '') +
          '">' +
          x[1] +
          '</button>'
        );
      })
      .join('') +
    '</div>';
  var content = '';
  if (d.section === 'overview')
    content =
      '<div class="v35-notice">准入校验：' +
      [
        ['① 冒烟通过', ready.smokePassed],
        ['② 自测', ready.self],
        ['③ Commit', ready.commit],
      ]
        .map(function (x) {
          return devBadge(x[0] + (x[1] ? ' ✓' : ' ✕'), x[1] ? 'ok' : 'warn');
        })
        .join(' ') +
      '</div>' +
      renderAiModePicker() +
      '<div class="v35-row">' +
      devButton(
        '提交 AI 检视申请',
        'request-ai',
        can ? '' : 'disabled title="' + escText(check.reason) + '"',
        'primary',
      ) +
      '</div>' +
      (can ? '' : '<div class="v35-notice warn">' + escText(check.reason) + '</div>') +
      (r
        ? devPanel(
            '当前检视批次 ' + escText(r.id) + ' · ' + escText(r.commit),
            '<div class="v35-list">' +
              r.checks.map(renderCheckCard).join('') +
              '</div><div class="v35-notice">AI 执行完成不等于问题已闭环，正式人工检视必须等待所有问题处理完毕。</div>',
          )
        : '<div class="v35-empty">尚无 AI 检视批次。完成三个准入步骤后可模拟申请。</div>') +
      (d.approval
        ? devPanel(
            '开发提交拟提测版本',
            '<div class="v35-notice">检视工程师已确认通过：' +
              escText(d.approval.commit) +
              '。开发工程师提交拟提测版本，必须与通过版本一致。</div><div class="v35-field"><label>拟提测 Commit</label><input id="v35HandoffCommit" value="' +
              escText(d.commit) +
              '"></div>' +
              devButton('校验版本并移交测试', 'handoff', '', 'primary'),
          )
        : '');
  if (d.section === 'issues') {
    var pending = pendingIssues().slice().reverse(),
      history = d.issues
        .filter(function (i) {
          return ['已关闭', '授权例外'].includes(i.status);
        })
        .slice()
        .reverse();
    var actionable = pending.filter(function (i) {
      return ['待整改', '待处理'].includes(i.status);
    });
    var allSelection =
      actionable.length &&
      actionable.every(function (i) {
        return d.v45Selection && d.v45Selection.includes(i.id);
      });
    content =
      '<div class="v35-notice">本页仅列未闭环问题；已完成复检或有效异议裁定的条目移入下方历史。批量认可后问题直接变灰并进入「待复检」，修改代码、重新冒烟及自测、提交新 Commit 后默认模拟复检通过；异议立即生成 R2 待办，不开启 R3 正式检视。</div>' +
      (actionable.length
        ? '<div class="v35-row" style="margin:10px 0"><label><input type="checkbox" data-v45-all ' +
          (allSelection ? 'checked' : '') +
          '> 全选可处理问题</label><span class="v35-mini">勾选需统一处理的问题</span>' +
          devButton('批量认可整改', 'batch-fix') +
          devButton('批量提交异议', 'batch-dispute', '', 'primary') +
          '</div>'
        : '') +
      '<div class="v35-list">' +
      (pending.length
        ? pending
            .map(function (i) {
              var editable = ['待整改', '待处理'].includes(i.status);
              return (
                '<div class="v35-issue ' +
                (i.status === '待复检' ? 'v45-muted' : '') +
                '"><div class="v35-row" style="align-items:center">' +
                (editable
                  ? '<input type="checkbox" data-v45-issue="' +
                    escText(i.id) +
                    '" ' +
                    (d.v45Selection && d.v45Selection.includes(i.id) ? 'checked' : '') +
                    '>'
                  : '<span style="width:18px"></span>') +
                '<strong>' +
                escText(i.title) +
                '</strong>' +
                devBadge(i.status, i.status === '待复检' ? '' : 'warn') +
                '</div><div class="v35-mini">' +
                escText(i.id) +
                ' · ' +
                escText(i.source) +
                ' · ' +
                escText(i.commit) +
                ' · ' +
                escText(i.run) +
                '</div><p>依据：' +
                escText(i.evidence) +
                '</p>' +
                (i.dispute ? '<p><b>开发异议：</b>' + escText(i.dispute) + '</p>' : '') +
                (i.reply ? '<p><b>检视反馈：</b>' + escText(i.reply) + '</p>' : '') +
                '</div>'
              );
            })
            .join('')
        : '<div class="v35-empty">当前没有待处理问题。</div>') +
      '</div>' +
      (!pending.length && isAiReviewClear()
        ? '<div class="v35-notice">最新 AI 检视有效完成，且问题处理页已清空。请由开发人员主动提交人工检视申请。</div><div class="v35-row">' +
          devButton(
            d.formalRequest && d.formalRequest.commit === d.commit
              ? '已提交人工检视'
              : '提交人工检视',
            'request-formal',
            d.formalRequest && d.formalRequest.commit === d.commit ? 'disabled' : '',
            'primary',
          ) +
          '</div>'
        : !pending.length
          ? '<div class="v35-notice warn">暂无待处理问题，但最新 AI 检视尚未有效完成，不能提交人工检视。</div>'
          : '') +
      (history.length
        ? devPanel(
            '已闭环问题历史（不占用处理列表）',
            '<div class="v35-list">' +
              history
                .map(function (i) {
                  return (
                    '<div class="v35-list-item"><b>' +
                    escText(i.id) +
                    ' · ' +
                    escText(i.title) +
                    '</b> ' +
                    devBadge(i.status, 'ok') +
                    '<p>' +
                    escText(i.reply || '已闭环') +
                    '</p></div>'
                  );
                })
                .join('') +
              '</div>',
          )
        : '');
  }

  if (d.section === 'history')
    content =
      '<h4>检视批次历史</h4><div class="v35-list">' +
      (d.runs.length
        ? d.runs
            .slice()
            .reverse()
            .map(function (run) {
              return (
                '<div class="v35-list-item"><strong>' +
                escText(run.id) +
                ' · ' +
                escText(run.commit) +
                ' ' +
                devBadge(run.result, run.result === '完成' ? 'ok' : 'bad') +
                '</strong><p>' +
                escText(run.at) +
                ' · 规则版本 ' +
                escText(run.ruleVersion) +
                '</p></div>'
              );
            })
            .join('')
        : '<div class="v35-empty">暂无检视记录</div>') +
      '</div>' +
      devPanel(
        '操作记录',
        '<div class="v35-timeline">' +
          (d.log.length
            ? d.log
                .slice(0, 16)
                .map(function (l) {
                  return (
                    '<div>' +
                    escText(l.text) +
                    '<small>' +
                    escText(l.at) +
                    ' · ' +
                    escText(l.commit) +
                    '</small></div>'
                  );
                })
                .join('')
            : '暂无记录') +
          '</div>',
      );
  openDevDrawer('AI 检视报告 · ' + escText(d.task), tabs + content);
}
App.openAiReviewDrawer = openAiReviewDrawer;

export function refreshDevView() {
  App.render();
}

function findIssue(id) {
  return getDevReview().issues.find(function (x) {
    return x.id === id;
  });
}

function applyReviewVerdict(i, result, comment) {
  i.verdict = comment;
  i.reply = (result === 'fix' ? '裁定应整改：' : '裁定为误报 / 授权例外：') + comment;
  i.status = result === 'fix' ? '待整改' : '授权例外';
  logDevEvent('检视工程师已裁定 ' + i.id + '：' + i.status);
}

function performAiReview(mode) {
  var d = getDevReview(),
    check = aiRequestCheck(getDevReadiness());
  if (!check.ok) {
    showToast(check.reason, 'warn');
    return;
  }
  var recheck = isRecheckRun(),
    recheckIssues = d.issues.filter(function (i) {
      return i.source === 'AI 检视' && i.status === '待复检' && i.commit !== d.commit;
    });
  var id = 'AI-' + String(++d.seq).padStart(3, '0');
  var names = ['文件一致性', '文件正确性', '方案与代码一致性', '点检项检查'];
  var checks = names.map(function (name, i) {
    var fail = mode === 'fail' && i === 2;
    return {
      name: name,
      result: fail ? '执行失败' : '通过',
      detail: fail
        ? '模拟执行异常，需重新执行并核实结果。'
        : '已根据 GitLab、方案文档与点检规则库完成模拟检查。',
    };
  });
  var run = {
    id: id,
    commit: d.commit,
    at: nowStamp(),
    ruleVersion: 'RULE-1.0',
    result: mode === 'fail' ? '执行失败' : '完成',
    checks: checks,
    owner: d.developer,
  };
  d.runs.push(run);
  if (mode === 'issues' && !recheck) {
    var samples = [
      ['异常分支缺少状态回收处理', '点检项 R-017：重连失败的异常状态未覆盖。'],
      ['错误日志缺少追踪标识', '代码规范 N-021：关键错误日志应输出关联追踪标识。'],
      ['局部函数超过建议长度', '点检项 R-025：部分函数长度超出建议阈值。'],
      ['设备断线场景与设计依据不一致', '方案一致性 D-009：断线后的重试间隔与规格书不一致。'],
      ['重复逻辑未抽取', '点检项 R-031：不同模块存在重复条件判断。'],
      ['接口异常未完整返回错误码', '代码规范 N-013：服务失败未统一返回错误码。'],
    ];
    samples.forEach(function (sample) {
      d.issues.push({
        id: 'ISS-' + String(d.issues.length + 1).padStart(3, '0'),
        source: 'AI 检视',
        title: sample[0],
        commit: d.commit,
        run: id,
        evidence: sample[1] + '（Mock）',
        status: '待整改',
        dispute: '',
        reply: '',
      });
    });
  }
  if (recheck && mode === 'pass') {
    recheckIssues.forEach(function (i) {
      i.status = '已关闭';
      i.recheckedAt = nowStamp();
      i.recheckedCommit = d.commit;
      i.reply =
        (i.reply || '') + '；经 ' + id + '（' + d.commit + '）AI 复检通过，确认该问题整改闭环。';
    });
  } else if (recheck && mode === 'issues') {
    recheckIssues.forEach(function (i) {
      i.status = '待整改';
      i.acknowledged = false;
      i.reply =
        (i.reply || '') + '；经 ' + id + '（' + d.commit + '）复检，问题仍存在，请继续整改。';
      i.failedRecheckCommit = d.commit;
    });
  }
  // A failed or uncertain AI run cannot silently close a previously reported issue.

  d.formalRequest = null;
  d.approval = null;
  d.handoff = false;
  d.v45Selection = [];
  logDevEvent(
    (recheck ? '整改复检' : '首次检视') + ' AI 申请，产生 ' + id + '（' + run.result + '）',
  );
  d.section = 'issues';
  refreshDevView();
  App.openAiReviewDrawer();
  showToast(
    recheck && mode === 'pass'
      ? 'AI 复检通过，旧问题已关闭；可提交人工检视'
      : recheck && mode === 'issues'
        ? 'AI 复检仍存在问题，请继续整改'
        : '已生成 ' + id + '，可在问题处理页查看',
  );
}
App.performAiReview = performAiReview;

/** V35/V45/V46 开发与 AI 检视 */
export function initDevReview() {
  document.addEventListener('keydown', function (e) {
    if (
      (e.key !== 'Enter' && e.key !== ' ') ||
      state.view !== 'project-lifecycle' ||
      state.lifecycleStage !== 'development'
    )
      return;
    var card = e.target.closest('.v35-card[data-v35="open"]');
    if (!card || e.target !== card) return;
    e.preventDefault();
    card.click();
  });
  /* V45: batch problem selection in the AI report drawer. */
  document.addEventListener('change', function (e) {
    if (state.lifecycleStage !== 'development') return;
    var d = getDevReview(),
      t = e.target;
    if (t.matches('[data-v45-issue]')) {
      var id = t.dataset.v45Issue;
      d.v45Selection = d.v45Selection || [];
      if (t.checked && !d.v45Selection.includes(id)) d.v45Selection.push(id);
      if (!t.checked)
        d.v45Selection = d.v45Selection.filter(function (x) {
          return x !== id;
        });
      return;
    }
    if (t.matches('[data-v45-all]')) {
      d.v45Selection = t.checked
        ? pendingIssues()
            .filter(function (i) {
              return ['待整改', '待处理'].includes(i.status);
            })
            .map(function (i) {
              return i.id;
            })
        : [];
      App.openAiReviewDrawer();
      return;
    }
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-v35]');
    if (!b || state.lifecycleStage !== 'development') return;
    e.preventDefault();
    e.stopPropagation();
    var d = getDevReview(),
      act = b.dataset.v35,
      id = b.dataset.id,
      issue = findIssue(id);
    if (b.disabled) return;
    if (act === 'close') {
      closeDrawer();
      return;
    }
    if (act === 'open') {
      ({
        repo: openRepoDrawer,
        self: openSelfTestDrawer,
        smoke: openSmokeDrawer,
        ai: App.openAiReviewDrawer,
      })[b.dataset.kind]();
      return;
    }
    if (act === 'repo-link') {
      showToast('Mock 仓库：' + d.repo);
      return;
    }
    if (act === 'generate-commit') {
      var el = document.querySelector('#v35Commit');
      if (el) el.value = 'mock-' + Date.now().toString(36).slice(-7);
      showToast('已生成模拟 Commit，请点击保存当前关联');
      return;
    }
    if (act === 'save-repo') {
      let commit = document.querySelector('#v35Commit').value.trim(),
        owner = d.developer,
        p = getDevPrep();
      if (!commit) {
        showToast('请先填写当前 Commit', 'warn');
        return;
      }
      if (!(p.smoke && p.self)) {
        showToast('请按顺序先完成冒烟测试和自测报告，再提交 Commit', 'warn');
        return;
      }
      if (d.commit === commit) {
        showToast('请使用新的 Commit 编号完成本轮提交', 'warn');
        return;
      }
      if (
        d.commits.some(function (c) {
          return c.commit === commit;
        })
      ) {
        showToast('此 Commit 已存在，请使用新提交编号', 'warn');
        return;
      }
      d.repo = document.querySelector('#v35Repo').value.trim();
      d.branch = document.querySelector('#v35Branch').value.trim();
      d.commit = commit;
      d.commits.push({ commit: commit, owner: owner, at: nowStamp() });
      d.smokes.push(Object.assign({}, p.smoke, { commit: commit, owner: owner }));
      d.selfTests.push(Object.assign({}, p.self, { commit: commit, owner: owner }));
      d.prep = { owner: owner, smoke: null, self: null };
      d.v47NeedsNewCommit = false;
      d.formalRequest = null;
      d.approval = null;
      d.handoff = false;
      d.section = 'overview';
      logDevEvent('完成冒烟、自测并提交 Commit：' + commit);
      closeDrawer();
      refreshDevView();
      showToast('Commit 已提交，冒烟与自测两项记录已绑定');
      return;
    }
    if (act === 'self-quote') {
      var selection = window.getSelection();
      d.selfQuote = selection ? selection.toString().trim() : '';
      showToast(
        d.selfQuote ? '已引用所选文字' : '请先在自测正文中选中文字',
        d.selfQuote ? 'success' : 'warn',
      );
      return;
    }
    if (act === 'self-freeze') {
      d.selfFrozen = !d.selfFrozen;
      openSelfTestDrawer();
      showToast(d.selfFrozen ? '评论已冻结' : '评论已解冻');
      return;
    }
    if (act === 'self-comment') {
      if (d.selfFrozen) return;
      var value = document.querySelector('#v35SelfComment').value.trim();
      if (!value) {
        showToast('请填写评论内容', 'warn');
        return;
      }
      d.selfComments.push({
        owner: d.developer,
        text: value,
        quote: d.selfQuote || '',
        at: nowStamp(),
      });
      d.selfQuote = '';
      openSelfTestDrawer();
      showToast('在线评论已添加');
      return;
    }
    if (act === 'save-self' || act === 'submit-self') {
      var text = document.querySelector('#v35SelfEditor').innerText.trim();
      if (!text) {
        showToast('请填写自测结论', 'warn');
        return;
      }
      d.selfText = text;
      if (act === 'save-self') {
        showToast('自测草稿已保存（Mock）');
        return;
      }
      let p = getDevPrep();
      if (!p.smoke) {
        showToast('请先完成冒烟测试', 'warn');
        return;
      }
      p.self = { text: text, at: nowStamp(), result: '已提交' };
      logDevEvent('完成自测报告（等待提交 Commit）');
      closeDrawer();
      refreshDevView();
      showToast('自测报告已提交，下一步请提交 Commit');
      return;
    }
    if (act === 'submit-smoke') {
      let p = getDevPrep(),
        res = document.querySelector('#v35SmokeResult').value,
        txt = document.querySelector('#v35SmokeText').value.trim();
      p.smoke = { result: res, text: txt, at: nowStamp() };
      p.self = null;
      logDevEvent('提交冒烟测试记录：' + res + '（等待自测）');
      closeDrawer();
      refreshDevView();
      showToast('冒烟记录已提交，下一步请填写自测报告');
      return;
    }

    if (act === 'ai-section') {
      d.section = b.dataset.section;
      App.openAiReviewDrawer();
      return;
    }
    if (act === 'request-ai') {
      App.performAiReview(document.querySelector('#v35AiMode').value);
      return;
    }
    if (act === 'request-formal') {
      if (!isAiReviewClear()) {
        showToast('须先完成有效 AI 检视并清空所有未闭环问题', 'warn');
        return;
      }
      d.formalRequest = { commit: d.commit, at: nowStamp(), owner: d.developer };
      d.reviewMode = 'todos';
      logDevEvent('开发人员主动提交 R3 正式人工检视申请：' + d.commit);
      d.section = 'issues';
      App.openAiReviewDrawer();
      showToast('已提交人工检视，检视工程师已收到 R3 正式待办');
      return;
    }
    if (act === 'batch-fix') {
      let ids = (d.v45Selection || []).slice(),
        items = d.issues.filter(function (i) {
          return ids.includes(i.id) && ['待整改', '待处理'].includes(i.status);
        });
      if (!items.length) {
        showToast('请先勾选需要认可整改的问题', 'warn');
        return;
      }
      items.forEach(function (i) {
        i.status = '待复检';
        i.acknowledged = true;
        i.acknowledgedAt = nowStamp();
        i.fixedAt = nowStamp();
      });
      d.v47NeedsNewCommit = true;
      d.prep = { owner: d.developer, smoke: null, self: null };
      d.v45Selection = [];
      logDevEvent('批量认可整改 ' + items.length + ' 项，待新 Commit AI 复检');
      App.openAiReviewDrawer();
      showToast(
        '已将 ' +
          items.length +
          ' 项置为灰色待复检；修改代码后依次完成冒烟、自测、新 Commit 和 AI 复检',
      );
      return;
    }
    if (act === 'confirm-fix' || act === 'mark-fix') {
      if (!issue) return;
      issue.status = '待复检';
      issue.acknowledged = true;
      issue.fixedAt = nowStamp();
      d.v47NeedsNewCommit = true;
      d.prep = { owner: d.developer, smoke: null, self: null };
      logDevEvent('开发确认整改 ' + id + '，待新 Commit AI 复检');
      App.openAiReviewDrawer();
      showToast('该问题已变灰待复检；请重新冒烟、自测、提交新 Commit 并申请 AI 复检');
      return;
    }
    if (act === 'batch-dispute' || act === 'dispute') {
      let ids = act === 'dispute' ? [id] : (d.v45Selection || []).slice();
      let items = d.issues.filter(function (i) {
        return ids.includes(i.id) && ['待整改', '待处理'].includes(i.status);
      });
      if (!items.length) {
        showToast('请先勾选需要提交异议的问题', 'warn');
        return;
      }
      d.v45DisputeIds = items.map(function (i) {
        return i.id;
      });
      openModal(
        'v45-dev-dispute',
        '批量提交开发异议 · ' + items.length + ' 条问题',
        '<div class="v35-root"><div class="v35-notice">统一填写一份异议说明，一次提交 ' +
          items.length +
          ' 条关联问题；每条问题仍独立进入 R2 异议待办，由检视工程师逐条裁定。不会自动进入 R3。</div><div class="v35-list">' +
          items
            .map(function (i) {
              return (
                '<div class="v35-list-item"><b>' +
                escText(i.id) +
                ' · ' +
                escText(i.title) +
                '</b><p>' +
                escText(i.evidence) +
                '</p></div>'
              );
            })
            .join('') +
          '</div><div class="v35-field"><label>异议说明（必填）</label><textarea id="v45DisputeText" rows="6" placeholder="请说明异议位置、理由、设计依据及建议判定"></textarea></div></div>',
        '<button class="btn" data-action="close-modal">取消</button><button class="btn primary" data-v35="confirm-dispute-batch">确认一次性提交</button>',
      );
      return;
    }
    if (act === 'confirm-dispute-batch' || act === 'confirm-dispute') {
      var field =
          document.getElementById('v45DisputeText') || document.getElementById('v40DisputeText'),
        content = field && field.value.trim();
      if (!content) {
        showToast('请填写具体异议说明后再提交', 'warn');
        if (field) field.focus();
        return;
      }
      let ids = act === 'confirm-dispute' ? [id] : d.v45DisputeIds || [],
        batch = 'DSP-' + String(Date.now()).slice(-8),
        count = 0;
      d.issues.forEach(function (i) {
        if (ids.includes(i.id) && ['待整改', '待处理'].includes(i.status)) {
          i.dispute = content;
          i.status = '异议待裁定';
          i.disputeAt = nowStamp();
          i.disputeOwner = d.developer;
          i.disputeBatch = batch;
          count++;
        }
      });
      d.v45Selection = [];
      d.v45DisputeIds = [];
      logDevEvent('开发批量提交异议 ' + batch + '：' + count + ' 项，已生成 R2 异议待办');
      var modal = document.getElementById('modalRoot');
      if (modal) {
        modal.classList.remove('show');
        modal.innerHTML = '';
      }
      d.section = 'issues';
      App.openAiReviewDrawer();
      showToast('异议已提交，检视工程师收到 ' + count + ' 条 R2 待办，未进入正式检视');
      return;
    }

    if (act === 'rev-mode') {
      d.reviewMode = b.dataset.mode;
      refreshDevView();
      return;
    }
    if (act === 'open-dispute') {
      d.reviewMode = 'disputes';
      refreshDevView();
      return;
    }
    if (act === 'verdict') {
      var opinion = (document.getElementById('v35Verdict-' + id) || {}).value || '';
      if (!opinion.trim()) {
        showToast('请先填写可执行裁定意见', 'warn');
        return;
      }
      applyReviewVerdict(issue, b.dataset.result, opinion.trim());
      refreshDevView();
      return;
    }
    if (act === 'offline') {
      issue.status = '待线下评审';
      logDevEvent('异议 ' + id + ' 转线下评审');
      refreshDevView();
      return;
    }
    if (act === 'offline-save') {
      var note = (document.getElementById('v35Minutes-' + id) || {}).value || '',
        decision = (document.getElementById('v35OfflineDecision-' + id) || {}).value || '';
      if (!note.trim() || !decision) {
        showToast('纪要与最终裁定均不能为空', 'warn');
        return;
      }
      d.disputes.push({ issue: id, minutes: note, decision: decision, at: nowStamp() });
      applyReviewVerdict(issue, decision, note);
      refreshDevView();
      return;
    }
    if (act === 'save-manual') {
      if (!isFormalReviewReady()) {
        showToast('AI 检视尚未正式通过，不能开展专业检视', 'warn');
        return;
      }
      let kind = document.querySelector('#v35ManualKind').value,
        result = document.querySelector('#v35ManualResult').value,
        txt = document.querySelector('#v35ManualText').value.trim();
      if (result === '发现问题' && !txt) {
        showToast('发现问题时必须填写问题内容', 'warn');
        return;
      }
      d.manual = d.manual.filter(function (m) {
        return !(m.kind === kind && m.commit === d.commit);
      });
      d.manual.push({ kind: kind, commit: d.commit, result: result, text: txt, at: nowStamp() });
      if (result === '发现问题') {
        d.issues.push({
          id: 'ISS-' + String(d.issues.length + 1).padStart(3, '0'),
          source: '人工检视',
          title: txt.slice(0, 60),
          evidence: '检视工程师独立检查：' + kind,
          commit: d.commit,
          run: latestAiRun().id,
          status: '待整改',
          reply: '',
        });
      }
      logDevEvent('人工检视：' + kind + ' · ' + result);
      refreshDevView();
      showToast('人工结论已保存' + (result === '发现问题' ? '，问题已回传开发侧' : ''));
      return;
    }
    if (act === 'show-ai-manual') {
      App.openAiResultsEvidence();
      return;
    }
    if (act === 'approve') {
      if (
        !isFormalReviewReady() ||
        !['高风险必查', 'AI 未有效覆盖', '独立抽检'].every(function (k) {
          return d.manual.some(function (x) {
            return x.kind === k && x.commit === d.commit && x.result === '无新增问题';
          });
        })
      ) {
        showToast('准出门禁尚未满足', 'warn');
        return;
      }
      d.approval = { commit: d.commit, at: nowStamp(), reviewer: '检视工程师' };
      syncHandoff();
      logDevEvent('检视工程师确认准出');
      refreshDevView();
      return;
    }
    if (act === 'handoff') {
      if (d.role !== 'developer') {
        showToast('仅开发工程师可以提交拟提测版本', 'warn');
        return;
      }
      let commit = document.querySelector('#v35HandoffCommit').value.trim();
      if (!d.approval || commit !== d.approval.commit || commit !== d.commit) {
        showToast('提测版本与已通过检视的 Commit 不一致，禁止移交', 'warn');
        return;
      }
      d.handoff = true;
      syncHandoff();
      logDevEvent('拟提测 Commit 一致，已模拟移交测试阶段');
      state.lifecycleStage = 'testing';
      App.render();
      showToast('版本校验通过，已进入测试阶段（Mock）');
      return;
    }
  });
}
