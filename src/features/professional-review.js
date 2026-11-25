/** 专业检视（V55）：30/70 卡片布局与 R3 出口流转到测试。 */
import { getDevReview } from '../store/lifecycle.js';
import { App } from '../core/app.js';
import { showToast } from '../components/toast.js';
import {
  devBadge,
  devButton,
  escText,
  logDevEvent,
  devPanel,
  refreshDevView,
  nowStamp,
} from './dev-review.js';
import { logFlowNote } from './lifecycle-flow.js';
import { getHandoffCommit, syncHandoff } from './version-anchor.js';
import { project, state } from '../store/state.js';

/** V55 专业检视 */
export function initProfessionalReview() {
  /* V55.0 professional review: 30/70 cards + deterministic R3 exit to testing.
   * Design document workflow untouched. */

  var kinds = ['高风险必查', 'AI 未有效覆盖', '独立抽检'];
  function latest(d, k) {
    return (
      d.manual
        .slice()
        .reverse()
        .find(function (r) {
          return r.kind === k && r.commit === d.commit;
        }) || null
    );
  }
  function complete(r) {
    return !!(r && ['无新增问题', '规则反馈'].includes(r.result));
  }
  function ensureMockCommit(d) {
    if (!d.commit) {
      var key = String(state.projectId || 'PROJECT').replace(/[^a-zA-Z0-9_-]/g, '-');
      d.commit = 'MOCK-R3-' + key;
      if (!d.commits) d.commits = [];
      if (
        !d.commits.some(function (x) {
          return x.commit === d.commit;
        })
      )
        d.commits.push({
          commit: d.commit,
          owner: d.developer || 'Mock 检视',
          at: nowStamp(),
          mock: true,
        });
      logDevEvent('生成演示用 Mock Commit：' + d.commit);
    }
    return d.commit;
  }
  function all(d) {
    return !!(
      d &&
      d.commit &&
      kinds.every(function (k) {
        return complete(latest(d, k));
      })
    );
  }

  // V55.3: use the platform-wide role as the single source of truth; d.role is only a render mirror.
  function canRecord(d) {
    return !!(d && state.role === 'reviewer');
  }
  function valid(d) {
    return !!(d && state.role === 'reviewer' && all(d));
  }
  function initDraft(d) {
    if (d.v55DraftCommit !== d.commit) {
      d.v55DraftCommit = d.commit;
      d.v55Drafts = {};
      d.v55Tab = kinds[0];
    }
    if (!kinds.includes(d.v55Tab)) d.v55Tab = kinds[0];
    if (!d.v55Drafts[d.v55Tab]) {
      var r = latest(d, d.v55Tab);
      d.v55Drafts[d.v55Tab] = { result: r ? r.result : '', html: r ? r.richHtml || '' : '' };
    }
    return d.v55Drafts[d.v55Tab];
  }
  function capture(d) {
    var draft = initDraft(d),
      editor = document.getElementById('v55Editor');
    if (editor) draft.html = editor.innerHTML;
    var input = document.querySelector('input[name="v55Result"]:checked');
    if (input) draft.result = input.value;
  }
  function esc55(v) {
    return escText(v == null ? '' : v);
  }
  App.renderFormalReview = function (d) {
    ensureMockCommit(d);
    var formal = canRecord(d),
      draft = initDraft(d),
      kind = d.v55Tab,
      r = latest(d, kind);
    var left = devPanel(
      '检视资料',
      '<div class="v55-evidence"><b>Git 仓库 / Commit</b><p><button class="v43-evidence-link" data-v43="commit" ' +
        (d.commit ? '' : 'disabled') +
        '>' +
        esc55(d.commit || '尚无提交') +
        ' ↗</button></p><small>' +
        esc55(d.repo || 'Mock GitLab') +
        ' / ' +
        esc55(d.branch || '—') +
        '</small></div>' +
        '<div class="v55-evidence"><b>设计与需求依据</b><p>软件规格书、架构 / 概要 / 详细设计与关联需求</p><button class="v43-evidence-link" data-v43="design">查看设计依据 ›</button></div>' +
        '<div class="v55-evidence"><b>AI 检视资料</b><p>文件一致性、文件正确性、方案与代码一致性、点检项检查</p>' +
        devButton('查看四项 AI 检视详情', 'show-ai-manual', '') +
        '</div>' +
        '<div class="v55-evidence"><b>当前检视进度</b><p>已通过 ' +
        kinds.filter(function (k) {
          return complete(latest(d, k));
        }).length +
        ' / 3 项</p><small>本轮为 Mock 演示，检视结论绑定演示 Commit。</small></div>',
    );
    var tabs = kinds
      .map(function (k) {
        var x = latest(d, k);
        return (
          '<button type="button" class="v55-tab ' +
          (kind === k ? 'active' : '') +
          '" data-v55="tab" data-kind="' +
          esc55(k) +
          '"><b>' +
          esc55(k) +
          '</b><small>' +
          (!x
            ? '未检查'
            : x.result === '发现问题'
              ? '发现问题'
              : complete(x)
                ? '已通过'
                : '未通过') +
          '</small></button>'
        );
      })
      .join('');
    var radios =
      '<div class="v55-radio"><label><input type="radio" name="v55Result" value="无新增问题" ' +
      (draft.result === '无新增问题' ? 'checked ' : '') +
      (formal ? '' : 'disabled') +
      '>无问题</label>' +
      '<label><input type="radio" name="v55Result" value="发现问题" ' +
      (draft.result === '发现问题' ? 'checked ' : '') +
      (formal ? '' : 'disabled') +
      '>发现问题 / 需要修改</label>' +
      '<label><input type="radio" name="v55Result" value="规则反馈" ' +
      (draft.result === '规则反馈' ? 'checked ' : '') +
      (formal ? '' : 'disabled') +
      '>规则反馈</label></div>';
    var format = [
      ['p', '正文'],
      ['h2', '二级标题'],
      ['h3', '三级标题'],
      ['bold', '加粗'],
      ['italic', '斜体'],
      ['insertUnorderedList', '列表'],
    ]
      .map(function (x) {
        return (
          '<button type="button" data-v55="format" data-format="' +
          x[0] +
          '" ' +
          (formal && ['发现问题', '规则反馈'].includes(draft.result) ? '' : 'disabled') +
          '>' +
          x[1] +
          '</button>'
        );
      })
      .join('');
    var right = devPanel(
      '人工检视',
      '<div class="v55-tabs">' +
        tabs +
        '</div><div class="v55-subtitle"><b>' +
        esc55(kind) +
        '</b> ' +
        (r
          ? devBadge('已记录 · ' + r.result, r.result === '发现问题' ? 'warn' : 'ok')
          : devBadge('待检视', 'warn')) +
        '</div>' +
        radios +
        '<div class="v55-detail ' +
        (['发现问题', '规则反馈'].includes(draft.result) ? '' : 'hidden') +
        '"><label>' +
        (draft.result === '规则反馈'
          ? '规则反馈内容（必填）'
          : '问题描述、证据与修改要求（必填）') +
        '</label>' +
        '<div class="v55-format">' +
        format +
        '</div><div id="v55Editor" class="v55-editor" contenteditable="' +
        (formal && ['发现问题', '规则反馈'].includes(draft.result) ? 'true' : 'false') +
        '">' +
        (draft.html || '') +
        '</div></div>' +
        '<div class="v55-save"><button class="btn primary" data-v55="save" ' +
        (formal ? '' : 'disabled') +
        '>保存本项检视结论</button></div>' +
        '<div class="v35-notice">三项均保存为「无问题」或「规则反馈」即可通过准出；任一项「发现问题」或未完成均阻断。</div>',
    );
    return (
      '<div class="v35-notice ' +
      (formal ? '' : 'warn') +
      '">' +
      (formal
        ? 'Mock 专业检视已开放，当前演示 Commit：' + esc55(d.commit)
        : '请切换至检视工程师角色') +
      '</div>' +
      '<div class="v55-review-grid"><div>' +
      left +
      '</div><div>' +
      right +
      '</div></div>'
    );
  };
  App.renderExitGate = function (d) {
    var gates = [
      [
        '高风险检视：无问题 / 规则反馈',
        !!latest(d, '高风险必查') && complete(latest(d, '高风险必查')),
      ],
      [
        'AI 未覆盖检视：无问题 / 规则反馈',
        !!latest(d, 'AI 未有效覆盖') && complete(latest(d, 'AI 未有效覆盖')),
      ],
      ['独立抽检：无问题 / 规则反馈', !!latest(d, '独立抽检') && complete(latest(d, '独立抽检'))],
    ];
    return devPanel(
      'R4 准出确认 · 检视工程师',
      '<div class="v35-list">' +
        gates
          .map(function (g) {
            return (
              '<div class="v35-check">' +
              devBadge(g[1] ? '通过' : '阻断', g[1] ? 'ok' : 'bad') +
              ' <span>' +
              esc55(g[0]) +
              '</span></div>'
            );
          })
          .join('') +
        '</div>' +
        '<div class="v35-notice">Mock 演示规则：三项人工检视均保存为「无问题」或「规则反馈」即可确认检视通过并移交测试；任一项发现问题或未完成均阻断。</div>' +
        '<div class="v35-row"><button class="btn primary" data-v55="exit" ' +
        (valid(d) ? '' : 'disabled') +
        '>确认检视通过并进入测试阶段</button></div>' +
        (d.approval
          ? '<div class="v35-notice">已审批 Commit：' +
            esc55(d.approval.commit) +
            ' · ' +
            esc55(d.approval.at) +
            '</div>'
          : ''),
    );
  };
  var beforeReviewer = App.renderReviewerWorkspace;
  App.renderReviewerWorkspace = function (d) {
    if (d.reviewMode === 'exit' && !all(d)) d.reviewMode = 'formal';
    return beforeReviewer(d);
  };
  document.addEventListener(
    'click',
    function (e) {
      var go = e.target.closest('[data-v35="rev-mode"][data-mode="exit"]');
      if (!go || state.lifecycleStage !== 'development' || all(getDevReview())) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      showToast('请先完成高风险、AI 未覆盖、独立抽检三项结论', 'warn');
    },
    true,
  );
  document.addEventListener(
    'click',
    function (e) {
      var b = e.target.closest('[data-v55]');
      if (!b || state.lifecycleStage !== 'development') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      var d = getDevReview(),
        act = b.dataset.v55;
      if (act === 'tab') {
        capture(d);
        d.v55Tab = b.dataset.kind;
        refreshDevView();
        return;
      }
      if (act === 'format') {
        let el = document.getElementById('v55Editor');
        if (!el || el.contentEditable !== 'true') return;
        el.focus();
        var x = b.dataset.format;
        document.execCommand(
          ['p', 'h2', 'h3'].includes(x) ? 'formatBlock' : x,
          false,
          ['p', 'h2', 'h3'].includes(x) ? x : null,
        );
        return;
      }
      if (act === 'save') {
        if (!canRecord(d)) {
          showToast('请切换至检视工程师角色后再填写检视结论', 'warn');
          return;
        }
        ensureMockCommit(d);
        capture(d);
        var k = d.v55Tab,
          draft = initDraft(d),
          result = draft.result;
        if (!['无新增问题', '发现问题', '规则反馈'].includes(result)) {
          showToast('请先选择本项检查结果', 'warn');
          return;
        }
        let el = document.getElementById('v55Editor');
        var text = (
          el
            ? el.innerText || el.textContent || ''
            : String(draft.html || '').replace(/<[^>]*>/g, '')
        ).trim();
        if (['发现问题', '规则反馈'].includes(result) && !text) {
          showToast(
            result === '规则反馈'
              ? '规则反馈必须填写具体内容'
              : '发现问题必须填写问题说明与修改内容',
            'warn',
          );
          return;
        }
        d.manual = d.manual.filter(function (x) {
          return !(x.kind === k && x.commit === d.commit);
        });
        d.manual.push({
          kind: k,
          commit: d.commit,
          result: result,
          text: ['发现问题', '规则反馈'].includes(result) ? text : '',
          richHtml: ['发现问题', '规则反馈'].includes(result) ? draft.html : '',
          issueId: '',
          at: nowStamp(),
          feedbackType: result === '规则反馈' ? '规则反馈' : undefined,
        });
        d.v55Drafts[k] = {
          result: result,
          html: ['发现问题', '规则反馈'].includes(result) ? draft.html : '',
        };
        logDevEvent('人工检视记录：' + k + ' · ' + result);
        refreshDevView();
        showToast(
          '已保存' +
            k +
            '的 Mock 检视结论' +
            (result === '发现问题'
              ? '；当前结论阻断准出'
              : result === '规则反馈'
                ? '；规则反馈已记录并计入通过'
                : '；本项已通过'),
        );
        return;
      }
      if (act === 'exit') {
        if (!valid(d)) {
          showToast('准出失败：请确认三项均已保存为「无问题」或「规则反馈」', 'warn');
          return;
        }
        ensureMockCommit(d);
        if (!d.approval || d.approval.commit !== d.commit || !d.handoff) {
          d.approval = { commit: d.commit, at: nowStamp(), reviewer: '检视工程师' };
          d.handoff = true;
          logDevEvent('R3 检视准出通过，正式移交 Commit ' + d.commit + ' 至测试');
          logFlowNote('专业检视准出通过，自动移交 Commit ' + d.commit + ' 至测试');
        }
        syncHandoff();
        if (getHandoffCommit() !== d.commit) {
          showToast('移交版本校验失败，请核对当前 Commit', 'warn');
          return;
        }
        var p = project();
        p.status = '进行中';
        p.flowStatus = '测试阶段';
        p.progress = Math.max(Number(p.progress) || 0, 60);
        state.lifecycleStage = 'testing';
        state.projectSection = 'lifecycle';
        state.view = 'project-lifecycle';
        App.render();
        showToast('三项检视全部通过，已进入测试阶段（Mock）');
        return;
      }
    },
    true,
  );
  document.addEventListener(
    'change',
    function (e) {
      if (!e.target.matches('input[name="v55Result"]') || state.lifecycleStage !== 'development')
        return;
      var d = getDevReview(),
        draft = initDraft(d);
      var editor = document.getElementById('v55Editor');
      if (editor) draft.html = editor.innerHTML;
      draft.result = e.target.value;
      refreshDevView();
    },
    true,
  );
  var css = document.createElement('style');
  css.textContent =
    '.v35-root .v55-review-grid{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,7fr);gap:14px;align-items:start}' +
    '.v35-root .v55-review-grid>div{min-width:0}.v35-root .v55-review-grid .v35-panel{height:100%}' +
    '.v35-root .v55-evidence{padding:12px 0;border-bottom:1px solid #e6eaf0;overflow-wrap:anywhere}' +
    '.v35-root .v55-evidence:first-child{padding-top:0}.v35-root .v55-evidence:last-child{border:0;padding-bottom:0}' +
    '.v35-root .v55-evidence b{font-size:12px}.v35-root .v55-evidence p{font-size:12px;color:#667085;line-height:1.6}' +
    '.v35-root .v55-evidence small{color:#667085;font-size:11px}' +
    '.v35-root .v55-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;border-bottom:1px solid #e6eaf0;padding-bottom:12px}' +
    '.v35-root .v55-tab{min-width:0;border:1px solid #d8e0e9;background:#f8fafc;border-radius:5px;padding:10px 5px;cursor:pointer;color:#475467}' +
    '.v35-root .v55-tab b{display:block;font-size:12px}.v35-root .v55-tab small{display:block;font-size:10px;margin-top:5px}' +
    '.v35-root .v55-tab.active{background:#ebf3ff;border-color:#174ea6;color:#174ea6}' +
    '.v35-root .v55-subtitle{display:flex;justify-content:space-between;align-items:center;gap:9px;margin:14px 0 10px}' +
    '.v35-root .v55-radio{display:flex;gap:22px;flex-wrap:wrap;background:#f8fafc;border:1px solid #e6eaf0;padding:13px;border-radius:5px}' +
    '.v35-root .v55-radio label{display:flex;align-items:center;gap:7px;font-size:12px;cursor:pointer}' +
    '.v35-root .v55-radio input{accent-color:#174ea6}' +
    '.v35-root .v55-detail{margin:14px 0}.v35-root .v55-detail.hidden{display:none}.v35-root .v55-detail>label{font-size:12px;font-weight:600}' +
    '.v35-root .v55-format{display:flex;gap:5px;flex-wrap:wrap;border:1px solid #d8e0e9;border-bottom:0;padding:7px;margin-top:8px;background:#f8fafc}' +
    '.v35-root .v55-format button{border:1px solid #d8e0e9;background:#fff;padding:5px 8px;font-size:11px;border-radius:4px}' +
    '.v35-root .v55-editor{min-height:155px;max-height:350px;overflow:auto;border:1px solid #d8e0e9;padding:12px;font-size:12px;line-height:1.7;outline:none}' +
    '.v35-root .v55-editor:focus{border-color:#174ea6}.v35-root .v55-save{display:flex;justify-content:flex-end;margin:14px 0}' +
    '@media(max-width:850px){.v35-root .v55-review-grid{grid-template-columns:1fr}}';
  document.head.appendChild(css);
  App.render();
}
