/** 需求 / 设计抽屉内联文档（V47）。 */
import { getFlow, stageDocs } from '../store/lifecycle.js';
import { App } from '../core/app.js';
import { showToast } from '../components/toast.js';
import { esc } from '../core/dom.js';
import { logFlowNote } from './lifecycle-flow.js';
import { state } from '../store/state.js';

let baseReqDetailTabBody;

/* V47: replace the duplicate document metadata/comment cards inside requirement/design drawers
   with a single heading-enabled rich document and unified anchored comments. */
function inlineDocKind(kind) {
  return kind === 'requirement'
    ? 'requirement:' + String(state.reqSelected || 'current')
    : 'design:' + String(state.designSelected || 'current');
}

function getInlineDoc(kind) {
  var key = state.projectId + ':' + inlineDocKind(kind);
  return (
    stageDocs[key] ||
    (stageDocs[key] = {
      html: '<h1>1. 文档概述</h1><h2>1.1 功能与范围</h2><p>在这里填写文档正文。</p>',
      comments: [],
    })
  );
}

function renderInlineDoc(kind) {
  var d = getInlineDoc(kind),
    key = inlineDocKind(kind);
  return (
    '<section class="v47-doc" data-v47-rich="' +
    esc(key) +
    '"><div class="v47-doc-bar"><b style="margin-right:auto">在线富文本正文</b>' +
    [
      ['P', '正文'],
      ['H1', '一级标题'],
      ['H2', '二级标题'],
      ['H3', '三级标题'],
      ['bold', '加粗'],
      ['italic', '斜体'],
    ]
      .map(function (x) {
        return (
          '<button type="button" data-v47="inline-format" data-format="' +
          x[0] +
          '">' +
          x[1] +
          '</button>'
        );
      })
      .join('') +
    '</div><div class="v47-editor" contenteditable="true" data-v47-inline-editor="' +
    esc(key) +
    '">' +
    d.html +
    '</div><div class="v47-comment"><b>选中文字评论 / 评审讨论</b><div class="mini-note">选取正文后点击「引用选中文字」，可冻结已提交评论。</div><button type="button" class="v47-btn" data-v47="inline-quote">引用选中文字</button><span class="mini-note" data-v47-quote></span><textarea data-v47-comment-input placeholder="输入评审意见或在线评论"></textarea><button type="button" class="v47-btn" data-v47="inline-comment">添加评论</button></div>' +
    d.comments
      .map(function (c, i) {
        return (
          '<div class="v47-comment">' +
          esc(c.text) +
          ' <span class="mini-note">' +
          (c.frozen ? '已冻结' : '未冻结') +
          '</span> ' +
          (c.frozen
            ? ''
            : '<button type="button" class="v47-btn" data-v47="inline-freeze" data-index="' +
              i +
              '">冻结评论</button>') +
          '</div>'
        );
      })
      .join('') +
    '<div style="padding:10px"><button type="button" class="v47-btn" data-v47="inline-save">保存文档正文</button></div></section>'
  );
}

function saveInlineDoc() {
  var el = document.querySelector('[data-v47-inline-editor]');
  if (!el) return;
  var key = el.dataset.v47InlineEditor,
    d = stageDocs[state.projectId + ':' + key];
  if (d) {
    d.html = el.innerHTML;
    getFlow().docs[key] = d.html;
    if (key.startsWith('requirement:')) getFlow().docs.requirement = d.html;
    if (key.startsWith('design:')) getFlow().docs.design = d.html;
    logFlowNote('保存在线文档 ' + key);
  }
}

/** V47 需求/设计抽屉内联文档 */
export function initInlineDocuments() {
  baseReqDetailTabBody = App.reqDetailTabBody;
  App.reqDetailTabBody = function (r) {
    if (state.reqDetailTab === 'detail' || !state.reqDetailTab)
      return '<div class="req-template">' + renderInlineDoc('requirement') + '</div>';
    return baseReqDetailTabBody(r);
  };

  App.designDetailPanel = function () {
    return '<div class="design-tab-panel">' + renderInlineDoc('design') + '</div>';
  };
  document.addEventListener(
    'click',
    function (e) {
      var n = e.target.closest(
        '[data-v47^="inline-"], [data-req-action="save"], [data-req-action="submit"], [data-design-drawer-action="save"], [data-design-drawer-action="submit"]',
      );
      if (!n) return;
      if (!n.dataset.v47) {
        saveInlineDoc();
        return;
      }
      var box = n.closest('[data-v47-rich]'),
        editor = box && box.querySelector('[data-v47-inline-editor]');
      if (!box) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      var kind = box.dataset.v47Rich,
        key = state.projectId + ':' + kind,
        d = stageDocs[key],
        act = n.dataset.v47;
      if (act === 'inline-format') {
        var v = n.dataset.format;
        editor.focus();
        document.execCommand(
          v === 'P' ? 'formatBlock' : /^H[1-3]$/.test(v) ? 'formatBlock' : v,
          false,
          v === 'P' ? 'p' : /^H[1-3]$/.test(v) ? v.toLowerCase() : null,
        );
        return;
      }
      if (act === 'inline-quote') {
        box.querySelector('[data-v47-quote]').textContent = window.getSelection().toString().trim();
        return;
      }
      if (act === 'inline-save') {
        saveInlineDoc();
        showToast('富文本正文已保存');
        return;
      }
      if (act === 'inline-comment') {
        var txt = box.querySelector('[data-v47-comment-input]').value.trim();
        if (!txt) {
          showToast('请填写评论', 'warn');
          return;
        }
        saveInlineDoc();
        var q = box.querySelector('[data-v47-quote]').textContent.trim();
        d.comments.push({ text: (q ? '「' + q + '」 · ' : '') + txt, frozen: false });
        var wrap = box.parentElement;
        wrap.innerHTML = renderInlineDoc(
          kind.startsWith('requirement:') ? 'requirement' : 'design',
        );
        showToast('评论已添加');
        return;
      }
      if (act === 'inline-freeze') {
        saveInlineDoc();
        d.comments[Number(n.dataset.index)].frozen = true;
        box.outerHTML = renderInlineDoc(kind.startsWith('requirement:') ? 'requirement' : 'design');
        showToast('评论已冻结');
        return;
      }
    },
    true,
  );
  App.render();
}
