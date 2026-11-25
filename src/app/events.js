/** 全局事件：data-nav / data-action 点击分发与页面级事件绑定。 */
import { App } from '../core/app.js';
import { closeDrawer, modalForm, openDrawer, openModal } from '../components/overlays.js';
import { showToast } from '../components/toast.js';
import { $, $$, person, tag } from '../core/dom.js';
import { projectView, setView } from '../core/navigation.js';
import { projects } from '../data/projects.js';
import { defaultLayouts } from '../data/roles.js';
import {
  closeCustomizer,
  openCustomizer,
  renderCustomizer,
} from '../pages/workbench/customizer.js';
import { saveCurrentLayout } from '../store/layout.js';
import { project, state } from '../store/state.js';

export function bindPageEvents() {
  $$('#globalSearch').forEach(
    (el) =>
      (el.onkeydown = (e) => {
        if (e.key === 'Enter') {
          showToast(`已搜索：${el.value || '全部内容'}`);
        }
      }),
  );
  $$('#dashboardGrid .widget').forEach((card) => {
    card.addEventListener('dragstart', () => {
      state.dragId = card.dataset.widget;
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('dragover', (e) => {
      if (state.editingLayout) {
        e.preventDefault();
        card.classList.add('drag-over');
      }
    });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      const from = state.draftVisible.indexOf(state.dragId),
        to = state.draftVisible.indexOf(card.dataset.widget);
      if (from > -1 && to > -1) {
        const [x] = state.draftVisible.splice(from, 1);
        state.draftVisible.splice(to, 0, x);
        App.render();
      }
    });
  });
  $$('input[type="range"]').forEach((el) =>
    el.addEventListener('input', () => {
      const n = el.parentElement.querySelector('span');
      if (n) n.textContent = el.value + '%';
    }),
  );
}

export function bindGlobal() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-nav],[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    const nav = el.dataset.nav;
    if (nav) {
      const map = {
        dashboard: 'dashboard',
        tasks: 'tasks',
        flows: 'flows',
        calendar: 'calendar',
        contacts: 'contacts',
        docs: 'docs',
        portfolio: 'portfolio',
        'project-basic': 'project-basic',
        'project-overview': 'project-overview',
        'project-lifecycle': 'project-lifecycle',
        'project-adjustment': 'project-adjustment',
        'ops-projects': 'ops-projects',
        'ops-people': 'ops-people',
        'ops-resources': 'ops-resources',
        'ops-review': 'ops-review',
      };
      if (nav.startsWith('project-')) {
        state.projectSection = nav.replace('project-', '');
        projectView(nav);
      } else setView(map[nav] || nav);
      return;
    }
    if (!action) return;
    switch (action) {
      case 'workbench-tab':
        setView(el.dataset.tab === 'dashboard' ? 'dashboard' : el.dataset.tab);
        break;
      case 'toggle-layout':
        state.editingLayout = !state.editingLayout;
        if (state.editingLayout) openCustomizer(false);
        else closeCustomizer();
        App.render();
        break;
      case 'close-customizer':
        closeCustomizer();
        break;
      case 'save-layout':
        saveCurrentLayout();
        closeCustomizer();
        state.editingLayout = false;
        App.render();
        showToast('个人工作台布局已保存');
        break;
      case 'reset-layout':
        state.draftVisible = defaultLayouts[state.role].slice();
        renderCustomizer();
        showToast('已恢复当前角色默认布局');
        break;
      case 'open-project':
        state.projectId = el.dataset.project || 'thermal';
        state.projectSection = 'basic';
        setView('project-basic');
        showToast(`已进入项目：${projects[state.projectId].name}`);
        break;
      case 'project-more':
        e.stopPropagation();
        showToast('项目更多操作已展开');
        break;
      case 'toggle-project-view':
        state.projectListMode = state.projectListMode === 'card' ? 'list' : 'card';
        App.render();
        break;
      case 'project-section':
        state.projectSection = el.dataset.section;
        setView('project-' + el.dataset.section);
        break;
      case 'overview-tab':
        state.overviewTab = el.dataset.tab;
        state.projectSection = 'overview';
        setView('project-overview');
        break;
      case 'lifecycle-stage':
        state.lifecycleStage = el.dataset.stage;
        state.projectSection = 'lifecycle';
        setView('project-lifecycle');
        break;
      case 'test-tab':
        state.testTab = el.dataset.tab;
        setView('project-lifecycle');
        break;
      case 'adjust-tab':
        state.adjustmentTab = el.dataset.tab;
        setView('project-adjustment');
        break;
      case 'ops-tab':
        setView('ops-' + el.dataset.tab);
        break;
      case 'open-notifications':
        openDrawer(
          '通知中心',
          `<div class="notice warn"><i>!</i><span>你有 2 条待审批流程、1 条严重缺陷验证提醒。</span></div><div class="mini-list-row"><i class="mini-avatar">流</i><div class="grow"><strong>液冷控制算法预研 · 项目立项申请</strong><small>待你审批 · 10 分钟前</small></div><button class="op" data-action="approve-flow">处理</button></div><div class="mini-list-row"><i class="mini-avatar">缺</i><div class="grow"><strong>DFT-0198 已完成修复，请验证</strong><small>智能温控平台 · 1 小时前</small></div><button class="op" data-action="verify-defect">处理</button></div>`,
        );
        break;
      case 'new-project':
        openModal(
          'project',
          '新建项目',
          modalForm('project', [
            { label: '项目名称', required: true, placeholder: '输入项目名称' },
            { label: '项目类型', required: true, select: true },
            { label: '负责人', required: true, placeholder: '选择负责人' },
            { label: '计划起止时间', required: true, placeholder: '选择日期范围' },
            { label: '所属部门', select: true },
            {
              label: '项目描述',
              area: true,
              wide: true,
              placeholder: '描述项目目标、范围和交付物',
            },
          ]),
        );
        break;
      case 'edit-project':
        openDrawer(
          '编辑项目',
          modalForm('project', [
            { label: '项目名称', required: true, value: project().name },
            { label: '项目类型', required: true, select: true, value: project().type },
            { label: '负责人', required: true, value: project().ownerDetail },
            { label: '计划结束时间', required: true, value: project().end },
            { label: '项目描述', area: true, wide: true, value: project().goal },
          ]),
          '<button class="btn" data-action="close-drawer">取消</button><button class="btn primary" data-action="save-project">保存修改</button>',
        );
        break;
      case 'save-project':
        closeDrawer();
        showToast('项目基础信息已保存');
        break;
      case 'new-requirement':
        openModal(
          'req',
          '新建需求文档',
          modalForm('req', [
            { label: '文档标题', required: true, value: project().name + '-需求文档' },
            { label: '文档类型', required: true, select: true, value: '原始需求' },
            {
              label: '内容',
              required: true,
              area: true,
              wide: true,
              placeholder: '支持富文本、图片与表格',
            },
          ]),
        );
        break;
      case 'upload-doc':
        showToast('已打开文件上传面板');
        break;
      case 'change-request':
        openModal(
          'change',
          '发起变更申请',
          modalForm('change', [
            { label: '变更类型', required: true, select: true, value: '需求变更' },
            { label: '变更对象', required: true, value: '最终需求文档 V2.1' },
            { label: '变更原因', required: true, placeholder: '说明变更原因' },
            {
              label: '变更内容',
              required: true,
              area: true,
              wide: true,
              placeholder: '描述变更内容与影响范围',
            },
          ]),
        );
        break;
      case 'breakdown':
        showToast('已根据需求自动创建 3 条开发任务');
        state.lifecycleStage = 'development';
        setView('project-lifecycle');
        break;
      case 'new-task':
        openModal(
          'task',
          '新建开发任务',
          modalForm('task', [
            { label: '任务名称', required: true, placeholder: '输入任务名称' },
            { label: '关联需求', value: '自动带出：REQ-142' },
            { label: '指派人', required: true, placeholder: '选择开发工程师' },
            { label: '预估工时', required: true, placeholder: '整数或 0.5 倍数' },
            { label: '优先级', required: true, select: true, value: '高' },
            { label: '任务描述', area: true, wide: true },
          ]),
        );
        break;
      case 'self-test':
        openDrawer(
          '自测记录 · 高并发消息队列优化',
          `<div class="notice"><i>✓</i><span>全部自测项通过后，任务才允许流转为“待测试”。</span></div><div class="card table-wrap"><table class="table"><thead><tr><th>测试项</th><th>测试步骤</th><th>预期结果</th><th>实际结果</th><th>结果</th></tr></thead><tbody><tr><td>高并发消息上报</td><td>模拟 1000 台设备</td><td>无丢包</td><td>无丢包</td><td>${tag('通过', 'green')}</td></tr><tr><td>异常重试</td><td>断开网络 30 秒</td><td>自动恢复</td><td>自动恢复</td><td>${tag('通过', 'green')}</td></tr></tbody></table></div>`,
        );
        break;
      case 'submit-test':
        showToast('提测前置检查未完成：仍有 2 项实际工时待补充', 'warn');
        break;
      case 'new-case':
        openModal(
          'case',
          '新建测试用例',
          modalForm('case', [
            { label: '用例名称', required: true, placeholder: '输入用例名称' },
            { label: '关联需求', required: true, placeholder: '选择需求' },
            { label: '优先级', required: true, select: true, value: 'P1' },
            { label: '负责人', required: true, placeholder: '选择测试工程师' },
            { label: '测试步骤', required: true, area: true, wide: true },
            { label: '预期结果', required: true, area: true, wide: true },
          ]),
        );
        break;
      case 'recommend-cases':
        openDrawer(
          'AI 推荐用例',
          `<div class="notice"><i>✦</i><span>基于需求关键词匹配标准用例库，共推荐 16 条。</span></div>${['设备断线后自动重连', '设备重连后的状态恢复', '高并发消息上报', '设备离线告警', '能耗数据按区域聚合'].map((x, i) => `<div class="config-row"><span><input type="checkbox" ${i < 3 ? 'checked' : ''}> ${x}<small class="mini-note" style="display:block;margin:4px 0 0 22px">匹配需求 REQ-${139 + i * 3} · 相似度 ${94 - i * 4}%</small></span>${tag(i < 3 ? '已选择' : '推荐', 'blue')}</div>`).join('')}`,
          '<button class="btn" data-action="close-drawer">取消</button><button class="btn primary" data-action="adopt-cases">采纳选中用例</button>',
        );
        break;
      case 'raise-defect':
        openModal(
          'defect',
          '提报缺陷',
          modalForm('defect', [
            { label: '缺陷标题', required: true, placeholder: '描述问题现象' },
            { label: '严重等级', required: true, select: true, value: 'AI 建议：严重' },
            { label: '关联版本', required: true, value: 'V2.6' },
            { label: '关联失败用例', required: true, value: 'TC-0822' },
            { label: '复现步骤', required: true, area: true, wide: true },
            { label: '问题描述', required: true, area: true, wide: true },
          ]),
        );
        break;
      case 'open-defect':
        openDrawer(
          '缺陷详情 · DFT-0198',
          `<div class="status-line">${tag('严重', 'red')} ${tag('待验证', 'purple')} <span class="mini-note">AI 已识别为高影响设备通信问题</span></div><div class="kv-grid"><div class="kv"><label>关联需求</label><div>REQ-142</div></div><div class="kv"><label>关联用例</label><div>TC-0822</div></div><div class="kv"><label>指派人</label><div>孙宁</div></div><div class="kv"><label>发现时间</label><div>08-08 15:20</div></div></div><div class="detail-section"><h4>问题描述</h4><p>高并发设备消息上报场景下出现间歇性丢包，复现概率约 8%。</p></div><div class="detail-section"><h4>处理记录</h4><div class="timeline"><div class="timeline-item">开发修复完成，提交测试验证<small>孙宁 · 08-11 16:10</small></div><div class="timeline-item">测试主管确认后指派开发<small>李明 · 08-09 09:30</small></div></div></div>`,
          '<button class="btn" data-action="close-drawer">关闭</button><button class="btn primary" data-action="verify-defect">验证缺陷</button>',
        );
        break;
      case 'verify-defect':
        closeDrawer();
        showToast('已打开缺陷验证表单');
        break;
      case 'batch-close':
        openModal(
          'batch',
          '批量闭环缺陷',
          `<div class="notice warn"><i>!</i><span>上传 Excel 后，AI 将匹配缺陷 ID 并解析结论。提交前请确认匹配结果。</span></div><div class="card card-pad" style="text-align:center;border-style:dashed;padding:32px">⌘<br><b>点击或拖拽上传 Excel 文件</b><br><span class="mini-note">支持 .xlsx / .xls，单次最多 500 条</span></div>`,
          '<button class="btn" data-action="close-modal">取消</button><button class="btn primary" data-action="modal-save">解析文件</button>',
        );
        break;
      case 'new-ecn':
      case 'new-pcn':
        openModal(
          'notice',
          action === 'new-ecn' ? '新建 ECN 表单' : '新建 PCN 表单',
          modalForm('notice', [
            { label: '变更单号', value: '系统自动生成' },
            { label: '项目名称', value: project().name },
            { label: '版本号', required: true, value: 'V2.6' },
            { label: '变更类型', required: true, select: true },
            { label: '变更描述', required: true, area: true, wide: true },
            { label: '变更影响', required: true, area: true, wide: true },
          ]),
        );
        break;
      case 'emergency-publish':
        openModal(
          'publish',
          '紧急发布审批',
          `<div class="notice warn"><i>!</i><span>紧急发布可先跳过 ECN / PCN，但发布后将自动创建 3 个工作日内完成的复盘任务。</span></div>${modalForm(
            'publish',
            [
              {
                label: '紧急原因',
                required: true,
                area: true,
                wide: true,
                placeholder: '说明为什么必须紧急发布',
              },
              { label: '研发总监', required: true, placeholder: '选择审批人' },
            ],
          )}`,
        );
        break;
      case 'archive':
        showToast('PCN 已提交归档审核');
        break;
      case 'submit-closing':
        showToast('结项申请已提交，进入文档工程师审核');
        break;
      case 'knowledge':
        showToast('已选择文档，待项目结项后推送组织知识库');
        break;
      case 'new-milestone':
        openModal(
          'milestone',
          '创建里程碑',
          modalForm('milestone', [
            { label: '里程碑名称', required: true, placeholder: '输入里程碑名称' },
            { label: '计划完成日期', required: true, placeholder: '选择日期' },
            { label: '关联任务', placeholder: '可选：选择关联任务' },
          ]),
        );
        break;
      case 'new-risk':
        openModal(
          'risk',
          '创建风险',
          modalForm('risk', [
            { label: '风险名称', required: true, placeholder: '输入风险名称' },
            { label: '风险等级', required: true, select: true, value: '高' },
            { label: '责任人', required: true, placeholder: '选择责任人' },
            { label: '风险描述', required: true, area: true, wide: true },
            { label: '应对措施', area: true, wide: true },
          ]),
        );
        break;
      case 'update-risk':
        openDrawer(
          '更新风险进展',
          modalForm('risk', [
            { label: '当前状态', required: true, select: true, value: '处理中' },
            { label: '进展说明', required: true, area: true, wide: true },
          ]),
          '<button class="btn" data-action="close-drawer">取消</button><button class="btn primary" data-action="save-risk">保存进展</button>',
        );
        break;
      case 'new-department':
      case 'new-role':
      case 'new-dictionary':
      case 'new-flow-template':
      case 'new-integration':
        openModal(
          'config',
          action === 'new-department'
            ? '新建部门'
            : action === 'new-role'
              ? '新建角色'
              : action === 'new-dictionary'
                ? '新建字典项'
                : action === 'new-flow-template'
                  ? '新建流程模板'
                  : '新建接口',
          modalForm('config', [
            { label: '名称', required: true, placeholder: '输入名称' },
            { label: '说明', area: true, wide: true, placeholder: '填写配置说明' },
          ]),
        );
        break;
      case 'toggle-switch':
        el.classList.toggle('on');
        break;
      case 'delete-dict':
        openModal(
          'confirm',
          '确认删除',
          `<div class="notice danger"><i>!</i><span>确认删除该字典项吗？删除后不可恢复。</span></div>`,
          '<button class="btn" data-action="close-modal">取消</button><button class="btn danger" data-action="modal-save">确认删除</button>',
        );
        break;
      case 'select-risk':
        state.selectedRisk = +el.dataset.risk;
        setView('project-adjustment');
        break;
      case 'share':
        openDrawer(
          '共享设置',
          `<div class="tabs"><button class="tab active">邀请成员</button><button class="tab">公开链接</button></div><div class="field"><label>邀请成员</label><input class="input" style="width:100%" placeholder="搜索姓名或部门"></div><div class="config-row"><span>王凯 · 项目经理</span>${tag('可编辑', 'blue')}</div><div class="config-row"><span>公开链接有效期</span><select class="input"><option>7 天（默认）</option><option>1 天</option><option>30 天</option><option>永久</option></select></div>`,
          '<button class="btn" data-action="close-drawer">取消</button><button class="btn primary" data-action="save-share">保存共享设置</button>',
        );
        break;
      case 'open-audit':
        openDrawer(
          '操作记录',
          `<div class="timeline"><div class="timeline-item"><b>项目状态由“开发中”变更为“测试中”</b><small>王凯 · 2026-08-08 16:42</small></div><div class="timeline-item"><b>关联版本更新为 V2.6</b><small>何盈 · 2026-08-05 11:20</small></div><div class="timeline-item"><b>最终需求文档评审通过并锁定</b><small>系统 · 2026-07-08 17:05</small></div><div class="timeline-item"><b>项目创建</b><small>系统 · 2026-04-18 09:30</small></div></div>`,
        );
        break;
      case 'close-modal':
        $('#modalRoot').classList.remove('show');
        break;
      case 'modal-save':
        $('#modalRoot').classList.remove('show');
        showToast('操作成功，数据已更新');
        break;
      case 'close-drawer':
        closeDrawer();
        break;
      case 'open-doc':
        openDrawer(
          '文档预览 · 软件规格书 V1.3',
          `<div class="doc-preview"><h3>软件规格书</h3><p><b>1. 文档目标</b></p><p>本规格书定义智能温控平台 V2.6 的核心软件能力、设备接入协议与能耗分析要求。</p><p><b>2. 功能范围</b></p><p>支持设备注册、状态上报、<mark>断线自动重连</mark>、能耗数据聚合与按区域筛选。</p><p><b>3. 评审状态</b></p><p>评审通过 · 当前版本 V1.3 · 上一版本 V1.2 可回溯</p></div><div class="detail-section"><h4>版本历史</h4><div class="config-row"><span>V1.3 · 08-08 · 何盈</span><span>${tag('当前', 'green')}</span></div><div class="config-row"><span>V1.2 · 08-06 · 何盈</span><button class="op" data-action="open-version">查看</button></div><div class="config-row"><span>V1.0 · 07-01 · 王凯</span><button class="op" data-action="open-version">查看</button></div></div>`,
        );
        break;
      case 'versions':
        openDrawer(
          '版本历史',
          `<div class="config-row"><span>V1.3 · 当前版本 · 何盈</span>${tag('当前', 'green')}</div><div class="config-row"><span>V1.2 · 2026-08-06 · 何盈</span><button class="op" data-action="open-version">查看</button></div><div class="config-row"><span>V1.0 · 2026-07-01 · 王凯</span><button class="op" data-action="open-version">查看</button></div>`,
        );
        break;
      case 'open-version':
        showToast('已打开只读版本快照');
        break;
      case 'approve-flow':
        openModal(
          'approve',
          '审批流程',
          `<div class="review-box"><b>项目立项申请</b><br>液冷控制算法预研 · 发起人：赵敏<br><br>审批通过后项目状态将变更为“已立项”，并创建规划阶段里程碑。</div><div class="field" style="margin-top:14px"><label>审批意见</label><textarea placeholder="填写审批意见（选填）"></textarea></div>`,
          '<button class="btn" data-action="close-modal">取消</button><button class="btn primary" data-action="modal-save">确认通过</button>',
        );
        break;
      case 'reject-flow':
        openModal(
          'reject',
          '驳回流程',
          `<div class="notice warn"><i>!</i><span>驳回后流程将退回发起人，并附带你的意见。</span></div><div class="field"><label><b>*</b>驳回意见</label><textarea placeholder="请填写驳回原因"></textarea></div>`,
          '<button class="btn" data-action="close-modal">取消</button><button class="btn danger" data-action="modal-save">确认驳回</button>',
        );
        break;
      case 'message':
        showToast('会话入口已打开');
        break;
      case 'assign':
        openModal(
          'assign',
          '指派任务',
          modalForm('assign', [
            { label: '任务名称', required: true, placeholder: '输入任务名称' },
            { label: '关联项目', required: true, value: project().name },
            { label: '截止时间', required: true, placeholder: '选择日期' },
          ]),
        );
        break;
      case 'open-task':
        openDrawer(
          '任务详情 · 补充能耗数据边界说明',
          `<div class="kv-grid"><div class="kv"><label>关联项目</label><div>${project().name}</div></div><div class="kv"><label>关联需求</label><div>REQ-146</div></div><div class="kv"><label>截止时间</label><div class="down">2026-08-12 18:00</div></div><div class="kv"><label>当前进度</label><div>40%</div></div><div class="kv"><label>预估 / 实际工时</label><div>8h / 3h</div></div><div class="kv"><label>状态</label><div>${tag('进行中', 'blue')}</div></div></div><div class="detail-section"><h4>任务描述</h4><p>补充能耗数据在不同设备类型、区域和异常值下的边界规则，并同步更新需求文档。</p></div>`,
        );
        break;
      case 'update-task':
        openDrawer(
          '更新任务进度',
          `<div class="field"><label>进度</label><input type="range" min="0" max="100" value="40" style="width:100%"><div class="mini-note" style="margin-top:7px">拖动更新百分比</div></div><div class="field" style="margin-top:15px"><label>实际工时（非必填）</label><input placeholder="例如：3.5"></div>`,
          '<button class="btn" data-action="close-drawer">取消</button><button class="btn primary" data-action="save-task">保存进度</button>',
        );
        break;
      case 'calendar-day':
        showToast('已展开当天任务、会议与里程碑');
        break;
      case 'feedback':
        openModal(
          'feedback',
          '提交产品反馈',
          modalForm('feedback', [
            { label: '反馈类型', required: true, select: true, value: '功能建议' },
            {
              label: '反馈内容',
              required: true,
              area: true,
              wide: true,
              placeholder: '请描述问题或建议',
            },
          ]),
        );
        break;
      case 'open-flow':
        openDrawer(
          '流程详情',
          `<div class="flow-line"><div class="flow-node done"><strong>发起</strong><small>已完成</small></div><span class="flow-arrow"></span><div class="flow-node done"><strong>技术主管</strong><small>已通过</small></div><span class="flow-arrow"></span><div class="flow-node active"><strong>研发总监</strong><small>当前节点</small></div><span class="flow-arrow"></span><div class="flow-node"><strong>完成</strong><small>待处理</small></div></div><div class="detail-section"><h4>审批记录</h4><div class="timeline"><div class="timeline-item">技术主管已通过<small>李明 · 今天 10:22</small></div><div class="timeline-item">流程已发起<small>赵敏 · 今天 09:12</small></div></div></div>`,
        );
        break;
      case 'refresh':
        showToast('数据已刷新');
        break;
      default:
        if (
          [
            'add-member',
            'member-detail',
            'remove-member',
            'edit-risk',
            'review-detail',
            'open-change',
            'edit-repo',
            'batch-assign',
            'execute-case',
            'submit-report',
            'import-cases',
            'adopt-cases',
            'new-pcn',
            'new-ecn',
            'resource-request',
            'person-detail',
            'new-flow-template',
            'edit-flow-template',
            'open-person',
            'edit-dict',
            'edit-integration',
            'add-label',
            'save-risk',
            'save-task',
            'save-share',
            'open-version',
            'new-milestone',
            'view-milestone',
            'edit-milestone',
            'submit-closing',
            'knowledge',
            'faq',
          ].includes(action)
        )
          showToast('已打开对应操作面板');
        else showToast('该交互已保留，后续可接入真实数据');
    }
  });
}

/** V1.3 全局 data-action 事件分发 */
export function bindActionEvents() {
  document.addEventListener(
    'click',
    (e) => {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      const a = el.dataset.action;
      if (
        ![
          'ops-refresh',
          'ops-export',
          'ops-open-project',
          'ops-toggle-focus',
          'ops-drill-risk',
          'ops-notify',
          'ops-open-defect',
          'ops-open-person',
          'ops-resource-detail',
          'ops-resource-request',
          'ops-approve-resource',
          'ops-resource-filter',
        ].includes(a)
      )
        return;
      e.stopImmediatePropagation();
      if (a === 'ops-refresh' || a === 'ops-export') {
        showToast(a === 'ops-refresh' ? '运营数据已刷新，已重新计算指标' : '当前看板报告已导出');
        return;
      }
      if (a === 'ops-open-project') {
        state.projectId = el.dataset.project || 'thermal';
        state.overviewTab = 'dashboard';
        setView('project-overview');
        showToast('已下钻至项目概况');
        return;
      }
      if (a === 'ops-toggle-focus') {
        state.opsFocus = state.opsFocus || ['thermal', 'gateway'];
        const p = el.dataset.project;
        state.opsFocus = state.opsFocus.includes(p)
          ? state.opsFocus.filter((x) => x !== p)
          : state.opsFocus.concat(p);
        App.render();
        return;
      }
      if (a === 'ops-drill-risk') {
        state.projectId = el.dataset.project || 'thermal';
        state.adjustmentTab = el.textContent.includes('项目调整') ? 'changes' : 'risks';
        setView(el.textContent.includes('项目调整') ? 'project-adjustment' : 'project-overview');
        return;
      }
      if (a === 'ops-open-defect') {
        openDrawer(
          '缺陷详情 · DFT-0198',
          `<div class="status-line">${tag('严重', 'red')} ${tag('待验证', 'purple')}</div><div class="kv-grid"><div class="kv"><label>关联项目</label><div>智能温控平台 V2.6</div></div><div class="kv"><label>关联用例</label><div>TC-0822</div></div><div class="kv"><label>指派人</label><div>孙宁</div></div><div class="kv"><label>超期时间</label><div class="down">3 天</div></div></div><div class="detail-section"><h4>处理记录</h4><p>开发已提交修复构建，等待测试验证；发布预检仍被该缺陷阻断。</p></div>`,
        );
        return;
      }
      if (a === 'ops-notify') {
        openModal(
          'ops-notify',
          '提醒负责人',
          `<div class="notice warn"><i>!</i><span>将向 ${el.dataset.person || '负责人'} 发送缺陷超期提醒，并在通知记录中留痕。</span></div><div class="field"><label>提醒内容</label><textarea>请尽快处理超过 3 天未闭环的严重缺陷。</textarea></div>`,
          '<button class="btn" data-action="close-modal">取消</button><button class="btn primary" data-action="modal-save">发送提醒</button>',
        );
        return;
      }
      if (a === 'ops-open-person') {
        const n = el.dataset.person || '赵敏';
        openDrawer(
          `${n} · 人员运营明细`,
          `<div class="status-line">${person(n, n[0])} <span class="tag orange">当前负载 112%</span></div><div class="kv-grid"><div class="kv"><label>部门 / 岗位</label><div>质量部 / 测试工程师</div></div><div class="kv"><label>负责 / 参与项目</label><div>1 / 2 个</div></div><div class="kv"><label>已耗用工时</label><div>86h</div></div><div class="kv"><label>未来可分配</label><div class="down">18h</div></div></div><div class="detail-section"><h4>个人项目明细</h4><div class="config-row"><span>智能温控平台 V2.6<small class="mini-note">测试工程师 · 进度 72% · 剩余 24h</small></span>${tag('设备待交付', 'red')}</div><div class="config-row"><span>设备云平台 3.0<small class="mini-note">测试工程师 · 进度 61% · 剩余 31h</small></span>${tag('正常', 'green')}</div></div><div class="notice danger" style="margin-top:14px"><i>!</i><span>卡点：设备待交付导致测试任务延期。建议主管调整排期或发起资源调配。</span></div>`,
        );
        return;
      }
      if (a === 'ops-resource-detail') {
        openDrawer(
          '项目资源占用与冲突明细',
          `<div class="notice warn"><i>!</i><span>检测到 2 名成员存在跨项目超负载占用。</span></div><table class="table"><thead><tr><th>成员</th><th>项目 A</th><th>项目 B</th><th>总负载</th><th>处理</th></tr></thead><tbody><tr><td>王凯</td><td>设备云 68%</td><td>网关 36%</td><td class="down">104%</td><td><button class="op" data-action="ops-resource-request">发起调配</button></td></tr><tr><td>李明</td><td>设备云 74%</td><td>温控 34%</td><td class="down">108%</td><td><button class="op" data-action="ops-resource-request">发起调配</button></td></tr></tbody></table>`,
        );
        return;
      }
      if (a === 'ops-resource-request' || a === 'ops-approve-resource') {
        openModal(
          'resource',
          '跨部门资源调配申请',
          `<div class="notice"><i>i</i><span>${a === 'ops-approve-resource' ? '当前申请：陈璐借调至智能温控平台，审批后写入调配记录。' : '填写借调/释放人员、来源部门、目标项目和生效周期。'}</span></div>${modalForm(
            'resource',
            [
              { label: '调配对象', required: true, value: '陈璐 · 测试工程师' },
              { label: '来源部门', required: true, value: '软件二科' },
              { label: '目标项目', required: true, value: '智能温控平台 V2.6' },
              { label: '生效周期', required: true, value: '2026-08-15 — 2026-09-12' },
              { label: '调配原因', required: true, area: true, wide: true },
            ],
          )}`,
          '<button class="btn" data-action="close-modal">取消</button><button class="btn primary" data-action="modal-save">提交审批</button>',
        );
        return;
      }
      if (a === 'ops-resource-filter') {
        showToast('已打开技能标签与忙闲状态筛选');
        return;
      }
    },
    true,
  );
}
