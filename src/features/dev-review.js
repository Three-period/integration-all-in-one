/** 开发阶段与 AI 代码检视（V35/V44-V46）：冒烟、自测、Commit、AI 检视与裁定。 */
import { App } from '../core/app.js';
import { closeDrawer, openDrawer, openModal } from '../components/overlays.js';
import { showToast } from '../components/toast.js';
import { esc } from '../core/dom.js';
import { project, state } from '../store/state.js';

/* V35: Same-task, same-developer, same-commit mock lifecycle for development & review. */
export const v35Store = Object.create(null);

export function v35Data() {
  var id = state.projectId || 'thermal';
  if (!v35Store[id])
    v35Store[id] = {
      task: 'TASK-142',
      developer: '孙宁',
      role: 'developer',
      tab: 'dev',
      repo: project().repo,
      branch: 'release/v2.6',
      commit: '',
      commits: [],
      smokes: [],
      selfTests: [],
      inspections: [],
      prep: null,
      formalRequest: null,
      runs: [],
      issues: [],
      manual: [],
      disputes: [],
      approval: null,
      handoff: false,
      section: 'overview',
      reviewMode: 'todos',
      reviewIssue: '',
      log: [],
      seq: 0,
      smokeResult: '通过',
      smokeText: '关键链路启动与基本功能检查完成。',
      selfText: '已覆盖主要功能及异常分支，测试结果符合预期。',
      selfComments: [],
      selfFrozen: false,
      aiMode: 'issues',
    };
  return v35Store[id];
}

export function v35Log(t) {
  var d = v35Data();
  d.log.unshift({
    text: t,
    at: new Date().toLocaleString('zh-CN', { hour12: false }),
    commit: d.commit || '—',
  });
}

export function v35E(s) {
  return esc(s == null ? '' : s);
}

export function v35Stamp() {
  return new Date().toLocaleString('zh-CN', { hour12: false });
}

function v35Find(list) {
  var d = v35Data();
  return list
    .slice()
    .reverse()
    .find(function (r) {
      return r.commit === d.commit && r.owner === d.developer;
    });
}

function v44Prep() {
  var d = v35Data();
  if (!d.prep || d.prep.owner !== d.developer)
    d.prep = { owner: d.developer, smoke: null, self: null };
  return d.prep;
}

function v35Ready() {
  var d = v35Data(),
    p = v44Prep();
  var owner = d.commits.find(function (c) {
    return c.commit === d.commit && c.owner === d.developer;
  });
  var smoke = !!(owner && v35Find(d.smokes)),
    self = !!(owner && v35Find(d.selfTests));
  return {
    smoke: smoke,
    self: self,
    commit: !!d.commit && !!owner,
    stageSmoke: !!p.smoke,
    stageSelf: !!p.self,
  };
}
App.v35Ready = v35Ready;

function v44StageReady() {
  var p = v44Prep();
  return { smoke: !!p.smoke, self: !!p.self };
}

export function v35Latest() {
  var d = v35Data();
  return d.runs
    .slice()
    .reverse()
    .find(function (r) {
      return r.commit === d.commit;
    });
}

export function v35Pending() {
  var d = v35Data();
  return d.issues.filter(function (i) {
    return !['已关闭', '授权例外'].includes(i.status);
  });
}

/* V46: a new Commit with acknowledged fixes is a reinspection, not another first inspection. */
function v46IsRecheck() {
  var d = v35Data();
  return !!(
    d.commit &&
    d.issues.some(function (i) {
      return i.source === 'AI 检视' && i.status === '待复检' && i.commit !== d.commit;
    })
  );
}
App.v46IsRecheck = v46IsRecheck;

function v46AiModePicker() {
  var repeat = App.v46IsRecheck();
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

function v45AiClear() {
  var r = v35Latest();
  return !!(
    r &&
    r.result === '完成' &&
    r.checks.every(function (c) {
      return c.result === '通过';
    }) &&
    v35Pending().length === 0
  );
}

export function v35FormalReady() {
  var d = v35Data();
  return !!(v45AiClear() && d.formalRequest && d.formalRequest.commit === d.commit);
}

export function v35Badge(label, cl) {
  return '<span class="v35-badge ' + (cl || '') + '">' + v35E(label) + '</span>';
}

export function v35Btn(label, act, attrs, cl) {
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

function v35ShellTitle(d) {
  return (
    '<div class="v35-head"><div><h2>开发阶段 · ' +
    (d.role === 'developer' ? '开发工程师' : '检视工程师') +
    '工作台</h2><div class="v35-sub">项目：' +
    v35E(project().name) +
    ' · 任务：' +
    v35E(d.task) +
    ' · 演示数据（不连接真实 GitLab、AI 或测试系统）</div></div><div class="v35-tools"><label>演示角色 <select class="input" data-v35-change="role"><option value="developer" ' +
    (d.role === 'developer' ? 'selected' : '') +
    '>开发工程师</option><option value="reviewer" ' +
    (d.role === 'reviewer' ? 'selected' : '') +
    '>检视工程师</option></select></label><label>责任开发人 <select class="input" data-v35-change="developer">' +
    ['孙宁', '李明', '何盈']
      .map(function (n) {
        return '<option ' + (n === d.developer ? 'selected' : '') + '>' + n + '</option>';
      })
      .join('') +
    '</select></label></div></div>'
  );
}
App.v35ShellTitle = v35ShellTitle;

function v35SummaryCard(title, status, note, type, badge) {
  return (
    '<section class="v35-card" data-v35="open" data-kind="' +
    type +
    '" role="button" tabindex="0" aria-label="打开' +
    title +
    '详情"><div class="v35-card-head"><strong>' +
    title +
    '</strong>' +
    v35Badge(badge === 'ok' ? '已就绪' : '待处理', badge) +
    '</div><div style="font-size:11px;font-weight:650">' +
    v35E(status) +
    '</div><div class="v35-card-note">' +
    v35E(note) +
    '</div><div class="v35-card-foot"><span class="v35-mini">点击查看 / 操作</span>' +
    v35Btn('打开详情', 'open', 'data-kind="' + type + '"', 'primary') +
    '</div></section>'
  );
}
App.v35SummaryCard = v35SummaryCard;

export function v35Panel(title, body, actions) {
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

function v35Drawer(title, body, foot) {
  openDrawer(
    title,
    '<div class="v35-root">' + body + '</div>',
    '<div class="v35-drawer-foot">' + (foot || v35Btn('关闭', 'close')) + '</div>',
  );
}

function v35Repo() {
  var d = v35Data();
  v35Drawer(
    '代码仓库关联 · 当前版本',
    v35Panel(
      'GitLab / 分支 / Commit',
      '<div class="v35-notice">GitLab 提交为 Mock 数据。必须先获取冒烟方案、填写冒烟结果并提交自测报告，再提交新 Commit；提交时统一绑定这两项记录。旧版本记录保留历史，不替代新版本。</div><div class="v35-field"><label>代码仓库 URL</label><input id="v35Repo" value="' +
        v35E(d.repo) +
        '"></div><div class="v35-field"><label>当前分支</label><input id="v35Branch" value="' +
        v35E(d.branch) +
        '"></div><div class="v35-field"><label>当前 Commit（输入新的提交 SHA / 版本号）</label><input id="v35Commit" placeholder="例如 a7d42f1" value="' +
        v35E(d.commit) +
        '"></div><div class="v35-row">' +
        v35Btn(
          '模拟新 Commit',
          'generate-commit',
          v44StageReady().self ? '' : 'disabled title="须先完成冒烟、自测"',
          'primary',
        ) +
        v35Btn(
          '提交 Commit / 保存关联',
          'save-repo',
          v44StageReady().self ? '' : 'disabled title="须先完成冒烟、自测"',
        ) +
        v35Btn('打开仓库（Mock）', 'repo-link') +
        '</div>',
    ) +
      v35Panel(
        'Commit 历史',
        '<div class="v35-list">' +
          (d.commits.length
            ? d.commits
                .map(function (x) {
                  return (
                    '<div class="v35-list-item">' +
                    v35Badge(
                      x.commit === d.commit ? '当前' : '历史',
                      x.commit === d.commit ? 'ok' : '',
                    ) +
                    ' <b>' +
                    v35E(x.commit) +
                    '</b> · ' +
                    v35E(x.owner) +
                    ' <span class="v35-mini">' +
                    v35E(x.at) +
                    '</span></div>'
                  );
                })
                .join('')
            : '<div class="v35-empty">尚无模拟 Commit</div>') +
          '</div>',
      ),
  );
}

function v35Self() {
  var d = v35Data(),
    record = v44Prep().self || v35Find(d.selfTests);
  v35Drawer(
    '自测报告 · 在线编写',
    v35Panel(
      '自测报告正文',
      '<div class="v35-notice">当前责任人 ' +
        v35E(d.developer) +
        ' · 自测报告在提交 Commit 前完成，提交后再关联当前版本。</div><div class="v35-field"><label>自测结论（支持在线编辑）</label><div id="v35SelfEditor" contenteditable="true" style="border:1px solid #d6deeb;min-height:130px;padding:12px;line-height:1.7;border-radius:5px" aria-label="自测报告在线编辑">' +
        v35E(record ? record.text : d.selfText) +
        '</div><div class="v35-row">' +
        v35Btn('引用选中文字', 'self-quote') +
        v35Btn(d.selfFrozen ? '解冻评论' : '冻结评论', 'self-freeze') +
        '</div><div class="v35-field" style="margin-top:10px"><label>在线评论（Mock）</label><textarea id="v35SelfComment" placeholder="选中文字后引用，再填写评论" ' +
        (d.selfFrozen ? 'disabled' : '') +
        '></textarea></div>' +
        v35Btn('添加评论', 'self-comment', d.selfFrozen ? 'disabled' : '') +
        '<div class="v35-list" style="margin-top:9px">' +
        d.selfComments
          .map(function (c) {
            return (
              '<div class="v35-list-item"><b>' +
              v35E(c.owner) +
              ' · ' +
              v35E(c.at) +
              '</b><p>引用：' +
              v35E(c.quote || '全文') +
              '</p><p>' +
              v35E(c.text) +
              '</p></div>'
            );
          })
          .join('') +
        '</div></div><div class="v35-row">' +
        v35Btn('保存草稿', 'save-self') +
        v35Btn(
          '提交自测报告',
          'submit-self',
          v44Prep().smoke ? '' : 'disabled title="须先完成冒烟测试"',
          'primary',
        ) +
        '</div>',
    ) +
      v35Panel(
        '自测报告版本历史',
        d.selfTests.length
          ? d.selfTests
              .slice()
              .reverse()
              .map(function (x) {
                return (
                  '<div class="v35-list-item"><b>' +
                  v35E(x.commit) +
                  '</b> ' +
                  v35Badge(
                    x.commit === d.commit ? '当前版本' : '历史版本',
                    x.commit === d.commit ? 'ok' : '',
                  ) +
                  ' · ' +
                  v35E(x.owner) +
                  ' · ' +
                  v35E(x.at) +
                  '<p>' +
                  v35E(x.text) +
                  '</p></div>'
                );
              })
              .join('')
          : '<div class="v35-empty">尚无已提交自测报告</div>',
      ),
  );
}

function v35Smoke() {
  var d = v35Data(),
    record = v44Prep().smoke || v35Find(d.smokes);
  v35Drawer(
    '冒烟测试 · 执行记录',
    v35Panel(
      '平台测试方案（Mock）',
      '<div class="v35-notice">依据规格书，测试组提前确定测试路径。此处记录第 1 步冒烟测试，完成后才允许填写自测报告；提交 Commit 时关联同一责任人与当前版本。</div><div class="v35-list"><div class="v35-list-item"><strong>SMK-01 基础启动与服务可用性</strong><p>预期：应用正常启动，核心服务可用。</p></div><div class="v35-list-item"><strong>SMK-02 核心功能链路</strong><p>预期：设备连接、数据上报与断线恢复基本可用。</p></div></div><div class="v35-field"><label>执行结果</label><select id="v35SmokeResult"><option ' +
        ((record ? record.result : d.smokeResult) === '通过' ? 'selected' : '') +
        '>通过</option><option ' +
        ((record ? record.result : d.smokeResult) === '失败' ? 'selected' : '') +
        '>失败</option><option ' +
        ((record ? record.result : d.smokeResult) === '待确认' ? 'selected' : '') +
        '>待确认</option></select></div><div class="v35-field"><label>执行记录 / 测试结论</label><textarea id="v35SmokeText">' +
        v35E(record ? record.text : d.smokeText) +
        '</textarea></div><div class="v35-row">' +
        v35Btn('提交冒烟测试记录', 'submit-smoke', '', 'primary') +
        '</div><div class="v35-notice warn">冒烟结果失败是否阻断 AI 申请，业务规则尚未确认。本原型仅校验该 Commit 已完成记录，不擅自将“通过”设为强制条件。</div>',
    ) +
      v35Panel(
        '历史冒烟记录',
        d.smokes.length
          ? d.smokes
              .slice()
              .reverse()
              .map(function (x) {
                return (
                  '<div class="v35-list-item"><b>' +
                  v35E(x.commit) +
                  '</b> · ' +
                  v35E(x.owner) +
                  ' · ' +
                  v35Badge(x.result, x.result === '通过' ? 'ok' : 'bad') +
                  '<p>' +
                  v35E(x.text) +
                  '</p></div>'
                );
              })
              .join('')
          : '<div class="v35-empty">暂无记录</div>',
      ),
  );
}

function v35CheckCard(c) {
  return (
    '<div class="v35-list-item"><strong>' +
    v35E(c.name) +
    ' ' +
    v35Badge(c.result, c.result === '通过' ? 'ok' : c.result === '失败' ? 'bad' : 'warn') +
    '</strong><p>' +
    v35E(c.detail) +
    '</p></div>'
  );
}

function v35AI() {
  var d = v35Data(),
    r = v35Latest(),
    ready = App.v35Ready(),
    can = ready.smoke && ready.self && ready.commit;
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
        ['① 冒烟', ready.smoke],
        ['② 自测', ready.self],
        ['③ Commit', ready.commit],
      ]
        .map(function (x) {
          return v35Badge(x[0] + (x[1] ? ' ✓' : ' ✕'), x[1] ? 'ok' : 'warn');
        })
        .join(' ') +
      '</div>' +
      v46AiModePicker() +
      '<div class="v35-row">' +
      v35Btn(
        '提交 AI 检视申请',
        'request-ai',
        can ? '' : 'disabled title="须同一人员依次完成冒烟、自测、Commit 并绑定同一版本"',
        'primary',
      ) +
      '</div>' +
      (r
        ? v35Panel(
            '当前检视批次 ' + v35E(r.id) + ' · ' + v35E(r.commit),
            '<div class="v35-list">' +
              r.checks.map(v35CheckCard).join('') +
              '</div><div class="v35-notice">AI 执行完成不等于问题已闭环，正式人工检视必须等待所有问题处理完毕。</div>',
          )
        : '<div class="v35-empty">尚无 AI 检视批次。完成三个准入步骤后可模拟申请。</div>') +
      (d.approval
        ? v35Panel(
            '开发提交拟提测版本',
            '<div class="v35-notice">检视工程师已确认通过：' +
              v35E(d.approval.commit) +
              '。开发工程师提交拟提测版本，必须与通过版本一致。</div><div class="v35-field"><label>拟提测 Commit</label><input id="v35HandoffCommit" value="' +
              v35E(d.commit) +
              '"></div>' +
              v35Btn('校验版本并移交测试', 'handoff', '', 'primary'),
          )
        : '');
  if (d.section === 'issues') {
    var pending = v35Pending().slice().reverse(),
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
          v35Btn('批量认可整改', 'batch-fix') +
          v35Btn('批量提交异议', 'batch-dispute', '', 'primary') +
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
                    v35E(i.id) +
                    '" ' +
                    (d.v45Selection && d.v45Selection.includes(i.id) ? 'checked' : '') +
                    '>'
                  : '<span style="width:18px"></span>') +
                '<strong>' +
                v35E(i.title) +
                '</strong>' +
                v35Badge(i.status, i.status === '待复检' ? '' : 'warn') +
                '</div><div class="v35-mini">' +
                v35E(i.id) +
                ' · ' +
                v35E(i.source) +
                ' · ' +
                v35E(i.commit) +
                ' · ' +
                v35E(i.run) +
                '</div><p>依据：' +
                v35E(i.evidence) +
                '</p>' +
                (i.dispute ? '<p><b>开发异议：</b>' + v35E(i.dispute) + '</p>' : '') +
                (i.reply ? '<p><b>检视反馈：</b>' + v35E(i.reply) + '</p>' : '') +
                '</div>'
              );
            })
            .join('')
        : '<div class="v35-empty">当前没有待处理问题。</div>') +
      '</div>' +
      (!pending.length && v45AiClear()
        ? '<div class="v35-notice">最新 AI 检视有效完成，且问题处理页已清空。请由开发人员主动提交人工检视申请。</div><div class="v35-row">' +
          v35Btn(
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
        ? v35Panel(
            '已闭环问题历史（不占用处理列表）',
            '<div class="v35-list">' +
              history
                .map(function (i) {
                  return (
                    '<div class="v35-list-item"><b>' +
                    v35E(i.id) +
                    ' · ' +
                    v35E(i.title) +
                    '</b> ' +
                    v35Badge(i.status, 'ok') +
                    '<p>' +
                    v35E(i.reply || '已闭环') +
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
                v35E(run.id) +
                ' · ' +
                v35E(run.commit) +
                ' ' +
                v35Badge(run.result, run.result === '完成' ? 'ok' : 'bad') +
                '</strong><p>' +
                v35E(run.at) +
                ' · 规则版本 ' +
                v35E(run.ruleVersion) +
                '</p></div>'
              );
            })
            .join('')
        : '<div class="v35-empty">暂无检视记录</div>') +
      '</div>' +
      v35Panel(
        '操作记录',
        '<div class="v35-timeline">' +
          (d.log.length
            ? d.log
                .slice(0, 16)
                .map(function (l) {
                  return (
                    '<div>' +
                    v35E(l.text) +
                    '<small>' +
                    v35E(l.at) +
                    ' · ' +
                    v35E(l.commit) +
                    '</small></div>'
                  );
                })
                .join('')
            : '暂无记录') +
          '</div>',
      );
  v35Drawer('AI 检视报告 · ' + v35E(d.task), tabs + content);
}
App.v35AI = v35AI;

function v35Reviewer(d) {
  var disputes = d.issues.filter(function (i) {
      return i.status === '异议待裁定' || i.status === '待线下评审';
    }),
    formal = v35FormalReady(),
    rechecks = d.issues.filter(function (i) {
      return i.source === '人工检视' && i.status === '待人工复核';
    });
  var counts =
    '正式检视 ' +
    (formal ? '1' : '0') +
    ' / 开发异议 ' +
    disputes.length +
    ' / 人工复核 ' +
    rechecks.length;
  var nav =
    '<div class="v35-row" style="margin-bottom:12px">' +
    v35Btn('检视待办', 'rev-mode', 'data-mode="todos"', d.reviewMode === 'todos' ? 'primary' : '') +
    v35Btn(
      '异议处理',
      'rev-mode',
      'data-mode="disputes"',
      d.reviewMode === 'disputes' ? 'primary' : '',
    ) +
    v35Btn(
      '专业检视',
      'rev-mode',
      'data-mode="formal"',
      d.reviewMode === 'formal' ? 'primary' : '',
    ) +
    v35Btn('准出确认', 'rev-mode', 'data-mode="exit"', d.reviewMode === 'exit' ? 'primary' : '') +
    '<span class="v35-spacer v35-mini">' +
    counts +
    '</span></div>';
  var content = '';
  if (d.reviewMode === 'todos')
    content = v35Panel(
      '检视任务列表（共享开发侧问题与状态）',
      '<div class="v35-list">' +
        disputes
          .map(function (i) {
            return (
              '<button class="v35-todo" data-v35="open-dispute" data-id="' +
              i.id +
              '"><span><b>开发异议 · ' +
              v35E(i.title) +
              '</b><small style="display:block">' +
              v35E(i.id) +
              ' · ' +
              v35E(i.commit) +
              '</small></span>' +
              v35Badge(i.status, 'warn') +
              '</button>'
            );
          })
          .join('') +
        (formal
          ? '<button class="v35-todo" data-v35="rev-mode" data-mode="formal"><span><b>正式专业检视 · ' +
            v35E(d.task) +
            '</b><small style="display:block">当前 Commit：' +
            v35E(d.commit) +
            '</small></span>' +
            v35Badge('待检视', 'ok') +
            '</button>'
          : '<div class="v35-notice warn">R3 待办尚未生成：须最新 AI 检视有效完成、问题处理页清空，且开发主动提交人工检视。R2 异议可提前处理。</div>') +
        rechecks
          .map(function (i) {
            return (
              '<button class="v35-todo" data-v35="rev-mode" data-mode="formal"><span><b>人工复核 · ' +
              v35E(i.title) +
              '</b></span>' +
              v35Badge(i.status, 'warn') +
              '</button>'
            );
          })
          .join('') +
        '</div>',
    );
  if (d.reviewMode === 'disputes')
    content = v35Panel(
      'R2 开发异议与裁定',
      disputes.length
        ? disputes
            .map(function (i) {
              return (
                '<div class="v35-issue"><h4>' +
                v35E(i.title) +
                ' ' +
                v35Badge(i.status, 'warn') +
                '</h4><p><b>AI 原问题：</b>' +
                v35E(i.evidence) +
                '</p><p><b>开发异议：</b>' +
                v35E(i.dispute || '待补充') +
                '</p><div class="v35-field"><label>裁定意见 / 执行要求</label><textarea id="v35Verdict-' +
                i.id +
                '" placeholder="说明处理依据与明确的下一步行动">' +
                v35E(i.verdict || '') +
                '</textarea></div><div class="v35-row">' +
                v35Btn('应整改', 'verdict', 'data-id="' + i.id + '" data-result="fix"') +
                v35Btn(
                  'AI误报 / 合理例外',
                  'verdict',
                  'data-id="' + i.id + '" data-result="exception"',
                ) +
                v35Btn('转线下评审', 'offline', 'data-id="' + i.id + '"') +
                '</div>' +
                (i.status === '待线下评审'
                  ? '<div class="v35-field" style="margin-top:10px"><label>线下会议纪要（Mock 上传说明）</label><textarea id="v35Minutes-' +
                    i.id +
                    '" placeholder="会议时间、参会人、结论摘要"></textarea><label>最终可执行裁定</label><select id="v35OfflineDecision-' +
                    i.id +
                    '"><option value="">请选择裁定结果</option><option value="fix">应整改</option><option value="exception">AI误报 / 授权例外</option></select>' +
                    v35Btn('保存纪要并裁定', 'offline-save', 'data-id="' + i.id + '"', 'primary') +
                    '</div>'
                  : '') +
                '</div>'
              );
            })
            .join('')
        : '<div class="v35-empty">当前没有开发异议待办</div>',
    );
  if (d.reviewMode === 'formal') content = App.v35Formal(d);
  if (d.reviewMode === 'exit') content = App.v35Exit(d);
  return nav + content;
}
App.v35Reviewer = v35Reviewer;

function v35Formal(d) {
  var formal = v35FormalReady(),
    checks = [
      ['高风险必查', '关键调用 / 异常处理'],
      ['AI 未有效覆盖', '范围遗漏与不确定项'],
      ['独立抽检', '开发实现独立复核'],
    ];
  return (
    '<div class="v35-notice ' +
    (formal ? '' : 'warn') +
    '">' +
    (formal
      ? '开发已提交正式人工检视申请，可进行专业检视。'
      : '尚未收到开发提交的 R3 正式人工检视申请；可查看检查框架，但不可提交人工结论。') +
    '</div><div class="v35-review-3">' +
    v35Panel(
      '① 检查范围',
      checks
        .map(function (c) {
          return (
            '<div class="v35-list-item"><b>' +
            c[0] +
            '</b><p>' +
            c[1] +
            '</p>' +
            v35Badge(
              d.manual.some(function (x) {
                return x.kind === c[0] && x.commit === d.commit;
              })
                ? '已记录'
                : '待检视',
              d.manual.some(function (x) {
                return x.kind === c[0] && x.commit === d.commit;
              })
                ? 'ok'
                : 'warn',
            ) +
            '</div>'
          );
        })
        .join(''),
    ) +
    v35Panel(
      '② 方案 / 代码证据',
      '<div class="v35-list-item"><b>当前 Commit</b><p><button class="v43-evidence-link" data-v43="commit" ' +
        (d.commit ? '' : 'disabled') +
        '>' +
        v35E(d.commit || '尚未提交') +
        ' ↗</button></p><small class="v43-evidence-note">' +
        v35E(d.repo || '模拟 GitLab 仓库') +
        ' · 点击访问仓库（Mock）</small></div><div class="v35-list-item"><b>设计依据</b><p>软件规格书 V1.3 / 关联方案文档（Mock）</p><button class="v43-evidence-link" data-v43="design">查看设计依据与文档目录 ›</button></div><div class="v35-list-item"><b>AI 对照结果</b><p>先保存当前 Commit 的独立抽检结论，再查看 AI 对照结果。</p>' +
        v35Btn(
          '查看 AI 四类检查',
          'show-ai-manual',
          d.commit &&
            d.manual.some(function (x) {
              return x.kind === '独立抽检' && x.commit === d.commit;
            })
            ? ''
            : 'disabled',
        ) +
        '</div>',
    ) +
    v35Panel(
      '③ 人工判断与新增问题',
      '<div class="v35-field"><label>检查类型</label><select id="v35ManualKind">' +
        checks
          .map(function (x) {
            return '<option>' + x[0] + '</option>';
          })
          .join('') +
        '</select></div><div class="v35-field"><label>独立检查结论</label><select id="v35ManualResult"><option>无新增问题</option><option>发现问题</option></select></div><div class="v35-field"><label>结论依据 / 新增问题描述</label><textarea id="v35ManualText" placeholder="写明证据或人工发现的问题"></textarea></div>' +
        v35Btn('保存人工检视记录', 'save-manual', formal ? '' : 'disabled', 'primary') +
        '<div class="v35-notice">人工新增问题会直接同步回开发侧 AI 报告的问题处理列表。整改后需新 Commit、重测与复检。</div>',
    ) +
    '</div>'
  );
}
App.v35Formal = v35Formal;

function v35Exit(d) {
  var r = v35Latest(),
    checks = [
      [
        '当前 Commit 有完整 AI 四类结果',
        !!r &&
          r.result === '完成' &&
          r.checks.every(function (c) {
            return c.result === '通过';
          }),
      ],
      ['所有 AI / 人工问题闭环', v35Pending().length === 0],
      [
        '三类人工检查已完成',
        ['高风险必查', 'AI 未有效覆盖', '独立抽检'].every(function (k) {
          return d.manual.some(function (m) {
            return m.kind === k && m.commit === d.commit && m.result === '无新增问题';
          });
        }),
      ],
      ['准出 Commit 与当前版本一致', !!d.commit && !!r && r.commit === d.commit],
    ];
  var ok = checks.every(function (x) {
    return x[1];
  });
  return v35Panel(
    'R4 最终准出 · 检视工程师确认',
    '<div class="v35-list">' +
      checks
        .map(function (c) {
          return (
            '<div class="v35-check">' +
            v35Badge(c[1] ? '通过' : '阻断', c[1] ? 'ok' : 'bad') +
            ' <span>' +
            c[0] +
            '</span></div>'
          );
        })
        .join('') +
      '</div><div class="v35-notice">检视通过不等于测试已开始。通过后还需由开发提交拟提测 Commit，并校验与检视通过版本一致。</div><div class="v35-row">' +
      v35Btn('确认检视通过', 'approve', ok ? '' : 'disabled', 'primary') +
      '</div>' +
      (d.approval
        ? '<div class="v35-notice">已确认：' +
          v35E(d.approval.commit) +
          ' · ' +
          v35E(d.approval.at) +
          '。请开发工程师从 AI 报告卡片提交拟提测 Commit。</div>'
        : ''),
  );
}
App.v35Exit = v35Exit;

export function v35Refresh() {
  App.render();
}

function v35Issue(id) {
  return v35Data().issues.find(function (x) {
    return x.id === id;
  });
}

function v35ApplyVerdict(i, result, comment) {
  i.verdict = comment;
  i.reply = (result === 'fix' ? '裁定应整改：' : '裁定为误报 / 授权例外：') + comment;
  i.status = result === 'fix' ? '待整改' : '授权例外';
  v35Log('检视工程师已裁定 ' + i.id + '：' + i.status);
}

function v35PerformAi(mode) {
  var d = v35Data(),
    ready = App.v35Ready();
  if (!(ready.commit && ready.smoke && ready.self)) {
    showToast('准入失败：须依次完成冒烟、自测和 Commit', 'warn');
    return;
  }
  var recheck = App.v46IsRecheck(),
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
    at: v35Stamp(),
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
      i.recheckedAt = v35Stamp();
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
  v35Log((recheck ? '整改复检' : '首次检视') + ' AI 申请，产生 ' + id + '（' + run.result + '）');
  d.section = 'issues';
  v35Refresh();
  App.v35AI();
  showToast(
    recheck && mode === 'pass'
      ? 'AI 复检通过，旧问题已关闭；可提交人工检视'
      : recheck && mode === 'issues'
        ? 'AI 复检仍存在问题，请继续整改'
        : '已生成 ' + id + '，可在问题处理页查看',
  );
}
App.v35PerformAi = v35PerformAi;

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
    var d = v35Data(),
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
        ? v35Pending()
            .filter(function (i) {
              return ['待整改', '待处理'].includes(i.status);
            })
            .map(function (i) {
              return i.id;
            })
        : [];
      App.v35AI();
      return;
    }
  });
  document.addEventListener('change', function (e) {
    var el = e.target.closest('[data-v35-change]');
    if (!el || state.lifecycleStage !== 'development') return;
    var d = v35Data();
    d[el.dataset.v35Change] = el.value;
    d.reviewMode = 'todos';
    v35Refresh();
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-v35]');
    if (!b || state.lifecycleStage !== 'development') return;
    e.preventDefault();
    e.stopPropagation();
    var d = v35Data(),
      act = b.dataset.v35,
      id = b.dataset.id,
      issue = v35Issue(id);
    if (b.disabled) return;
    if (act === 'close') {
      closeDrawer();
      return;
    }
    if (act === 'switch-role') {
      d.role = b.dataset.role;
      d.reviewMode = 'todos';
      v35Refresh();
      return;
    }
    if (act === 'view-dev') {
      d.role = 'developer';
      v35Refresh();
      return;
    }
    if (act === 'view-review') {
      d.role = 'reviewer';
      v35Refresh();
      return;
    }
    if (act === 'open') {
      ({ repo: v35Repo, self: v35Self, smoke: v35Smoke, ai: App.v35AI })[b.dataset.kind]();
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
        p = v44Prep();
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
      d.commits.push({ commit: commit, owner: owner, at: v35Stamp() });
      d.smokes.push(Object.assign({}, p.smoke, { commit: commit, owner: owner }));
      d.selfTests.push(Object.assign({}, p.self, { commit: commit, owner: owner }));
      d.prep = { owner: owner, smoke: null, self: null };
      d.v47NeedsNewCommit = false;
      d.formalRequest = null;
      d.approval = null;
      d.handoff = false;
      d.section = 'overview';
      v35Log('完成冒烟、自测并提交 Commit：' + commit);
      closeDrawer();
      v35Refresh();
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
      v35Self();
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
        at: v35Stamp(),
      });
      d.selfQuote = '';
      v35Self();
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
      let p = v44Prep();
      if (!p.smoke) {
        showToast('请先完成冒烟测试', 'warn');
        return;
      }
      p.self = { text: text, at: v35Stamp(), result: '已提交' };
      v35Log('完成自测报告（等待提交 Commit）');
      closeDrawer();
      v35Refresh();
      showToast('自测报告已提交，下一步请提交 Commit');
      return;
    }
    if (act === 'submit-smoke') {
      let p = v44Prep(),
        res = document.querySelector('#v35SmokeResult').value,
        txt = document.querySelector('#v35SmokeText').value.trim();
      p.smoke = { result: res, text: txt, at: v35Stamp() };
      p.self = null;
      v35Log('提交冒烟测试记录：' + res + '（等待自测）');
      closeDrawer();
      v35Refresh();
      showToast('冒烟记录已提交，下一步请填写自测报告');
      return;
    }

    if (act === 'ai-section') {
      d.section = b.dataset.section;
      App.v35AI();
      return;
    }
    if (act === 'request-ai') {
      App.v35PerformAi(document.querySelector('#v35AiMode').value);
      return;
    }
    if (act === 'request-formal') {
      if (!v45AiClear()) {
        showToast('须先完成有效 AI 检视并清空所有未闭环问题', 'warn');
        return;
      }
      d.formalRequest = { commit: d.commit, at: v35Stamp(), owner: d.developer };
      d.reviewMode = 'todos';
      v35Log('开发人员主动提交 R3 正式人工检视申请：' + d.commit);
      d.section = 'issues';
      App.v35AI();
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
        i.acknowledgedAt = v35Stamp();
        i.fixedAt = v35Stamp();
      });
      d.v47NeedsNewCommit = true;
      d.prep = { owner: d.developer, smoke: null, self: null };
      d.v45Selection = [];
      v35Log('批量认可整改 ' + items.length + ' 项，待新 Commit AI 复检');
      App.v35AI();
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
      issue.fixedAt = v35Stamp();
      d.v47NeedsNewCommit = true;
      d.prep = { owner: d.developer, smoke: null, self: null };
      v35Log('开发确认整改 ' + id + '，待新 Commit AI 复检');
      App.v35AI();
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
                v35E(i.id) +
                ' · ' +
                v35E(i.title) +
                '</b><p>' +
                v35E(i.evidence) +
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
          i.disputeAt = v35Stamp();
          i.disputeOwner = d.developer;
          i.disputeBatch = batch;
          count++;
        }
      });
      d.v45Selection = [];
      d.v45DisputeIds = [];
      v35Log('开发批量提交异议 ' + batch + '：' + count + ' 项，已生成 R2 异议待办');
      var modal = document.getElementById('modalRoot');
      if (modal) {
        modal.classList.remove('show');
        modal.innerHTML = '';
      }
      d.section = 'issues';
      App.v35AI();
      showToast('异议已提交，检视工程师收到 ' + count + ' 条 R2 待办，未进入正式检视');
      return;
    }

    if (act === 'rev-mode') {
      d.reviewMode = b.dataset.mode;
      v35Refresh();
      return;
    }
    if (act === 'open-dispute') {
      d.reviewMode = 'disputes';
      v35Refresh();
      return;
    }
    if (act === 'verdict') {
      var opinion = (document.getElementById('v35Verdict-' + id) || {}).value || '';
      if (!opinion.trim()) {
        showToast('请先填写可执行裁定意见', 'warn');
        return;
      }
      v35ApplyVerdict(issue, b.dataset.result, opinion.trim());
      v35Refresh();
      return;
    }
    if (act === 'offline') {
      issue.status = '待线下评审';
      v35Log('异议 ' + id + ' 转线下评审');
      v35Refresh();
      return;
    }
    if (act === 'offline-save') {
      var note = (document.getElementById('v35Minutes-' + id) || {}).value || '',
        decision = (document.getElementById('v35OfflineDecision-' + id) || {}).value || '';
      if (!note.trim() || !decision) {
        showToast('纪要与最终裁定均不能为空', 'warn');
        return;
      }
      d.disputes.push({ issue: id, minutes: note, decision: decision, at: v35Stamp() });
      v35ApplyVerdict(issue, decision, note);
      v35Refresh();
      return;
    }
    if (act === 'save-manual') {
      if (!v35FormalReady()) {
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
      d.manual.push({ kind: kind, commit: d.commit, result: result, text: txt, at: v35Stamp() });
      if (result === '发现问题') {
        d.issues.push({
          id: 'ISS-' + String(d.issues.length + 1).padStart(3, '0'),
          source: '人工检视',
          title: txt.slice(0, 60),
          evidence: '检视工程师独立检查：' + kind,
          commit: d.commit,
          run: v35Latest().id,
          status: '待整改',
          reply: '',
        });
      }
      v35Log('人工检视：' + kind + ' · ' + result);
      v35Refresh();
      showToast('人工结论已保存' + (result === '发现问题' ? '，问题已回传开发侧' : ''));
      return;
    }
    if (act === 'show-ai-manual') {
      App.v43OpenAiResults();
      return;
    }
    if (act === 'approve') {
      if (
        !v35FormalReady() ||
        !['高风险必查', 'AI 未有效覆盖', '独立抽检'].every(function (k) {
          return d.manual.some(function (x) {
            return x.kind === k && x.commit === d.commit && x.result === '无新增问题';
          });
        })
      ) {
        showToast('准出门禁尚未满足', 'warn');
        return;
      }
      d.approval = { commit: d.commit, at: v35Stamp(), reviewer: '检视工程师' };
      v35Log('检视工程师确认准出');
      v35Refresh();
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
      v35Log('拟提测 Commit 一致，已模拟移交测试阶段');
      state.lifecycleStage = 'testing';
      App.render();
      showToast('版本校验通过，已进入测试阶段（Mock）');
      return;
    }
  });
}
