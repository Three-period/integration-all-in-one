/** 项目调整页（评审 / 变更 / 风险 / 缺陷入口）。 */
import { App } from '../../core/app.js';
import { commonHead } from '../../components/shell.js';
import { $, tag } from '../../core/dom.js';
import { renderProjectShell } from '../project/shell.js';
import { state } from '../../store/state.js';

let adjustmentCleanupObserver;

export function renderAdjustment() {
  const tabs = [
    ['reviews', '评审管理'],
    ['changes', '变更管理'],
    ['risks', '风险管理'],
    ['defects', '缺陷管理'],
  ];
  let body =
    state.adjustmentTab === 'reviews'
      ? `<div class="card"><div class="card-head"><span class="card-title">评审记录</span><span class="card-note">需求评审、设计评审与测试报告审核</span></div><div class="table-wrap"><table class="table"><thead><tr><th>评审类型</th><th>评审对象</th><th>发起人</th><th>评审人</th><th>发起时间</th><th>状态</th><th>操作</th></tr></thead><tbody><tr><td>需求评审</td><td>最终需求文档 V2.1</td><td>王凯</td><td>李明、赵敏</td><td>07-05 10:00</td><td>${tag('已通过', 'green')}</td><td><button class="op" data-action="review-detail">查看详情</button></td></tr><tr><td>设计评审</td><td>软件规格书 V1.3</td><td>何盈</td><td>李明</td><td>08-06 14:30</td><td>${tag('已通过', 'green')}</td><td><button class="op" data-action="review-detail">查看详情</button></td></tr><tr><td>测试报告审核</td><td>长运测试报告 V2.6</td><td>赵敏</td><td>李明</td><td>08-08 16:00</td><td>${tag('待审核', 'orange')}</td><td><button class="op" data-action="review-detail">查看详情</button></td></tr></tbody></table></div></div>`
      : state.adjustmentTab === 'changes'
        ? `<div class="toolbar"><input class="input search-input" placeholder="搜索变更编号 / 对象"><select class="input"><option>全部变更类型</option><option>需求变更</option><option>设计变更</option></select><button class="btn primary" data-action="change-request">＋ 发起变更申请</button></div><div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>变更编号</th><th>变更类型</th><th>变更对象</th><th>申请人</th><th>影响对象</th><th>状态</th><th>操作</th></tr></thead><tbody><tr><td class="link">CHG-202608-004</td><td>${tag('需求变更', 'blue')}</td><td>最终需求文档 V2.1</td><td>陈思</td><td>5 个任务 · 12 条用例</td><td>${tag('审批中', 'orange')}</td><td><button class="op" data-action="open-change">查看影响</button></td></tr><tr><td class="link">CHG-202608-002</td><td>${tag('设计变更', 'purple')}</td><td>软件规格书 V1.3</td><td>何盈</td><td>3 个任务 · 6 条用例</td><td>${tag('已通过', 'green')}</td><td><button class="op" data-action="open-change">查看影响</button></td></tr></tbody></table></div></div>`
        : state.adjustmentTab === 'risks'
          ? `<div class="toolbar"><input class="input search-input" placeholder="搜索风险名称 / 编号"><select class="input"><option>全部状态</option><option>待处理</option><option>处理中</option><option>已关闭</option></select><button class="btn primary" data-action="new-risk">＋ 创建风险</button></div><div class="card risk-layout"><div class="risk-left"><div class="risk-title">风险列表 <span class="card-note" style="margin-left:auto">共 12 项</span></div>${[
              ['整机联调环境交付延期', '极高', 'red', '处理中'],
              ['第三方协议接口兼容问题', '高', 'orange', '待处理'],
              ['测试资源与其他项目冲突', '高', 'orange', '处理中'],
              ['能耗数据迁移质量不稳定', '中', 'blue', '待处理'],
            ]
              .map(
                (r, i) =>
                  `<div class="risk-row ${state.selectedRisk === i ? 'active' : ''}" data-action="select-risk" data-risk="${i}"><div class="risk-top">${tag(r[1], r[2])}<span class="risk-name">${r[0]}</span></div><div class="risk-id">RSK-202608-00${i + 1} · ${i ? '技术风险' : '进度风险'}</div><div class="risk-meta"><span>责任人：${['王凯', '李明', '赵敏', '孙宁'][i]}</span>${tag(r[3], r[3] === '处理中' ? 'blue' : 'gray')}</div></div>`,
              )
              .join(
                '',
              )}</div><div class="risk-detail"><div class="detail-head"><div><h3>整机联调环境交付延期</h3><div>${tag('极高风险', 'red')} ${tag('处理中', 'blue')} <span class="mini-note">RSK-202608-001</span></div></div><div><button class="btn" data-action="edit-risk">编辑</button> <button class="btn primary" data-action="update-risk">更新进展</button></div></div><div class="kv-grid"><div class="kv"><label>风险类型</label><div>进度风险</div></div><div class="kv"><label>责任人</label><div>王凯 / 项目经理</div></div><div class="kv"><label>发现时间</label><div>2026-07-28 14:20</div></div><div class="kv"><label>计划完成时间</label><div class="down">2026-08-13</div></div><div class="kv"><label>发生概率</label><div>高（80%）</div></div><div class="kv"><label>影响程度</label><div>严重 · 可能影响发布节点</div></div></div><div class="detail-section"><h4>风险描述</h4><p>供应商联调设备交付延迟，当前整机联调无法完整开展，若再次延期将直接压缩系统测试窗口。</p></div><div class="detail-section"><h4>应对策略</h4><p>启用备用模拟环境完成主流程验证；每日与供应商同步进度；测试团队提前准备回归用例。</p></div><div class="detail-section"><h4>跟踪记录</h4><div class="timeline"><div class="timeline-item">备用模拟环境已完成基础配置<small>李明 · 07-30 16:42</small></div><div class="timeline-item">风险创建并升级为极高等级<small>赵敏 · 07-28 14:20</small></div></div></div></div></div>`
          : `<div class="toolbar"><input class="input search-input" placeholder="搜索缺陷标题 / ID"><button class="btn" data-action="batch-close">上传 Excel 批量闭环</button><button class="btn primary" data-action="raise-defect">＋ 提报缺陷</button></div><div class="card table-wrap"><table class="table"><thead><tr><th>缺陷 ID</th><th>标题</th><th>严重等级</th><th>关联版本</th><th>指派人</th><th>状态</th><th>操作</th></tr></thead><tbody><tr><td class="link">DFT-0198</td><td>高并发设备消息上报丢包</td><td>${tag('严重', 'red')}</td><td>V2.6</td><td>孙宁</td><td>${tag('待验证', 'purple')}</td><td><button class="op" data-action="open-defect">查看</button><button class="op" data-action="verify-defect">验证</button></td></tr><tr><td class="link">DFT-0197</td><td>断线重连状态同步延迟</td><td>${tag('一般', 'orange')}</td><td>V2.6</td><td>李明</td><td>${tag('打开', 'blue')}</td><td><button class="op" data-action="open-defect">查看</button></td></tr></tbody></table></div>`;
  const content = `${commonHead('项目管理 / 项目调整', '项目调整', '集中管理项目评审、变更、风险与缺陷，所有对象均回写统一项目数据。', '<button class="btn" data-action="open-audit">操作记录</button>')}<div class="seg-tabs">${tabs.map(([k, n]) => `<button class="seg-tab ${state.adjustmentTab === k ? 'active' : ''}" data-action="adjust-tab" data-tab="${k}">${n}</button>`).join('')}</div>${body}`;
  return renderProjectShell(content);
}

function stripReviewManagement() {
  if (state.view !== 'project-adjustment') return;
  document.querySelectorAll('.seg-tab[data-tab="reviews"]').forEach(function (el) {
    el.remove();
  });
  if (state.adjustmentTab === 'reviews') {
    state.adjustmentTab = 'changes';
    App.render();
  }
}

/** 项目调整页移除评审管理入口 */
export function initAdjustmentCleanup() {
  adjustmentCleanupObserver = new MutationObserver(stripReviewManagement);
  adjustmentCleanupObserver.observe($('#appView'), { childList: true, subtree: true });
  stripReviewManagement();
}
