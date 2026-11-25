/** 检视证据抽屉与分类资产列表（V43）。 */
import { getDevReview } from '../../store/lifecycle.js';
import { App } from '../../core/app.js';
import { openDrawer } from '../../components/overlays.js';
import { showToast } from '../../components/toast.js';
import { esc } from '../../core/dom.js';
import { latestAiRun } from '../../features/dev-review.js';
import { project } from '../../store/state.js';

/* V43: Reviewer evidence drawers + categorized asset lists, isolated incremental patch */
function designEvidenceDocs() {
  var p = project();
  return [
    {
      id: 'spec',
      name: '软件规格书 V1.3',
      type: '规格书',
      sections: [
        [
          '1. 需求范围与追溯',
          '演示文档：围绕 ' +
            p.name +
            ' 的设备管理、数据交互与异常处理需求建立研发范围；对接 REQ-139、REQ-142、REQ-146。',
        ],
        ['2. 接口及数据约束', '演示文档：定义设备接入、消息上报、失败重试及响应字段的约束。'],
        ['3. 验收约束', '演示文档：明确接口输入输出、异常场景及与测试用例的对应关系。'],
      ],
    },
    {
      id: 'architecture',
      name: '软件架构设计说明书 V1.1',
      type: '架构设计',
      sections: [
        ['1. 模块组成', '演示文档：设备连接层、业务处理层、数据服务层及相应边界。'],
        ['2. 组件交互', '演示文档：连接状态管理、消息流转、异步队列和错误恢复流程。'],
      ],
    },
    {
      id: 'detail',
      name: '软件详细设计说明书 V1.0',
      type: '详细设计',
      sections: [
        ['1. 关键函数与职责', '演示文档：重连策略、消息队列与能耗查询接口的职责划分。'],
        ['2. 代码实现约束', '演示文档：异常处理、日志、边界校验与资源释放要求。'],
      ],
    },
  ];
}

function openDesignEvidence() {
  var docs = designEvidenceDocs();
  var html =
    '<div class="notice"><i>◈</i><span>关联设计依据为 Mock 文档，仅展示「文档目录 → 点击目录展开正文」两层内容。</span></div><div class="v43-doc-list">' +
    docs
      .map(function (doc) {
        return (
          '<div class="v43-doc"><button type="button" class="v43-doc-heading" data-v43="doc-toggle" data-doc="' +
          doc.id +
          '" aria-expanded="false"><span><strong>' +
          esc(doc.name) +
          '</strong><small>' +
          esc(doc.type) +
          ' · ' +
          doc.sections.length +
          ' 个章节</small></span><span class="v43-arrow">⌄</span></button><div class="v43-doc-content" data-doc-content="' +
          doc.id +
          '" hidden>' +
          doc.sections
            .map(function (section) {
              return (
                '<div class="v43-doc-section"><b>' +
                esc(section[0]) +
                '</b><p>' +
                esc(section[1]) +
                '</p></div>'
              );
            })
            .join('') +
          '</div></div>'
        );
      })
      .join('') +
    '</div>';
  openDrawer('设计依据 · 文档目录', html);
}

function openAiResultsEvidence() {
  var d = getDevReview(),
    record = d.manual.some(function (m) {
      return m.kind === '独立抽检' && m.commit === d.commit;
    });
  if (!record) {
    showToast('请先保存当前 Commit 的独立抽检结论', 'warn');
    return;
  }
  var r = latestAiRun();
  var html =
    '<div class="notice"><i>◈</i><span>AI 四类检查为 Mock 数据；独立抽检结论已记录后才允许查看。结果仅用于对照，不代替人工判断。</span></div>' +
    '<div class="kv-grid"><div class="kv"><label>当前 Commit</label><div>' +
    esc(d.commit || '—') +
    '</div></div><div class="kv"><label>AI 检视批次</label><div>' +
    esc(r ? r.id : '暂无批次') +
    '</div></div><div class="kv"><label>执行状态</label><div>' +
    esc(r ? r.result : '未执行') +
    '</div></div></div>' +
    (r && r.checks && r.checks.length
      ? '<div class="v43-ai-results">' +
        r.checks
          .map(function (c, i) {
            var pass = c.result === '通过';
            return (
              '<article class="v43-ai-check"><div class="v43-ai-check-head"><strong>' +
              (i + 1) +
              '. ' +
              esc(c.name) +
              '</strong><span class="tag ' +
              (pass ? 'green' : 'orange') +
              '">' +
              esc(c.result) +
              '</span></div><p>' +
              esc(c.detail || '暂无详情') +
              '</p></article>'
            );
          })
          .join('') +
        '</div>'
      : '<div class="notice warn">当前 Commit 尚无可对照的 AI 检视批次，请先返回开发工作台完成 AI 检视。</div>');
  openDrawer('AI 四类检查 · 对照结果', html);
}
App.openAiResultsEvidence = openAiResultsEvidence;

/** V43 检视证据抽屉 */
export function initReviewEvidence() {
  document.addEventListener('click', function (event) {
    var el = event.target.closest('[data-v43]');
    if (!el) return;
    event.preventDefault();
    event.stopPropagation();
    var action = el.dataset.v43;
    if (action === 'design') {
      openDesignEvidence();
      return;
    }
    if (action === 'doc-toggle') {
      var content = document.querySelector('[data-doc-content="' + el.dataset.doc + '"]');
      if (!content) return;
      var open = content.hasAttribute('hidden');
      if (open) content.removeAttribute('hidden');
      else content.setAttribute('hidden', '');
      el.setAttribute('aria-expanded', String(open));
      el.classList.toggle('expanded', open);
      return;
    }
    if (action === 'commit') {
      var d = getDevReview(),
        repo = (d.repo || '').trim();
      if (!d.commit) {
        showToast('当前暂无 Commit', 'warn');
        return;
      }
      if (!/^https?:\/\//i.test(repo)) repo = 'https://' + repo;
      try {
        var url = new URL(repo);
        if (!['https:', 'http:'].includes(url.protocol)) throw Error('invalid');
        window.open(url.href, '_blank', 'noopener,noreferrer');
      } catch {
        showToast('尚未配置有效仓库地址', 'warn');
      }
    }
  });
}
