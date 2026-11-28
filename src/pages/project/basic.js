/** 项目基本信息页：项目基础信息表单、审核人配置、操作记录与项目通知。 */
import { App } from '../../core/app.js';
import { commonHead } from '../../components/shell.js';
import { renderProjectShell } from './shell.js';
import { renderApprovalBar, renderApproverConfig } from '../../features/stage-approval.js';
import { project } from '../../store/state.js';

const AUDIT_CARD = `<div class="card card-pad"><h3 class="section-title">项目操作记录 <small>关键字段变更与状态流转</small></h3><div class="timeline"><div class="timeline-item"><b>项目状态由“开发中”变更为“测试中”</b><small>王凯 · 2026-08-08 16:42</small></div><div class="timeline-item"><b>关联版本更新为 V2.6</b><small>何盈 · 2026-08-05 11:20</small></div><div class="timeline-item"><b>项目负责人变更为王凯</b><small>系统 · 2026-04-18 09:30</small></div></div><button class="btn" data-action="open-audit">查看全部操作记录</button></div>`;

const NOTICE_CARD = `<div class="card card-pad"><h3 class="section-title">项目通知 <small>任务、审批与文档动态</small></h3><div class="mini-list-row"><i class="mini-avatar">!</i><div class="grow"><strong>需求评审将在明天 14:00 开始</strong><small>系统通知 · 10分钟前</small></div></div><div class="mini-list-row"><i class="mini-avatar">文</i><div class="grow"><strong>软件规格书已更新至 V1.3</strong><small>何盈 · 昨日 18:20</small></div></div></div>`;

function renderProjectBasic() {
  const p = project();
  const head = commonHead(
    '项目管理 / 基本信息',
    '基本信息',
    '维护项目基础数据、审核人与操作记录。',
    '<button class="btn" data-action="share">共享</button><button class="btn" data-action="open-audit">操作记录</button>',
  );
  const form =
    '<section class="card card-pad basic-info-card"><div class="card-head"><b>项目基础信息</b></div>' +
    App.renderProjectFormFields(p, 'edit') +
    '<div class="form-foot"><button class="btn primary" data-v47="save-basic">保存项目基础信息</button></div></section>';
  return renderProjectShell(
    head +
      renderApprovalBar('planning') +
      form +
      '<div class="grid cols-2 basic-side-grid">' +
      renderApproverConfig() +
      '<div class="grid basic-side-stack">' +
      AUDIT_CARD +
      NOTICE_CARD +
      '</div></div>',
  );
}
App.renderProjectBasic = renderProjectBasic;
