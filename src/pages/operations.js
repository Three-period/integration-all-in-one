/** 运营看板：项目、人员、资源与 AI 检视运营。 */
import { can } from '../domain/permissions.js';
import { App } from '../core/app.js';
import { modalForm, openDrawer, openModal } from '../components/overlays.js';
import { showToast } from '../components/toast.js';
import { $, esc, person } from '../core/dom.js';
import { projects } from '../data/projects.js';
import { setView } from '../core/navigation.js';
import { renderReviewOperations } from './review/reviewer-tasks.js';
import { state } from '../store/state.js';

let informationArchitectureApp;
let ops3FallbackApp;

function ops2Tab() {
  return state.view === 'ops-review'
    ? 'review'
    : state.view === 'ops-people'
      ? 'people'
      : state.view === 'ops-resources'
        ? 'resources'
        : 'projects';
}

function ops2Tabs() {
  if (!can(state.role, 'operations.view')) return '';
  return (
    '<div class="ops2-tabs"><button class="ops2-tab ' +
    (ops2Tab() === 'projects' ? 'active' : '') +
    '" data-ops2-action="tab" data-ops2-tab="projects">项目运营看板</button><button class="ops2-tab ' +
    (ops2Tab() === 'people' ? 'active' : '') +
    '" data-ops2-action="tab" data-ops2-tab="people">人员运营看板</button><button class="ops2-tab ' +
    (ops2Tab() === 'resources' ? 'active' : '') +
    '" data-ops2-action="tab" data-ops2-tab="resources">资源分配看板</button>' +
    (can(state.role, 'operations.view')
      ? '<button class="ops2-tab ' +
        (ops2Tab() === 'review' ? 'active' : '') +
        '" data-ops2-action="tab" data-ops2-tab="review">AI 检视看板</button>'
      : '') +
    '</div>'
  );
}
App.ops2Tabs = ops2Tabs;

export function ops2Metric(label, value, foot, kind) {
  return (
    '<div class="ops2-metric ' +
    (kind || '') +
    '"><div class="ops2-metric-label">' +
    label +
    '</div><div class="ops2-metric-value">' +
    value +
    '</div><div class="ops2-metric-foot">' +
    foot +
    '</div></div>'
  );
}

function ops2ProjectButton(id, name, meta) {
  return (
    '<button class="ops2-project-chip" data-ops2-action="open-project" data-ops2-project="' +
    id +
    '"><b>' +
    name +
    '</b><small>' +
    meta +
    '</small></button>'
  );
}

function ops2ProjectBoard() {
  return (
    '<div class="ops2-toolbar"><span class="ops2-spacer"></span><span class="mini-note">数据更新时间：刚刚</span></div><div class="ops2-grid cols-2"><div class="ops2-card"><div class="ops2-card-head"><strong>项目健康度矩阵</strong><span class="mini-note">点击项目定位异常</span></div><div class="ops2-matrix"><div class="ops2-quadrant good"><strong>高进度 · 高质量</strong>' +
    ops2ProjectButton('thermal', '液冷控制算法', '进度 72% · 质量 94%') +
    '</div><div class="ops2-quadrant mid"><strong>低进度 · 高质量</strong>' +
    ops2ProjectButton('gateway', '边缘网关适配', '进度 48% · 质量 91%') +
    '</div><div class="ops2-quadrant bad"><strong>高进度 · 低质量</strong>' +
    ops2ProjectButton('cloud', '设备云平台 3.0', '进度 81% · 质量 68%') +
    '</div><div class="ops2-quadrant bad"><strong>低进度 · 低质量</strong>' +
    ops2ProjectButton('algorithm', '智能温控预研', '进度 39% · 质量 62%') +
    '</div></div></div><div class="ops2-card"><div class="ops2-card-head"><strong>重点项目关注</strong><button class="op" data-ops2-action="focus-settings">管理关注项目</button></div><div class="ops2-card-body"><div class="ops2-list"><div class="ops2-list-row"><span class="mini-avatar">液</span><div class="grow"><strong>液冷控制算法预研</strong><small>王凯 · 进度 72% · 更新于刚刚</small></div><span class="tag orange">设备延期</span></div><div class="ops2-list-row"><span class="mini-avatar">云</span><div class="grow"><strong>设备云平台 3.0</strong><small>陈思 · 进度 81% · 更新于 10 分钟前</small></div><span class="tag red">质量风险</span></div><div class="ops2-list-row"><span class="mini-avatar">网</span><div class="grow"><strong>边缘网关适配</strong><small>赵敏 · 进度 48% · 更新于 18 分钟前</small></div><span class="tag blue">正常</span></div></div></div></div></div><div class="ops2-grid cols-2" style="margin-top:12px"><div class="ops2-card"><div class="ops2-card-head"><strong>延期风险预警</strong><span class="tag red">3 项异常</span></div><div class="ops2-card-body"><div class="ops2-alert"><b>整机联调环境交付延期</b><span>关键路径阻塞 · 已滞留 3 天 · 责任人：王凯</span></div><div class="ops2-alert"><b>设备云平台 3.0 · 版本验收即将逾期</b><span>里程碑：测试报告审核 · 剩余 2 天 · 责任人：赵敏</span></div><div class="ops2-alert"><b>边缘网关适配 · 接口联调任务阻塞</b><span>预计影响发布节点 · 责任人：李明</span></div></div></div><div class="ops2-card"><div class="ops2-card-head"><strong>质量趋势图</strong><span class="mini-note">按月 · 自动统计</span></div><div class="ops2-trend"><div class="ops2-trend-col"><i style="height:45%"></i><i class="alt" style="height:62%"></i></div><div class="ops2-trend-col"><i style="height:58%"></i><i class="alt" style="height:68%"></i></div><div class="ops2-trend-col"><i style="height:72%"></i><i class="alt" style="height:76%"></i></div><div class="ops2-trend-col"><i style="height:80%"></i><i class="alt" style="height:86%"></i></div><div class="ops2-trend-col"><i style="height:88%"></i><i class="alt" style="height:92%"></i></div></div><div class="ops2-xlabels"><span>4月</span><span>5月</span><span>6月</span><span>7月</span><span>8月</span></div><div class="ops2-legend"><span><i></i>发布通过率</span><span><i class="alt"></i>缺陷闭环率</span></div></div></div><div class="ops2-grid cols-2" style="margin-top:12px"><div class="ops2-card"><div class="ops2-card-head"><strong>缺陷闭环监控</strong><span class="tag red">未关闭 12</span></div><div class="ops2-card-body"><div class="ops2-list"><div class="ops2-list-row"><span class="tag red">严重</span><div class="grow"><strong>高并发设备消息上报丢包</strong><small>DFT-202608-0198 · 已超期 3 天 · 孙宁</small></div><button class="op" data-ops2-action="notify" data-ops2-person="孙宁">提醒</button></div><div class="ops2-list-row"><span class="tag orange">一般</span><div class="grow"><strong>断线重连状态同步延迟</strong><small>DFT-202608-0197 · 待处理 · 李明</small></div><button class="op" data-ops2-action="notify" data-ops2-person="李明">提醒</button></div></div></div></div><div class="ops2-card"><div class="ops2-card-head"><strong>测试进度总览</strong><span class="mini-note">按项目汇总</span></div><div class="ops2-table-wrap"><table class="ops2-table"><thead><tr><th>项目</th><th>用例总数</th><th>已执行</th><th>通过</th><th>失败</th><th>剩余</th></tr></thead><tbody><tr><td>液冷控制算法</td><td>128</td><td>105</td><td class="up">96</td><td class="down">9</td><td>23</td></tr><tr><td>设备云平台 3.0</td><td>96</td><td>80</td><td class="up">73</td><td class="down">7</td><td>16</td></tr><tr><td>边缘网关适配</td><td>64</td><td>42</td><td class="up">38</td><td class="down">4</td><td>22</td></tr></tbody></table></div></div></div>'
  );
}

/** 项目运营看板顶部的五个统计图（阶段分布、进度、趋势、缺陷构成、健康度）。 */
function ops2ProjectCharts() {
  var f = Object.entries(projects),
    counts = {};
  f.forEach(function (x) {
    var s = x[1].flowStatus || x[1].status;
    counts[s] = (counts[s] || 0) + 1;
  });

  var charts = '<div class="v47-ops-grid" style="margin-top:16px">';
  charts +=
    '<div class="v47-chart-card"><b>① 项目阶段分布 · 柱状图</b>' +
    ['立项阶段', '需求阶段', '设计阶段', '开发阶段', '测试阶段', '发布阶段', '已发布']
      .map(function (s) {
        var n = f.filter(function (x) {
          return (x[1].flowStatus || '').includes(s);
        }).length;
        return (
          '<div class="v47-bar"><span>' +
          s +
          '</span><div><i style="width:' +
          (n / Math.max(1, f.length)) * 100 +
          '%"></i></div><strong>' +
          n +
          '</strong></div>'
        );
      })
      .join('') +
    '</div>';
  charts +=
    '<div class="v47-chart-card"><b>② 里程碑达成 · 横向柱状图</b>' +
    f
      .slice(0, 6)
      .map(function (x) {
        var n = x[1].progress || 0;
        return (
          '<div class="v47-bar"><span>' +
          esc(x[1].name.slice(0, 8)) +
          '</span><div><i style="width:' +
          n +
          '%"></i></div><b>' +
          n +
          '%</b></div>'
        );
      })
      .join('') +
    '</div>';
  charts +=
    '<div class="v47-chart-card"><b>③ 项目延期趋势 · 折线图（历史 Mock）</b><svg viewBox="0 0 340 125" style="width:100%;max-height:125px;margin-top:8px"><path d="M20 92H330M20 50H330M20 10H330" stroke="#e3eaf4"/><polyline class="v47-line" points="20,55 76,65 132,38 188,52 244,22 310,35"/>' +
    [20, 76, 132, 188, 244, 310]
      .map(function (x, i) {
        return (
          '<text x="' +
          x +
          '" y="119" text-anchor="middle" font-size="10" fill="#667085">' +
          (i + 5) +
          '月</text>'
        );
      })
      .join('') +
    '</svg></div>';
  charts +=
    '<div class="v47-chart-card"><b>④ 需求变更结构 · 堆叠柱状图（历史 Mock）</b>' +
    [
      ['智能温控', 8, 3, 1],
      ['设备云', 5, 2, 1],
      ['边缘网关', 4, 3, 0],
      ['液冷算法', 6, 1, 1],
    ]
      .map(function (x) {
        var total = x[1] + x[2] + x[3];
        return (
          '<div style="padding:10px 0"><small>' +
          x[0] +
          ' · ' +
          total +
          ' 项</small><div class="v47-stack"><i style="width:' +
          (x[1] / total) * 100 +
          '%;background:#3874d5"></i><i style="width:' +
          (x[2] / total) * 100 +
          '%;background:#f79009"></i><i style="width:' +
          (x[3] / total) * 100 +
          '%;background:#98a2b3"></i></div></div>'
        );
      })
      .join('') +
    '<small>蓝：新增　橙：变更　灰：取消</small></div>';
  var risks = f.reduce(function (acc, x) {
    var status = x[1].health || '健康';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  charts +=
    '<div class="v47-chart-card"><b>⑤ 项目风险等级 · 分布条形图</b>' +
    Object.entries(risks)
      .map(function (x) {
        return (
          '<div class="v47-bar"><span>' +
          esc(x[0]) +
          '</span><div><i style="width:' +
          (x[1] / f.length) * 100 +
          '%;background:' +
          (x[0] === '风险' ? '#f79009' : '#42ad90') +
          '"></i></div><b>' +
          x[1] +
          '</b></div>'
        );
      })
      .join('') +
    '</div></div>';
  return charts;
}

function ops2Projects() {
  return ops2ProjectCharts() + ops2ProjectBoard();
}
App.ops2Projects = ops2Projects;

function ops2People() {
  return '<div class="ops2-toolbar"><select class="input ops2-select"><option>研发中心</option><option>软件一科</option><option>质量部</option></select><select class="input ops2-select"><option>未来 4 周</option><option>未来 1 周</option><option>未来 2 周</option></select><span class="ops2-spacer"></span><span class="mini-note">负载数据自动汇总项目与任务排期</span></div><div class="ops2-grid cols-2"><div class="ops2-card"><div class="ops2-card-head"><strong>人员负载总览</strong><span class="mini-note">部门全员 · 甘特排期</span></div><div class="ops2-card-body"><div class="ops2-members"><div class="ops2-member-bar"><span>赵敏</span><div class="bar"><i class="warn" style="width:112%"></i></div><b class="down">112%</b></div><div class="ops2-member-bar"><span>王凯</span><div class="bar"><i class="warn" style="width:104%"></i></div><b class="down">104%</b></div><div class="ops2-member-bar"><span>孙宁</span><div class="bar"><i style="width:86%"></i></div><b>86%</b></div><div class="ops2-member-bar"><span>李明</span><div class="bar"><i style="width:74%"></i></div><b>74%</b></div></div><div class="settings2-help" style="margin-top:14px">点击人员可查看项目明细、任务排期、剩余工时和当前卡点。</div></div></div><div class="ops2-card"><div class="ops2-card-head"><strong>人员效能趋势</strong><span class="mini-note">支持绩效分析</span></div><div class="ops2-card-body"><div class="ops2-grid cols-3"><div class="ops2-metric"><div class="ops2-metric-label">任务完成率</div><div class="ops2-metric-value">91%</div></div><div class="ops2-metric"><div class="ops2-metric-label">平均交付周期</div><div class="ops2-metric-value">4.6<span style="font-size:11px"> 天</span></div></div><div class="ops2-metric"><div class="ops2-metric-label">缺陷引入率</div><div class="ops2-metric-value down">3.2%</div></div></div><div class="ops2-alert" style="margin-top:14px;border-left-color:#e5a54b;background:#fffaf0;color:#80551b"><b>负载预警</b><span>赵敏当前负载 112%，建议主管调整测试任务排期。</span></div></div></div></div><div class="ops2-card" style="margin-top:12px"><div class="ops2-card-head"><strong>部门成员列表</strong><span class="mini-note">项目、人效与卡点统一视图</span></div><div class="ops2-table-wrap"><table class="ops2-table"><thead><tr><th>成员</th><th>部门 / 岗位</th><th>负责项目</th><th>参与项目</th><th>当前进度</th><th>剩余工时</th><th>卡点与风险</th><th>操作</th></tr></thead><tbody><tr><td>赵敏</td><td>质量部 / 测试工程师</td><td>1</td><td>2</td><td>72%</td><td>24h</td><td><span class="tag red">设备待交付</span></td><td><button class="op" data-ops2-action="person-detail" data-ops2-person="赵敏">查看</button></td></tr><tr><td>王凯</td><td>项目管理 / 项目经理</td><td>2</td><td>1</td><td>68%</td><td>18h</td><td><span class="tag orange">联调延期</span></td><td><button class="op" data-ops2-action="person-detail" data-ops2-person="王凯">查看</button></td></tr><tr><td>孙宁</td><td>软件一科 / 后端开发</td><td>1</td><td>2</td><td>86%</td><td>12h</td><td><span class="tag blue">正常</span></td><td><button class="op" data-ops2-action="person-detail" data-ops2-person="孙宁">查看</button></td></tr></tbody></table></div></div><div class="ops2-card" style="margin-top:12px"><div class="ops2-card-head"><strong>资源空闲度分析</strong><span class="mini-note">未来 1—4 周可分配工时</span></div><div class="ops2-table-wrap"><table class="ops2-table"><thead><tr><th>成员</th><th>第 1 周</th><th>第 2 周</th><th>第 3 周</th><th>第 4 周</th><th>建议</th></tr></thead><tbody><tr><td>赵敏</td><td class="down">0h</td><td class="down">4h</td><td>12h</td><td>18h</td><td>不建议插单</td></tr><tr><td>孙宁</td><td>8h</td><td>12h</td><td>18h</td><td>24h</td><td>可承接小型任务</td></tr><tr><td>李明</td><td>16h</td><td>22h</td><td>26h</td><td>28h</td><td>可调配</td></tr></tbody></table></div></div>';
}

function ops2Resources() {
  return '<div class="ops2-toolbar"><select class="input ops2-select"><option>研发中心</option><option>软件一科</option><option>质量部</option><option>产品与设计</option></select><button class="btn" data-ops2-action="resource-filter">技能标签筛选</button><span class="ops2-spacer"></span><span class="mini-note">资源数据来源：项目排期、任务工时与组织架构</span></div><div class="ops2-card"><div class="ops2-card-head"><strong>部门资源池</strong><span class="mini-note">按技术方向 / 技能标签分组</span></div><div class="ops2-card-body"><div class="ops2-skill-grid"><div class="ops2-skill"><strong>后端开发</strong><small>4 人 · 平均负载 88%</small><div class="people"><span class="ops2-person">孙宁 · 86%</span><span class="ops2-person busy">李明 · 104%</span><span class="ops2-person">周航 · 74%</span></div></div><div class="ops2-skill"><strong>测试工程</strong><small>3 人 · 平均负载 103%</small><div class="people"><span class="ops2-person busy">赵敏 · 112%</span><span class="ops2-person busy">陈璐 · 101%</span><span class="ops2-person">刘洋 · 96%</span></div></div><div class="ops2-skill"><strong>产品与设计</strong><small>3 人 · 平均负载 68%</small><div class="people"><span class="ops2-person">何盈 · 68%</span><span class="ops2-person">王凯 · 82%</span></div></div></div></div></div><div class="ops2-card" style="margin-top:12px"><div class="ops2-card-head"><strong>项目资源占用</strong><span class="tag red">2 项资源冲突</span></div><div class="ops2-table-wrap"><table class="ops2-table"><thead><tr><th>成员</th><th>项目 A</th><th>项目 B</th><th>总负载</th><th>冲突原因</th><th>处理</th></tr></thead><tbody><tr><td>王凯</td><td>液冷算法 68%</td><td>边缘网关 36%</td><td class="down">104%</td><td>排期重叠</td><td><button class="op" data-ops2-action="resource-request">发起调配</button></td></tr><tr><td>李明</td><td>设备云 74%</td><td>液冷算法 34%</td><td class="down">108%</td><td>关键任务并行</td><td><button class="op" data-ops2-action="resource-request">发起调配</button></td></tr><tr><td>孙宁</td><td>液冷算法 62%</td><td>—</td><td>62%</td><td>正常</td><td>—</td></tr></tbody></table></div></div><div class="ops2-grid cols-2" style="margin-top:12px"><div class="ops2-card"><div class="ops2-card-head"><strong>资源需求预测</strong><span class="mini-note">基于待立项项目预估工时</span></div><div class="ops2-card-body"><div class="ops2-trend"><div class="ops2-trend-col"><i style="height:54%"></i><i class="alt" style="height:72%"></i></div><div class="ops2-trend-col"><i style="height:68%"></i><i class="alt" style="height:86%"></i></div><div class="ops2-trend-col"><i style="height:76%"></i><i class="alt" style="height:94%"></i></div><div class="ops2-trend-col"><i style="height:61%"></i><i class="alt" style="height:82%"></i></div></div><div class="ops2-xlabels"><span>8月</span><span>9月</span><span>10月</span><span>11月</span></div><div class="ops2-alert" style="margin-top:12px;border-left-color:#e5a54b;background:#fffaf0;color:#80551b"><b>资源缺口预测</b><span>9 月预计存在 2 人资源缺口，建议提前发起跨部门调配。</span></div></div></div><div class="ops2-card"><div class="ops2-card-head"><strong>跨部门调配记录</strong><button class="btn primary" data-ops2-action="resource-request">发起调配申请</button></div><div class="ops2-table-wrap"><table class="ops2-table"><thead><tr><th>调配对象</th><th>来源部门</th><th>目标项目</th><th>周期</th><th>审批状态</th><th>操作</th></tr></thead><tbody><tr><td>陈璐 · 测试工程师</td><td>软件二科</td><td>液冷控制算法</td><td>08/15—09/12</td><td><span class="tag orange">审批中</span></td><td><button class="op" data-ops2-action="approve">审批</button></td></tr><tr><td>李明 · 后端开发</td><td>软件一科</td><td>设备云平台</td><td>08/18—09/05</td><td><span class="tag green">已通过</span></td><td><button class="op" data-ops2-action="resource-detail">查看</button></td></tr></tbody></table></div></div></div>';
}

function applyOps2Surface() {
  if (
    state.view !== 'ops-projects' &&
    state.view !== 'ops-people' &&
    state.view !== 'ops-resources' &&
    state.view !== 'ops-review'
  )
    return;
  var app = $('#appView');
  if (!app || app.querySelector('.ops2-page')) return;
  app.innerHTML = App.renderOps2();
}

const informationArchitectureObserver = new MutationObserver(function () {
  applyOps2Surface();
});

function ops2Head(title, subtitle) {
  var actions =
    '<button class="btn" data-ops2-action="refresh">↻ 刷新数据</button><button class="btn" data-ops2-action="export">导出报告</button>';
  return (
    '<div class="ops2-head"><div><h2>' +
    title +
    '</h2>' +
    (subtitle ? '<p>' + subtitle + '</p>' : '') +
    '</div><div class="ops2-actions">' +
    actions +
    '</div></div>'
  );
}

function ops3ProjectAnalytics() {
  return '<section class="ops3-analysis"><div class="ops3-analysis-head"><div><h3>项目运营数据分析</h3><p>基于当前部门与项目类型筛选条件自动汇总，支持从分布、趋势和风险三个维度查看交付情况。</p></div><span class="mini-note">数据更新时间：刚刚</span></div><div class="ops3-grid"><div class="ops2-card ops3-card"><div class="ops2-card-head"><strong>项目状态分布</strong><span class="mini-note">共 24 个项目</span></div><div class="ops3-card-body"><div class="ops3-ring-layout"><div class="ops3-ring"><span><b>24</b><small>项目总数</small></span></div><div class="ops3-legend"><div><i class="blue"></i><span>进行中</span><b>16 · 67%</b></div><div><i class="light-blue"></i><span>已完成</span><b>5 · 21%</b></div><div><i class="orange"></i><span>待开始</span><b>2 · 8%</b></div><div><i class="red"></i><span>已延期</span><b>1 · 4%</b></div></div></div></div></div><div class="ops2-card ops3-card"><div class="ops2-card-head"><strong>项目类型分布</strong><span class="mini-note">按项目数</span></div><div class="ops3-card-body"><div class="ops3-hbars"><div class="ops3-hbar"><span>产品开发</span><div><i style="width:92%"></i></div><b>10</b></div><div class="ops3-hbar"><span>预研项目</span><div><i style="width:66%"></i></div><b>7</b></div><div class="ops3-hbar"><span>紧急定制</span><div><i class="orange" style="width:42%"></i></div><b>4</b></div><div class="ops3-hbar"><span>设备适配</span><div><i class="light" style="width:30%"></i></div><b>3</b></div></div><div class="ops3-card-note"><span>产品开发占比最高</span><b>41.7%</b></div></div></div><div class="ops2-card ops3-card"><div class="ops2-card-head"><strong>项目健康等级</strong><span class="mini-note">进度、质量与风险综合</span></div><div class="ops3-card-body"><div class="ops3-health"><div><span class="ops3-health-label"><i class="good"></i>健康</span><b>14</b><em>58%</em></div><div><span class="ops3-health-label"><i class="normal"></i>关注</span><b>7</b><em>29%</em></div><div><span class="ops3-health-label"><i class="warn"></i>预警</span><b>2</b><em>8%</em></div><div><span class="ops3-health-label"><i class="danger"></i>高风险</span><b>1</b><em>4%</em></div></div><div class="ops3-stacked"><i class="good" style="width:58%"></i><i class="normal" style="width:29%"></i><i class="warn" style="width:8%"></i><i class="danger" style="width:5%"></i></div></div></div></div><div class="ops3-grid ops3-grid-wide"><div class="ops2-card ops3-card"><div class="ops2-card-head"><strong>月度交付计划与实际</strong><span class="mini-note">单位：项目数</span></div><div class="ops3-card-body"><div class="ops3-vchart"><div class="ops3-vitem"><div><i style="height:62%"></i><i class="alt" style="height:45%"></i></div><span>4月</span></div><div class="ops3-vitem"><div><i style="height:76%"></i><i class="alt" style="height:58%"></i></div><span>5月</span></div><div class="ops3-vitem"><div><i style="height:84%"></i><i class="alt" style="height:70%"></i></div><span>6月</span></div><div class="ops3-vitem"><div><i style="height:72%"></i><i class="alt" style="height:64%"></i></div><span>7月</span></div><div class="ops3-vitem"><div><i style="height:94%"></i><i class="alt" style="height:82%"></i></div><span>8月</span></div></div><div class="ops3-chart-legend"><span><i></i>计划交付</span><span><i class="alt"></i>实际交付</span><b>本月按时交付率 92%</b></div></div></div><div class="ops2-card ops3-card"><div class="ops2-card-head"><strong>风险与质量分布</strong><span class="mini-note">项目数量</span></div><div class="ops3-card-body"><div class="ops3-risk-row"><span>高风险项目</span><div><i class="danger" style="width:22%"></i></div><b class="down">3</b></div><div class="ops3-risk-row"><span>中风险项目</span><div><i class="warn" style="width:45%"></i></div><b>6</b></div><div class="ops3-risk-row"><span>低风险项目</span><div><i class="good" style="width:82%"></i></div><b>15</b></div><div class="ops3-divider"></div><div class="ops3-inline-stats"><div><small>缺陷闭环率</small><strong>86%</strong><span class="up">较上月 +8%</span></div><div><small>版本发布通过率</small><strong>94%</strong><span class="up">较上月 +4%</span></div><div><small>阻塞任务</small><strong class="down">7</strong><span>需重点跟进</span></div></div></div></div></div></section>';
}

function renderOps2() {
  if (!can(state.role, 'operations.view'))
    return '<section class="page ops2-page"><div class="notice warn">运营看板仅部门主管可查看。</div><button class="btn primary" data-v47="go-home">返回个人工作台</button></section>';
  var tab = ops2Tab();
  if (tab === 'review' && !can(state.role, 'operations.view')) {
    state.view = 'ops-projects';
    tab = 'projects';
  }
  var body =
    tab === 'review'
      ? renderReviewOperations()
      : tab === 'people'
        ? ops2People()
        : tab === 'resources'
          ? ops2Resources()
          : App.ops2Projects();
  return (
    '<section class="page"><div class="ops2-page">' +
    ops2Head(
      tab === 'review'
        ? 'AI 检视运营看板'
        : tab === 'people'
          ? '人员运营看板'
          : tab === 'resources'
            ? '资源分配看板'
            : '项目运营看板',
      tab === 'review'
        ? '主管视图 · AI 检视演示数据（Mock，不连接真实服务）'
        : tab === 'projects'
          ? ''
          : '主管专用视图 · 数据自动统计',
    ) +
    App.ops2Tabs() +
    body +
    (tab === 'projects' ? ops3ProjectAnalytics() : '') +
    '</div></section>'
  );
}
App.renderOps2 = renderOps2;

function ensureOps3Fallback() {
  if (state.view !== 'ops-projects') return;
  var app = $('#appView');
  if (!app || app.querySelector('.ops3-analysis')) return;
  var host = app.querySelector('.ops2-page') || app.querySelector('.page');
  if (host) host.insertAdjacentHTML('beforeend', ops3ProjectAnalytics());
}

const ops3FallbackObserver = new MutationObserver(function () {
  ensureOps3Fallback();
});

/** 运营看板 */
export function initOperations() {
  informationArchitectureApp = $('#appView');
  if (informationArchitectureApp)
    informationArchitectureObserver.observe(informationArchitectureApp, {
      childList: true,
      subtree: true,
    });
  setTimeout(function () {
    applyOps2Surface();
  }, 0);
  document.addEventListener('click', function (e) {
    var ops = e.target.closest('[data-ops2-action]');
    if (ops) {
      e.preventDefault();
      e.stopPropagation();
      var action = ops.dataset.ops2Action;
      if (action === 'tab') {
        setView('ops-' + ops.dataset.ops2Tab);
        return;
      }
      if (action === 'refresh') {
        showToast('运营数据已刷新，指标已重新计算');
        return;
      }
      if (action === 'export') {
        showToast('当前看板报告已导出');
        return;
      }
      if (action === 'open-project') {
        state.projectId = ops.dataset.ops2Project || 'thermal';
        setView('project-overview');
        return;
      }
      if (action === 'focus-settings') {
        showToast('已打开重点项目关注设置');
        return;
      }
      if (action === 'notify') {
        showToast('已向 ' + (ops.dataset.ops2Person || '负责人') + ' 发送提醒');
        return;
      }
      if (action === 'person-detail') {
        openDrawer(
          (ops.dataset.ops2Person || '成员') + ' · 人员运营明细',
          '<div class="status-line">' +
            person(ops.dataset.ops2Person || '赵敏', (ops.dataset.ops2Person || '赵').slice(0, 1)) +
            ' <span class="tag orange">当前负载 112%</span></div><div class="kv-grid"><div class="kv"><label>负责 / 参与项目</label><div>1 / 2 个</div></div><div class="kv"><label>已耗用工时</label><div>86h</div></div><div class="kv"><label>未来可分配</label><div>18h</div></div></div><div class="detail-section"><h4>当前卡点</h4><p>设备交付延期导致测试任务排期受阻，建议主管调整资源。</p></div>',
        );
        return;
      }
      if (action === 'resource-filter') {
        showToast('已打开技能标签与忙闲状态筛选');
        return;
      }
      if (action === 'resource-request') {
        openModal(
          'resource-request',
          '跨部门资源调配申请',
          modalForm('resource-request', [
            { label: '调配对象', required: true, value: '陈璐 · 测试工程师' },
            { label: '来源部门', required: true, value: '软件二科' },
            { label: '目标项目', required: true, value: '液冷控制算法预研' },
            { label: '生效周期', required: true, value: '2026-08-15 — 2026-09-12' },
            { label: '调配原因', required: true, area: true, wide: true },
          ]),
          '<button class="btn" data-action="close-modal">取消</button><button class="btn primary" data-action="modal-save">提交审批</button>',
        );
        return;
      }
      if (action === 'approve') {
        showToast('资源调配申请已进入审批流程');
        return;
      }
      if (action === 'resource-detail') {
        openDrawer(
          '资源调配记录详情',
          '<div class="detail-section"><h4>陈璐 · 测试工程师</h4><p>软件二科 → 液冷控制算法预研</p><p>生效周期：2026-08-15 — 2026-09-12</p></div><div class="timeline"><div class="timeline-item"><b>审批通过</b><small>部门主管 · 08-14 16:20</small></div><div class="timeline-item"><b>调配申请</b><small>王凯 · 08-14 15:10</small></div></div>',
        );
        return;
      }
    }
  });
  document.addEventListener('change', function (e) {
    var filter = e.target.closest('[data-ops2-filter]');
    if (filter) showToast('已按' + (filter.value || '当前条件') + '刷新运营数据');
  });
  ops3FallbackApp = $('#appView');
  if (ops3FallbackApp)
    ops3FallbackObserver.observe(ops3FallbackApp, { childList: true, subtree: true });
  setTimeout(ensureOps3Fallback, 0);
}
