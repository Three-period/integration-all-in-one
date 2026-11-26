/** 项目概况：仪表盘、甘特图、成员与文档。 */
import { App } from '../../core/app.js';
import { commonHead } from '../../components/shell.js';
import { person, tag } from '../../core/dom.js';
import { renderProjectShell } from './shell.js';
import { state } from '../../store/state.js';

function overviewDashboard() {
  return `<div class="grid cols-4"><div class="card metric"><div class="metric-label">整体进度</div><div class="metric-value">72<span class="metric-unit">%</span></div><div class="metric-foot"><span class="up">↑ 4%</span> 较上周</div></div><div class="card metric"><div class="metric-label">里程碑完成率</div><div class="metric-value">5<span class="metric-unit">/ 8</span></div><div class="metric-foot">临期 1 · 逾期 1</div></div><div class="card metric"><div class="metric-label">缺陷闭环率</div><div class="metric-value">86<span class="metric-unit">%</span></div><div class="metric-foot">未关闭 12 个</div></div><div class="card metric"><div class="metric-label">风险水位</div><div class="metric-value down">中</div><div class="metric-foot">极高 1 · 高 2 · 中 4</div></div></div><div class="grid cols-2" style="margin-top:14px"><div class="card"><div class="card-head"><span class="card-title">进度概览</span><span class="card-note">实时计算</span></div><div style="display:flex;align-items:center;gap:28px;padding:19px"><div class="donut"><div class="donut-text"><strong>72%</strong><span>整体进度</span></div></div><div style="flex:1"><div class="bar-row"><span>计划进度</span><div class="track"><div class="fill" style="width:78%;background:#9bbcff"></div></div><b>78%</b></div><div class="bar-row"><span>实际进度</span><div class="track"><div class="fill" style="width:72%;background:#165dff"></div></div><b>72%</b></div><div class="mini-note">进度 = 已完成任务数 / 总任务数 × 100%</div></div></div></div><div class="card"><div class="card-head"><span class="card-title">里程碑状态</span><button class="op" data-action="overview-tab" data-tab="gantt">查看甘特图</button></div><div class="mini-list"><div class="mini-list-row"><i class="status-dot" style="width:8px;height:8px;background:var(--green);border-radius:50%"></i><div class="grow"><strong>需求评审通过</strong><small>已完成 · 2026-07-08</small></div>${tag('已完成', 'green')}</div><div class="mini-list-row"><i class="status-dot" style="width:8px;height:8px;background:var(--blue);border-radius:50%"></i><div class="grow"><strong>整机联调</strong><small>计划 2026-08-13 · 负责人王凯</small></div>${tag('进行中', 'blue')}</div><div class="mini-list-row"><i class="status-dot" style="width:8px;height:8px;background:var(--red);border-radius:50%"></i><div class="grow"><strong>版本发布</strong><small>计划 2026-09-12 · 受测试结果影响</small></div>${tag('风险', 'red')}</div></div></div></div>`;
}
App.overviewDashboard = overviewDashboard;

function overviewGantt() {
  return `<div class="card"><div class="card-head"><span class="card-title">项目甘特图</span><span class="card-note">拖拽任务条可调整时间（项目经理 / 主管可编辑）</span></div><div class="gantt"><div class="gantt-head"><div>任务 / 里程碑</div>${['08/04', '08/11', '08/18', '08/25', '09/01', '09/08', '09/15', '09/22'].map((x) => `<div>${x}</div>`).join('')}</div>${[
    ['需求评审与定稿', 'green', '2', '3'],
    ['软件规格书评审', 'green', '1', '3'],
    ['接口开发与自测', 'blue', '2', '6'],
    ['整机联调', 'orange', '4', '8'],
    ['版本回归测试', 'red', '6', '8'],
  ]
    .map(
      ([n, c, s, w]) =>
        `<div class="gantt-row"><div><b>${n}</b><small class="mini-note" style="display:block;margin-top:3px">${c === 'red' ? '关键路径' : ''}</small></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div><span class="gantt-task ${c}" style="left:${+s * 9}%;width:${+w * 9}%">${n}</span></div></div>`,
    )
    .join('')}</div></div>`;
}

function overviewMembers() {
  return `<div class="card"><div class="card-head"><span class="card-title">项目组成员</span><button class="btn primary" data-action="add-member">＋ 添加成员</button></div><div class="table-wrap"><table class="table"><thead><tr><th>成员</th><th>角色</th><th>部门</th><th>当前负载</th><th>任务数</th><th>加入时间</th><th>操作</th></tr></thead><tbody><tr><td>${person('王凯', '王')}</td><td>${tag('项目负责人', 'blue')}</td><td>软件一科</td><td><div class="table-progress"><div class="track"><div class="fill" style="width:86%;background:var(--blue)"></div></div>86%</div></td><td>12</td><td>2026-04-18</td><td><button class="op" data-action="member-detail">查看</button></td></tr><tr><td>${person('何盈', '何')}</td><td>${tag('产品经理', 'purple')}</td><td>软件一科</td><td><div class="table-progress"><div class="track"><div class="fill" style="width:68%;background:var(--green)"></div></div>68%</div></td><td>8</td><td>2026-04-18</td><td><button class="op" data-action="member-detail">查看</button><button class="op danger" data-action="remove-member">移除</button></td></tr><tr><td>${person('赵敏', '赵')}</td><td>${tag('测试工程师', 'green')}</td><td>质量部</td><td><div class="table-progress"><div class="track"><div class="fill" style="width:112%;background:var(--orange)"></div></div><span class="down">112%</span></div></td><td>15</td><td>2026-05-02</td><td><button class="op" data-action="member-detail">查看</button><button class="op danger" data-action="remove-member">移除</button></td></tr></tbody></table></div><div class="card-pad mini-note">成员负载 = 全局非完成任务预估工时 / 标准日工时；超过 100% 黄色预警，超过 120% 红色预警。</div></div>`;
}

function overviewDocs() {
  return `<div class="card doc-layout"><div class="doc-tree"><button class="active">规划 <span>2</span></button><button>需求 <span>6</span></button><button>设计 <span>8</span></button><button>开发 <span>12</span></button><button>测试 <span>9</span></button><button>发布 <span>3</span></button><button>结项 <span>0</span></button></div><div class="doc-main"><div class="page-head" style="margin-bottom:13px"><div><h3 class="section-title" style="margin:0">设计阶段文档</h3><p class="subtitle">所有生命周期阶段提交的文档自动归档，旧版本可回溯。</p></div><button class="btn" data-action="open-doc">打开文档中心</button></div><div class="doc-list"><div class="doc-row"><div class="doc-icon">DOC</div><div class="grow"><strong>软件规格书</strong><small>当前版本 V1.3 · 何盈 · 2026-08-08 18:20</small></div>${tag('已评审', 'green')}<button class="op" data-action="open-doc">预览</button><button class="op" data-action="versions">版本</button></div><div class="doc-row"><div class="doc-icon">DOC</div><div class="grow"><strong>架构设计说明书</strong><small>当前版本 V1.1 · 李明 · 2026-08-04 11:30</small></div>${tag('已评审', 'green')}<button class="op" data-action="open-doc">预览</button><button class="op" data-action="versions">版本</button></div><div class="doc-row"><div class="doc-icon">PDF</div><div class="grow"><strong>接口协议与数据字典</strong><small>当前版本 V1.0 · 王凯 · 2026-07-28 15:16</small></div>${tag('草稿', 'gray')}<button class="op" data-action="open-doc">预览</button><button class="op" data-action="versions">版本</button></div></div></div></div>`;
}

export function renderProjectOverview() {
  const content = `${commonHead('项目管理 / 项目概况', '项目概况', '从进度、质量、风险、成员和文档五个维度查看项目健康度。', '<button class="btn" data-action="share">共享</button><button class="btn" data-action="refresh">↻ 刷新数据</button>')}<div class="seg-tabs">${[
    ['dashboard', '项目仪表盘'],
    ['gantt', '甘特图'],
    ['members', '项目组成员'],
    ['docs', '项目文档'],
  ]
    .map(
      ([k, v]) =>
        `<button class="seg-tab ${state.overviewTab === k ? 'active' : ''}" data-action="overview-tab" data-tab="${k}">${v}</button>`,
    )
    .join(
      '',
    )}</div>${state.overviewTab === 'dashboard' ? App.overviewDashboard() : state.overviewTab === 'gantt' ? overviewGantt() : state.overviewTab === 'members' ? overviewMembers() : overviewDocs()}`;
  return renderProjectShell(content);
}
