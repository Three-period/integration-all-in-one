/** 业务资产管理页（V42）。 */
import { App } from '../core/app.js';
import { openDrawer } from '../components/overlays.js';
import { commonHead, navItem } from '../components/shell.js';
import { $, esc } from '../core/dom.js';
import { assetGalleryData } from '../data/asset-gallery.js';
import { state } from '../store/state.js';

let assetOriginalSidebar;
let assetOriginalCrumb;
let assetOriginalRender;

function renderAssetGallery() {
  return (
    '<section class="page asset-gallery-page">' +
    commonHead(
      '业务资产管理',
      '业务资产管理',
      '点检项、代码规范与 AI 检视经验的统一资产展示空间。当前内容为 Mock 示例，仅供原型演示。',
    ) +
    '<div class="asset-gallery-tip">◈ 演示数据 · 三类资产按 Gallery 分组，组内按条目展示；点击条目仍在右侧打开详情抽屉。</div>' +
    '<div class="asset-v43-categories">' +
    assetGalleryData
      .map(function (group) {
        return (
          '<section class="asset-v43-category"><div class="asset-gallery-heading"><span class="asset-gallery-symbol ' +
          group.tone +
          '">' +
          esc(group.symbol) +
          '</span><div><h3>' +
          esc(group.title) +
          '</h3><p>' +
          esc(group.subtitle) +
          '</p></div><span class="tag gray">' +
          group.items.length +
          ' 条</span></div><div class="asset-v43-items">' +
          group.items
            .map(function (item) {
              return (
                '<button type="button" class="asset-v43-item" data-asset-group="' +
                group.id +
                '" data-asset-id="' +
                item.id +
                '"><span class="asset-v43-item-main"><strong>' +
                esc(item.name) +
                '</strong><small>' +
                esc(item.id) +
                ' · ' +
                esc(item.type) +
                '</small></span><span class="asset-v43-item-arrow">›</span></button>'
              );
            })
            .join('') +
          '</div><div class="asset-v43-foot">Mock 资产 · 点击条目查看详细说明</div></section>'
        );
      })
      .join('') +
    '</div></section>'
  );
}

function openAssetDetail(groupId, itemId) {
  var group = assetGalleryData.find(function (x) {
    return x.id === groupId;
  });
  var item =
    group &&
    group.items.find(function (x) {
      return x.id === itemId;
    });
  if (!item) return;
  openDrawer(
    item.name,
    '<div class="notice"><i>◈</i><span>当前为业务资产示例数据。未接入真实规则管理、知识库或 AI 检视服务。</span></div><div class="kv-grid"><div class="kv"><label>资产编号</label><div>' +
      esc(item.id) +
      '</div></div><div class="kv"><label>所属资产库</label><div>' +
      esc(group.title) +
      '</div></div><div class="kv"><label>资产类型</label><div>' +
      esc(item.type) +
      '</div></div><div class="kv"><label>数据状态</label><div>Mock 示例</div></div><div class="kv"><label>来源</label><div>' +
      esc(item.source) +
      '</div></div></div><div class="detail-section"><h4>资产说明</h4><p>' +
      esc(item.summary) +
      '</p></div>',
  );
}

/** V42 业务资产管理 */
export function initAssetGallery() {
  assetOriginalSidebar = App.renderSidebar;
  App.renderSidebar = function () {
    assetOriginalSidebar();
    var sidebar = $('#sidebar');
    var before = [...sidebar.querySelectorAll('.nav-title')].find(function (e) {
      return e.textContent.trim() === '运营管理';
    });
    if (!before) return;
    var entry = document.createElement('div');
    entry.className = 'asset-sidebar-entry';
    entry.innerHTML =
      '<div class="nav-title">业务资产</div>' +
      navItem('业务资产管理', '▣', 'asset-gallery', state.view === 'asset-gallery');
    sidebar.insertBefore(entry, before);
  };
  assetOriginalCrumb = App.crumb;
  App.crumb = function () {
    return state.view === 'asset-gallery' ? '业务资产管理 / 资产画廊' : assetOriginalCrumb();
  };
  assetOriginalRender = App.render;
  App.render = function () {
    if (state.view !== 'asset-gallery') return assetOriginalRender();
    App.renderSidebar();
    $('#crumb').innerHTML = '业务资产管理 / <strong>资产画廊</strong>';
    $('#appView').innerHTML = renderAssetGallery();
    $('.workspace').scrollTop = 0;
  };
  document.addEventListener('click', function (event) {
    var tile = event.target.closest('[data-asset-group][data-asset-id]');
    if (!tile) return;
    event.preventDefault();
    event.stopPropagation();
    openAssetDetail(tile.dataset.assetGroup, tile.dataset.assetId);
  });
  App.render();
}
