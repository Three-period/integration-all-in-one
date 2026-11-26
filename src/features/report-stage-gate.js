/** 测试报告 / 复盘的只读阶段门禁与富文档（V49.1）。 */
import { App } from '../core/app.js';
import { showToast } from '../components/toast.js';
import { esc } from '../core/dom.js';
import { project, state } from '../store/state.js';

/** V49.1 测试报告 / 复盘只读门禁 */
export function initReportStageGate() {
  /* V49.1: scoped read-only stage gate and rich documents for testing reports / retrospective. */

  const css = document.createElement('style');
  css.id = 'v491-styles';
  css.textContent = `
  .v491-doc{border:1px solid #e1e7f0;border-radius:10px;background:#fff;margin:10px 0;overflow:hidden}
  .v491-toolbar{display:flex;flex-wrap:wrap;gap:6px;padding:10px 12px;border-bottom:1px solid #e6eaf0;background:#fafbfe;align-items:center}
  .v491-toolbar button{background:#fff;border:1px solid #d9e0eb;border-radius:5px;padding:6px 9px;font-size:12px;cursor:pointer;color:#344054}
  .v491-editor{min-height:210px;padding:20px;line-height:1.8;outline:0;white-space:normal;overflow-wrap:anywhere}
  .v491-editor:focus{box-shadow:inset 0 0 0 2px #9fc1ef}
  .v491-editor h1{font-size:23px;margin:12px 0}.v491-editor h2{font-size:19px;margin:11px 0}.v491-editor h3{font-size:16px;margin:10px 0}
  .v491-comment-area{border-top:1px solid #e6eaf0;padding:12px;background:#fcfdff}
  .v491-comment-line{border:1px solid #e8ebf2;border-radius:6px;padding:9px;margin-top:8px;font-size:12px;background:#fff}
  .v491-comment-area textarea{width:100%;min-height:58px;margin-top:8px;box-sizing:border-box;padding:9px;border:1px solid #d8dfeb;border-radius:6px}
  .v491-soft{color:#667085;font-size:12px}.v491-doc-btn{border:1px solid #d7dfe9;background:#fff;border-radius:6px;padding:6px 10px;cursor:pointer;margin:5px 5px 0 0;font-size:12px}
  .v49-locked-stage input:disabled,.v49-locked-stage select:disabled,.v49-locked-stage textarea:disabled,.v49-locked-stage button:disabled{cursor:not-allowed!important;opacity:.62}
  .v49-locked-stage [contenteditable="false"]{opacity:.65;cursor:default}
  `;
  document.head.appendChild(css);
  function e(s) {
    return esc(String(s == null ? '' : s));
  }
  function strip(h) {
    const d = document.createElement('div');
    d.innerHTML = String(h || '');
    return (d.textContent || '').trim();
  }
  function docFor(kind) {
    if (kind === 'retro') {
      const d = state.releaseReviewDraft || {};
      if (!d.v491Rich) {
        d.v491Rich =
          '<h1>1. 项目总结</h1><p>' +
          e(d.summary || '请填写项目复盘总结。') +
          '</p><h2>1.1 成果与经验</h2><p>' +
          e(d.achievements || '') +
          '</p><h2>1.2 风险与改进措施</h2><p>' +
          e(d.actions || '') +
          '</p>';
      }
      if (!Array.isArray(d.v491Comments)) d.v491Comments = [];
      return { item: d, htmlKey: 'v491Rich', commentsKey: 'v491Comments' };
    }
    const r = App.getTestReport(kind);
    if (!r.richHtml)
      r.richHtml =
        '<h1>1. 测试概况</h1><p>填写本次' +
        e(App.testingReportInfo(kind)[0]) +
        '的测试范围。</p><h2>1.1 执行结果</h2><p>' +
        e(r.conclusion || '请填写测试结果。') +
        '</p><h3>1.1.1 异常与风险</h3><p>填写发现的问题与风险。</p>';
    if (!Array.isArray(r.richComments)) r.richComments = [];
    return { item: r, htmlKey: 'richHtml', commentsKey: 'richComments' };
  }
  function rich(kind) {
    const d = docFor(kind),
      list = d.item[d.commentsKey];
    return (
      '<section class="v491-doc" data-v491-doc="' +
      e(kind) +
      '"><div class="v491-toolbar"><span style="font-weight:600;font-size:12px;margin-right:8px">富文本正文</span>' +
      [
        ['p', '正文'],
        ['h1', 'H1 一级'],
        ['h2', 'H2 二级'],
        ['h3', 'H3 三级'],
        ['bold', '加粗'],
        ['italic', '斜体'],
        ['insertUnorderedList', '列表'],
      ]
        .map(
          (x) =>
            '<button type="button" data-v491="format" data-format="' +
            x[0] +
            '">' +
            x[1] +
            '</button>',
        )
        .join('') +
      '</div><div class="v491-editor" contenteditable="true" aria-label="在线富文本正文" data-v491-editor>' +
      d.item[d.htmlKey] +
      '</div><div class="v491-comment-area"><strong>正文评论 / 评审讨论</strong><div class="v491-soft">选取正文后引用文字，发表评论；已发表的评论可冻结。</div><button type="button" class="v491-doc-btn" data-v491="quote">引用选中文字</button><span data-v491-quote class="v491-soft"></span><textarea data-v491-comment placeholder="请输入评论或评审意见"></textarea><button type="button" class="v491-doc-btn" data-v491="comment">添加评论</button>' +
      list
        .map(
          (c, i) =>
            '<div class="v491-comment-line"><div>' +
            e(c.text) +
            '</div><div class="v491-soft">' +
            (c.frozen ? '已冻结' : '未冻结') +
            (c.frozen
              ? ''
              : ' <button type="button" class="v491-doc-btn" data-v491="freeze" data-index="' +
                i +
                '">冻结评论</button>') +
            '</div></div>',
        )
        .join('') +
      '</div></section>'
    );
  }
  function saveRich(root) {
    if (!root) return;
    const kind = root.dataset.v491Doc,
      d = docFor(kind),
      edit = root.querySelector('[data-v491-editor]');
    if (!edit) return;
    d.item[d.htmlKey] = edit.innerHTML;
    if (kind === 'retro') d.item.summary = strip(edit.innerHTML);
    else d.item.conclusion = strip(edit.innerHTML);
  }
  // Reuse V37 report tabs and storage; only replace the editable report body.
  App.renderTestReportBody = function (section, active) {
    const r = App.getTestReport(section),
      tab = active || state.v37ReportTab || 'detail';
    const tabs =
      '<div class="testing-report-tabs">' +
      [
        ['detail', '详细信息'],
        ['version', '关联版本'],
        ['history', '报告历史'],
      ]
        .map(
          (t) =>
            '<button class="testing-report-tab ' +
            (tab === t[0] ? 'active' : '') +
            '" data-v37-report-tab="' +
            t[0] +
            '" data-v37-section="' +
            section +
            '">' +
            t[1] +
            '</button>',
        )
        .join('') +
      '</div>';
    if (tab === 'detail')
      return (
        tabs +
        '<div class="testing-template"><div class="testing-template-head"><span>' +
        e(App.testingReportInfo(section)[0]) +
        ' · ' +
        e(r.status) +
        '</span><span class="mini-note">在线文档 · Mock</span></div><div style="padding:15px">' +
        rich(section) +
        '</div></div>'
      );
    if (tab === 'version')
      return (
        tabs +
        '<div class="card-pad"><h3 class="section-title">关联版本</h3><p>当前项目：' +
        e(project().name) +
        '</p><p>关联版本：' +
        e(r.version) +
        '</p><p>状态：' +
        e(r.status) +
        '</p></div>'
      );
    return (
      tabs +
      '<div class="card-pad"><h3 class="section-title">报告历史</h3>' +
      (r.history.length
        ? r.history
            .slice()
            .reverse()
            .map(
              (h) =>
                '<div class="doc-row"><div class="grow"><strong>' +
                e(h.name) +
                ' · ' +
                e(h.status) +
                '</strong><small>' +
                e(h.version) +
                ' · ' +
                e(h.owner) +
                ' · ' +
                e(h.at) +
                '</small><div class="mini-note">' +
                e(h.conclusion) +
                '</div></div></div>',
            )
            .join('')
        : '<div class="empty">暂无保存记录</div>') +
      '</div>'
    );
  };
  App.collectTestReport = function () {
    const r = App.getTestReport(state.testingSection);
    const root = document.querySelector('[data-v491-doc="' + state.testingSection + '"]');
    if (root) saveRich(root);
    return r;
  };
  // Existing retrospective save/submit event remains; allow it to read rich text through its existing 'summary' field.

  App.renderClosingReview = function () {
    const d = state.releaseReviewDraft;
    return (
      '<section class="release-panel"><div class="release-panel-head"><div><h3>项目复盘</h3><p>在线编写复盘正文 · ' +
      e(d.status || '草稿') +
      '</p></div><div class="release-actions"><button class="btn" data-release-page-action="review-save">保存草稿</button><button class="btn primary" data-release-page-action="review-submit">提交复盘</button></div></div><div class="release-review"><div class="release-review-editor"><div class="release-review-body" style="padding:14px">' +
      rich('retro') +
      '</div></div></div></section>'
    );
  };
  // Capture saved text before V37/V37-tab/retrospective handlers and preserve comments on tab change.
  document.addEventListener(
    'click',
    function (ev) {
      const b = ev.target.closest(
        '[data-v37-report-action],[data-v37-report-tab],[data-release-page-action]',
      );
      if (!b) return;
      if (b.matches('[data-v37-report-action],[data-v37-report-tab]')) {
        const root = document.querySelector('[data-v491-doc="' + state.testingSection + '"]');
        if (root) saveRich(root);
      }
      if (
        b.dataset.releasePageAction === 'review-save' ||
        b.dataset.releasePageAction === 'review-submit'
      ) {
        const root = document.querySelector('[data-v491-doc="retro"]');
        if (root) saveRich(root);
      }
    },
    true,
  );
  document.addEventListener(
    'click',
    function (ev) {
      const btn = ev.target.closest('[data-v491]');
      if (!btn) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      const root = btn.closest('[data-v491-doc]');
      if (!root) return;
      const kind = root.dataset.v491Doc,
        editor = root.querySelector('[data-v491-editor]'),
        d = docFor(kind),
        cmd = btn.dataset.v491;
      if (cmd === 'format') {
        const fmt = btn.dataset.format;
        editor.focus();
        document.execCommand(
          ['p', 'h1', 'h2', 'h3'].includes(fmt) ? 'formatBlock' : fmt,
          false,
          ['p', 'h1', 'h2', 'h3'].includes(fmt) ? fmt : null,
        );
        return;
      }
      if (cmd === 'quote') {
        root.querySelector('[data-v491-quote]').textContent = String(window.getSelection()).trim();
        return;
      }
      if (cmd === 'comment') {
        const comment = root.querySelector('[data-v491-comment]').value.trim();
        if (!comment) {
          showToast('请输入评论内容', 'warn');
          return;
        }
        saveRich(root);
        const quote = root.querySelector('[data-v491-quote]').textContent.trim();
        d.item[d.commentsKey].push({
          text: (quote ? '「' + quote + '」 · ' : '') + comment,
          frozen: false,
        });
        root.outerHTML = rich(kind);
        showToast('评论已添加');
        return;
      }
      if (cmd === 'freeze') {
        saveRich(root);
        const row = d.item[d.commentsKey][Number(btn.dataset.index)];
        if (row) row.frozen = true;
        root.outerHTML = rich(kind);
        showToast('评论已冻结');
        return;
      }
    },
    true,
  );
  // Apply true DOM read-only semantics to future phases, not CSS/pointer blocking alone.
  function secureStage() {
    document.querySelectorAll('.v49-locked-stage').forEach((root) => {
      root.querySelectorAll('input,select,textarea,button').forEach((el) => {
        if (!el.disabled) {
          el.disabled = true;
          el.setAttribute('aria-disabled', 'true');
        }
      });
      root.querySelectorAll('[contenteditable]').forEach((el) => {
        if (el.getAttribute('contenteditable') !== 'false')
          el.setAttribute('contenteditable', 'false');
        el.setAttribute('aria-readonly', 'true');
      });
      root.querySelectorAll('a,[role="button"]').forEach((el) => {
        if (el.getAttribute('tabindex') !== '-1') el.setAttribute('tabindex', '-1');
        el.setAttribute('aria-disabled', 'true');
      });
    });
  }
  secureStage();
  const target = document.getElementById('appView');
  if (target) {
    const observer = new MutationObserver(secureStage);
    observer.observe(target, { childList: true, subtree: true });
  }
  for (const name of ['beforeinput', 'input', 'change', 'submit', 'paste', 'drop'])
    document.addEventListener(
      name,
      function (ev) {
        const root = ev.target.closest && ev.target.closest('.v49-locked-stage');
        if (!root) return;
        ev.preventDefault();
        ev.stopImmediatePropagation();
      },
      true,
    );
}
