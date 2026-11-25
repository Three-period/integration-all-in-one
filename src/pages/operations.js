/** 运营看板：项目、人员、资源与 AI 检视运营。 */
import { App } from '../core/app.js';
import { modalForm, openDrawer, openModal } from '../components/overlays.js';
import { commonHead } from '../components/shell.js';
import { showToast } from '../components/toast.js';
import { $, person, tag } from '../core/dom.js';
import { setView } from '../core/navigation.js';
import { renderReviewOperations } from './review/reviewer-tasks.js';
import { state } from '../store/state.js';

let informationArchitectureApp;
let ops3FallbackApp;

function opsFilters() {
  return `<div class="ops-toolbar"><select class="input" data-ops-filter><option>组织：研发中心</option><option>软件一科</option><option>软件二科</option><option>质量部</option></select><select class="input" data-ops-filter><option>项目类型：全部</option><option>产品开发</option><option>预研项目</option><option>紧急定制</option></select><select class="input" data-ops-filter><option>周期：近 4 周</option><option>本季度</option><option>今年</option></select><select class="input" data-ops-filter><option>负责人：全部</option><option>王凯</option><option>赵敏</option><option>孙宁</option></select><button class="btn" data-action="ops-refresh">↻ 刷新数据</button><button class="btn" data-action="ops-export">导出当前看板</button><span class="mini-note" style="margin-left:auto">数据口径版本 V1.2 · 最近更新 18:00</span></div>`;
}

function renderOperations(tab) {
  const tabs = [
    ['projects', '项目运营看板'],
    ['people', '人员运营看板'],
    ['resources', '资源分配看板'],
  ];
  let body = '';
  if (tab === 'projects')
    body = `${opsFilters()}<div class="grid cols-4"><div class="card metric ops-kpi"><div class="metric-label">总项目数</div><div class="metric-value">24</div><div class="metric-foot">进行中 18 · 已结项 4</div></div><div class="card metric ops-kpi"><div class="metric-label">按时交付率</div><div class="metric-value">86<span class="metric-unit">%</span></div><div class="metric-foot"><span class="up">↑ 5%</span><span>较上季度</span></div></div><div class="card metric ops-kpi"><div class="metric-label">延期风险项目</div><div class="metric-value down">3</div><div class="metric-foot"><span>未来 3 天到期</span><span class="down">1 个高风险</span></div></div><div class="card metric ops-kpi"><div class="metric-label">本月交付</div><div class="metric-value">6</div><div class="metric-foot">通过验收 5 · 待结项 1</div></div></div><div class="grid cols-2" style="margin-top:14px"><div class="card card-pad ops-panel"><div class="card-head"><div><h3 class="section-title" style="margin:0">项目健康度矩阵</h3><p class="ops-subtitle">X 轴：里程碑进度得分 · Y 轴：质量得分；点击项目下钻</p></div><span class="mini-note">每小时刷新</span></div><div class="ops-matrix"><button class="ops-point tag green" style="left:70%;top:23%" data-action="ops-open-project" data-project="thermal">智能温控 82</button><button class="ops-point tag blue" style="left:52%;top:42%" data-action="ops-open-project" data-project="cloud">设备云 71</button><button class="ops-point tag orange" style="left:39%;top:60%" data-action="ops-open-project" data-project="algorithm">控制算法 63</button><button class="ops-point tag red" style="left:21%;top:76%" data-action="ops-open-project" data-project="gateway">边缘网关 54</button></div><div class="legend"><span><i style="background:#6fd6a1"></i>健康</span><span><i style="background:#ffd49a"></i>关注</span><span><i style="background:#ff9d9d"></i>异常</span></div></div><div class="card card-pad ops-panel"><div class="card-head"><div><h3 class="section-title" style="margin:0">重点项目关注</h3><p class="ops-subtitle">主管手动标记，实时展示进度、风险与负责人</p></div><span class="mini-note">${(state.opsFocus || ['thermal', 'gateway']).length} 个重点项目</span></div><div class="ops-list">${[
      ['thermal', '智能温控平台 V2.6', '进度 72% · 负责人 王凯', '高风险', 'orange'],
      ['gateway', '边缘计算网关适配', '进度 54% · 负责人 陈思', '需介入', 'red'],
      ['algorithm', '液冷控制算法预研', '进度 38% · 负责人 赵敏', '资源冲突', 'orange'],
    ]
      .map(
        (x) =>
          `<div class="ops-list-item"><button class="op" data-action="ops-toggle-focus" data-project="${x[0]}" title="标记重点">${(state.opsFocus || ['thermal', 'gateway']).includes(x[0]) ? '★' : '☆'}</button><div class="grow"><strong>${x[1]}</strong><small>${x[2]}</small></div>${tag(x[3], x[4])}<button class="op" data-action="ops-open-project" data-project="${x[0]}">下钻</button></div>`,
      )
      .join(
        '',
      )}</div></div></div><div class="grid cols-2" style="margin-top:14px"><div class="card card-pad ops-panel"><div class="card-head"><div><h3 class="section-title" style="margin:0">延期风险预警</h3><p class="ops-subtitle">延期项目、未来 3 天到期里程碑和关键路径阻塞任务</p></div><span class="tag red">3 项</span></div><div class="ops-list">${[
      ['边缘计算网关适配', '项目延期 4 天 · 负责人 陈思', '项目调整', 'gateway', 'red'],
      ['智能温控平台 V2.6', '联调里程碑明日到期 · 王凯', '项目概况', 'thermal', 'orange'],
      ['液冷控制算法预研', '关键任务被资源冲突阻塞 · 赵敏', '项目调整', 'algorithm', 'orange'],
    ]
      .map(
        (x) =>
          `<div class="ops-list-item"><i class="mini-avatar" style="background:${x[4] === 'red' ? '#fff1f0' : '#fff7ed'};color:${x[4] === 'red' ? '#d92d20' : '#b54708'}">!</i><div class="grow"><strong>${x[0]}</strong><small>${x[1]}</small></div>${tag(x[2], x[4])}<button class="op" data-action="ops-drill-risk" data-project="${x[3]}">查看</button></div>`,
      )
      .join(
        '',
      )}</div></div><div class="card card-pad ops-panel"><div class="card-head"><div><h3 class="section-title" style="margin:0">质量趋势图</h3><p class="ops-subtitle">发布通过率、缺陷密度、缺陷闭环率、用例执行率</p></div><select class="input" style="width:80px"><option>按月</option><option>按周</option></select></div><div class="ops-trend"><i style="height:46%"></i><i style="height:57%"></i><i style="height:69%"></i><i style="height:81%"></i><i style="height:72%"></i><i style="height:88%"></i></div><div class="ops-trend-label"><span>3月</span><span>4月</span><span>5月</span><span>6月</span><span>7月</span><span>8月</span></div><div class="legend"><span><i style="background:#9bbcff"></i>发布通过率</span><span><i style="background:#ffd49a"></i>缺陷闭环率</span></div></div></div><div class="grid cols-2" style="margin-top:14px"><div class="card card-pad ops-panel"><div class="card-head"><div><h3 class="section-title" style="margin:0">缺陷闭环监控</h3><p class="ops-subtitle">未关闭的致命/严重缺陷与超过 3 天未处理项</p></div><span class="tag red">4 个严重缺陷</span></div><div class="ops-list"><div class="ops-list-item"><span class="tag red">严重</span><div class="grow"><strong>DFT-0198 · 高并发消息上报丢包</strong><small>已待验证 3 天 · 指派人 孙宁</small></div><button class="op" data-action="ops-notify" data-person="孙宁">提醒负责人</button><button class="op" data-action="ops-open-defect">查看</button></div><div class="ops-list-item"><span class="tag red">致命</span><div class="grow"><strong>DFT-0189 · 设备批量升级失败</strong><small>已打开 1 天 · 指派人 李明</small></div><button class="op" data-action="ops-notify" data-person="李明">提醒负责人</button><button class="op" data-action="ops-open-defect">查看</button></div></div></div><div class="card ops-panel"><div class="card-head"><div><h3 class="section-title" style="margin:0">测试进度总览</h3><p class="ops-subtitle">每行一个项目，支持点击进入项目测试阶段</p></div><span class="mini-note">用例执行率 82%</span></div><div class="table-wrap"><table class="table"><thead><tr><th>项目</th><th>用例总数</th><th>已执行</th><th>通过</th><th>失败</th><th>剩余</th><th>操作</th></tr></thead><tbody>${[
      ['智能温控', '128', '105', '96', '9', '23', 'thermal'],
      ['设备云平台', '96', '80', '73', '7', '16', 'cloud'],
      ['边缘网关', '64', '64', '52', '12', '0', 'gateway'],
    ]
      .map(
        (x) =>
          `<tr><td class="link">${x[0]}</td><td>${x[1]}</td><td>${x[2]}</td><td class="up">${x[3]}</td><td class="down">${x[4]}</td><td>${x[5]}</td><td><button class="op" data-action="ops-open-project" data-project="${x[6]}">查看项目</button></td></tr>`,
      )
      .join('')}</tbody></table></div></div></div>`;
  if (tab === 'people')
    body = `${opsFilters()}<div class="grid cols-2"><div class="card card-pad ops-panel"><div class="card-head"><div><h3 class="section-title" style="margin:0">人员负载总览</h3><p class="ops-subtitle">未来 4 周任务排期；点击人员查看项目明细、卡点和风险</p></div><span class="mini-note">标准工时 160h</span></div><div class="ops-bars">${[
      ['赵敏', 112, 'danger', '缺陷阻塞'],
      ['王凯', 104, 'warn', '需求变更'],
      ['孙宁', 86, 'ok', '无'],
      ['李明', 74, 'ok', '无'],
    ]
      .map(
        (x) =>
          `<div class="ops-bar-row"><span>${person(x[0], x[0][0])}</span><div class="bar"><i style="width:${Math.min(x[1], 120) / 1.2}%;background:${x[2] === 'danger' ? '#f97066' : x[2] === 'warn' ? '#fdb022' : '#6fd6a1'}"></i></div><b class="${x[2] === 'danger' ? 'down' : x[2] === 'warn' ? 'up' : ''}">${x[1]}%</b><button class="op" data-action="ops-open-person" data-person="${x[0]}">明细</button></div>`,
      )
      .join(
        '',
      )}</div><div class="setting-detail"><b>负载口径</b><span class="ops-subtitle">已分配任务工时 ÷ 未来 4 周标准工时；超过 100% 黄色、超过 120% 红色。</span></div></div><div class="card card-pad ops-panel"><div class="card-head"><div><h3 class="section-title" style="margin:0">人员效能趋势</h3><p class="ops-subtitle">按人员统计任务完成率、平均交付周期和引入缺陷率</p></div><select class="input" style="width:80px"><option>部门</option><option>个人</option></select></div><div class="grid cols-3"><div class="metric"><div class="metric-label">任务完成率</div><div class="metric-value">91<span class="metric-unit">%</span></div><div class="metric-foot">↑ 6% 较上月</div></div><div class="metric"><div class="metric-label">平均交付周期</div><div class="metric-value">4.6<span class="metric-unit">天</span></div><div class="metric-foot">↓ 0.8 天</div></div><div class="metric"><div class="metric-label">引入缺陷率</div><div class="metric-value down">3.2<span class="metric-unit">%</span></div><div class="metric-foot">目标 ≤ 3%</div></div></div><div class="ops-trend" style="margin-top:15px"><i style="height:44%"></i><i style="height:62%"></i><i style="height:58%"></i><i style="height:79%"></i><i style="height:86%"></i><i style="height:94%"></i></div><div class="ops-trend-label"><span>3月</span><span>4月</span><span>5月</span><span>6月</span><span>7月</span><span>8月</span></div></div></div><div class="card" style="margin-top:14px"><div class="card-head"><div><span class="card-title">部门成员列表</span><span class="card-note">项目参与、工时、卡点和资源空闲度</span></div><button class="btn" data-action="ops-export">导出人员明细</button></div><div class="table-wrap"><table class="table"><thead><tr><th>成员</th><th>部门 / 岗位</th><th>负责项目</th><th>参与项目</th><th>已耗用 / 剩余工时</th><th>卡点与风险</th><th>未来 4 周可分配</th><th>操作</th></tr></thead><tbody>${[
      ['赵敏', '质量部 / 测试工程师', '1', '2', '86h / 24h', '设备待交付', '18h', 'danger'],
      ['孙宁', '软件一科 / 后端开发', '2', '1', '124h / 32h', '无', '36h', 'ok'],
      ['李明', '软件一科 / 后端开发', '1', '2', '78h / 45h', '无', '52h', 'ok'],
      ['王凯', '软件一科 / 项目经理', '2', '3', '96h / 28h', '需求变更', '12h', 'warn'],
    ]
      .map(
        (x) =>
          `<tr><td>${person(x[0], x[0][0])}</td><td>${x[1]}</td><td>${x[2]}</td><td>${x[3]}</td><td>${x[4]}</td><td>${x[6] === 'danger' ? tag(x[5], 'red') : x[6] === 'warn' ? tag(x[5], 'orange') : '—'}</td><td class="${x[6] === 'danger' ? 'down' : x[6] === 'warn' ? 'up' : ''}">${x[6] === 'danger' ? '18h' : x[6] === 'warn' ? '12h' : '36h'}</td><td><button class="op" data-action="ops-open-person" data-person="${x[0]}">查看明细</button></td></tr>`,
      )
      .join('')}</tbody></table></div></div>`;
  if (tab === 'resources')
    body = `${opsFilters()}<div class="grid cols-2"><div class="card card-pad ops-panel"><div class="card-head"><div><h3 class="section-title" style="margin:0">部门资源池</h3><p class="ops-subtitle">按技术方向与技能标签分组，展示成员忙闲状态</p></div><button class="btn" data-action="ops-resource-filter">技能筛选</button></div><div class="resource-group"><div class="resource-head"><span>后端开发</span><span class="mini-note">4 人 · 平均 88%</span></div><div><span class="ops-chip">孙宁 · 86%</span><span class="ops-chip warn">李明 · 104%</span><span class="ops-chip">周航 · 74%</span><span class="ops-chip">陈涛 · 82%</span></div></div><div class="resource-group"><div class="resource-head"><span>测试工程</span><span class="mini-note">3 人 · 平均 103%</span></div><div><span class="ops-chip danger">赵敏 · 112%</span><span class="ops-chip warn">陈璐 · 101%</span><span class="ops-chip">刘洋 · 96%</span></div></div><div class="resource-group"><div class="resource-head"><span>产品与设计</span><span class="mini-note">3 人 · 平均 68%</span></div><div><span class="ops-chip">何盈 · 68%</span><span class="ops-chip warn">王凯 · 104%</span></div></div></div><div class="card ops-panel"><div class="card-head"><div><h3 class="section-title" style="margin:0">项目资源占用</h3><p class="ops-subtitle">同一人员被多个项目占用且超负载时自动标红</p></div><span class="tag red">2 个冲突</span></div><div class="table-wrap"><table class="table"><thead><tr><th>项目</th><th>成员数</th><th>占用工时</th><th>负载率</th><th>冲突成员</th><th>操作</th></tr></thead><tbody><tr><td>智能温控平台 V2.6</td><td>8</td><td>486h</td><td>92%</td><td>赵敏</td><td><button class="op" data-action="ops-resource-detail">查看占用</button></td></tr><tr><td>设备云平台 3.0</td><td>6</td><td>318h</td><td class="down">108%</td><td class="down">王凯、李明</td><td><button class="op" data-action="ops-resource-detail">查看冲突</button></td></tr><tr><td>边缘计算网关适配</td><td>5</td><td>224h</td><td>78%</td><td>—</td><td><button class="op" data-action="ops-resource-detail">查看占用</button></td></tr></tbody></table></div></div></div><div class="grid cols-2" style="margin-top:14px"><div class="card card-pad ops-panel"><div class="card-head"><div><h3 class="section-title" style="margin:0">资源需求预测</h3><p class="ops-subtitle">基于待立项项目预估工时，预测未来月份资源缺口</p></div><span class="mini-note">预测窗口：未来 4 个月</span></div><div class="ops-trend"><i style="height:52%"></i><i style="height:76%"></i><i style="height:93%"></i><i style="height:68%"></i></div><div class="ops-trend-label"><span>8月</span><span>9月</span><span>10月</span><span>11月</span></div><div class="legend"><span><i style="background:#9bbcff"></i>可用资源</span><span><i style="background:#ffd49a"></i>预计需求</span></div><div class="notice warn" style="margin-top:13px"><i>!</i><span>10 月预计存在 4 人资源缺口，建议提前发起跨部门调配。</span></div></div><div class="card ops-panel"><div class="card-head"><div><span class="card-title">跨部门调配记录</span><span class="card-note">借调、释放、审批和实际生效时间</span></div><button class="btn primary" data-action="ops-resource-request">发起调配申请</button></div><div class="table-wrap"><table class="table"><thead><tr><th>调配对象</th><th>来源部门</th><th>目标项目</th><th>周期</th><th>申请人</th><th>审批状态</th><th>操作</th></tr></thead><tbody><tr><td>陈璐 · 测试工程师</td><td>软件二科</td><td>智能温控平台</td><td>08/15—09/12</td><td>王凯</td><td>${tag('审批中', 'orange')}</td><td><button class="op" data-action="ops-approve-resource">审批</button></td></tr><tr><td>李明 · 后端开发</td><td>软件一科</td><td>设备云平台</td><td>08/18—09/05</td><td>赵敏</td><td>${tag('已通过', 'green')}</td><td><button class="op" data-action="ops-resource-detail">查看留痕</button></td></tr></tbody></table></div></div></div>`;
  return `<section class="page">${commonHead('运营看板', tabs.find((x) => x[0] === tab)[1], '主管视角的项目健康度、人员负载、资源占用与调配分析。', '<button class="btn" data-action="ops-export">导出报告</button>')}<div class="tabs">${tabs.map(([k, n]) => `<button class="tab ${tab === k ? 'active' : ''}" data-action="ops-tab" data-tab="${k}">${n}</button>`).join('')}</div>${body}</section>`;
}
App.renderOperations = renderOperations;

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
  return (
    '<div class="ops2-tabs"><button class="ops2-tab ' +
    (ops2Tab() === 'projects' ? 'active' : '') +
    '" data-ops2-action="tab" data-ops2-tab="projects">项目运营看板</button><button class="ops2-tab ' +
    (ops2Tab() === 'people' ? 'active' : '') +
    '" data-ops2-action="tab" data-ops2-tab="people">人员运营看板</button><button class="ops2-tab ' +
    (ops2Tab() === 'resources' ? 'active' : '') +
    '" data-ops2-action="tab" data-ops2-tab="resources">资源分配看板</button>' +
    (state.role === 'supervisor'
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

function ops2Projects() {
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
  var tab = ops2Tab();
  if (tab === 'review' && state.role !== 'supervisor') {
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
