/** 在线文档编辑器（V33）：生命周期表单中的富文本、评论与版本。 */
import { onlineDocs } from '../store/lifecycle.js';
import { App } from '../core/app.js';
import { showToast } from './toast.js';
import { esc } from '../core/dom.js';
import { developmentCurrentReport } from '../pages/project/development.js';
import { reqRecord } from '../pages/project/requirements.js';
import { state } from '../store/state.js';

/* V33: Mock document editor shared by lifecycle detail forms only. */

let enhancingDocFields = false;

function docFieldContext(el) {
  var label = el.closest('.req-form-field,.field');
  var title = label && label.querySelector('label');
  var text = title ? title.textContent.trim() : '';
  var attr =
    el.dataset.reqInput ||
    el.dataset.designInput ||
    el.dataset.devInput ||
    el.dataset.testingInput ||
    el.dataset.closingInput ||
    el.dataset.releaseInput ||
    el.dataset.v33DocText ||
    '';
  var drawer = document.querySelector('#drawer');
  var insideDrawer = drawer && drawer.contains(el);

  var stage = state.lifecycleStage;
  if (!['requirements', 'design', 'development', 'testing', 'release', 'closing'].includes(stage))
    return null;
  if (stage === 'requirements' && insideDrawer && attr === 'summary')
    return 'requirement:' + state.projectId + ':' + (state.reqSelected || 'new') + ':summary';
  if (stage === 'design' && insideDrawer && attr === 'summary')
    return 'design:' + state.projectId + ':' + (state.designSelected || 'new') + ':summary';
  if (stage === 'development' && insideDrawer && attr === 'summary')
    return 'development:' + state.projectId + ':' + (state.devSelected || 'new') + ':summary';
  if (stage === 'testing' && (attr === 'testing-main' || text === '测试结论'))
    return (
      'testing:' +
      state.projectId +
      ':' +
      (state.testingSection || 'single') +
      ':' +
      (insideDrawer ? 'drawer' : 'page')
    );
  if (
    stage === 'closing' &&
    ['变更内容', '影响范围', '变更原因', '发布内容', '影响范围'].includes(text)
  )
    return 'closing:' + state.projectId + ':' + (state.closingSection || 'home') + ':' + attr;
  if (
    stage === 'release' &&
    ['交付物清单', '项目总结', '目标与成果', '问题与风险回顾', '经验沉淀', '后续改进措施'].includes(
      text,
    )
  )
    return 'release:' + state.projectId + ':' + (state.releaseSection || 'closing') + ':' + attr;
  return null;
}

function renderDocComments(box) {
  var key = box.dataset.v33Key,
    doc = onlineDocs[key];
  if (!doc) return;
  var list = box.querySelector('.v33-doc-list');
  list.innerHTML = doc.comments.length
    ? doc.comments
        .map(function (c) {
          return (
            '<div class="v33-doc-comment"><b>' +
            esc(c.author) +
            '</b><small> · ' +
            esc(c.time) +
            '</small>' +
            (c.quote ? '<blockquote>“' + esc(c.quote) + '”</blockquote>' : '') +
            '<div>' +
            esc(c.text) +
            '</div></div>'
          );
        })
        .join('')
    : '<div class="v33-doc-status">暂无评论。选中文字后点击「引用选中内容」，再输入评论。</div>';
  box.querySelector('.v33-doc-freeze').textContent = doc.frozen ? '解冻评论' : '冻结评论';
  box.querySelector('.v33-doc-input textarea').disabled = doc.frozen;
  box.querySelector('.v33-doc-add').disabled = doc.frozen;
  var freeze = box.querySelector('.v33-doc-freeze');
  freeze.title = '仅文档创建人可冻结或解冻评论';
  freeze.disabled = doc.creator && doc.creator !== '何盈' && doc.creator !== '自动带出';
}

function enhanceDocFields() {
  if (enhancingDocFields) return;
  enhancingDocFields = true;
  try {
    document
      .querySelectorAll('#drawerBody textarea,#appView textarea,#modalRoot textarea')
      .forEach(function (el) {
        if (el.dataset.v33Done) return;
        var key = docFieldContext(el);
        if (!key) return;
        el.dataset.v33Done = '1';
        var doc =
          onlineDocs[key] ||
          (onlineDocs[key] = { html: '', comments: [], frozen: false, quote: '' });
        if (!doc.initialized) {
          if (key.startsWith('requirement:')) doc.creator = reqRecord(state.reqSelected).creator;
          if (key.startsWith('design:')) doc.creator = App.designCurrentRecord().creator;
          if (key.startsWith('development:')) doc.creator = developmentCurrentReport().owner;
          doc.html = esc(el.value).replace(/\n/g, '<div></div>');
          doc.initialized = true;
        }
        el.style.display = 'none';
        var box = document.createElement('div');
        box.className = 'v33-doc';
        box.dataset.v33Key = key;
        box.innerHTML =
          '<div class="v33-doc-toolbar"><button type="button" data-v33-doc-cmd="bold">加粗</button><button type="button" data-v33-doc-cmd="italic">斜体</button><button type="button" data-v33-doc-cmd="insertUnorderedList">列表</button><button type="button" data-v33-doc-cmd="quote">引用选中内容</button><button type="button" class="v33-doc-freeze" data-v33-doc-cmd="freeze">冻结评论</button></div><div class="v33-doc-content" contenteditable="true" aria-label="在线文档正文"></div><div class="v33-doc-comments"><h4>在线评论 · Mock 协作</h4><div class="v33-doc-status">可编辑正文、选中文字评论；评论不与真实服务同步。</div><div class="v33-doc-list"></div><div class="v33-doc-input"><textarea placeholder="输入评审意见"></textarea><button type="button" class="btn v33-doc-add" data-v33-doc-cmd="add">评论</button></div></div>';
        el.after(box);
        var editor = box.querySelector('.v33-doc-content');
        editor.innerHTML = doc.html;
        el.value = editor.innerText;
        editor.addEventListener('input', function () {
          el.value = editor.innerText;
        });
        renderDocComments(box);
      });
  } finally {
    enhancingDocFields = false;
  }
}

const docFieldObserver = new MutationObserver(function () {
  enhanceDocFields();
});

/** V33 在线文档编辑器 */
export function initDocEditor() {
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-v33-doc-cmd]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    var box = btn.closest('.v33-doc'),
      doc = onlineDocs[box.dataset.v33Key],
      editor = box.querySelector('.v33-doc-content'),
      cmd = btn.dataset.v33DocCmd;
    if (['bold', 'italic', 'insertUnorderedList'].includes(cmd)) {
      editor.focus();
      document.execCommand(cmd, false, null);
      var source = box.previousElementSibling;
      if (source) source.value = editor.innerText;
      return;
    }
    if (cmd === 'quote') {
      var sel = window.getSelection();
      var quote = sel && sel.toString().trim();
      if (!quote) {
        showToast('请先在正文中选中需要评论的文字', 'warn');
        return;
      }
      doc.quote = quote;
      box.querySelector('.v33-doc-input textarea').placeholder =
        '引用：“' + quote.slice(0, 40) + '” · 输入评论';
      showToast('已关联选中文字');
      return;
    }
    if (cmd === 'freeze') {
      if (btn.disabled) {
        showToast('仅文档创建人可以冻结评论', 'warn');
        return;
      }
      doc.frozen = !doc.frozen;
      renderDocComments(box);
      showToast(doc.frozen ? '评论已冻结（Mock）' : '评论已解冻（Mock）');
      return;
    }
    if (cmd === 'add') {
      if (doc.frozen) return;
      var inp = box.querySelector('.v33-doc-input textarea'),
        value = inp.value.trim();
      if (!value) {
        showToast('请输入评论内容', 'warn');
        return;
      }
      doc.comments.push({
        author: '何盈',
        quote: doc.quote,
        text: value,
        time: new Date().toLocaleString('zh-CN', { hour12: false }),
      });
      doc.quote = '';
      inp.value = '';
      inp.placeholder = '输入评审意见';
      renderDocComments(box);
      showToast('评论已添加');
    }
  });
  document.addEventListener('change', function (e) {
    if (e.target.matches('[data-v33-developer]')) {
      state.v33Developer = e.target.value;
      state.v33DevTab = 'development';
      App.render();
    }
  });
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-v33-dev]');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    if (el.dataset.v33Dev === 'tab') {
      state.v33DevTab = el.dataset.tab;
      App.render();
      return;
    }
    if (el.dataset.v33Dev === 'commit') {
      if (!state.v33Commits) state.v33Commits = {};
      state.v33Commits[state.projectId + '|' + state.v33Developer] = true;
      var ready =
        state.devReports &&
        state.devReports.some(function (r) {
          return r.owner === state.v33Developer && r.status === '已提交';
        });
      if (ready) state.v33DevTab = 'inspection';
      App.render();
      showToast(
        ready
          ? '同一人员双条件已满足，已打开检视工作台'
          : 'Commit 已模拟提交，等待该人员提交自测报告',
      );
    }
  });
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-development-action="submit-report"]');
    if (!el) return;
    var key = state.projectId + '|' + state.v33Developer;
    if (
      state.v33Commits &&
      state.v33Commits[key] &&
      state.devReports &&
      state.devReports.some(function (r) {
        return r.owner === state.v33Developer && r.status === '已提交';
      })
    ) {
      state.v33DevTab = 'inspection';
      App.render();
      showToast('同一开发人员已提交 Commit 与自测报告，检视工作台已展开');
    }
  });
  docFieldObserver.observe(document.querySelector('#appView'), { childList: true, subtree: true });
  docFieldObserver.observe(document.querySelector('#drawerBody'), {
    childList: true,
    subtree: true,
  });
  docFieldObserver.observe(document.querySelector('#modalRoot'), {
    childList: true,
    subtree: true,
  });
  enhanceDocFields();
}
